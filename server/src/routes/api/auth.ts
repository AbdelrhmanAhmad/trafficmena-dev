import { and, count, eq, gte } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { auth } from '../../auth.js';
import { db } from '../../db/client.js';
import { authVerifications, invitations, platformSettings, users } from '../../db/schema/index.js';
import { otpRateLimiter, otpVerificationRateLimiter } from '../../services/rateLimiter.js';
import { isTurnstileEnabled, verifyTurnstileToken } from '../../services/turnstile.js';
import { getRequestIp, normalizeEmail } from './utils.js';

const OTP_SHORT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const OTP_SHORT_LIMIT = 3;
const OTP_SHORT_LIMIT_EVENT_MODE = 15;
const OTP_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const OTP_DAILY_LIMIT = 10;
const OTP_DAILY_LIMIT_EVENT_MODE = 50;
const OTP_IP_WINDOW_MS = 10 * 60 * 1000;
const OTP_IP_LIMIT_DEFAULT = 8;
const OTP_IP_LIMIT_EVENT_MODE = 300; // Event mode supports high-density sessions
// Threshold after which Turnstile is required (per IP within the window)
const TURNSTILE_THRESHOLD = 20;

const otpRequestSchema = z.object({
  email: z.string().email(),
  type: z.enum(['sign-in', 'email-verification', 'forget-password']).optional(),
  intent: z.enum(['signup', 'signin']).optional(),
  turnstileToken: z.string().optional(),
});

const otpVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(8),
  intent: z.enum(['signup', 'signin']).optional(),
});

