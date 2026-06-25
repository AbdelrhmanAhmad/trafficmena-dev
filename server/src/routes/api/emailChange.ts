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
import { normalizeEmail } from './utils.js';

const SHORT_WINDOW_MS = 10 * 60 * 1000;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const USER_REQUEST_LIMIT = 3; // per user per 10 min
const DEST_SHORT_LIMIT = 3; // per destination email per 10 min
const DEST_DAILY_LIMIT = 10; // per destination email per day
const VERIFY_LIMIT = 5; // verify attempts per user per 10 min

const requestSchema = z.object({ newEmail: z.string().email() });
const verifySchema = z.object({
  newEmail: z.string().email(),
  otp: z.string().min(4).max(8),
});

class EmailTakenError extends Error {}

const rateLimited = (c: Context) =>
  c.json(
    {
      error: {
        code: 'EMAIL_CHANGE_RATE_LIMITED',
        message: 'Too many email-change requests. Please wait a few minutes and try again.',
      },
    },
    429,
  );

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

      // Per-user limit caps a logged-in attacker; per-destination limits (sharing the sign-in OTP
      // budget for the target address) close the email-bombing vector.
      const userWindow = otpRateLimiter.consume(`emailchange:user:${userId}`, {
        limit: USER_REQUEST_LIMIT,
        windowMs: SHORT_WINDOW_MS,
      });
      if (!userWindow.allowed) return rateLimited(c);

      const destShort = otpRateLimiter.consume(`otp:email:short:${newEmail}`, {
        limit: DEST_SHORT_LIMIT,
        windowMs: SHORT_WINDOW_MS,
      });
      if (!destShort.allowed) return rateLimited(c);

      const destDaily = otpRateLimiter.consume(`otp:email:daily:${newEmail}`, {
        limit: DEST_DAILY_LIMIT,
        windowMs: DAILY_WINDOW_MS,
      });
      if (!destDaily.allowed) return rateLimited(c);

      const otp = generateEmailChangeOtp();
      const otpHash = hashEmailChangeOtp(env.BETTER_AUTH_SECRET, userId, newEmail, otp);

      await db.insert(emailChangeRequests).values({
        userId,
        newEmail,
        otpHash,
        expiresAt: new Date(Date.now() + EMAIL_CHANGE_OTP_TTL_MS),
      });

      await sendOtpEmail({ email: newEmail, otp, ttlMinutes: EMAIL_CHANGE_OTP_TTL_MINUTES });
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
      console.error('[auth] email-change request failed', error);
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

    const verifyWindow = otpVerificationRateLimiter.consume(`emailchange:verify:${userId}`, {
      limit: VERIFY_LIMIT,
      windowMs: SHORT_WINDOW_MS,
    });
    if (!verifyWindow.allowed) {
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

    const [request] = await db
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
        await tx
          .update(emailChangeRequests)
          .set({ consumedAt: new Date() })
          .where(eq(emailChangeRequests.id, request.id));
        // Invalidate the user's other sessions; the current session (keyed on userId) survives.
        await tx
          .delete(authSessions)
          .where(and(eq(authSessions.userId, userId), ne(authSessions.id, currentSessionId)));
      });
    } catch (error) {
      if (error instanceof EmailTakenError) {
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
      console.error('[auth] email-change verify failed', error);
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

    otpVerificationRateLimiter.reset(`emailchange:verify:${userId}`);
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
