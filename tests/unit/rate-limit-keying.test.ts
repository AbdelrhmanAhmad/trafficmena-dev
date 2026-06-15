import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const { consumeRateLimit } = await import('../../server/src/routes/api/utils.ts');

describe('consumeRateLimit keying', () => {
  it('does not allow bypass by rotating forwarded IP headers', async () => {
    const app = new Hono();
    const key = `rate-limit-test:${Date.now()}`;

    app.post('/limited', async (c) => {
      const limited = consumeRateLimit(c, key, { limit: 1, windowMs: 60_000 });
      if (limited) return limited;
      return c.json({ success: true });
    });

    const first = await app.request('/limited', {
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.10' },
    });
    const second = await app.request('/limited', {
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.11' },
    });

    assert.equal(first.status, 200);
    assert.equal(second.status, 429);
  });
});
