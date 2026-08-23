import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  hasPriorBuyerComplimentaryAccess,
  isSeriesVisibleInMemberLibrary,
  normalizeRecordingsAccessPolicy,
  resolveLibraryAssetAccess,
  resolveSeriesAccess,
  resolveSeriesAssetAccess,
} from '../../server/src/routes/api/seriesAccess.ts';

const baseAssetInput = {
  isStaff: false,
  isSubscriber: false,
  hasTrackBooking: false,
  hasTrackEventAttendance: false,
  hasSeriesGrant: false,
  seriesIsPremium: false,
  recordingsAccessPolicy: 'free_for_prior_buyers' as const,
  bookingTicketType: null,
  assetIsPremium: false,
  assetIsPublic: false,
  assetEventId: null,
  assetEventFormat: null,
  userEventIds: new Set<string>(),
};

describe('series access', () => {
  it('grants premium series access when user booked the track under free_for_prior_buyers', () => {
    const hasAccess = resolveSeriesAccess({
      isStaff: false,
      isSubscriber: false,
      hasTrackBooking: true,
      hasTrackEventAttendance: false,
      hasSeriesGrant: false,
      seriesIsPremium: true,
      recordingsAccessPolicy: 'free_for_prior_buyers',
    });

    assert.equal(hasAccess, true);
  });

  it('grants premium series access when user attended a track event under free_for_prior_buyers', () => {
    const hasAccess = resolveSeriesAccess({
      isStaff: false,
      isSubscriber: false,
      hasTrackBooking: false,
      hasTrackEventAttendance: true,
      hasSeriesGrant: false,
      seriesIsPremium: true,
      recordingsAccessPolicy: 'free_for_prior_buyers',
    });

    assert.equal(hasAccess, true);
  });

  it('grants premium series access when user has explicit series grant', () => {
    const hasAccess = resolveSeriesAccess({
      isStaff: false,
      isSubscriber: false,
      hasTrackBooking: false,
      hasTrackEventAttendance: false,
      hasSeriesGrant: true,
      seriesIsPremium: true,
      recordingsAccessPolicy: 'everyone_pays',
    });

    assert.equal(hasAccess, true);
  });

  it('denies track booking complimentary access when everyone_pays', () => {
    assert.equal(
      hasPriorBuyerComplimentaryAccess({
        isStaff: false,
        isSubscriber: false,
        hasTrackBooking: true,
        hasTrackEventAttendance: true,
        hasSeriesGrant: false,
        seriesIsPremium: true,
        recordingsAccessPolicy: 'everyone_pays',
      }),
      false,
    );

    const hasAccess = resolveSeriesAccess({
      isStaff: false,
      isSubscriber: false,
      hasTrackBooking: true,
      hasTrackEventAttendance: true,
      hasSeriesGrant: false,
      seriesIsPremium: true,
      recordingsAccessPolicy: 'everyone_pays',
    });

    assert.equal(hasAccess, false);
  });

  it('still grants access via series grant when everyone_pays', () => {
    const hasAccess = resolveSeriesAccess({
      isStaff: false,
      isSubscriber: false,
      hasTrackBooking: true,
      hasTrackEventAttendance: false,
      hasSeriesGrant: true,
      seriesIsPremium: true,
      recordingsAccessPolicy: 'everyone_pays',
    });

    assert.equal(hasAccess, true);
  });

  it('grants premium asset access for a legacy (null ticket type) booking', () => {
    const hasAccess = resolveSeriesAssetAccess({
      ...baseAssetInput,
      hasTrackBooking: true,
      seriesIsPremium: true,
      bookingTicketType: null,
      assetIsPremium: true,
      assetEventId: 'event-1',
      assetEventFormat: 'online',
    });

    assert.equal(hasAccess, true);
  });

  it('grants premium asset access when user booked the track under free_for_prior_buyers', () => {
    const hasAccess = resolveSeriesAssetAccess({
      ...baseAssetInput,
      hasTrackBooking: true,
      seriesIsPremium: true,
      bookingTicketType: null,
      assetIsPremium: true,
      assetEventId: 'event-1',
      assetEventFormat: 'offline',
    });

    assert.equal(hasAccess, true);
  });

  it('denies premium asset via booking when everyone_pays without grant', () => {
    const hasAccess = resolveSeriesAssetAccess({
      ...baseAssetInput,
      hasTrackBooking: true,
      seriesIsPremium: true,
      recordingsAccessPolicy: 'everyone_pays',
      bookingTicketType: null,
      assetIsPremium: true,
      assetEventId: 'event-1',
      assetEventFormat: 'offline',
    });

    assert.equal(hasAccess, false);
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

  it('keeps event-based access for non-premium assets', () => {
    const hasAccess = resolveSeriesAssetAccess({
      ...baseAssetInput,
      assetEventId: 'event-2',
      assetEventFormat: 'offline',
      userEventIds: new Set(['event-2']),
    });

    assert.equal(hasAccess, true);
  });

  it('normalizes unknown policy to free_for_prior_buyers', () => {
    assert.equal(normalizeRecordingsAccessPolicy(null), 'free_for_prior_buyers');
    assert.equal(normalizeRecordingsAccessPolicy('everyone_pays'), 'everyone_pays');
  });

  it('denies unpaid library access to sellable series assets under everyone_pays even with event registration', () => {
    const hasAccess = resolveLibraryAssetAccess({
      isStaff: false,
      isSubscriber: false,
      assetIsPremium: true,
      assetIsPublic: true,
      assetEventId: 'event-1',
      assetEventFormat: null,
      hasEventRegistration: true,
      parentSeries: {
        isPremium: true,
        salesEnabled: true,
        recordingsAccessPolicy: 'everyone_pays',
        hasTrackBooking: false,
        hasTrackEventAttendance: true,
        hasSeriesGrant: false,
        bookingTicketType: null,
      },
    });

    assert.equal(hasAccess, false);
  });

  it('denies unpaid library access to sellable series assets with no booking or grant', () => {
    const hasAccess = resolveLibraryAssetAccess({
      isStaff: false,
      isSubscriber: false,
      assetIsPremium: true,
      assetIsPublic: true,
      assetEventId: 'event-1',
      assetEventFormat: null,
      hasEventRegistration: false,
      parentSeries: {
        isPremium: true,
        salesEnabled: true,
        recordingsAccessPolicy: 'everyone_pays',
        hasTrackBooking: false,
        hasTrackEventAttendance: false,
        hasSeriesGrant: false,
        bookingTicketType: null,
      },
    });

    assert.equal(hasAccess, false);
  });

  it('denies click-through unlock for sellable series assets when only track booking exists under everyone_pays', () => {
    const hasAccess = resolveLibraryAssetAccess({
      isStaff: false,
      isSubscriber: false,
      assetIsPremium: true,
      assetIsPublic: true,
      assetEventId: 'event-1',
      assetEventFormat: null,
      hasEventRegistration: false,
      parentSeries: {
        isPremium: true,
        salesEnabled: true,
        recordingsAccessPolicy: 'everyone_pays',
        hasTrackBooking: true,
        hasTrackEventAttendance: false,
        hasSeriesGrant: false,
        bookingTicketType: null,
      },
    });

    assert.equal(hasAccess, false);
  });

  it('allows library access after series purchase grant under everyone_pays', () => {
    const hasAccess = resolveLibraryAssetAccess({
      isStaff: false,
      isSubscriber: false,
      assetIsPremium: true,
      assetIsPublic: true,
      assetEventId: 'event-1',
      assetEventFormat: null,
      hasEventRegistration: false,
      parentSeries: {
        isPremium: true,
        salesEnabled: true,
        recordingsAccessPolicy: 'everyone_pays',
        hasTrackBooking: false,
        hasTrackEventAttendance: false,
        hasSeriesGrant: true,
        bookingTicketType: null,
      },
    });

    assert.equal(hasAccess, true);
  });

  it('allows library access for prior buyers when policy is free_for_prior_buyers', () => {
    const hasAccess = resolveLibraryAssetAccess({
      isStaff: false,
      isSubscriber: false,
      assetIsPremium: true,
      assetIsPublic: false,
      assetEventId: 'event-1',
      assetEventFormat: null,
      hasEventRegistration: true,
      parentSeries: {
        isPremium: true,
        salesEnabled: true,
        recordingsAccessPolicy: 'free_for_prior_buyers',
        hasTrackBooking: false,
        hasTrackEventAttendance: true,
        hasSeriesGrant: false,
        bookingTicketType: null,
      },
    });

    assert.equal(hasAccess, true);
  });

  it('hides track-linked series from member library until Publish for sale', () => {
    assert.equal(
      isSeriesVisibleInMemberLibrary({
        isPublished: true,
        salesEnabled: false,
        trackId: 'track-1',
      }),
      false,
    );
  });

  it('shows track-linked series after Publish for sale', () => {
    assert.equal(
      isSeriesVisibleInMemberLibrary({
        isPublished: true,
        salesEnabled: true,
        trackId: 'track-1',
      }),
      true,
    );
  });

  it('shows manual library series without salesEnabled', () => {
    assert.equal(
      isSeriesVisibleInMemberLibrary({
        isPublished: true,
        salesEnabled: false,
        trackId: null,
        eventId: null,
      }),
      true,
    );
  });

  it('hides standalone event-linked series until Publish for sale', () => {
    assert.equal(
      isSeriesVisibleInMemberLibrary({
        isPublished: true,
        salesEnabled: false,
        trackId: null,
        eventId: 'event-1',
      }),
      false,
    );
  });

  it('shows standalone event-linked series after Publish for sale', () => {
    assert.equal(
      isSeriesVisibleInMemberLibrary({
        isPublished: true,
        salesEnabled: true,
        trackId: null,
        eventId: 'event-1',
      }),
      true,
    );
  });

  it('hides unpublished manual series from member library', () => {
    assert.equal(
      isSeriesVisibleInMemberLibrary({
        isPublished: false,
        salesEnabled: false,
        trackId: null,
        eventId: null,
      }),
      false,
    );
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
