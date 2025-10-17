import type { Hono } from 'hono';
import { z } from 'zod';
import { auth } from '../../auth.js';
import { otpRateLimiter } from '../../services/rateLimiter.js';
import { getRequestIp, normalizeEmail } from './utils.js';

const OTP_SHORT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const OTP_SHORT_LIMIT = 3;
const OTP_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const OTP_DAILY_LIMIT = 10;
const OTP_IP_WINDOW_MS = 10 * 60 * 1000;
const OTP_IP_LIMIT = 8;

const otpRequestSchema = z.object({
  email: z.string().email(),
  type: z.enum(['sign-in', 'email-verification', 'forget-password']).optional(),
});

const otpVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(8),
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
      const clientIp = getRequestIp(c);

      const shortWindow = otpRateLimiter.consume(`otp:email:short:${email}`, {
        limit: OTP_SHORT_LIMIT,
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
        limit: OTP_DAILY_LIMIT,
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

      if (clientIp !== 'unknown') {
        const ipWindow = otpRateLimiter.consume(`otp:ip:${clientIp}`, {
          limit: OTP_IP_LIMIT,
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

      const response = await auth.api.signInEmailOTP({
        body: {
          email,
          otp: body.data.otp,
        },
        request: c.req.raw,
        headers: c.req.raw.headers,
        asResponse: true,
      });

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
