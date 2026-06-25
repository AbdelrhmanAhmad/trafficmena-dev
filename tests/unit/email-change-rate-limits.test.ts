import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

  it('verify budget: consume is the atomic boundary for the sixth attempt', () => {
    const limiter = new InMemoryRateLimiter();
    const key = emailChangeRateKeys.verify('user-1');
    for (let i = 0; i < EMAIL_CHANGE_VERIFY_LIMIT; i++) {
      assert.equal(
        limiter.consume(key, { limit: EMAIL_CHANGE_VERIFY_LIMIT, windowMs: SHORT_WINDOW_MS })
          .allowed,
        true,
      );
    }
    assert.equal(
      limiter.consume(key, { limit: EMAIL_CHANGE_VERIFY_LIMIT, windowMs: SHORT_WINDOW_MS }).allowed,
      false,
    );
    limiter.dispose();
  });

  it('verify budget: a correct-code transient failure can refund its consumed slot', () => {
    const limiter = new InMemoryRateLimiter();
    const key = emailChangeRateKeys.verify('user-2');
    assert.equal(
      limiter.consume(key, { limit: EMAIL_CHANGE_VERIFY_LIMIT, windowMs: SHORT_WINDOW_MS }).allowed,
      true,
    );
    limiter.decrement(key);
    assert.equal(limiter.getCount(key), 0);
    limiter.dispose();
  });

  it('verify route consumes before loading the pending request', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/emailChange.ts', import.meta.url),
      'utf8',
    );
    const verifyRoute = source.indexOf("app.post('/auth/email-change/verify'");
    const consumeCall = source.indexOf('otpVerificationRateLimiter.consume(verifyKey', verifyRoute);
    const requestLookup = source.indexOf('.from(emailChangeRequests)', verifyRoute);

    assert.ok(verifyRoute >= 0);
    assert.ok(consumeCall > verifyRoute);
    assert.ok(requestLookup > consumeCall);
    assert.equal(source.slice(verifyRoute, requestLookup).includes('getCount(verifyKey)'), false);
  });

  it('request route deletes the pending request if OTP delivery fails', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/emailChange.ts', import.meta.url),
      'utf8',
    );
    const requestRoute = source.indexOf("app.post('/auth/email-change/request'");
    const sendOtp = source.indexOf('await sendOtpEmail', requestRoute);
    const cleanup = source.indexOf('.delete(emailChangeRequests)', sendOtp);

    assert.ok(requestRoute >= 0);
    assert.ok(sendOtp > requestRoute);
    assert.ok(cleanup > sendOtp);
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
