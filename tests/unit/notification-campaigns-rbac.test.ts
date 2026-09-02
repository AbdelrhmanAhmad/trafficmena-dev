import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

describe('notification campaigns RBAC (HTTP smoke)', () => {
  it('denies anonymous POST /notifications/campaigns', async () => {
    const { registerNotificationRoutes } = await import(
      '../../server/src/routes/api/notifications.ts'
    );
    const app = new Hono();
    registerNotificationRoutes(app);

    const res = await app.request('/notifications/campaigns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titleEn: 'Hello',
        titleAr: 'مرحبا',
        bodyHtmlEn: '<p>Hi</p>',
        bodyHtmlAr: '<p>أهلا</p>',
        audience: { type: 'all_users' },
      }),
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { error?: { code?: string } };
    assert.equal(body.error?.code, 'UNAUTHORIZED');
  });

  // Full member (role=user) vs manager denial needs session+profile fixtures / deps injection.
  // Notifications routes hard-code requireManager (no test deps), so member 403 is covered by
  // requireManager unit behavior elsewhere; this smoke asserts the campaign create gate exists.
});
