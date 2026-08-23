import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ApiError } from '../../src/app/api/client.ts';
import { shouldRetryPricePreview } from '../../src/app/api/pricePreviewRetry.ts';

// Reproduces the 2026-07-03 retry storm: the preview endpoint throws deterministic 4xx codes that a
// retry can never resolve, yet the global `retry: 3` default amplified each into 4 identical failing
// requests. The predicate must suppress retries for the whole 4xx class while leaving transient
// (5xx / network) resilience intact.
describe('price preview retry predicate', () => {
  it('never retries deterministic 4xx, at any failure count (whole class, not a code list)', () => {
    for (const status of [400, 401, 404, 409, 422, 429]) {
      const error = new ApiError('rejected', status, 'TICKET_TYPE_REQUIRED');
      assert.equal(shouldRetryPricePreview(0, error), false);
      assert.equal(shouldRetryPricePreview(2, error), false);
    }
  });

  it('retries 5xx below the cap and stops at the cap', () => {
    const error = new ApiError('boom', 500, 'INTERNAL');
    assert.equal(shouldRetryPricePreview(0, error), true);
    assert.equal(shouldRetryPricePreview(2, error), true);
    assert.equal(shouldRetryPricePreview(3, error), false);
  });

  it('retries network errors (no status) below the cap — fail open to transient bias', () => {
    const error = new TypeError('Failed to fetch');
    assert.equal(shouldRetryPricePreview(0, error), true);
    assert.equal(shouldRetryPricePreview(3, error), false);
  });

  it('retries non-ApiError objects below the cap', () => {
    assert.equal(shouldRetryPricePreview(0, { message: 'weird' }), true);
    assert.equal(shouldRetryPricePreview(3, { message: 'weird' }), false);
  });
});
