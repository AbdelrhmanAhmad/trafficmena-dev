import { and, desc, eq, gt, isNull, ne } from 'drizzle-orm';
import type { Context, Hono } from 'hono';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { db } from '../../db/client.js';
import { authSessions, emailChangeRequests, users } from '../../db/schema/index.js';
import { sendEmailChangeNotice, sendOtpEmail } from '../../services/email.js';
import { otpRateLimiter, otpVerificationRateLimiter } from '../../services/rateLimiter.js';
import { getSessionFromRequest } from '../../utils/session.js';
import {
  EMAIL_CHANGE_OTP_TTL_MINUTES,
  EMAIL_CHANGE_OTP_TTL_MS,
  generateEmailChangeOtp,
  hashEmailChangeOtp,
  maskEmail,
  safeCompareHex,
} from './emailChangeLogic.js';
import {
  DAILY_WINDOW_MS,
  EMAIL_CHANGE_DEST_DAILY_LIMIT,
  EMAIL_CHANGE_DEST_SHORT_LIMIT,
  EMAIL_CHANGE_USER_REQUEST_LIMIT,
  EMAIL_CHANGE_VERIFY_LIMIT,
  emailChangeRateKeys,
  SHORT_WINDOW_MS,
} from './emailChangeRateLimits.js';
// NOTE: the limiters below are in-memory and per-instance (see rateLimiter.ts). All email-change
// throttles (per-user, per-destination bombing, verify brute-force) hold only within one process;
// move to a shared store before horizontal scaling (C-7).
import { isKnownDatabaseConflict, normalizeEmail } from './utils.js';

const requestSchema = z.object({ newEmail: z.string().email() });
const verifySchema = z.object({
  newEmail: z.string().email(),
  otp: z.string().min(4).max(8),
});

class EmailTakenError extends Error {}

const rateLimited = (c: Context, resetAt: number) => {
  // Tell the client exactly how long to wait so its resend cooldown matches the server window
  // instead of inviting an immediate retry that just 429s again (C-8).
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  c.header('Retry-After', String(retryAfterSeconds));
  return c.json(
    {
      error: {
        code: 'EMAIL_CHANGE_RATE_LIMITED',
        message: 'Too many email-change requests. Please wait a few minutes and try again.',
        retryAfterSeconds,
      },
    },
    429,
  );
};