export function registerAuthRoutes(app: Hono) {
  app.post('/auth/otp/request', async (c) => {
    const body = otpRequestSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Email is required to request an OTP.',
          },
        },
        400,
      );
    }

    try {
      const email = normalizeEmail(body.data.email);
      const type = body.data.type ?? 'sign-in';
      const intent = body.data.intent ?? 'signin';
      const clientIp = getRequestIp(c);
      const now = Date.now();
      const [settings] = await db
        .select({
          inviteOnlySignup: platformSettings.inviteOnlySignup,
          eventMode: platformSettings.eventMode,
        })
        .from(platformSettings)
        .limit(1);
      const shortLimit = settings?.eventMode ? OTP_SHORT_LIMIT_EVENT_MODE : OTP_SHORT_LIMIT;
      const dailyLimit = settings?.eventMode ? OTP_DAILY_LIMIT_EVENT_MODE : OTP_DAILY_LIMIT;

      const [recentOtpStats, dailyOtpStats] = await Promise.all([
        db
          .select({ total: count(authVerifications.id) })
          .from(authVerifications)
          .where(
            and(
              eq(authVerifications.identifier, email),
              gte(authVerifications.createdAt, new Date(now - OTP_SHORT_WINDOW_MS)),
            ),
          ),
        db
          .select({ total: count(authVerifications.id) })
          .from(authVerifications)
          .where(
            and(
              eq(authVerifications.identifier, email),
              gte(authVerifications.createdAt, new Date(now - OTP_DAILY_WINDOW_MS)),
            ),
          ),
      ]);

      const recentOtpCount = Number(recentOtpStats?.[0]?.total ?? 0);
      if (recentOtpCount >= shortLimit) {
        return c.json(
          {
            error: {
              code: 'OTP_RATE_LIMITED',
              message: 'Too many OTP requests. Please wait a few minutes before trying again.',
            },
          },
          429,
        );
      }

      const dailyOtpCount = Number(dailyOtpStats?.[0]?.total ?? 0);
      if (dailyOtpCount >= dailyLimit) {
        return c.json(
          {
            error: {
              code: 'OTP_RATE_LIMITED',
              message:
                'You have reached the maximum OTP requests for today. Please try again tomorrow.',
            },
          },
          429,
        );
      }

      const shortWindow = otpRateLimiter.consume(`otp:email:short:${email}`, {
        limit: shortLimit,
        windowMs: OTP_SHORT_WINDOW_MS,
      });

      if (!shortWindow.allowed) {
        return c.json(
          {
            error: {
              code: 'OTP_RATE_LIMITED',
              message: 'Too many OTP requests. Please wait a few minutes before trying again.',
            },
          },
          429,
        );
      }

      const dailyWindow = otpRateLimiter.consume(`otp:email:daily:${email}`, {
        limit: dailyLimit,
        windowMs: OTP_DAILY_WINDOW_MS,
      });

      if (!dailyWindow.allowed) {
        return c.json(
          {
            error: {
              code: 'OTP_RATE_LIMITED',
              message:
                'You have reached the maximum OTP requests for today. Please try again tomorrow.',
            },
          },
          429,
        );
      }

      const ipLimit = settings?.eventMode ? OTP_IP_LIMIT_EVENT_MODE : OTP_IP_LIMIT_DEFAULT;

      // Check current IP request count for Turnstile requirement
      const ipRequestCount = otpRateLimiter.getCount(`otp:ip:${clientIp}`);
      const requiresTurnstile =
        isTurnstileEnabled() && (settings?.eventMode || ipRequestCount >= TURNSTILE_THRESHOLD);

      if (requiresTurnstile) {
        const turnstileToken = body.data.turnstileToken;
        if (!turnstileToken) {
          return c.json(
            {
              error: {
                code: 'TURNSTILE_REQUIRED',
                message: 'Please complete the security check to continue.',
                requiresTurnstile: true,
              },
            },
            400,
          );
        }

        const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
        if (!turnstileResult.success) {
          console.warn('[auth] Turnstile verification failed', {
            ip: clientIp,
            errors: turnstileResult.errorCodes,
          });
          return c.json(
            {
              error: {
                code: 'TURNSTILE_FAILED',
                message: 'Security verification failed. Please try again.',
                requiresTurnstile: true,
              },
            },
            400,
          );
        }
      }

      if (clientIp !== 'unknown') {
        const ipWindow = otpRateLimiter.consume(`otp:ip:${clientIp}`, {
          limit: ipLimit,
          windowMs: OTP_IP_WINDOW_MS,
        });

        if (!ipWindow.allowed) {
          return c.json(
            {
              error: {
                code: 'OTP_RATE_LIMITED',
                message: 'Too many OTP requests from this network. Please wait and try again.',
              },
            },
            429,
          );
        }
      }

      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (intent === 'signup' && existingUser) {
        return c.json(
          {
            error: {
              code: 'EMAIL_EXISTS',
              message: 'An account already exists for this email. Please sign in instead.',
            },
          },
          409,
        );
      }

      if (!existingUser && intent === 'signin') {
        return c.json(
          {
            error: {
              code: 'ACCOUNT_NOT_FOUND',
              message: 'No account found for this email. Please sign up instead.',
            },
          },
          404,
        );
      }

      if (!existingUser && settings?.inviteOnlySignup) {
        const [acceptedInvite] = await db
          .select({ id: invitations.id })
          .from(invitations)
          .where(and(eq(invitations.email, email), eq(invitations.status, 'accepted')))
          .limit(1);
        if (!acceptedInvite) {
          return c.json(
            {
              error: {
                code: 'INVITE_ONLY',
                message: 'An invitation is required to sign up.',
              },
            },
            403,
          );
        }
      }

      const response = await auth.api.sendVerificationOTP({
        body: {
          email,
          type,
        },
        request: c.req.raw,
        headers: c.req.raw.headers,
        asResponse: true,
      });

      return response;
    } catch (error) {
      console.error('[auth] OTP send failed', error);
      const status = (error as { status?: number }).status ?? 500;
      const message = (error as { message?: string }).message ?? 'Unable to send OTP.';
      return c.json({ error: { code: 'OTP_SEND_FAILED', message } }, status as any);
    }
  });

  app.post('/auth/otp/verify', async (c) => {
    const body = otpVerifySchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Email and OTP are required.',
          },
        },
        400,
      );
    }

    try {
      const email = normalizeEmail(body.data.email);
      const intent = body.data.intent ?? 'signin';

      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (intent === 'signup' && existingUser) {
        return c.json(
          {
            error: {
              code: 'EMAIL_EXISTS',
              message: 'An account already exists for this email. Please sign in instead.',
            },
          },
          409,
        );
      }

      if (!existingUser && intent === 'signin') {
        return c.json(
          {
            error: {
              code: 'ACCOUNT_NOT_FOUND',
              message: 'No account found for this email. Please sign up instead.',
            },
          },
          404,
        );
      }

      if (!existingUser) {
        const [settings] = await db
          .select({ inviteOnlySignup: platformSettings.inviteOnlySignup })
          .from(platformSettings)
          .limit(1);
        if (settings?.inviteOnlySignup) {
          const [acceptedInvite] = await db
            .select({ id: invitations.id })
            .from(invitations)
            .where(and(eq(invitations.email, email), eq(invitations.status, 'accepted')))
            .limit(1);
          if (!acceptedInvite) {
            return c.json(
              {
                error: {
                  code: 'INVITE_ONLY',
                  message: 'An invitation is required to sign up.',
                },
              },
              403,
            );
          }
        }
      }

      const verificationWindow = otpVerificationRateLimiter.consume(`otp:verify:${email}`, {
        limit: 5,
        windowMs: 10 * 60 * 1000,
      });

      if (!verificationWindow.allowed) {
        return c.json(
          {
            error: {
              code: 'OTP_VERIFY_RATE_LIMITED',
              message: 'Too many verification attempts. Please request a new code.',
            },
          },
          429,
        );
      }

      const response = await auth.api.signInEmailOTP({
        body: {
          email,
          otp: body.data.otp,
        },
        request: c.req.raw,
        headers: c.req.raw.headers,
        asResponse: true,
      });

      if (response.ok) {
        otpVerificationRateLimiter.reset(`otp:verify:${email}`);
      }

      return response;
    } catch (error) {
      console.error('[auth] OTP verify failed', error);
      const status = (error as { status?: number }).status ?? 401;
      const message = (error as { message?: string }).message ?? 'Invalid or expired OTP.';
      return c.json({ error: { code: 'OTP_VERIFY_FAILED', message } }, status as any);
    }
  });

  app.post('/auth/logout', async (c) => {
    try {
      const response = await auth.api.signOut({
        request: c.req.raw,
        headers: c.req.raw.headers,
        asResponse: true,
      });
      return response;
    } catch (error) {
      console.error('[auth] logout failed', error);
      return c.json(
        {
          error: {
            code: 'LOGOUT_FAILED',
            message: 'Unable to sign out at the moment.',
          },
        },
        500,
      );
    }
  });

  app.get('/auth/session', async (c) => {
    try {
      const response = await auth.api.getSession({
        request: c.req.raw,
        headers: c.req.raw.headers,
        asResponse: true,
      });
      return response;
    } catch (error) {
      console.error('[auth] session lookup failed', error);
      return c.json(
        {
          error: {
            code: 'SESSION_LOOKUP_FAILED',
            message: 'Unable to fetch session.',
          },
        },
        500,
      );
    }
  });
}
