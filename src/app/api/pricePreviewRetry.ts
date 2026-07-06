import { ApiError } from './client';

// TanStack calls retry(failureCount, error) with failureCount 0-indexed at decision time, so this
// mirrors the numeric `retry: 3` default (`failureCount < 3`) for transient errors — but never
// retries a deterministic 4xx. The preview endpoint throws ~nine 4xx codes (TICKET_TYPE_REQUIRED,
// ALREADY_BOOKED, INDIVIDUAL_BOOKING_DISABLED, …); a retry can't resolve any of them, so each was
// amplifying into 4 identical failing requests. Suppress by status class, not a code list, so new
// 4xx codes are covered automatically.
export const PRICE_PREVIEW_RETRY_CAP = 3;

export function shouldRetryPricePreview(
  failureCount: number,
  error: unknown,
  maxRetries = PRICE_PREVIEW_RETRY_CAP,
): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < maxRetries;
}
