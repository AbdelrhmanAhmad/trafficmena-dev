import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../../../config/env.js';
import { ecdRateLimiter } from './helpers.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const EDIT_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 8;

type OtpChallenge = {
  hash: string;
  expiresAt: number;
  attempts: number;
};

/** In-process OTP challenges for ECD portal (buyer email verify). */
const otpChallenges = new Map<string, OtpChallenge>();

function portalSecret() {
  return env.BETTER_AUTH_SECRET || 'ecd-portal-dev-secret';
}

function hashOtp(bookingId: string, otp: string) {
  return createHash('sha256').update(`${portalSecret()}:ecd-portal-otp:${bookingId}:${otp}`).digest('hex');
}

function safeEqual(a: string, b: string) {
  try {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

export function canRequestPortalOtp(bookingId: string) {
  const short = ecdRateLimiter.consume(`ecd-portal-otp:short:${bookingId}`, {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!short.allowed) {
    return { ok: false as const, code: 'OTP_RATE_LIMITED', message: 'Too many codes. Wait a few minutes.' };
  }
  const daily = ecdRateLimiter.consume(`ecd-portal-otp:daily:${bookingId}`, {
    limit: 20,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!daily.allowed) {
    return {
      ok: false as const,
      code: 'OTP_RATE_LIMITED',
      message: 'Daily OTP limit reached for this booking.',
    };
  }
  return { ok: true as const };
}

/** Create a 6-digit OTP for this booking and store its hash. */
export function issuePortalOtp(bookingId: string) {
  const otp = String(randomInt(100000, 999999));
  otpChallenges.set(bookingId, {
    hash: hashOtp(bookingId, otp),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
  return { otp, ttlMinutes: Math.ceil(OTP_TTL_MS / 60_000) };
}

export function verifyPortalOtpCode(bookingId: string, otp: string) {
  const challenge = otpChallenges.get(bookingId);
  if (!challenge) {
    return { ok: false as const, code: 'OTP_EXPIRED', message: 'Request a new code.' };
  }
  if (Date.now() > challenge.expiresAt) {
    otpChallenges.delete(bookingId);
    return { ok: false as const, code: 'OTP_EXPIRED', message: 'Code expired. Request a new one.' };
  }
  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    otpChallenges.delete(bookingId);
    return {
      ok: false as const,
      code: 'OTP_VERIFY_RATE_LIMITED',
      message: 'Too many incorrect attempts. Request a new code.',
    };
  }
  challenge.attempts += 1;
  const candidate = hashOtp(bookingId, otp.trim());
  if (!safeEqual(candidate, challenge.hash)) {
    return { ok: false as const, code: 'OTP_INVALID', message: 'Invalid or expired code.' };
  }
  otpChallenges.delete(bookingId);
  return { ok: true as const };
}

/** Short-lived HMAC edit token after OTP (no Better Auth session required). */
export function makePortalEditToken(bookingId: string) {
  const exp = Date.now() + EDIT_TTL_MS;
  const payload = `${bookingId}.${exp}`;
  const sig = createHmac('sha256', portalSecret())
    .update(`ecd-portal-edit:${payload}`)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyPortalEditToken(token: string | undefined, bookingId: string) {
  if (!token || !bookingId) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [id, expStr, sig] = parts;
  if (id !== bookingId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const payload = `${id}.${expStr}`;
  const expected = createHmac('sha256', portalSecret())
    .update(`ecd-portal-edit:${payload}`)
    .digest('base64url');
  if (expected.length !== sig.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

export function getBearerRaw(c: { req: { header: (name: string) => string | undefined } }) {
  const header = c.req.header('authorization') || c.req.header('Authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m?.[1]?.trim() || '';
}
