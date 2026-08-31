import { randomInt } from 'node:crypto';

export const AUTH_OTP_LENGTH = 6;
export const AUTH_TEST_FIXED_OTP = '0'.repeat(AUTH_OTP_LENGTH);

function runtimeNodeEnv(): string {
  return process.env.NODE_ENV ?? 'development';
}

/** Fail-closed: fixed OTP only in explicit test/dev modes, never production. */
export function isFixedAuthOtpEnabled(): boolean {
  const nodeEnv = runtimeNodeEnv();
  if (nodeEnv === 'production') {
    return false;
  }
  if (nodeEnv === 'test') {
    return true;
  }
  return process.env.AUTH_TEST_FIXED_OTP === 'true';
}

export function assertFixedAuthOtpNotEnabledInProduction(): void {
  if (runtimeNodeEnv() !== 'production') {
    return;
  }
  if (process.env.AUTH_TEST_FIXED_OTP === 'true') {
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