export function registerEmailChangeRoutes(app: Hono) {
  app.post('/auth/email-change/request', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.session || !session.user) {
      return c.json(
        { error: { code: 'UNAUTHORIZED', message: 'Sign in to change your email.' } },
        401,
      );
    }

    const body = requestSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json(
        { error: { code: 'INVALID_REQUEST', message: 'A valid new email is required.' } },
        400,
      );
    }

    try {
      const userId = session.user.id;
      const currentEmail = normalizeEmail(session.user.email);
      const newEmail = normalizeEmail(body.data.newEmail);

      if (newEmail === currentEmail) {
        return c.json(
          { error: { code: 'EMAIL_UNCHANGED', message: 'That is already your email address.' } },
          400,
        );
      }

      // Consume the per-user budget BEFORE probing whether the address is in use, so the 409-vs-200
      // outcome can't be an unbounded account-enumeration oracle (C-1). The residual disclosure — an
      // authenticated user learning an address is taken, now capped at the per-user short-window
      // limit — is the same thing signup already reveals, so we keep the explicit "in use" 409 for
      // clear UX rather than masking it behind a silent success.
      const userWindow = otpRateLimiter.consume(emailChangeRateKeys.userRequest(userId), {
        limit: EMAIL_CHANGE_USER_REQUEST_LIMIT,
        windowMs: SHORT_WINDOW_MS,
      });
      if (!userWindow.allowed) return rateLimited(c, userWindow.resetAt);

      const [taken] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, newEmail))
        .limit(1);
      if (taken) {
        return c.json(
          {
            error: {
              code: 'EMAIL_EXISTS',
              message: 'That email is already in use by another account.',
            },
          },
          409,
        );
      }

      // Per-destination limits (shared with the sign-in OTP budget) close the email-bombing vector.
      const destShort = otpRateLimiter.consume(emailChangeRateKeys.destShort(newEmail), {
        limit: EMAIL_CHANGE_DEST_SHORT_LIMIT,
        windowMs: SHORT_WINDOW_MS,
      });
      if (!destShort.allowed) return rateLimited(c, destShort.resetAt);

      const destDaily = otpRateLimiter.consume(emailChangeRateKeys.destDaily(newEmail), {
        limit: EMAIL_CHANGE_DEST_DAILY_LIMIT,
        windowMs: DAILY_WINDOW_MS,
      });
      if (!destDaily.allowed) return rateLimited(c, destDaily.resetAt);

      const otp = generateEmailChangeOtp();
      const otpHash = hashEmailChangeOtp(env.BETTER_AUTH_SECRET, userId, newEmail, otp);

      const [createdRequest] = await db
        .insert(emailChangeRequests)
        .values({
          userId,
          newEmail,
          otpHash,
          expiresAt: new Date(Date.now() + EMAIL_CHANGE_OTP_TTL_MS),
        })
        .returning({ id: emailChangeRequests.id });

      try {
        await sendOtpEmail({ email: newEmail, otp, ttlMinutes: EMAIL_CHANGE_OTP_TTL_MINUTES });
      } catch (error) {
        if (createdRequest?.id) {
          try {
            await db
              .delete(emailChangeRequests)
              .where(eq(emailChangeRequests.id, createdRequest.id));
          } catch {
            console.error('[auth] email-change request cleanup failed after OTP send failure');
          }
        }
        throw error;
      }
      // Best-effort out-of-band notice to the current address; never block the flow on it.
      try {
        await sendEmailChangeNotice({
          email: currentEmail,
          status: 'requested',
          maskedNewEmail: maskEmail(newEmail),
        });
      } catch {
        console.error('[auth] email-change request notice failed');
      }

      return c.json({ success: true });
    } catch (error) {
      // Log the message only, never the raw error: a DB error's detail can contain the new email.
      console.error(
        '[auth] email-change request failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
      return c.json(
        { error: { code: 'EMAIL_CHANGE_FAILED', message: 'Unable to start the email change.' } },
        500,
      );
    }
  });

  app.post('/auth/email-change/verify', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.session || !session.user) {
      return c.json(
        { error: { code: 'UNAUTHORIZED', message: 'Sign in to change your email.' } },
        401,
      );
    }

    const body = verifySchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json(
        {
          error: { code: 'INVALID_REQUEST', message: 'Email and verification code are required.' },
        },
        400,
      );
    }

    const userId = session.user.id;
    const currentSessionId = session.session.id;
    const oldEmail = normalizeEmail(session.user.email);
    const newEmail = normalizeEmail(body.data.newEmail);

    const verifyKey = emailChangeRateKeys.verify(userId);
    // Consume before any awaited work so concurrent wrong-code bursts cannot all pass a peek and
    // exceed the brute-force cap. Correct-code DB failures refund this slot in the catch below.
    const verifyAttempt = otpVerificationRateLimiter.consume(verifyKey, {
      limit: EMAIL_CHANGE_VERIFY_LIMIT,
      windowMs: SHORT_WINDOW_MS,
    });
    if (!verifyAttempt.allowed) {
      return c.json(
        {
          error: {
            code: 'OTP_VERIFY_RATE_LIMITED',
            message: 'Too many attempts. Please request a new code.',
          },
        },
        429,
      );
    }

    let request: typeof emailChangeRequests.$inferSelect | undefined;
    try {
      [request] = await db
        .select()
        .from(emailChangeRequests)
        .where(
          and(
            eq(emailChangeRequests.userId, userId),
            eq(emailChangeRequests.newEmail, newEmail),
            isNull(emailChangeRequests.consumedAt),
            gt(emailChangeRequests.expiresAt, new Date()),
          ),
        )
        .orderBy(desc(emailChangeRequests.createdAt))
        .limit(1);
    } catch (error) {
      otpVerificationRateLimiter.decrement(verifyKey);
      console.error(
        '[auth] email-change verify lookup failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
      return c.json(
        {
          error: {
            code: 'EMAIL_CHANGE_FAILED',
            message: 'Unable to change email. Please try again.',
          },
        },
        500,
      );
    }

    if (!request) {
      return c.json(
        {
          error: {
            code: 'OTP_INVALID',
            message: 'No pending email change found or it has expired. Request a new code.',
          },
        },
        400,
      );
    }

    const candidateHash = hashEmailChangeOtp(
      env.BETTER_AUTH_SECRET,
      userId,
      newEmail,
      body.data.otp,
    );
    if (!safeCompareHex(candidateHash, request.otpHash)) {
      return c.json(
        { error: { code: 'OTP_INVALID', message: 'That code is incorrect or has expired.' } },
        400,
      );
    }

    try {
      await db.transaction(async (tx) => {
        // Re-check uniqueness inside the transaction (guard the request→verify race).
        const [conflict] = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, newEmail))
          .limit(1);
        if (conflict && conflict.id !== userId) {
          throw new EmailTakenError();
        }

        await tx
          .update(users)
          .set({ email: newEmail, emailVerified: true, updatedAt: new Date() })
          .where(eq(users.id, userId));
        // Compare-and-swap: only the first verify to land consumes the request (single-use rigor).
        await tx
          .update(emailChangeRequests)
          .set({ consumedAt: new Date() })
          .where(
            and(eq(emailChangeRequests.id, request.id), isNull(emailChangeRequests.consumedAt)),
          );
        // Invalidate the user's other sessions; the current session (keyed on userId) survives.
        await tx
          .delete(authSessions)
          .where(and(eq(authSessions.userId, userId), ne(authSessions.id, currentSessionId)));
      });
    } catch (error) {
      otpVerificationRateLimiter.decrement(verifyKey);
      // The in-transaction re-check can still lose a request→verify race; users.email UNIQUE is the
      // real backstop. Map that 23505 to the same 409 as an explicit conflict (C-2) so the riskiest
      // endpoint returns a clean "email in use" instead of a generic 500.
      if (error instanceof EmailTakenError || isKnownDatabaseConflict(error) === 'unique') {
        return c.json(
          {
            error: {
              code: 'EMAIL_EXISTS',
              message: 'That email is already in use by another account.',
            },
          },
          409,
        );
      }
      // Message only — a DB error's detail can contain the new email (C-3).
      console.error(
        '[auth] email-change verify failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
      return c.json(
        {
          error: {
            code: 'EMAIL_CHANGE_FAILED',
            message: 'Unable to change email. Please try again.',
          },
        },
        500,
      );
    }

    otpVerificationRateLimiter.reset(verifyKey);
    // Best-effort completion notice to the old address.
    try {
      await sendEmailChangeNotice({
        email: oldEmail,
        status: 'completed',
        maskedNewEmail: maskEmail(newEmail),
      });
    } catch {
      console.error('[auth] email-change completion notice failed');
    }

    return c.json({ success: true, email: newEmail });
  });
}
