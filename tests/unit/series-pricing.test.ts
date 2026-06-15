import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatSeriesPriceLabel,
  mapSeriesFormToPayload,
  shouldShowSeriesPrice,
} from '../../src/features/series/utils/seriesPricing.ts';

describe('series pricing', () => {
  it('formats free and paid prices', () => {
    assert.equal(formatSeriesPriceLabel(null), 'Free');
    assert.equal(formatSeriesPriceLabel(0), 'Free');
    assert.equal(formatSeriesPriceLabel(150000), '1500 EGP');
    assert.equal(formatSeriesPriceLabel(150050), '1500.50 EGP');
  });

  it('shows public price only when sales are enabled', () => {
    const series = { sales_enabled: true, price_in_cents: 50000 };

    assert.equal(shouldShowSeriesPrice(series), true);
    assert.equal(shouldShowSeriesPrice({ sales_enabled: false, price_in_cents: 50000 }), false);
    assert.equal(
      shouldShowSeriesPrice({ sales_enabled: false, price_in_cents: 50000 }, { isStaff: true }),
      true,
    );
  });

  it('maps form values to API payload', () => {
    const payload = mapSeriesFormToPayload({
      title: 'Growth Series',
      isPublished: true,
      isPremium: false,
      priceEgp: '99.50',
      salesEnabled: true,
    });

    assert.equal(payload.priceInCents, 9950);
    assert.equal(payload.salesEnabled, true);
  });
});
