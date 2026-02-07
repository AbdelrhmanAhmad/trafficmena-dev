import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { fetchInvitations } from '../../src/app/api/invitations.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('fetchInvitations', () => {
  it('sends paging, status, and trimmed search params', async () => {
    let capturedUrl = '';

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      capturedUrl = String(input);

      return new Response(
        JSON.stringify({
          items: [],
          pagination: {
            page: 2,
            pageSize: 200,
            total: 0,
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    }) as typeof fetch;

    await fetchInvitations({
      page: 2,
      pageSize: 200,
      status: 'sent',
      search: '  invited.user@example.com  ',
    });

    assert.equal(
      capturedUrl,
      '/api/invitations?page=2&pageSize=200&status=sent&search=invited.user%40example.com',
    );
  });
});
