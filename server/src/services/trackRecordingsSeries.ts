import { and, count, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  eventAttendees,
  libraryAssets,
  series,
  seriesAccessGrants,
  seriesAssets,
  trackBookings,
  trackEvents,
} from '../db/schema/index.js';
import {
  normalizeRecordingsAccessPolicy,
  resolveSeriesAccess,
} from '../routes/api/seriesAccess.js';
import { hasActiveSubscription } from '../routes/api/subscriptionShared.js';
import { activeTrackBookingWhere } from '../utils/booking.js';
import { getPurchasedSeriesIds, isSeriesSellable } from './seriesSales.js';

export type RecordingsSeriesUserContext = {
  userId?: string | null;
  isStaff?: boolean;
  userHasTrackBooking?: boolean;
  userHasTrackEventAttendance?: boolean;
  /** Standalone event recordings — prior buyer = active registration on this event */
  standaloneEventId?: string | null;
};

export type RecordingsSeriesSummary = {
  id: string;
  title: string;
  isPublished: boolean;
  salesEnabled: boolean;
  priceInCents: number | null;
  recordingsAccessPolicy: 'free_for_prior_buyers' | 'everyone_pays';
  assetCount: number;
  eventAssetCount: number | null;
  isSellable: boolean;
  hasAccess?: boolean;
  hasPurchased?: boolean;
};

export async function enrichRecordingsSeriesForUser(
  summary: Omit<RecordingsSeriesSummary, 'hasAccess' | 'hasPurchased'>,
  options: {
    trackId?: string | null;
    standaloneEventId?: string | null;
    seriesIsPremium: boolean;
    userContext?: RecordingsSeriesUserContext;
  },
): Promise<RecordingsSeriesSummary> {
  const { trackId, standaloneEventId, seriesIsPremium, userContext } = options;
  const userId = userContext?.userId ?? null;
  if (!userId) {
    return summary;
  }

  const isStaff = userContext?.isStaff ?? false;
  if (isStaff) {
    return { ...summary, hasAccess: true, hasPurchased: false };
  }

  let hasTrackBooking = userContext?.userHasTrackBooking ?? false;
  let hasTrackEventAttendance = userContext?.userHasTrackEventAttendance ?? false;

  const eventIdForAttendance = standaloneEventId ?? null;

  const [isSubscriber, bookingRows, attendanceRows, grantRows, purchasedSet] = await Promise.all([
    hasActiveSubscription(userId),
    trackId && !hasTrackBooking
      ? db
          .select({ id: trackBookings.id })
          .from(trackBookings)
          .where(
            activeTrackBookingWhere(
              eq(trackBookings.trackId, trackId),
              eq(trackBookings.userId, userId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    !hasTrackEventAttendance && (eventIdForAttendance || trackId)
      ? eventIdForAttendance
        ? db
            .select({ id: eventAttendees.id })
            .from(eventAttendees)
            .where(
              and(
                eq(eventAttendees.eventId, eventIdForAttendance),
                eq(eventAttendees.userId, userId),
                eq(eventAttendees.status, 'active'),
              ),
            )
            .limit(1)
        : db
            .select({ id: eventAttendees.id })
            .from(eventAttendees)
            .innerJoin(trackEvents, eq(trackEvents.eventId, eventAttendees.eventId))
            .where(
              and(
                eq(trackEvents.trackId, trackId!),
                eq(eventAttendees.userId, userId),
                eq(eventAttendees.status, 'active'),
              ),
            )
            .limit(1)
      : Promise.resolve([]),
    db
      .select({ id: seriesAccessGrants.id })
      .from(seriesAccessGrants)
      .where(
        and(
          eq(seriesAccessGrants.seriesId, summary.id),
          eq(seriesAccessGrants.userId, userId),
          isNull(seriesAccessGrants.revokedAt),
        ),
      )
      .limit(1),
    getPurchasedSeriesIds(userId, [summary.id]),
  ]);

  if (trackId && !hasTrackBooking) {
    hasTrackBooking = Boolean(bookingRows[0]);
  }
  if (!hasTrackEventAttendance) {
    hasTrackEventAttendance = Boolean(attendanceRows[0]);
  }

  const hasSeriesGrant = Boolean(grantRows[0]);
  const hasPurchased = purchasedSet.has(summary.id);

  const hasAccess = resolveSeriesAccess({
    isStaff: false,
    isSubscriber,
    hasTrackBooking,
    hasTrackEventAttendance,
    hasSeriesGrant,
    seriesIsPremium,
    recordingsAccessPolicy: summary.recordingsAccessPolicy,
  });

  return { ...summary, hasAccess, hasPurchased };
}

export async function loadRecordingsSeriesForTrack(
  trackId: string,
  eventId?: string | null,
  userContext?: RecordingsSeriesUserContext,
): Promise<RecordingsSeriesSummary | null> {
  const [trackSeries] = await db
    .select({
      id: series.id,
      title: series.title,
      isPublished: series.isPublished,
      salesEnabled: series.salesEnabled,
      priceInCents: series.priceInCents,
      recordingsAccessPolicy: series.recordingsAccessPolicy,
      isPremium: series.isPremium,
    })
    .from(series)
    .where(eq(series.trackId, trackId))
    .limit(1);

  if (!trackSeries) return null;

  const [assetCountRow] = await db
    .select({ value: count(seriesAssets.assetId) })
    .from(seriesAssets)
    .where(eq(seriesAssets.seriesId, trackSeries.id));
  const assetCount = Number(assetCountRow?.value ?? 0);

  let eventAssetCount: number | null = null;
  if (eventId) {
    const [eventCountRow] = await db
      .select({ value: count(seriesAssets.assetId) })
      .from(seriesAssets)
      .innerJoin(libraryAssets, eq(libraryAssets.id, seriesAssets.assetId))
      .where(and(eq(seriesAssets.seriesId, trackSeries.id), eq(libraryAssets.eventId, eventId)));
    eventAssetCount = Number(eventCountRow?.value ?? 0);
  }

  const recordingsAccessPolicy = normalizeRecordingsAccessPolicy(
    trackSeries.recordingsAccessPolicy,
  );

  const baseSummary = {
    id: trackSeries.id,
    title: trackSeries.title,
    isPublished: trackSeries.isPublished,
    salesEnabled: trackSeries.salesEnabled,
    priceInCents: trackSeries.priceInCents,
    recordingsAccessPolicy,
    assetCount,
    eventAssetCount,
    isSellable: isSeriesSellable({
      salesEnabled: trackSeries.salesEnabled,
      priceInCents: trackSeries.priceInCents ?? 0,
      isPublished: trackSeries.isPublished,
      assetCount,
    }),
  };

  return enrichRecordingsSeriesForUser(baseSummary, {
    trackId,
    seriesIsPremium: trackSeries.isPremium,
    userContext,
  });
}
