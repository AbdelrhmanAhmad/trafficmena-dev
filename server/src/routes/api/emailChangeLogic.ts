import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const EMAIL_CHANGE_OTP_TTL_MINUTES = 10;
export const EMAIL_CHANGE_OTP_TTL_MS = EMAIL_CHANGE_OTP_TTL_MINUTES * 60 * 1000;

// 6-digit numeric OTP, zero-padded.
export function generateEmailChangeOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

// Deterministic HMAC of the OTP, bound to the user + destination email so a stored hash can't be
// replayed against a different request. Keyed on the server secret; the OTP is never stored raw.
export function hashEmailChangeOtp(
  secret: string,
  userId: string,
  newEmail: string,
  otp: string,
): string {
  return createHmac('sha256', secret)
    .update(`${userId}:${newEmail.toLowerCase()}:${otp}`)
    .digest('hex');
}

export function hashEmailChangeCurrentOtp(
  secret: string,
  userId: string,
  currentEmail: string,
  otp: string,
): string {
  return createHmac('sha256', secret)
    .update(`${userId}:current:${currentEmail.toLowerCase()}:${otp}`)
    .digest('hex');
}

// Constant-time comparison of two hex-encoded hashes (length-checked first to avoid throwing).
export function safeCompareHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length === 0 || a.length !== b.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

// Mask an email for the out-of-band notice to the old address (never reveal the full new address):
// "alice@example.com" -> "a****@example.com".
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local[0]}${'*'.repeat(Math.max(2, local.length - 1))}@${domain}`;
}
