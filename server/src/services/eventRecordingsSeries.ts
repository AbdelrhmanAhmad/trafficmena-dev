import { and, count, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { libraryAssets, series, seriesAssets, trackEvents } from '../db/schema/index.js';
import {
  bilingualDescriptionFromLegacy,
  bilingualTitleFromLegacy,
} from '../utils/bilingualDb.js';
import { normalizeRecordingsAccessPolicy } from '../routes/api/seriesAccess.js';
import { isSeriesSellable } from './seriesSales.js';
import {
  enrichRecordingsSeriesForUser,
  type RecordingsSeriesSummary,
  type RecordingsSeriesUserContext,
} from './trackRecordingsSeries.js';

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function isEventLinkedToTrack(eventId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: trackEvents.eventId })
    .from(trackEvents)
    .where(eq(trackEvents.eventId, eventId))
    .limit(1);
  return Boolean(row);
}

export async function createEventRecordingsSeriesInTx(
  tx: DbTx,
  eventId: string,
  eventTitle: string,
  recordingAssetId: string,
): Promise<string> {
  const seriesTitle = `${eventTitle} Recordings`;
  const seriesDescription = `Recording from ${eventTitle}`;
  const [eventSeries] = await tx
    .insert(series)
    .values({
      ...bilingualTitleFromLegacy(seriesTitle),
      ...bilingualDescriptionFromLegacy(seriesDescription),
      eventId,
      isPublished: false,
    })
    .returning({ id: series.id });

  await tx.insert(seriesAssets).values({
    seriesId: eventSeries.id,
    assetId: recordingAssetId,
    sortOrder: 0,
  });

  return eventSeries.id;
}

/** Ensures standalone events have a recordings Series + linked assets (legacy backfill). */
export async function ensureEventRecordingsSeries(eventId: string, eventTitle: string): Promise<void> {
  if (await isEventLinkedToTrack(eventId)) return;

  const [existing] = await db
    .select({ id: series.id })
    .from(series)
    .where(eq(series.eventId, eventId))
    .limit(1);

  if (existing) {
    const eventAssets = await db
      .select({ id: libraryAssets.id })
      .from(libraryAssets)
      .where(eq(libraryAssets.eventId, eventId));

    if (eventAssets.length === 0) return;

    const linked = await db
      .select({ assetId: seriesAssets.assetId })
      .from(seriesAssets)
      .where(eq(seriesAssets.seriesId, existing.id));
    const linkedSet = new Set(linked.map((row) => row.assetId));

    const toLink = eventAssets.filter((asset) => !linkedSet.has(asset.id));
    if (toLink.length === 0) return;

    await db.insert(seriesAssets).values(
      toLink.map((asset, index) => ({
        seriesId: existing.id,
        assetId: asset.id,
        sortOrder: index,
      })),
    );
    return;
  }

  await db.transaction(async (tx) => {
    const eventAssets = await tx
      .select({ id: libraryAssets.id })
      .from(libraryAssets)
      .where(eq(libraryAssets.eventId, eventId));

    let recordingAssetId = eventAssets[0]?.id;
    if (!recordingAssetId) {
      const recordingTitle = `${eventTitle} - Recording`;
      const recordingDescription = `Recording from ${eventTitle}`;
      const [createdAsset] = await tx
        .insert(libraryAssets)
        .values({
          ...bilingualTitleFromLegacy(recordingTitle),
          ...bilingualDescriptionFromLegacy(recordingDescription),
          fileType: 'Video',
          eventId,
          isPublic: false,
        })
        .returning({ id: libraryAssets.id });
      recordingAssetId = createdAsset.id;
    }

    await createEventRecordingsSeriesInTx(tx, eventId, eventTitle, recordingAssetId);

    const extraAssets = eventAssets.filter((asset) => asset.id !== recordingAssetId);
    if (extraAssets.length > 0) {
      const [eventSeries] = await tx
        .select({ id: series.id })
        .from(series)
        .where(eq(series.eventId, eventId))
        .limit(1);
      if (eventSeries) {
        await tx.insert(seriesAssets).values(
          extraAssets.map((asset, index) => ({
            seriesId: eventSeries.id,
            assetId: asset.id,
            sortOrder: index + 1,
          })),
        );
      }
    }
  });
}

export async function deleteEventRecordingsSeries(eventId: string): Promise<void> {
  await db.delete(series).where(eq(series.eventId, eventId));
}

export async function loadRecordingsSeriesForEvent(
  eventId: string,
  userContext?: RecordingsSeriesUserContext,
): Promise<RecordingsSeriesSummary | null> {
  if (await isEventLinkedToTrack(eventId)) {
    return null;
  }

  const [eventSeries] = await db
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
    .where(eq(series.eventId, eventId))
    .limit(1);

  if (!eventSeries) return null;

  const [assetCountRow] = await db
    .select({ value: count(seriesAssets.assetId) })
    .from(seriesAssets)
    .where(eq(seriesAssets.seriesId, eventSeries.id));
  const assetCount = Number(assetCountRow?.value ?? 0);

  const [eventCountRow] = await db
    .select({ value: count(seriesAssets.assetId) })
    .from(seriesAssets)
    .innerJoin(libraryAssets, eq(libraryAssets.id, seriesAssets.assetId))
    .where(and(eq(seriesAssets.seriesId, eventSeries.id), eq(libraryAssets.eventId, eventId)));

  const recordingsAccessPolicy = normalizeRecordingsAccessPolicy(
    eventSeries.recordingsAccessPolicy,
  );

  const baseSummary = {
    id: eventSeries.id,
    title: eventSeries.title,
    isPublished: eventSeries.isPublished,
    salesEnabled: eventSeries.salesEnabled,
    priceInCents: eventSeries.priceInCents,
    recordingsAccessPolicy,
    assetCount,
    eventAssetCount: Number(eventCountRow?.value ?? 0),
    isSellable: isSeriesSellable({
      salesEnabled: eventSeries.salesEnabled,
      priceInCents: eventSeries.priceInCents ?? 0,
      isPublished: eventSeries.isPublished,
      assetCount,
    }),
  };

  return enrichRecordingsSeriesForUser(baseSummary, {
    standaloneEventId: eventId,
    seriesIsPremium: eventSeries.isPremium,
    userContext: {
      ...userContext,
      standaloneEventId: eventId,
    },
  });
}

/** Standalone meetups only — track-linked events use the track recordings flow. */
export async function loadRecordingsSeriesForEventDetail(
  eventId: string,
  trackId: string | null | undefined,
  userContext?: RecordingsSeriesUserContext,
): Promise<RecordingsSeriesSummary | null> {
  if (trackId) {
    return null;
  }
  return loadRecordingsSeriesForEvent(eventId, userContext);
}
