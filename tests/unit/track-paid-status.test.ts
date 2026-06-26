import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isPaidTrack, isPaidTrackOffering } from '../../server/src/routes/api/trackPaidStatus.ts';

describe('track paid status', () => {
  it('returns true for positive prices', () => {
    assert.equal(isPaidTrack(100), true);
  });

  it('returns false for zero or null prices', () => {
    assert.equal(isPaidTrack(0), false);
    assert.equal(isPaidTrack(null), false);
  });

  it('returns false when price is undefined', () => {
    assert.equal(isPaidTrack(undefined), false);
  });

  it('treats paid ticket variants as paid even when legacy price is null', () => {
    assert.equal(
      isPaidTrackOffering({
        priceInCents: null,
        onlineOnlyPriceCents: 40_000,
        onlineOfflinePriceCents: null,
        offlineOnlyPriceCents: null,
      }),
      true,
    );
  });

  it('does not treat all-free ticket variants as paid', () => {
    assert.equal(
      isPaidTrackOffering({
        priceInCents: null,
        onlineOnlyPriceCents: 0,
        onlineOfflinePriceCents: null,
        offlineOnlyPriceCents: null,
      }),
      false,
    );
  });
});
