import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const { registerSubscriptionGrantRoutes } = await import(
  '../../server/src/routes/api/subscriptionsGrants.ts'
);

describe('subscription grants RBAC', () => {
  it('rejects non-admin requests before invoking grant handlers', async () => {
    let rateLimitCalls = 0;
    let createCalls = 0;
    let revokeCalls = 0;
    let bulkCalls = 0;

    const app = new Hono();
    registerSubscriptionGrantRoutes(app, {
      requireAdmin: async (c) => ({
        response: c.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required.',
            },
          },
          401,
        ),
      }),
      consumeRateLimit: () => {
        rateLimitCalls += 1;
        return null;
      },
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
          type: 'created',
          subscription: {
            id: 'sub-1',
            userId: '11111111-1111-1111-1111-111111111111',
            status: 'active',
            startsAt: new Date('2026-01-01T00:00:00.000Z'),
            endsAt: new Date('2027-01-01T00:00:00.000Z'),
            source: 'legacy',
          },
        };
      },
      revokeSubscriptionGrantRecord: async () => {
        revokeCalls += 1;
        return { type: 'revoked', id: 'sub-1' };
      },
      handleSubscriptionBulkGrant: async (c) => {
        bulkCalls += 1;
        return c.json({ success: true, grantedCount: 1 });
      },
    });

    const createResponse = await app.request('/subscriptions/grants', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: '11111111-1111-1111-1111-111111111111',
        source: 'legacy',
        reason: 'Legacy migration',
      }),
    });
    const revokeResponse = await app.request('/subscriptions/grants/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: '11111111-1111-1111-1111-111111111111',
        reason: 'Cleanup',
      }),
    });
    const bulkResponse = await app.request('/subscriptions/grants/bulk', {
      method: 'POST',
    });

    assert.equal(createResponse.status, 401);
    assert.equal(revokeResponse.status, 401);
    assert.equal(bulkResponse.status, 401);

    const createBody = await createResponse.json();
    const revokeBody = await revokeResponse.json();
    const bulkBody = await bulkResponse.json();

    assert.equal(createBody.error?.code, 'UNAUTHORIZED');
    assert.equal(revokeBody.error?.code, 'UNAUTHORIZED');
    assert.equal(bulkBody.error?.code, 'UNAUTHORIZED');

    assert.equal(rateLimitCalls, 0);
    assert.equal(createCalls, 0);
    assert.equal(revokeCalls, 0);
    assert.equal(bulkCalls, 0);
  });
});
