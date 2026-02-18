import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Hono } from 'hono';
import { extractJsonPayload } from '../../server/src/routes/api/jsonPayload.ts';

function createTestApp() {
  const app = new Hono();
  const results: Array<Awaited<ReturnType<typeof extractJsonPayload>>> = [];

  app.post('/test', async (c) => {
    const result = await extractJsonPayload(c);
    results.push(result);
    return c.json({ ok: true });
  });

  return { app, results };
}

describe('extractJsonPayload', () => {
  it('returns INVALID_CONTENT_TYPE when content-type is not json', async () => {
    const { app, results } = createTestApp();

    await app.request('/test', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{"userId":"abc"}',
    });

    const result = results[0];
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'INVALID_CONTENT_TYPE');
  });

  it('returns INVALID_JSON for malformed JSON payloads', async () => {
    const { app, results } = createTestApp();

    await app.request('/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"userId":',
    });

    const result = results[0];
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'INVALID_JSON');
  });

  it('parses valid JSON payloads', async () => {
    const { app, results } = createTestApp();

    await app.request('/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 'abc' }),
    });

    const result = results[0];
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.data, { userId: 'abc' });
  });

  it('returns PAYLOAD_TOO_LARGE for oversized payloads', async () => {
    const { app, results } = createTestApp();

    await app.request('/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: 'x'.repeat(1_100_000) }),
    });

    const result = results[0];
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'PAYLOAD_TOO_LARGE');
  });
});
