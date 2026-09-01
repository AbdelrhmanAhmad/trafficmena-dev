import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

describe('community post RBAC (HTTP)', () => {
  it('denies anonymous access to channel list', async () => {
    const { registerCommunityRoutes } = await import('../../server/src/routes/api/community.ts');
    const app = new Hono();
    registerCommunityRoutes(app);

    const res = await app.request('/community/channels', { method: 'GET' });
    assert.equal(res.status, 401);
    const body = (await res.json()) as { error?: { code?: string } };
    assert.equal(body.error?.code, 'UNAUTHORIZED');
  });

  it('denies anonymous access to channel feed', async () => {
    const { registerCommunityRoutes } = await import('../../server/src/routes/api/community.ts');
    const app = new Hono();
    registerCommunityRoutes(app);

    const res = await app.request('/community/channels/general/feed', { method: 'GET' });
    assert.equal(res.status, 401);
  });

  it('denies anonymous post creation', async () => {
    const { registerCommunityRoutes } = await import('../../server/src/routes/api/community.ts');
    const app = new Hono();
    registerCommunityRoutes(app);

    const res = await app.request('/community/channels/general/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bodyHtml: '<p>test</p>' }),
    });
    assert.equal(res.status, 401);
  });

  it('denies anonymous admin channel management', async () => {
    const { registerCommunityRoutes } = await import('../../server/src/routes/api/community.ts');
    const app = new Hono();
    registerCommunityRoutes(app);

    const res = await app.request('/community/admin/channels', { method: 'GET' });
    assert.ok(res.status === 401 || res.status === 403);
  });
});
