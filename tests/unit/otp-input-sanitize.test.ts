import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { completeSignInVerification, sanitizeOtp } from '../../src/app/auth/signIn.ts';

describe('sanitizeOtp', () => {
  it('strips spaces from a spaced code (the reported "4 4 5 4 6 3" case)', () => {
    assert.equal(sanitizeOtp('4 4 5 4 6 3'), '445463');
  });

  it('strips symbols and edge whitespace', () => {
    assert.equal(sanitizeOtp(' 12-34 56 '), '123456');
  });

  it('passes a clean code through unchanged', () => {
    assert.equal(sanitizeOtp('123456'), '123456');
  });

  it('caps at 6 digits', () => {
    assert.equal(sanitizeOtp('1234567'), '123456');
  });

  it('handles empty input', () => {
    assert.equal(sanitizeOtp(''), '');
  });
});

describe('completeSignInVerification sanitizes the code before verifying', () => {
  it('passes a digits-only code to verifyOtp even when the user entered spaces', async () => {
    let receivedOtp: string | null = null;
    await completeSignInVerification({
      email: 'User@Example.com',
      otp: '4 4 5 4 6 3',
      verifyOtp: async ({ otp }) => {
        receivedOtp = otp;
        return { id: 'u1' };
      },
      refreshSession: async () => ({ id: 'u1' }),
    });
    assert.equal(receivedOtp, '445463');
  });
});
