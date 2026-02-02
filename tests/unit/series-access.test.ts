import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveSeriesAccess,
  resolveSeriesAssetAccess,
} from '../../server/src/routes/api/seriesAccess.js';

describe('series access', () => {
  it('grants premium series access when user booked the track', () => {
    const hasAccess = resolveSeriesAccess({
      isStaff: false,
      isSubscriber: false,
      hasTrackBooking: true,
      seriesIsPremium: true,
    });

    assert.equal(hasAccess, true);
  });

  it('grants premium asset access when user booked the track', () => {
    const hasAccess = resolveSeriesAssetAccess({
      isStaff: false,
      isSubscriber: false,
      hasTrackBooking: true,
      seriesIsPremium: true,
      assetIsPremium: true,
      assetIsPublic: false,
      assetEventId: 'event-1',
      userEventIds: new Set(),
    });

    assert.equal(hasAccess, true);
  });

  it('keeps event-based access for non-premium assets', () => {
    const hasAccess = resolveSeriesAssetAccess({
      isStaff: false,
      isSubscriber: false,
      hasTrackBooking: false,
      seriesIsPremium: false,
      assetIsPremium: false,
      assetIsPublic: false,
      assetEventId: 'event-2',
      userEventIds: new Set(['event-2']),
    });

    assert.equal(hasAccess, true);
  });
});
