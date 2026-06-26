import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getEnabledTicketTypes,
  hasTicketTypes,
  includedFormatsFor,
} from '../../src/features/tracks/ticketTypes.ts';

const hybrid = {
  online_only_price_cents: 40_000,
  online_offline_price_cents: 60_000,
  offline_only_price_cents: 30_000,
};

const legacy = {
  online_only_price_cents: null,
  online_offline_price_cents: null,
  offline_only_price_cents: null,
};

describe('track ticket-type selector helpers', () => {
  it('lists enabled variants in canonical order with prices + benefit copy', () => {
    const enabled = getEnabledTicketTypes(hybrid);
    assert.deepEqual(
      enabled.map((option) => option.type),
      ['online_only', 'online_offline', 'offline_only'],
    );
    assert.equal(enabled[0].priceCents, 40_000);
    assert.match(enabled[0].benefit, /recordings of all sessions/i);
  });

  it('omits variants with a null price (disabled)', () => {
    const onlyOffline = { ...legacy, offline_only_price_cents: 0 };
    const enabled = getEnabledTicketTypes(onlyOffline);
    assert.equal(enabled.length, 1);
    assert.equal(enabled[0].type, 'offline_only');
    assert.equal(enabled[0].priceCents, 0); // free, still enabled
  });

  it('reports a legacy (all-null) track as not using ticket types', () => {
    assert.equal(hasTicketTypes(legacy), false);
    assert.equal(getEnabledTicketTypes(legacy).length, 0);
  });

  it('maps each variant to the session formats it filters to', () => {
    assert.deepEqual(includedFormatsFor('online_only'), ['online']);
    assert.deepEqual(includedFormatsFor('online_offline'), ['online', 'offline']);
    assert.deepEqual(includedFormatsFor('offline_only'), ['offline']);
  });
});
