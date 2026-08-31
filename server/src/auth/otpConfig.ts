import { randomInt, timingSafeEqual } from 'node:crypto';

export const AUTH_OTP_LENGTH = 6;
export const AUTH_TEST_FIXED_OTP = '0'.repeat(AUTH_OTP_LENGTH);

function runtimeNodeEnv(): string {
  return process.env.NODE_ENV ?? 'development';
}

/** Explicit opt-in only — never inferred from NODE_ENV=test alone. */
export function isAuthTestFixedOtpFlagEnabled(): boolean {
  return process.env.AUTH_TEST_FIXED_OTP === 'true';
}

/** Fail-closed: fixed OTP only when AUTH_TEST_FIXED_OTP=true and not production. */
export function isFixedAuthOtpEnabled(): boolean {
  if (runtimeNodeEnv() === 'production') {
    return false;
  }
  return isAuthTestFixedOtpFlagEnabled();
}

export function assertFixedAuthOtpNotEnabledInProduction(): void {
  if (runtimeNodeEnv() !== 'production') {
    return;
  }
  if (isAuthTestFixedOtpFlagEnabled()) {
    throw new Error(
      'AUTH_TEST_FIXED_OTP cannot be enabled in production. Remove it from environment configuration.',
    );
  }
}

export function generateAuthOtp(): string {
  if (isFixedAuthOtpEnabled()) {
    return AUTH_TEST_FIXED_OTP;
  }
  return randomInt(0, 10 ** AUTH_OTP_LENGTH).toString().padStart(AUTH_OTP_LENGTH, '0');
}

/** Mirrors Better Auth defaultKeyHasher (SHA-256 → base64url) for tests/documentation. */
export async function hashAuthOtpForStorage(otp: string): Promise<string> {
  const { createHash } = await import('@better-auth/utils/hash');
  const { base64Url } = await import('@better-auth/utils/base64');
  const hash = await createHash('SHA-256').digest(new TextEncoder().encode(otp));
  return base64Url.encode(new Uint8Array(hash), { padding: false });
}

/** Better Auth stores `${hash}:${attempts}` in auth_verifications.value. */
export function formatStoredOtpValue(storedHash: string, attempts = 0): string {
  return `${storedHash}:${attempts}`;
}

export function splitStoredOtpValue(storedValue: string): { hash: string; attempts: number } {
  const colon = storedValue.lastIndexOf(':');
  if (colon <= 0) {
    return { hash: storedValue, attempts: 0 };
  }
  return {
    hash: storedValue.slice(0, colon),
    attempts: Number.parseInt(storedValue.slice(colon + 1), 10) || 0,
  };
}

export async function verifySubmittedOtpAgainstStored(
  submittedOtp: string,
  storedValue: string,
): Promise<boolean> {
  const { hash } = splitStoredOtpValue(storedValue);
  const candidate = await hashAuthOtpForStorage(submittedOtp);
  if (candidate.length !== hash.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
  } catch {
    return false;
  }
}

export type SimulatedOtpVerifyResult = 'ok' | 'expired' | 'invalid' | 'replay';

/**
 * Mirrors Better Auth sign-in OTP checks (expiry + hashed compare + one-time consumption).
 * Used by unit tests; production verification remains in Better Auth routes.
 */
export async function simulateOtpVerification(input: {
  submittedOtp: string;
  storedValue: string | null;
  expiresAt: Date;
  now?: Date;
}): Promise<SimulatedOtpVerifyResult> {
  const now = input.now ?? new Date();
  if (!input.storedValue) {
    return 'replay';
  }
  if (input.expiresAt.getTime() < now.getTime()) {
    return 'expired';
  }
  const matches = await verifySubmittedOtpAgainstStored(input.submittedOtp, input.storedValue);
  if (!matches) {
    return 'invalid';
  }
  return 'ok';
}
