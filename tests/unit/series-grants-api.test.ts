import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { fetchAllSeriesGrantUserIds } from '../../src/app/api/seriesGrants.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('fetchAllSeriesGrantUserIds', () => {
  it('collects granted user IDs across multiple pages', async () => {
    const responses = [
      {
        items: [{ userId: 'user-1' }, { userId: 'user-2' }],
        pagination: { page: 1, pageSize: 2, total: 5 },
      },
      {
        items: [{ userId: 'user-3' }, { userId: 'user-4' }],
        pagination: { page: 2, pageSize: 2, total: 5 },
      },
      {
        items: [{ userId: 'user-5' }],
        pagination: { page: 3, pageSize: 2, total: 5 },
      },
    ];

    let callCount = 0;
    globalThis.fetch = (async () => {
      const payload = responses[callCount];
      callCount += 1;
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const userIds = await fetchAllSeriesGrantUserIds('series-1', 2);

    assert.deepEqual(userIds, ['user-1', 'user-2', 'user-3', 'user-4', 'user-5']);
    assert.equal(callCount, 3);
  });

  it('respects an already-aborted signal before issuing requests', async () => {
    let callCount = 0;
    globalThis.fetch = (async () => {
      callCount += 1;
      throw new Error('fetch should not be called for an already-aborted signal');
    }) as typeof fetch;

    const controller = new AbortController();
    controller.abort();

    await assert.rejects(
      () => fetchAllSeriesGrantUserIds('series-1', 200, controller.signal),
      (error) => error instanceof DOMException && error.name === 'AbortError',
    );
    assert.equal(callCount, 0);
  });

  it('fetches pages sequentially to avoid bursty fan-out', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const requestUrl = new URL(String(input), 'http://localhost');
      const page = Number(requestUrl.searchParams.get('page') ?? '1');
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      await new Promise((resolve) => setTimeout(resolve, 15));
      inFlight -= 1;

      const base = (page - 1) * 2;
      return new Response(
        JSON.stringify({
          items: [{ userId: `user-${base + 1}` }, { userId: `user-${base + 2}` }],
          pagination: { page, pageSize: 2, total: 10 },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const userIds = await fetchAllSeriesGrantUserIds('series-1', 2);

    assert.equal(userIds.length, 10);
    assert.equal(maxInFlight, 1);
  });

  it('fails fast when a later page request fails', async () => {
    let callCount = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      callCount += 1;
      const requestUrl = new URL(String(input), 'http://localhost');
      const page = Number(requestUrl.searchParams.get('page') ?? '1');

      if (page === 3) {
        return new Response(
          JSON.stringify({ error: { code: 'SERVER_ERROR', message: 'page 3 failed' } }),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          },
        );
      }

      const base = (page - 1) * 2;
      return new Response(
        JSON.stringify({
          items: [{ userId: `user-${base + 1}` }, { userId: `user-${base + 2}` }],
          pagination: { page, pageSize: 2, total: 8 },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    }) as typeof fetch;

    await assert.rejects(() => fetchAllSeriesGrantUserIds('series-1', 2), /page 3 failed/i);
    assert.equal(callCount, 3);
  });

  it('forwards trimmed search to paginated grant-id requests', async () => {
    const requestedSearch: Array<string | null> = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const requestUrl = new URL(String(input), 'http://localhost');
      requestedSearch.push(requestUrl.searchParams.get('search'));

      return new Response(
        JSON.stringify({
          items: [],
          pagination: { page: 1, pageSize: 200, total: 0 },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const userIds = await fetchAllSeriesGrantUserIds(
      'series-1',
      200,
      undefined,
      '  member@test.com  ',
    );

    assert.deepEqual(userIds, []);
    assert.deepEqual(requestedSearch, ['member@test.com']);
  });

  it('throws when pagination guard is exhausted before loading all rows', async () => {
    let callCount = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      callCount += 1;
      const requestUrl = new URL(String(input), 'http://localhost');
      const page = Number(requestUrl.searchParams.get('page') ?? '1');

      const base = (page - 1) * 200;
      return new Response(
        JSON.stringify({
          items: Array.from({ length: 200 }, (_, index) => ({
            userId: `user-${base + index + 1}`,
          })),
          pagination: { page, pageSize: 200, total: 20_000 },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    }) as typeof fetch;

    await assert.rejects(
      () => fetchAllSeriesGrantUserIds('series-1', 200),
      /too many grants to load safely/i,
    );
    assert.equal(callCount, 50);
  });
});
