import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const { buildIdempotencyKey } = await import(
  '../../server/src/services/notifications/deliveries.ts'
);

describe('notification idempotency key', () => {
  it('is stable for the same inputs', () => {
    const a = buildIdempotencyKey('event.registered', 'event', 'evt-1', 'user-1', 'email');
    const b = buildIdempotencyKey('event.registered', 'event', 'evt-1', 'user-1', 'email');
    assert.equal(a, b);
  });

  it('differs when channel differs', () => {
    const email = buildIdempotencyKey('event.registered', 'event', 'evt-1', 'user-1', 'email');
    const wa = buildIdempotencyKey('event.registered', 'event', 'evt-1', 'user-1', 'whatsapp');
    assert.notEqual(email, wa);
  });

  it('differs when user differs', () => {
    const a = buildIdempotencyKey('payment.paid', 'payment', 'pay-1', 'user-a', 'email');
    const b = buildIdempotencyKey('payment.paid', 'payment', 'pay-1', 'user-b', 'email');
    assert.notEqual(a, b);
  });

  it('differs when entityId differs', () => {
    const a = buildIdempotencyKey('certificate.issued', 'certificate', 'c1', 'user-1', 'email');
    const b = buildIdempotencyKey('certificate.issued', 'certificate', 'c2', 'user-1', 'email');
    assert.notEqual(a, b);
  });

  it('treats null entity fields as empty segments without colliding channels', () => {
    const email = buildIdempotencyKey('announcement.send', null, null, 'user-1', 'email');
    const wa = buildIdempotencyKey('announcement.send', null, null, 'user-1', 'whatsapp');
    // eventType : entityType('') : entityId('') : userId : channel
    assert.equal(email, 'announcement.send:::user-1:email');
    assert.notEqual(email, wa);
  });
});
