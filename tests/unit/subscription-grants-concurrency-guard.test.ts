import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const { registerSubscriptionGrantRoutes } = await import(
  '../../server/src/routes/api/subscriptionsGrants.ts'
);

describe('subscription grants concurrency guards', () => {
  it('returns ACTIVE_SUBSCRIPTION_EXISTS when create guard detects concurrent active state', async () => {
    let createCalls = 0;

    const app = new Hono();
    registerSubscriptionGrantRoutes(app, {
      requireAdmin: async () => ({
        userId: 'admin-1',
        role: 'admin',
      }),
      consumeRateLimit: () => null,
      extractJsonPayload: async () => ({
        ok: true,
        data: {
          userId: '11111111-1111-1111-1111-111111111111',
          source: 'legacy',
          reason: 'Legacy migration',
        },
      }),
      createSubscriptionGrantRecord: async () => {
        createCalls += 1;
        return {
          type: 'active_exists',
          endsAt: new Date('2027-01-01T00:00:00.000Z'),
        };
      },
      revokeSubscriptionGrantRecord: async () => ({ type: 'not_found' }),
      handleSubscriptionBulkGrant: async (c) => c.json({ success: true, grantedCount: 0 }),
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    const response = await app.request('/subscriptions/grants', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: '11111111-1111-1111-1111-111111111111',
        source: 'legacy',
        reason: 'Legacy migration',
      }),
    });

    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.error?.code, 'ACTIVE_SUBSCRIPTION_EXISTS');
    assert.match(body.error?.message ?? '', /2027-01-01T00:00:00.000Z/);
    assert.equal(createCalls, 1);
  });

  it('forwards bulk conflict responses from the bulk guard handler', async () => {
    const app = new Hono();
    registerSubscriptionGrantRoutes(app, {
      requireAdmin: async () => ({ userId: 'admin-1', role: 'admin' }),
      consumeRateLimit: () => null,
      extractJsonPayload: async () => ({ ok: true, data: {} }),
      createSubscriptionGrantRecord: async () => ({ type: 'user_not_found' }),
      revokeSubscriptionGrantRecord: async () => ({ type: 'not_found' }),
      handleSubscriptionBulkGrant: async (c) =>
        c.json(
          {
            error: {
              code: 'INVALID_CSV',
              message: 'CSV validation failed. No subscriptions were granted.',
            },
          },
          409,
        ),
    });

    const response = await app.request('/subscriptions/grants/bulk', {
      method: 'POST',
    });

    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.error?.code, 'INVALID_CSV');
  });
});
