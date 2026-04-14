import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const { registerTrackEnrollmentRoutes } = await import(
  '../../server/src/routes/api/trackEnrollments.ts'
);

describe('track enrollment RBAC', () => {
  it('rejects non-manager requests before invoking enrollment handlers', async () => {
    let rateLimitCalls = 0;
    let jsonCalls = 0;

    const app = new Hono();
    registerTrackEnrollmentRoutes(app, {
      requireManager: async (c) => ({
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
      extractJsonPayload: async () => {
        jsonCalls += 1;
        return {
          ok: true,
          data: {
            userId: '11111111-1111-1111-1111-111111111111',
            reason: 'Manual wallet transfer confirmed by ops',
            reference: 'instapay-2026-04-13-abc123',
          },
        };
      },
    });

    const manualResponse = await app.request(
      '/tracks/11111111-1111-1111-1111-111111111111/manual-enrollments',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: '11111111-1111-1111-1111-111111111111',
          reason: 'Manual wallet transfer confirmed by ops',
          reference: 'instapay-2026-04-13-abc123',
        }),
      },
    );

    const revokeResponse = await app.request(
      '/tracks/11111111-1111-1111-1111-111111111111/enrollments/11111111-1111-1111-1111-111111111111/revoke',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reason: 'Cleanup duplicate access',
        }),
      },
    );

    assert.equal(manualResponse.status, 401);
    assert.equal(revokeResponse.status, 401);

    const manualBody = await manualResponse.json();
    const revokeBody = await revokeResponse.json();

    assert.equal(manualBody.error?.code, 'UNAUTHORIZED');
    assert.equal(revokeBody.error?.code, 'UNAUTHORIZED');
    assert.equal(rateLimitCalls, 0);
    assert.equal(jsonCalls, 0);
  });
});
