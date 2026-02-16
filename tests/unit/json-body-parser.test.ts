import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseJsonRequestBody } from '../../server/src/routes/api/jsonPayload.ts';

describe('parseJsonRequestBody', () => {
  it('returns INVALID_CONTENT_TYPE when content-type is not json', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{"userId":"abc"}',
    });

    const result = await parseJsonRequestBody(request);

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'INVALID_CONTENT_TYPE');
  });

  it('returns INVALID_JSON for malformed JSON payloads', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"userId":',
    });

    const result = await parseJsonRequestBody(request);

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'INVALID_JSON');
  });

  it('parses valid JSON payloads', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 'abc' }),
    });

    const result = await parseJsonRequestBody(request);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.data, { userId: 'abc' });
  });
});
