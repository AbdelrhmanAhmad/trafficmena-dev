import { and, count, desc, eq, ilike, inArray, isNull } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import {
  eventAttendees,
  libraryAssets,
  series,
  seriesAccessGrants,
  seriesAssets,
  trackBookings,
} from '../../db/schema/index.js';
import {
  getActiveSeriesGrantIds,
  getPurchasedSeriesIds,
  isSeriesSellable,
  loadSellableSeriesByIds,
} from '../../services/seriesSales.js';
import { activeTrackBookingWhere } from '../../utils/booking.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { resolveSeriesAccess, resolveSeriesAssetAccess } from './seriesAccess.js';
import { hasActiveSubscription } from './subscriptionShared.js';
import { escapeLikePattern, getOptionalUserRole } from './utils.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().optional(),
});

const uuidParamSchema = z.string().uuid();

export function registerSeriesStoreRoutes(app: Hono) {
  app.get('/series/store', async (c) => {
    const parsed = listQuerySchema.safeParse({
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
      search: c.req.query('search'),
    });

    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_QUERY', message: parsed.error.message } }, 400);
    }

    const { page, pageSize, search } = parsed.data;
    const session = await getSessionFromRequest(c);
    const userId = session?.user?.id ?? null;

    const filters = [eq(series.isPublished, true), eq(series.salesEnabled, true)];
    if (search) {
      filters.push(ilike(series.title, `%${escapeLikePattern(search)}%`));
    }

    const candidates = await db
      .select({
        id: series.id,
        title: series.title,
        description: series.description,
        imageUrl: series.imageUrl,
        priceInCents: series.priceInCents,
        salesEnabled: series.salesEnabled,
        isPublished: series.isPublished,
        isPremium: series.isPremium,
        sortOrder: series.sortOrder,
        createdAt: series.createdAt,
      })
      .from(series)
      .where(and(...filters))
      .orderBy(series.sortOrder, desc(series.createdAt));

    const sellableRows = await loadSellableSeriesByIds(candidates.map((row) => row.id));
    const sellableMap = new Map(
      sellableRows.filter((row) => isSeriesSellable(row)).map((row) => [row.id, row]),
    );

    let items = candidates
      .filter((row) => sellableMap.has(row.id))
      .map((row) => {
        const sellable = sellableMap.get(row.id)!;
        return {
          id: row.id,
          title: row.title,
          description: row.description,
          imageUrl: row.imageUrl,
          priceInCents: sellable.priceInCents,
          salesEnabled: row.salesEnabled,
          isPremium: row.isPremium,
          assetCount: sellable.assetCount,
          isSellable: true,
        };
      });

    if (userId) {
      const itemIds = items.map((item) => item.id);
      const [purchased, seriesGrants] = await Promise.all([
        getPurchasedSeriesIds(userId, itemIds),
        getActiveSeriesGrantIds(userId, itemIds),
      ]);
      items = items.map((item) => ({
        ...item,
        hasPurchased: purchased.has(item.id),
        hasSeriesGrant: seriesGrants.has(item.id),
      }));
    }

    const total = items.length;
    const offset = (page - 1) * pageSize;
    const pageItems = items.slice(offset, offset + pageSize);

    return c.json({
      items: pageItems,
      pagination: { page, pageSize, total },
    });
  });

  app.get('/series/store/:id', async (c) => {
    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid series id.' } }, 400);
    }

    const id = idParsed.data;
    const session = await getSessionFromRequest(c);
    const userId = session?.user?.id ?? null;

    const [seriesRecord] = await db
      .select()
      .from(series)
      .where(eq(series.id, id))
      .limit(1);

    if (!seriesRecord || !seriesRecord.isPublished) {
      return c.json({ error: { code: 'SERIES_NOT_FOUND', message: 'Series not found.' } }, 404);
    }

    const [assetCountRow] = await db
      .select({ assetCount: count(seriesAssets.assetId) })
      .from(seriesAssets)
      .where(eq(seriesAssets.seriesId, id));

    const assetCount = Number(assetCountRow?.assetCount ?? 0);
    const sellable = isSeriesSellable({
      salesEnabled: seriesRecord.salesEnabled,
      priceInCents: seriesRecord.priceInCents ?? 0,
      isPublished: seriesRecord.isPublished,
      assetCount,
    });

    if (!sellable) {
      return c.json({ error: { code: 'SERIES_NOT_FOR_SALE', message: 'Series not for sale.' } }, 404);
    }

    const role = userId ? await getOptionalUserRole(userId) : null;
    const isStaff = role ? ['owner', 'admin', 'manager'].includes(role) : false;
    const isSubscriber = userId && !isStaff ? await hasActiveSubscription(userId) : false;

    let hasTrackBooking = false;
    let hasSeriesGrant = false;
    let hasPurchased = false;

    if (userId && !isStaff) {
      const [bookingRows, grantRows, purchasedSet] = await Promise.all([
        seriesRecord.trackId
          ? db
              .select({ id: trackBookings.id })
              .from(trackBookings)
              .where(
                activeTrackBookingWhere(
                  eq(trackBookings.trackId, seriesRecord.trackId),
                  eq(trackBookings.userId, userId),
                ),
              )
              .limit(1)
          : Promise.resolve([]),
        db
          .select({ id: seriesAccessGrants.id })
          .from(seriesAccessGrants)
          .where(
            and(
              eq(seriesAccessGrants.seriesId, seriesRecord.id),
              eq(seriesAccessGrants.userId, userId),
              isNull(seriesAccessGrants.revokedAt),
            ),
          )
          .limit(1),
        getPurchasedSeriesIds(userId, [seriesRecord.id]),
      ]);

      hasTrackBooking = Boolean(bookingRows[0]);
      hasSeriesGrant = Boolean(grantRows[0]);
      hasPurchased = purchasedSet.has(seriesRecord.id);
    }

    const accessContext = {
      isStaff,
      isSubscriber,
      hasTrackBooking,
      hasSeriesGrant,
      seriesIsPremium: seriesRecord.isPremium,
    };
    const hasAccess = resolveSeriesAccess(accessContext);

    const seriesAssetsList = await db
      .select({
        assetId: seriesAssets.assetId,
        sortOrder: seriesAssets.sortOrder,
        asset: {
          id: libraryAssets.id,
          title: libraryAssets.title,
          description: libraryAssets.description,
          fileType: libraryAssets.fileType,
          thumbnailUrl: libraryAssets.thumbnailUrl,
          videoUrl: libraryAssets.videoUrl,
          documentUrl: libraryAssets.documentUrl,
          embedUrl: libraryAssets.embedUrl,
          embedType: libraryAssets.embedType,
          viewCount: libraryAssets.viewCount,
          createdAt: libraryAssets.createdAt,
          eventId: libraryAssets.eventId,
          isPublic: libraryAssets.isPublic,
          isPremium: libraryAssets.isPremium,
        },
      })
      .from(seriesAssets)
      .innerJoin(libraryAssets, eq(libraryAssets.id, seriesAssets.assetId))
      .where(eq(seriesAssets.seriesId, id))
      .orderBy(seriesAssets.sortOrder);

    let userEventIds = new Set<string>();
    if (userId && !hasAccess) {
      const registrations = await db
        .select({ eventId: eventAttendees.eventId })
        .from(eventAttendees)
        .where(and(eq(eventAttendees.userId, userId), eq(eventAttendees.status, 'active')));
      userEventIds = new Set(registrations.map((row) => row.eventId));
    }

    const assets = seriesAssetsList.map((row) => {
      const assetHasAccess = resolveSeriesAssetAccess({
        ...accessContext,
        assetIsPremium: row.asset.isPremium,
        assetIsPublic: row.asset.isPublic,
        assetEventId: row.asset.eventId,
        userEventIds,
      });

      return {
        id: row.asset.id,
        title: row.asset.title,
        description: assetHasAccess ? row.asset.description : null,
        fileType: row.asset.fileType,
        thumbnailUrl: row.asset.thumbnailUrl,
        videoUrl: assetHasAccess ? row.asset.videoUrl : null,
        documentUrl: assetHasAccess ? row.asset.documentUrl : null,
        embedUrl: assetHasAccess ? row.asset.embedUrl : null,
        embedType: row.asset.embedType,
        viewCount: row.asset.viewCount,
        createdAt: row.asset.createdAt,
        sortOrder: row.sortOrder,
        eventId: row.asset.eventId,
        isPublic: row.asset.isPublic,
        isPremium: row.asset.isPremium,
        hasAccess: assetHasAccess,
      };
    });

    return c.json({
      id: seriesRecord.id,
      title: seriesRecord.title,
      description: seriesRecord.description,
      imageUrl: seriesRecord.imageUrl,
      priceInCents: seriesRecord.priceInCents,
      salesEnabled: seriesRecord.salesEnabled,
      isPremium: seriesRecord.isPremium,
      isSellable: true,
      assetCount: assets.length,
      assets,
      hasAccess,
      hasPurchased,
      hasSeriesGrant,
      isAuthenticated: Boolean(userId),
    });
  });
}
