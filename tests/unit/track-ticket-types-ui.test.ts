import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import {
  getAllTicketTypes,
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

  it('getAllTicketTypes keeps disabled variants visible with an enabled flag', () => {
    // online_only paid, online_offline disabled (null), offline_only free (0).
    const partial = { ...legacy, online_only_price_cents: 40_000, offline_only_price_cents: 0 };
    const all = getAllTicketTypes(partial);
    assert.deepEqual(
      all.map((option) => option.type),
      ['online_only', 'online_offline', 'offline_only'],
    );
    assert.deepEqual(
      all.map((option) => option.enabled),
      [true, false, true],
    );
    assert.equal(all[1].priceCents, null, 'disabled variant carries a null price');
    assert.equal(all[2].priceCents, 0, 'free-but-enabled variant carries 0');
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

describe('ticketed track replacement-code UI wiring', () => {
  it('lets track detail request a new code through the checkout dialog', async () => {
    const dialogSource = await readFile(
      new URL('../../src/shared/components/payment/PaymentCheckoutDialog.tsx', import.meta.url),
      'utf8',
    );
    const trackDetailSource = await readFile(
      new URL('../../src/features/tracks/pages/TrackDetail.tsx', import.meta.url),
      'utf8',
    );

    assert.ok(dialogSource.includes('forceNewCode?: boolean'));
    assert.ok(dialogSource.includes('forceNewCode,'));
    assert.ok(dialogSource.includes('forceNewCode,'));
    assert.ok(trackDetailSource.includes('forceNewCode={requestingNewCode}'));
  });

  it('forwards the stored payment ticket type when the pending page requests a new code', async () => {
    const pendingSource = await readFile(
      new URL('../../src/pages/payment/pending.tsx', import.meta.url),
      'utf8',
    );
    const paymentsApiSource = await readFile(
      new URL('../../src/app/api/payments.ts', import.meta.url),
      'utf8',
    );

    assert.ok(paymentsApiSource.includes('ticketType?: TicketType | null'));
    assert.ok(pendingSource.includes('ticketType: payment?.ticketType ?? undefined'));
  });
});
