import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import {
  getEnabledTicketTypes,
  hasTicketTypes,
  includedFormatsFor,
  resolveTicketSelection,
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

  describe('resolveTicketSelection precedence', () => {
    it('valid pending overrides a different current selection (multi-variant)', () => {
      // A single-variant fixture proves nothing here — the pending type would equal the lone
      // preselection candidate. Two variants force the precedence to show.
      const resolved = resolveTicketSelection({
        current: 'online_only',
        pending: 'offline_only',
        enabledTypes: ['online_only', 'offline_only'],
        canPreselect: true,
      });
      assert.equal(resolved, 'offline_only');
    });

    it('preselects the lone enabled variant while the viewer can buy', () => {
      const resolved = resolveTicketSelection({
        current: null,
        pending: null,
        enabledTypes: ['online_only'],
        canPreselect: true,
      });
      assert.equal(resolved, 'online_only');
    });

    it('does not preselect for booked or payment-pending viewers', () => {
      assert.equal(
        resolveTicketSelection({
          current: null,
          pending: null,
          enabledTypes: ['online_only'],
          canPreselect: false,
        }),
        null,
      );
      // An invalid stored pending type must clear, not fall through to the lone variant.
      assert.equal(
        resolveTicketSelection({
          current: null,
          pending: 'online_offline',
          enabledTypes: ['online_only'],
          canPreselect: false,
        }),
        null,
      );
      // The real payment-pending state: canPreselect is false there, yet a valid pending
      // ticket must still restore.
      assert.equal(
        resolveTicketSelection({
          current: null,
          pending: 'offline_only',
          enabledTypes: ['online_only', 'offline_only'],
          canPreselect: false,
        }),
        'offline_only',
      );
    });

    it('preselects a lone free variant derived from real track prices', () => {
      const onlyFree = { ...legacy, offline_only_price_cents: 0 };
      const resolved = resolveTicketSelection({
        current: null,
        pending: null,
        enabledTypes: getEnabledTicketTypes(onlyFree).map((option) => option.type),
        canPreselect: true,
      });
      assert.equal(resolved, 'offline_only');
    });

    it('never picks among several enabled variants', () => {
      assert.equal(
        resolveTicketSelection({
          current: null,
          pending: null,
          enabledTypes: ['online_only', 'offline_only'],
          canPreselect: true,
        }),
        null,
      );
      // A still-valid current choice is kept; a stale one clears.
      assert.equal(
        resolveTicketSelection({
          current: 'offline_only',
          pending: null,
          enabledTypes: ['online_only', 'offline_only'],
          canPreselect: true,
        }),
        'offline_only',
      );
      assert.equal(
        resolveTicketSelection({
          current: 'online_offline',
          pending: null,
          enabledTypes: ['online_only', 'offline_only'],
          canPreselect: true,
        }),
        null,
      );
    });

    it('resolves to null for a legacy track with no ticket types', () => {
      assert.equal(
        resolveTicketSelection({
          current: null,
          pending: null,
          enabledTypes: [],
          canPreselect: true,
        }),
        null,
      );
    });
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
