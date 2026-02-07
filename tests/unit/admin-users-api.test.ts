import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { fetchUsersAdmin } from '../../src/app/api/users.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('fetchUsersAdmin', () => {
  it('sends server-side search and filter params', async () => {
    let capturedUrl = '';

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      capturedUrl = String(input);
      return new Response(
        JSON.stringify({
          items: [
            {
              id: 'u_1',
              email: 'eng.rowinathemida@gmail.com',
              name: 'Rowina',
              createdAt: '2026-02-05T20:40:45.000Z',
              phoneNumber: null,
              role: 'user',
              userType: 'learner',
              isSubscriber: false,
            },
          ],
          pagination: {
            page: 2,
            pageSize: 200,
            total: 1,
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const result = await fetchUsersAdmin({
      page: 2,
      pageSize: 200,
      search: 'eng.rowinathemida@gmail.com',
      role: 'user',
      subscription: 'not_subscribed',
    });

    assert.equal(
      capturedUrl,
      '/api/users?page=2&pageSize=200&search=eng.rowinathemida%40gmail.com&role=user&subscription=not_subscribed',
    );
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.created_at, '2026-02-05T20:40:45.000Z');
    assert.equal(result.pagination.total, 1);
  });
});
