import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const { isDeliveryRetryable } = await import(
  '../../server/src/services/notifications/worker.ts'
);

describe('notification delivery retry rules', () => {
  it('failed → retryable', () => {
    assert.equal(isDeliveryRetryable('failed'), true);
    assert.equal(isDeliveryRetryable('failed', null), true);
  });

  it('sent → not retryable', () => {
    assert.equal(isDeliveryRetryable('sent'), false);
  });

  it('skipped + provider_not_configured → retryable', () => {
    assert.equal(isDeliveryRetryable('skipped', 'provider_not_configured'), true);
  });

  it('skipped + missing_or_invalid_email → not retryable', () => {
    assert.equal(isDeliveryRetryable('skipped', 'missing_or_invalid_email'), false);
  });

  it('skipped + missing_or_invalid_phone → not retryable', () => {
    assert.equal(isDeliveryRetryable('skipped', 'missing_or_invalid_phone'), false);
  });

  it('pending/processing → not retryable', () => {
    assert.equal(isDeliveryRetryable('pending'), false);
    assert.equal(isDeliveryRetryable('processing'), false);
  });
});
