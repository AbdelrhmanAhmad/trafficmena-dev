/** Backend signals Turnstile via error.extra or known codes (W1 contract). */
export function isTurnstileRequiredApiError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string; extra?: Record<string, unknown> };
  if (candidate.extra?.requiresTurnstile === true) {
    return true;
  }

  return candidate.code === 'TURNSTILE_REQUIRED' || candidate.code === 'TURNSTILE_FAILED';
}

/** Pure gate: after TURNSTILE_REQUIRED, auto-retry once token is verified and idle. */
export function shouldAutoRetryTurnstileOtpRequest(input: {
  awaitingAutoRetry: boolean;
  showTurnstile: boolean;
  isVerified: boolean;
  hasToken: boolean;
  isSubmitting: boolean;
}): boolean {
  return (
    input.awaitingAutoRetry &&
    input.showTurnstile &&
    input.isVerified &&
    input.hasToken &&
    !input.isSubmitting
  );
}
