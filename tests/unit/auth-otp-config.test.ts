import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AUTH_TEST_FIXED_OTP,
  assertFixedAuthOtpNotEnabledInProduction,
  formatStoredOtpValue,
  generateAuthOtp,
  hashAuthOtpForStorage,
  isAuthTestFixedOtpFlagEnabled,
  isFixedAuthOtpEnabled,
  simulateOtpVerification,
} from '../../server/src/auth/otpConfig.ts';

function withEnv(
  overrides: Record<string, string | undefined>,
  run: () => void | Promise<void>,
): Promise<void> | void {
  const snapshot = {
    NODE_ENV: process.env.NODE_ENV,
    AUTH_TEST_FIXED_OTP: process.env.AUTH_TEST_FIXED_OTP,
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('auth OTP config — explicit opt-in only', () => {
  it('NODE_ENV=test alone does not enable fixed OTP', () => {
    withEnv({ NODE_ENV: 'test', AUTH_TEST_FIXED_OTP: undefined }, () => {
      assert.equal(isAuthTestFixedOtpFlagEnabled(), false);
      assert.equal(isFixedAuthOtpEnabled(), false);
      const samples = new Set<string>();
      for (let i = 0; i < 20; i++) {
        samples.add(generateAuthOtp());
      }
      assert.ok(samples.size > 1, 'NODE_ENV=test without flag should still produce random OTP');
      assert.equal(samples.has(AUTH_TEST_FIXED_OTP), false);
    });
  });

  it('NODE_ENV=development without flag uses random OTP', () => {
    withEnv({ NODE_ENV: 'development', AUTH_TEST_FIXED_OTP: undefined }, () => {
      assert.equal(isFixedAuthOtpEnabled(), false);
      const samples = new Set<string>();
      for (let i = 0; i < 20; i++) {
        samples.add(generateAuthOtp());
      }
      assert.ok(samples.size > 1);
    });
  });

  it('fixed OTP requires AUTH_TEST_FIXED_OTP=true explicitly', () => {
    withEnv({ NODE_ENV: 'test', AUTH_TEST_FIXED_OTP: 'true' }, () => {
      assert.equal(isAuthTestFixedOtpFlagEnabled(), true);
      assert.equal(isFixedAuthOtpEnabled(), true);
      assert.equal(generateAuthOtp(), AUTH_TEST_FIXED_OTP);
    });
  });

  it('development with explicit flag uses fixed OTP', () => {
    withEnv({ NODE_ENV: 'development', AUTH_TEST_FIXED_OTP: 'true' }, () => {
      assert.equal(generateAuthOtp(), AUTH_TEST_FIXED_OTP);
    });
  });

  it('production without flag uses random OTP and never enables fixed mode', () => {
    withEnv({ NODE_ENV: 'production', AUTH_TEST_FIXED_OTP: undefined }, () => {
      assert.equal(isFixedAuthOtpEnabled(), false);
      const samples = new Set<string>();
      for (let i = 0; i < 20; i++) {
        samples.add(generateAuthOtp());
      }
      assert.ok(samples.size > 1);
      assert.equal(samples.has(AUTH_TEST_FIXED_OTP), false);
    });
  });

  it('production with AUTH_TEST_FIXED_OTP=true rejects startup guard', () => {
    withEnv({ NODE_ENV: 'production', AUTH_TEST_FIXED_OTP: 'true' }, () => {
      assert.equal(isFixedAuthOtpEnabled(), false);
      assert.throws(
        () => assertFixedAuthOtpNotEnabledInProduction(),
        /AUTH_TEST_FIXED_OTP cannot be enabled in production/,
      );
    });
  });

  it('staging-like NODE_ENV=test with flag unset stays random (regression for VPS misconfig)', () => {
    withEnv({ NODE_ENV: 'test', AUTH_TEST_FIXED_OTP: 'false' }, () => {
      assert.equal(isFixedAuthOtpEnabled(), false);
      assert.notEqual(generateAuthOtp(), AUTH_TEST_FIXED_OTP);
    });
  });
});

describe('Better Auth OTP hashing contract', () => {
  it('hashed storage must not equal plaintext OTP', async () => {
    const otp = '123456';
    const stored = await hashAuthOtpForStorage(otp);
    assert.notEqual(stored, otp);
    assert.ok(stored.length > otp.length);
  });

  it('explicit fixed OTP is still hashed before storage', async () => {
    withEnv({ NODE_ENV: 'development', AUTH_TEST_FIXED_OTP: 'true' }, async () => {
      const otp = generateAuthOtp();
      assert.equal(otp, AUTH_TEST_FIXED_OTP);
      const stored = await hashAuthOtpForStorage(otp);
      assert.notEqual(stored, AUTH_TEST_FIXED_OTP);
    });
  });

  it('wrong OTP fails hashed verification', async () => {
    withEnv({ NODE_ENV: 'development', AUTH_TEST_FIXED_OTP: 'true' }, async () => {
      const otp = generateAuthOtp();
      const storedHash = await hashAuthOtpForStorage(otp);
      const storedValue = formatStoredOtpValue(storedHash);
      const result = await simulateOtpVerification({
        submittedOtp: '999999',
        storedValue,
        expiresAt: new Date(Date.now() + 60_000),
      });
      assert.equal(result, 'invalid');
    });
  });

  it('expired OTP fails before hash compare', async () => {
    withEnv({ NODE_ENV: 'development', AUTH_TEST_FIXED_OTP: 'true' }, async () => {
      const otp = generateAuthOtp();
      const storedHash = await hashAuthOtpForStorage(otp);
      const storedValue = formatStoredOtpValue(storedHash);
      const result = await simulateOtpVerification({
        submittedOtp: otp,
        storedValue,
        expiresAt: new Date(Date.now() - 1_000),
        now: new Date(),
      });
      assert.equal(result, 'expired');
    });
  });

  it('replay fails when verification record is already consumed (null stored value)', async () => {
    withEnv({ NODE_ENV: 'development', AUTH_TEST_FIXED_OTP: 'true' }, async () => {
      const otp = generateAuthOtp();
      const result = await simulateOtpVerification({
        submittedOtp: otp,
        storedValue: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      assert.equal(result, 'replay');
    });
  });

  it('correct explicit fixed OTP passes hashed verification', async () => {
    withEnv({ NODE_ENV: 'development', AUTH_TEST_FIXED_OTP: 'true' }, async () => {
      const otp = generateAuthOtp();
      const storedHash = await hashAuthOtpForStorage(otp);
      const storedValue = formatStoredOtpValue(storedHash);
      const result = await simulateOtpVerification({
        submittedOtp: otp,
        storedValue,
        expiresAt: new Date(Date.now() + 60_000),
      });
      assert.equal(result, 'ok');
    });
  });
});
