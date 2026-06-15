import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { series, seriesAccessGrants, seriesAssets } from '../db/schema/index.js';
import { ApiError } from '../utils/errors.js';

export type SellableSeriesRow = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceInCents: number;
  salesEnabled: boolean;
  isPublished: boolean;
  isPremium: boolean;
  assetCount: number;
};

export function isSeriesSellable(
  row: Pick<SellableSeriesRow, 'salesEnabled' | 'priceInCents' | 'isPublished' | 'assetCount'>,
): boolean {
  return (
    row.isPublished &&
    row.salesEnabled &&
    row.priceInCents > 0 &&
    row.assetCount > 0
  );
}

export async function loadSellableSeriesByIds(seriesIds: string[]): Promise<SellableSeriesRow[]> {
  if (seriesIds.length === 0) {
    return [];
  }

  const uniqueIds = [...new Set(seriesIds)];
  const rows = await db
    .select({
      id: series.id,
      title: series.title,
      description: series.description,
      imageUrl: series.imageUrl,
      priceInCents: series.priceInCents,
      salesEnabled: series.salesEnabled,
      isPublished: series.isPublished,
      isPremium: series.isPremium,
    })
    .from(series)
    .where(inArray(series.id, uniqueIds));

  const counts = await db
    .select({
      seriesId: seriesAssets.seriesId,
      assetCount: count(seriesAssets.assetId),
    })
    .from(seriesAssets)
    .where(inArray(seriesAssets.seriesId, uniqueIds))
    .groupBy(seriesAssets.seriesId);

  const countMap = new Map(counts.map((row) => [row.seriesId, Number(row.assetCount)]));

  return rows.map((row) => ({
    ...row,
    priceInCents: row.priceInCents ?? 0,
    assetCount: countMap.get(row.id) ?? 0,
  }));
}

export async function assertSeriesIdsSellable(seriesIds: string[]): Promise<SellableSeriesRow[]> {
  const rows = await loadSellableSeriesByIds(seriesIds);
  const rowMap = new Map(rows.map((row) => [row.id, row]));

  for (const seriesId of [...new Set(seriesIds)]) {
    const row = rowMap.get(seriesId);
    if (!row) {
      throw new ApiError('SERIES_NOT_FOUND', `Series not found: ${seriesId}`, 404);
    }
    if (!isSeriesSellable(row)) {
      throw new ApiError(
        'SERIES_NOT_FOR_SALE',
        `"${row.title}" is not available for purchase.`,
        400,
      );
    }
  }

  return seriesIds.map((id) => rowMap.get(id)!);
}

export async function getActiveSeriesGrantIds(
  userId: string,
  seriesIds: string[],
): Promise<Set<string>> {
  if (seriesIds.length === 0) {
    return new Set();
  }

  const grants = await db
    .select({ seriesId: seriesAccessGrants.seriesId })
    .from(seriesAccessGrants)
    .where(
      and(
        eq(seriesAccessGrants.userId, userId),
        inArray(seriesAccessGrants.seriesId, seriesIds),
        isNull(seriesAccessGrants.revokedAt),
      ),
    );

  return new Set(grants.map((grant) => grant.seriesId));
}

export async function getPurchasedSeriesIds(userId: string, seriesIds: string[]): Promise<Set<string>> {
  if (seriesIds.length === 0) {
    return new Set();
  }

  const grants = await db
    .select({ seriesId: seriesAccessGrants.seriesId })
    .from(seriesAccessGrants)
    .where(
      and(
        eq(seriesAccessGrants.userId, userId),
        inArray(seriesAccessGrants.seriesId, seriesIds),
        isNull(seriesAccessGrants.revokedAt),
        eq(seriesAccessGrants.grantReason, 'purchase'),
      ),
    );

  return new Set(grants.map((grant) => grant.seriesId));
}
