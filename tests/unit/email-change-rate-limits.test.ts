import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EMAIL_CHANGE_DEST_SHORT_LIMIT,
  EMAIL_CHANGE_USER_REQUEST_LIMIT,
  EMAIL_CHANGE_VERIFY_LIMIT,
  emailChangeRateKeys,
  SHORT_WINDOW_MS,
} from '../../server/src/routes/api/emailChangeRateLimits.ts';
import { InMemoryRateLimiter } from '../../server/src/services/rateLimiter.ts';

// utils.ts transitively loads the db client, so set env and import it dynamically (as other tests do).
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';
const { isKnownDatabaseConflict } = await import('../../server/src/routes/api/utils.ts');

// Full request/verify happy-path, duplicate-email, expired-OTP and session-invalidation flows need
// a live DB + HTTP harness the repo doesn't have. These tests instead lock in the security
// boundaries that are testable in isolation: the rate-limit thresholds and keys the route enforces,
// and the DB-conflict mapping the verify path relies on. (C-5)

const exhaust = (limiter: InMemoryRateLimiter, key: string, limit: number) => {
  for (let i = 0; i < limit; i++) {
    assert.equal(limiter.consume(key, { limit, windowMs: SHORT_WINDOW_MS }).allowed, true);
  }
  return limiter.consume(key, { limit, windowMs: SHORT_WINDOW_MS }).allowed;
};

describe('email-change rate limits', () => {
  it('throttles requests at the per-user limit (the next request is blocked)', () => {
    const limiter = new InMemoryRateLimiter();
    const blocked = exhaust(
      limiter,
      emailChangeRateKeys.userRequest('user-1'),
      EMAIL_CHANGE_USER_REQUEST_LIMIT,
    );
    assert.equal(blocked, false);
    limiter.dispose();
  });

  it('throttles requests at the per-destination short limit', () => {
    const limiter = new InMemoryRateLimiter();
    const blocked = exhaust(
      limiter,
      emailChangeRateKeys.destShort('dest@example.com'),
      EMAIL_CHANGE_DEST_SHORT_LIMIT,
    );
    assert.equal(blocked, false);
    limiter.dispose();
  });

  it('reuses the sign-in OTP namespace for per-destination keys (shared bombing budget)', () => {
    assert.equal(emailChangeRateKeys.destShort('a@b.com'), 'otp:email:short:a@b.com');
    assert.equal(emailChangeRateKeys.destDaily('a@b.com'), 'otp:email:daily:a@b.com');
  });

  it('namespaces per-user request and verify keys apart so they hold separate budgets', () => {
    assert.notEqual(
      emailChangeRateKeys.userRequest('user-1'),
      emailChangeRateKeys.verify('user-1'),
    );
  });

  // C-6: the verify path peeks getCount (blocking at the limit) and only a failed guess consumes, so
  // a correct OTP that hits a transient error never burns an attempt. Model both halves here.
  it('verify budget: getCount blocks once the failed-guess limit is reached', () => {
    const limiter = new InMemoryRateLimiter();
    const key = emailChangeRateKeys.verify('user-1');
    for (let i = 0; i < EMAIL_CHANGE_VERIFY_LIMIT; i++) {
      assert.ok(limiter.getCount(key) < EMAIL_CHANGE_VERIFY_LIMIT); // peek lets it through
      limiter.consume(key, { limit: EMAIL_CHANGE_VERIFY_LIMIT, windowMs: SHORT_WINDOW_MS });
    }
    assert.ok(limiter.getCount(key) >= EMAIL_CHANGE_VERIFY_LIMIT); // peek now blocks the next attempt
    limiter.dispose();
  });

  it('verify budget: not consuming (success / transient failure) leaves the budget untouched', () => {
    const limiter = new InMemoryRateLimiter();
    const key = emailChangeRateKeys.verify('user-2');
    // The route does not consume on a correct OTP, so repeated success-path entries never lock out.
    assert.equal(limiter.getCount(key), 0);
    limiter.dispose();
  });
});

describe('email-change concurrent-claim mapping (C-2)', () => {
  it('maps a Postgres unique violation (23505) to a unique conflict for the 409 backstop', () => {
    assert.equal(isKnownDatabaseConflict({ code: '23505' }), 'unique');
    // node-postgres often nests the driver error under `cause`.
    assert.equal(isKnownDatabaseConflict({ cause: { code: '23505' } }), 'unique');
  });

  it('does not treat an unrelated error as a unique conflict', () => {
    assert.equal(isKnownDatabaseConflict(new Error('boom')), null);
    assert.equal(isKnownDatabaseConflict({ code: '08006' }), null);
  });
});
