import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveSeriesAccess,
  resolveSeriesAssetAccess,
} from '../../server/src/routes/api/seriesAccess.ts';

const baseAssetInput = {
  isStaff: false,
  isSubscriber: false,
  hasTrackBooking: false,
  hasSeriesGrant: false,
  seriesIsPremium: false,
  bookingTicketType: null,
  assetIsPremium: false,
  assetIsPublic: false,
  assetEventId: null,
  assetEventFormat: null,
  userEventIds: new Set<string>(),
};

describe('series access', () => {
  it('grants premium series access when user booked the track', () => {
    const hasAccess = resolveSeriesAccess({
      isStaff: false,
      isSubscriber: false,
      hasTrackBooking: true,
      hasSeriesGrant: false,
      seriesIsPremium: true,
    });

    assert.equal(hasAccess, true);
  });

  it('grants premium series access when user has explicit series grant', () => {
    const hasAccess = resolveSeriesAccess({
      isStaff: false,
      isSubscriber: false,
      hasTrackBooking: false,
      hasSeriesGrant: true,
      seriesIsPremium: true,
    });

    assert.equal(hasAccess, true);
  });

  it('grants premium asset access for a legacy (null ticket type) booking', () => {
    const hasAccess = resolveSeriesAssetAccess({
      ...baseAssetInput,
      hasTrackBooking: true,
      seriesIsPremium: true,
      bookingTicketType: null, // legacy booking granted everything
      assetIsPremium: true,
      assetEventId: 'event-1',
      assetEventFormat: 'online',
    });

    assert.equal(hasAccess, true);
  });

  it('keeps event-based access for non-premium assets', () => {
    const hasAccess = resolveSeriesAssetAccess({
      ...baseAssetInput,
      assetEventId: 'event-2',
      assetEventFormat: 'offline',
      userEventIds: new Set(['event-2']),
    });

    assert.equal(hasAccess, true);
  });

  it('grants premium asset access when user has explicit series grant', () => {
    const hasAccess = resolveSeriesAssetAccess({
      ...baseAssetInput,
      hasSeriesGrant: true,
      seriesIsPremium: true,
      assetIsPremium: true,
      assetEventId: 'event-1',
      assetEventFormat: 'online',
    });

    assert.equal(hasAccess, true);
  });
});

describe('series asset access is ticket-aware', () => {
  const premiumBooking = (
    bookingTicketType: 'online_only' | 'online_offline' | 'offline_only',
    assetEventFormat: 'online' | 'offline' | null,
  ) =>
    resolveSeriesAssetAccess({
      ...baseAssetInput,
      hasTrackBooking: true,
      seriesIsPremium: true,
      assetIsPremium: true,
      assetEventId: assetEventFormat ? 'event-1' : null,
      bookingTicketType,
      assetEventFormat,
    });

  it('lets an online_only booking open an offline-session recording', () => {
    assert.equal(premiumBooking('online_only', 'offline'), true);
  });

  it('blocks an offline_only booking from an online-session recording', () => {
    assert.equal(premiumBooking('offline_only', 'online'), false);
  });

  it('lets an offline_only booking open an offline-session recording', () => {
    assert.equal(premiumBooking('offline_only', 'offline'), true);
  });

  it('gives every ticket type a recording with no linked event (general content)', () => {
    assert.equal(premiumBooking('online_only', null), true);
    assert.equal(premiumBooking('offline_only', null), true);
    assert.equal(premiumBooking('online_offline', null), true);
  });
});
