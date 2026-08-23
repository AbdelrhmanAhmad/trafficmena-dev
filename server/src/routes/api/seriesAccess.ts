import { bookingGrantsRecording, type EventFormat, type TicketType } from './ticketAccess.js';

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
  // The viewer's active track booking ticket type (null = legacy / non-ticket-typed booking).
  bookingTicketType: TicketType | null;
  assetIsPremium: boolean;
  assetIsPublic: boolean;
  assetEventId: string | null;
  // Delivery mode of the asset's linked event (null = no linked event -> general track content).
  assetEventFormat: EventFormat | null;
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
    context.hasSeriesGrant ||
    hasPriorBuyerComplimentaryAccess(context) ||
    !context.seriesIsPremium
  );
}

export function resolveSeriesAssetAccess(input: SeriesAssetAccessInput): boolean {
  if (input.isStaff || input.isSubscriber || input.hasSeriesGrant) {
    return true;
  }

  const soldRecordingsRequirePurchase =
    input.recordingsAccessPolicy === 'everyone_pays' && input.seriesIsPremium;

  // Track booking grants this recording only when the ticket matrix allows it.
  if (
    input.hasTrackBooking &&
    !soldRecordingsRequirePurchase &&
    bookingGrantsRecording(input.bookingTicketType, input.assetEventFormat)
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
  assetEventFormat: EventFormat | null;
  hasEventRegistration: boolean;
  parentSeries: null | {
    isPremium: boolean;
    salesEnabled: boolean;
    recordingsAccessPolicy: RecordingsAccessPolicy;
    hasTrackBooking: boolean;
    hasTrackEventAttendance: boolean;
    hasSeriesGrant: boolean;
    bookingTicketType: TicketType | null;
  };
};

/** Library routes: honor series recordings policy when asset belongs to a gated series. */
export function resolveLibraryAssetAccess(input: LibraryAssetAccessInput): boolean {
  if (input.isStaff || input.isSubscriber) {
    return true;
  }

  const parent = input.parentSeries;
  if (parent && (parent.salesEnabled || parent.isPremium)) {
    if (
      parent.recordingsAccessPolicy === 'free_for_prior_buyers' &&
      parent.hasTrackEventAttendance &&
      input.hasEventRegistration
    ) {
      return true;
    }

    return resolveSeriesAssetAccess({
      isStaff: input.isStaff,
      isSubscriber: input.isSubscriber,
      hasTrackBooking: parent.hasTrackBooking,
      hasTrackEventAttendance: parent.hasTrackEventAttendance,
      hasSeriesGrant: parent.hasSeriesGrant,
      seriesIsPremium: parent.isPremium,
      recordingsAccessPolicy: parent.recordingsAccessPolicy,
      bookingTicketType: parent.bookingTicketType,
      assetIsPremium: input.assetIsPremium,
      assetIsPublic: input.assetIsPublic,
      assetEventId: input.assetEventId,
      assetEventFormat: input.assetEventFormat,
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

/**
 * Member /dashboard/library Series tab visibility.
 * Track-linked auto Series stay hidden until "Publish for sale";
 * standalone series appear when published by admin.
 */
export function isSeriesVisibleInMemberLibrary(series: {
  isPublished: boolean;
  salesEnabled: boolean;
  trackId: string | null;
  eventId?: string | null;
}): boolean {
  if (!series.isPublished) return false;
  // Auto-created track or standalone event recordings: hide until Publish for sale
  if (series.trackId != null || series.eventId != null) {
    return series.salesEnabled;
  }
  return true;
}
