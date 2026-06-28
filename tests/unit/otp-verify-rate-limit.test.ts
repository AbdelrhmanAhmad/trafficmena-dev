import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import {
  OTP_VERIFY_LIMIT,
  OTP_VERIFY_WINDOW_MS,
  otpVerifyKey,
} from '../../server/src/routes/api/otpRateLimits.ts';
import { InMemoryRateLimiter } from '../../server/src/services/rateLimiter.ts';

const readSource = (rel: string) => readFile(new URL(rel, import.meta.url), 'utf8');

describe('OTP verify limiter mechanics', () => {
  it('allows OTP_VERIFY_LIMIT attempts then blocks the next', () => {
    const limiter = new InMemoryRateLimiter();
    const key = otpVerifyKey('user@example.com');
    const rule = { limit: OTP_VERIFY_LIMIT, windowMs: OTP_VERIFY_WINDOW_MS };
    for (let i = 0; i < OTP_VERIFY_LIMIT; i++) {
      assert.equal(limiter.consume(key, rule).allowed, true);
    }
    assert.equal(limiter.consume(key, rule).allowed, false);
    limiter.dispose();
  });

  // The core of the fix: requesting a new code resets the verify budget. Without reset-on-resend,
  // a locked user stays locked for the whole window even with a valid fresh code in hand.
  it('reset() after a block restores the full budget (models resend recovery)', () => {
    const limiter = new InMemoryRateLimiter();
    const key = otpVerifyKey('user@example.com');
    const rule = { limit: OTP_VERIFY_LIMIT, windowMs: OTP_VERIFY_WINDOW_MS };
    for (let i = 0; i < OTP_VERIFY_LIMIT; i++) {
      limiter.consume(key, rule);
    }
    assert.equal(limiter.consume(key, rule).allowed, false); // locked out
    limiter.reset(key);
    assert.equal(limiter.consume(key, rule).allowed, true); // fresh budget after a new code is sent
    limiter.dispose();
  });

  it('keeps the limit generous-but-safe (10)', () => {
    assert.equal(OTP_VERIFY_LIMIT, 10);
  });
});

describe('OTP verify limiter wiring (source assertions)', () => {
  it('request handler resets the verify budget on the send success path', async () => {
    const src = await readSource('../../server/src/routes/api/auth.ts');
    const requestRoute = src.indexOf("app.post('/auth/otp/request'");
    const verifyRoute = src.indexOf("app.post('/auth/otp/verify'");
    const sendOtp = src.indexOf('sendVerificationOTP', requestRoute);
    const reset = src.indexOf('otpVerificationRateLimiter.reset(otpVerifyKey', requestRoute);

    assert.ok(requestRoute >= 0 && verifyRoute > requestRoute);
    assert.ok(sendOtp > requestRoute && sendOtp < verifyRoute, 'sends OTP in the request handler');
    assert.ok(
      reset > sendOtp && reset < verifyRoute,
      'resets verify budget after send, before verify route',
    );
  });

  it('verify handler consumes the limiter via the shared key + named constant', async () => {
    const src = await readSource('../../server/src/routes/api/auth.ts');
    assert.ok(src.includes('otpVerificationRateLimiter.consume(otpVerifyKey'));
    assert.ok(src.includes('limit: OTP_VERIFY_LIMIT'));
  });

  it('Better Auth emailOTP sets allowedAttempts so one code is not killed after 3 tries', async () => {
    const src = await readSource('../../server/src/auth.ts');
    assert.match(src, /allowedAttempts:\s*10/);
  });

  it('lockout message still points the user to the (now-working) recovery', async () => {
    const src = await readSource('../../server/src/routes/api/auth.ts');
    const block = src.indexOf('OTP_VERIFY_RATE_LIMITED');
    assert.ok(block >= 0);
    assert.match(src.slice(block, block + 200), /request a new code/i);
  });
});
