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

  it('grants premium asset access when user booked the track under free_for_prior_buyers', () => {
    const hasAccess = resolveSeriesAssetAccess({
      isStaff: false,
      isSubscriber: false,
      hasTrackBooking: true,
      hasTrackEventAttendance: false,
      hasSeriesGrant: false,
      seriesIsPremium: true,
      recordingsAccessPolicy: 'free_for_prior_buyers',
      assetIsPremium: true,
      assetIsPublic: false,
      assetEventId: 'event-1',
      userEventIds: new Set(),
    });

    assert.equal(hasAccess, true);
  });

  it('denies premium asset via booking when everyone_pays without grant', () => {
    const hasAccess = resolveSeriesAssetAccess({
      isStaff: false,
      isSubscriber: false,
      hasTrackBooking: true,
      hasTrackEventAttendance: false,
      hasSeriesGrant: false,
      seriesIsPremium: true,
      recordingsAccessPolicy: 'everyone_pays',
      assetIsPremium: true,
      assetIsPublic: false,
      assetEventId: 'event-1',
      userEventIds: new Set(),
    });

    assert.equal(hasAccess, false);
  });

  it('keeps event-based access for non-premium assets', () => {
    const hasAccess = resolveSeriesAssetAccess({
      isStaff: false,
      isSubscriber: false,
      hasTrackBooking: false,
      hasTrackEventAttendance: false,
      hasSeriesGrant: false,
      seriesIsPremium: false,
      recordingsAccessPolicy: 'free_for_prior_buyers',
      assetIsPremium: false,
      assetIsPublic: false,
      assetEventId: 'event-2',
      userEventIds: new Set(['event-2']),
    });

    assert.equal(hasAccess, true);
  });

  it('normalizes unknown policy to free_for_prior_buyers', () => {
    assert.equal(normalizeRecordingsAccessPolicy(null), 'free_for_prior_buyers');
    assert.equal(normalizeRecordingsAccessPolicy('everyone_pays'), 'everyone_pays');
  });

  it('denies unpaid library access to sellable series assets under everyone_pays even with event registration', () => {
    // Bug repro: GET /library/:id unlocked premium recording via event attendance
    // despite series sales_enabled + everyone_pays and no purchase grant.
    const hasAccess = resolveLibraryAssetAccess({
      isStaff: false,
      isSubscriber: false,
      assetIsPremium: true,
      assetIsPublic: true,
      assetEventId: 'event-1',
      hasEventRegistration: true,
      parentSeries: {
        isPremium: true,
        salesEnabled: true,
        recordingsAccessPolicy: 'everyone_pays',
        hasTrackBooking: false,
        hasTrackEventAttendance: true,
        hasSeriesGrant: false,
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
      hasEventRegistration: false,
      parentSeries: {
        isPremium: true,
        salesEnabled: true,
        recordingsAccessPolicy: 'everyone_pays',
        hasTrackBooking: false,
        hasTrackEventAttendance: false,
        hasSeriesGrant: false,
      },
    });

    assert.equal(hasAccess, false);
  });

  it('denies click-through unlock for sellable series assets when only track booking exists under everyone_pays', () => {
    const hasAccess = resolveLibraryAssetAccess({
      isStaff: false,
      isSubscriber: false,
      assetIsPremium: true,
      assetIsPublic: false,
      assetEventId: 'event-1',
      hasEventRegistration: false,
      parentSeries: {
        isPremium: true,
        salesEnabled: true,
        recordingsAccessPolicy: 'everyone_pays',
        hasTrackBooking: true,
        hasTrackEventAttendance: false,
        hasSeriesGrant: false,
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
      hasEventRegistration: false,
      parentSeries: {
        isPremium: true,
        salesEnabled: true,
        recordingsAccessPolicy: 'everyone_pays',
        hasTrackBooking: false,
        hasTrackEventAttendance: false,
        hasSeriesGrant: true,
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
      hasEventRegistration: true,
      parentSeries: {
        isPremium: true,
        salesEnabled: true,
        recordingsAccessPolicy: 'free_for_prior_buyers',
        hasTrackBooking: false,
        hasTrackEventAttendance: true,
        hasSeriesGrant: false,
      },
    });

    assert.equal(hasAccess, true);
  });

  it('hides track-linked series from member library until Publish for sale', () => {
    // Bug repro: publishing a Track auto-sets series.isPublished, so "… Recordings"
    // appeared on /dashboard/library before admin enabled sales.
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

  it('shows standalone published series without salesEnabled', () => {
    assert.equal(
      isSeriesVisibleInMemberLibrary({
        isPublished: true,
        salesEnabled: false,
        trackId: null,
      }),
      true,
    );
  });

  it('hides unpublished standalone series from member library', () => {
    assert.equal(
      isSeriesVisibleInMemberLibrary({
        isPublished: false,
        salesEnabled: false,
        trackId: null,
      }),
      false,
    );
  });
});
