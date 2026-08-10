export type RecordingsAccessPolicy = 'free_for_prior_buyers' | 'everyone_pays';

export const RECORDINGS_ACCESS_POLICIES = ['free_for_prior_buyers', 'everyone_pays'] as const;

type SeriesAccessContext = {
  isStaff: boolean;
  isSubscriber: boolean;
  hasTrackBooking: boolean;
  hasTrackEventAttendance: boolean;
  hasSeriesGrant: boolean;
  seriesIsPremium: boolean;
  recordingsAccessPolicy: RecordingsAccessPolicy;
};

type SeriesAssetAccessInput = SeriesAccessContext & {
  assetIsPremium: boolean;
  assetIsPublic: boolean;
  assetEventId: string | null;
  userEventIds: Set<string>;
};

/** Prior live buyers may watch for free only when policy allows. */
export function hasPriorBuyerComplimentaryAccess(context: SeriesAccessContext): boolean {
  if (context.recordingsAccessPolicy === 'everyone_pays') {
    return false;
  }
  return context.hasTrackBooking || context.hasTrackEventAttendance;
}

export function resolveSeriesAccess(context: SeriesAccessContext): boolean {
  return (
    context.isStaff ||
    context.isSubscriber ||
    hasPriorBuyerComplimentaryAccess(context) ||
    context.hasSeriesGrant ||
    !context.seriesIsPremium
  );
}

export function resolveSeriesAssetAccess(input: SeriesAssetAccessInput): boolean {
  if (
    input.isStaff ||
    input.isSubscriber ||
    hasPriorBuyerComplimentaryAccess(input) ||
    input.hasSeriesGrant
  ) {
    return true;
  }

  if (input.seriesIsPremium || input.assetIsPremium) {
    return false;
  }

  return input.assetIsPublic || !input.assetEventId || input.userEventIds.has(input.assetEventId);
}

type LibraryAssetAccessInput = {
  isStaff: boolean;
  isSubscriber: boolean;
  assetIsPremium: boolean;
  assetIsPublic: boolean;
  assetEventId: string | null;
  hasEventRegistration: boolean;
  parentSeries: null | {
    isPremium: boolean;
    salesEnabled: boolean;
    recordingsAccessPolicy: RecordingsAccessPolicy;
    hasTrackBooking: boolean;
    hasTrackEventAttendance: boolean;
    hasSeriesGrant: boolean;
  };
};

/** Library routes: honor series recordings policy when asset belongs to a gated series. */
export function resolveLibraryAssetAccess(input: LibraryAssetAccessInput): boolean {
  if (input.isStaff || input.isSubscriber) {
    return true;
  }

  const parent = input.parentSeries;
  if (parent && (parent.salesEnabled || parent.isPremium)) {
    return resolveSeriesAssetAccess({
      isStaff: input.isStaff,
      isSubscriber: input.isSubscriber,
      hasTrackBooking: parent.hasTrackBooking,
      hasTrackEventAttendance: parent.hasTrackEventAttendance,
      hasSeriesGrant: parent.hasSeriesGrant,
      seriesIsPremium: parent.isPremium,
      recordingsAccessPolicy: parent.recordingsAccessPolicy,
      assetIsPremium: input.assetIsPremium,
      assetIsPublic: input.assetIsPublic,
      assetEventId: input.assetEventId,
      userEventIds:
        input.hasEventRegistration && input.assetEventId
          ? new Set([input.assetEventId])
          : new Set(),
    });
  }

  // Standalone / non-gated series: legacy library rules
  if (input.assetIsPremium) {
    return input.hasEventRegistration;
  }
  return input.assetIsPublic || !input.assetEventId || input.hasEventRegistration;
}

export function normalizeRecordingsAccessPolicy(value: unknown): RecordingsAccessPolicy {
  if (value === 'everyone_pays') return 'everyone_pays';
  return 'free_for_prior_buyers';
}
