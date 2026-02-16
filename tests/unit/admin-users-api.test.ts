import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { fetchUsersAdmin, updateUserRole } from '../../src/app/api/users.ts';

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
              activeSubscriptionSource: null,
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
    assert.equal(result.items[0]?.active_subscription_source, null);
    assert.equal(result.pagination.total, 1);
  });

  it('maps phoneNumber when updating a user role', async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: 'u_2',
            email: 'member@example.com',
            name: 'Member',
            createdAt: '2026-02-05T20:40:45.000Z',
            phoneNumber: '+201000000000',
            role: 'manager',
            userType: 'learner',
            isSubscriber: true,
            activeSubscriptionSource: 'gift',
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const result = await updateUserRole('u_2', 'manager');

    assert.equal(result.success, true);
    assert.equal(result.user.phone_number, '+201000000000');
    assert.equal(result.user.active_subscription_source, 'gift');
  });
});
