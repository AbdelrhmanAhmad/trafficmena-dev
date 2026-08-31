import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AUTH_TEST_FIXED_OTP,
  assertFixedAuthOtpNotEnabledInProduction,
  generateAuthOtp,
  hashAuthOtpForStorage,
  isFixedAuthOtpEnabled,
} from '../../server/src/auth/otpConfig.ts';

describe('auth OTP config', () => {
  it('uses fixed OTP in NODE_ENV=test', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalFlag = process.env.AUTH_TEST_FIXED_OTP;
    process.env.NODE_ENV = 'test';
    delete process.env.AUTH_TEST_FIXED_OTP;

    try {
      assert.equal(isFixedAuthOtpEnabled(), true);
      assert.equal(generateAuthOtp(), AUTH_TEST_FIXED_OTP);
      assert.match(AUTH_TEST_FIXED_OTP, /^\d{6}$/);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalFlag === undefined) delete process.env.AUTH_TEST_FIXED_OTP;
      else process.env.AUTH_TEST_FIXED_OTP = originalFlag;
    }
  });

  it('never enables fixed OTP when NODE_ENV=production', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalFlag = process.env.AUTH_TEST_FIXED_OTP;
    process.env.NODE_ENV = 'production';
    process.env.AUTH_TEST_FIXED_OTP = 'true';

    try {
      assert.equal(isFixedAuthOtpEnabled(), false);
      const samples = new Set<string>();
      for (let i = 0; i < 20; i++) {
        samples.add(generateAuthOtp());
      }
      assert.ok(samples.size > 1, 'production OTP should vary across samples');
      assert.equal(samples.has(AUTH_TEST_FIXED_OTP), false);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalFlag === undefined) delete process.env.AUTH_TEST_FIXED_OTP;
      else process.env.AUTH_TEST_FIXED_OTP = originalFlag;
    }
  });

  it('throws on production boot when AUTH_TEST_FIXED_OTP is explicitly true', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalFlag = process.env.AUTH_TEST_FIXED_OTP;
    process.env.NODE_ENV = 'production';
    process.env.AUTH_TEST_FIXED_OTP = 'true';

    try {
      assert.throws(
        () => assertFixedAuthOtpNotEnabledInProduction(),
        /AUTH_TEST_FIXED_OTP cannot be enabled in production/,
      );
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalFlag === undefined) delete process.env.AUTH_TEST_FIXED_OTP;
      else process.env.AUTH_TEST_FIXED_OTP = originalFlag;
    }
  });
});

describe('Better Auth OTP hashing contract', () => {
  it('hashed storage must not equal plaintext OTP', async () => {
    const otp = '123456';
    const stored = await hashAuthOtpForStorage(otp);
    assert.notEqual(stored, otp);
    assert.ok(stored.length > otp.length);
  });

  it('fixed test OTP is still hashed before storage', async () => {
    const stored = await hashAuthOtpForStorage(AUTH_TEST_FIXED_OTP);
    assert.notEqual(stored, AUTH_TEST_FIXED_OTP);
  });
});
