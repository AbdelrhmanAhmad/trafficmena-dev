import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { createSeriesGrantsFromCsv } from '../../src/app/api/seriesGrants.ts';
import { createSubscriptionGrantsFromCsv } from '../../src/app/api/subscriptions.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('bulk grants API response handling', () => {
  it('throws for non-JSON success responses in subscription bulk grants', async () => {
    globalThis.fetch = (async () =>
      new Response('ok', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })) as typeof fetch;

    const csvFile = new File(['email,source,reason'], 'subscriptions.csv', { type: 'text/csv' });

    await assert.rejects(
      () => createSubscriptionGrantsFromCsv(csvFile),
      /Unexpected response format/i,
    );
  });

  it('throws for non-JSON success responses in series bulk grants', async () => {
    globalThis.fetch = (async () =>
      new Response('ok', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })) as typeof fetch;

    const csvFile = new File(['email,series_id,reason'], 'series.csv', { type: 'text/csv' });

    await assert.rejects(() => createSeriesGrantsFromCsv(csvFile), /Unexpected response format/i);
  });
});
