import { and, count, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { libraryAssets, series, seriesAssets } from '../db/schema/index.js';
import { isSeriesSellable } from './seriesSales.js';
import { normalizeRecordingsAccessPolicy } from '../routes/api/seriesAccess.js';

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
};

export async function loadRecordingsSeriesForTrack(
  trackId: string,
  eventId?: string | null,
): Promise<RecordingsSeriesSummary | null> {
  const [trackSeries] = await db
    .select({
      id: series.id,
      title: series.title,
      isPublished: series.isPublished,
      salesEnabled: series.salesEnabled,
      priceInCents: series.priceInCents,
      recordingsAccessPolicy: series.recordingsAccessPolicy,
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

  return {
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
}
