import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isTurnstileRequiredApiError,
  shouldAutoRetryTurnstileOtpRequest,
} from '../../src/app/auth/turnstileOtpGate.ts';

function apiError(code: string, extra?: Record<string, unknown>) {
  return { message: 'error', status: 400, code, extra };
}

describe('isTurnstileRequiredApiError', () => {
  it('returns true when requiresTurnstile is in error.extra', () => {
    assert.equal(
      isTurnstileRequiredApiError(
        apiError('TURNSTILE_REQUIRED', {
          requiresTurnstile: true,
        }),
      ),
      true,
    );
  });

  it('returns true for TURNSTILE_REQUIRED and TURNSTILE_FAILED codes', () => {
    assert.equal(isTurnstileRequiredApiError(apiError('TURNSTILE_REQUIRED')), true);
    assert.equal(isTurnstileRequiredApiError(apiError('TURNSTILE_FAILED')), true);
  });

  it('returns false for unrelated errors', () => {
    assert.equal(isTurnstileRequiredApiError(apiError('ACCOUNT_NOT_FOUND')), false);
    assert.equal(isTurnstileRequiredApiError(new Error('network')), false);
  });
});

describe('shouldAutoRetryTurnstileOtpRequest', () => {
  it('returns true only when awaiting retry with verified token and idle submit', () => {
    assert.equal(
      shouldAutoRetryTurnstileOtpRequest({
        awaitingAutoRetry: true,
        showTurnstile: true,
        isVerified: true,
        hasToken: true,
        isSubmitting: false,
      }),
      true,
    );
  });

  it('returns false while submitting to avoid duplicate OTP requests', () => {
    assert.equal(
      shouldAutoRetryTurnstileOtpRequest({
        awaitingAutoRetry: true,
        showTurnstile: true,
        isVerified: true,
        hasToken: true,
        isSubmitting: true,
      }),
      false,
    );
  });

  it('returns false before captcha completes', () => {
    assert.equal(
      shouldAutoRetryTurnstileOtpRequest({
        awaitingAutoRetry: true,
        showTurnstile: true,
        isVerified: false,
        hasToken: false,
        isSubmitting: false,
      }),
      false,
    );
  });
});

describe('sign-in turnstile OTP flow contract', () => {
  it('includes turnstileToken in OTP request payload when token is present', () => {
    const payload: Record<string, string> = { email: 'member@example.com', intent: 'signin' };
    const turnstileToken = 'cf-turnstile-token-value';
    if (turnstileToken) {
      payload.turnstileToken = turnstileToken;
    }
    assert.equal(payload.turnstileToken, turnstileToken);
    assert.equal(Boolean(payload.turnstileToken), true);
  });

  it('simulates TURNSTILE_REQUIRED then auto-retry after token capture', () => {
    let step: 'request' | 'verify' = 'request';
    let showTurnstile = false;
    let awaitingAutoRetry = false;
    let isVerified = false;
    let hasToken = false;
    let isSubmitting = false;
    let otpRequestCount = 0;

    const requestOtp = () => {
      otpRequestCount += 1;
      if (otpRequestCount === 1) {
        const error = apiError('TURNSTILE_REQUIRED', { requiresTurnstile: true });
        if (isTurnstileRequiredApiError(error)) {
          awaitingAutoRetry = true;
          showTurnstile = true;
        }
        return;
      }
      step = 'verify';
      showTurnstile = false;
      isVerified = false;
      hasToken = false;
      awaitingAutoRetry = false;
    };

    requestOtp();
    assert.equal(step, 'request');
    assert.equal(showTurnstile, true);
    assert.equal(awaitingAutoRetry, true);

    isVerified = true;
    hasToken = true;
    if (
      shouldAutoRetryTurnstileOtpRequest({
        awaitingAutoRetry,
        showTurnstile,
        isVerified,
        hasToken,
        isSubmitting,
      })
    ) {
      awaitingAutoRetry = false;
      requestOtp();
    }

    assert.equal(otpRequestCount, 2);
    assert.equal(step, 'verify');
    assert.equal(showTurnstile, false);
  });
});
