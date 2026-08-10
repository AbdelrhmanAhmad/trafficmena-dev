import { and, count, desc, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
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
import { activeTrackBookingWhere } from '../../utils/booking.js';
import { getSessionFromRequest } from '../../utils/session.js';
import {
  getActiveSeriesGrantIds,
  getPurchasedSeriesIds,
  isSeriesSellable,
} from '../../services/seriesSales.js';
import { resolveSeriesAccess, resolveSeriesAssetAccess } from './seriesAccess.js';
import { registerSeriesStoreRoutes } from './seriesStore.js';
import { hasActiveSubscription } from './subscriptionShared.js';
import { escapeLikePattern, getOptionalUserRole, requireAdmin, requireManager } from './utils.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().optional(),
});

const priceInCentsSchema = z
  .union([
    z.coerce.number().int().min(0, 'Price cannot be negative.').max(10000000, 'Price too large.'),
    z.null(),
  ])
  .optional()
  .transform((value) => (value === undefined ? undefined : value));

const createSeriesSchema = z.object({
  title: z.string().trim().min(3, 'Title is required.').max(180),
  description: z.union([z.string().trim().max(4000), z.null()]).optional(),
  imageUrl: z.union([z.string().url().max(500), z.literal(''), z.null()]).optional(),
  isPublished: z.boolean().default(true),
  isPremium: z.boolean().default(false),
  priceInCents: priceInCentsSchema,
  salesEnabled: z.boolean().default(false),
});

const updateSeriesSchema = z
  .object({
    title: z.string().trim().min(3, 'Title is required.').max(180).optional(),
    description: z.union([z.string().trim().max(4000), z.null()]).optional(),
    imageUrl: z.union([z.string().url().max(500), z.literal(''), z.null()]).optional(),
    isPublished: z.boolean().optional(),
    isPremium: z.boolean().optional(),
    priceInCents: priceInCentsSchema,
    salesEnabled: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

const addAssetsSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1, 'Provide at least one asset.'),
});

const reorderAssetsSchema = z.object({
  assetIds: z.array(z.string().uuid()),
});

const uuidParamSchema = z.string().uuid();

async function assertSeriesSalesReady(seriesId: string, priceInCents: number | null | undefined) {
  if (!priceInCents || priceInCents <= 0) {
    throw new Error('SALES_PRICE_REQUIRED');
  }

  const [assetCountRow] = await db
    .select({ assetCount: count(seriesAssets.assetId) })
    .from(seriesAssets)
    .where(eq(seriesAssets.seriesId, seriesId));

  if (Number(assetCountRow?.assetCount ?? 0) < 1) {
    throw new Error('SALES_RECORDINGS_REQUIRED');
  }
}

export function registerSeriesRoutes(app: Hono) {
  registerSeriesStoreRoutes(app);

  // List series (users see published only, staff see all)
  app.get('/series', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, 401);
    }

    const parsed = listQuerySchema.safeParse({
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
      search: c.req.query('search'),
    });

    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_QUERY', message: parsed.error.message } }, 400);
    }

    const { page, pageSize, search } = parsed.data;
    const role = session?.user ? await getOptionalUserRole(session.user.id) : null;
    const isStaff = role && ['owner', 'admin', 'manager'].includes(role);

    const filters: ReturnType<typeof eq>[] = [];
    if (!isStaff) {
      filters.push(eq(series.isPublished, true));
    }
    if (search) {
      filters.push(ilike(series.title, `%${escapeLikePattern(search)}%`));
    }

    const whereClause = filters.length ? and(...filters) : undefined;

    // Get total count
    const [totalResult] = await db
      .select({ value: count(series.id) })
      .from(series)
      .where(whereClause);

    const offset = (page - 1) * pageSize;

    // Get series list
    const seriesList = await db
      .select({
        id: series.id,
        title: series.title,
        description: series.description,
        imageUrl: series.imageUrl,
        sortOrder: series.sortOrder,
        isPublished: series.isPublished,
        isPremium: series.isPremium,
        priceInCents: series.priceInCents,
        salesEnabled: series.salesEnabled,
        createdAt: series.createdAt,
      })
      .from(series)
      .where(whereClause)
      .orderBy(series.sortOrder, desc(series.createdAt))
      .limit(pageSize)
      .offset(offset);

    // Get asset counts for each series
    const seriesIds = seriesList.map((s) => s.id);
    const countsMap = new Map<string, number>();

    if (seriesIds.length > 0) {
      const assetCounts = await db
        .select({
          seriesId: seriesAssets.seriesId,
          assetCount: count(seriesAssets.assetId),
        })
        .from(seriesAssets)
        .where(inArray(seriesAssets.seriesId, seriesIds))
        .groupBy(seriesAssets.seriesId);

      for (const ac of assetCounts) {
        countsMap.set(ac.seriesId, Number(ac.assetCount));
      }
    }

    const seriesIdsForAccess = seriesList.map((s) => s.id);
    const [purchasedIds, seriesGrantIds] = !isStaff
      ? await Promise.all([
          getPurchasedSeriesIds(session.user.id, seriesIdsForAccess),
          getActiveSeriesGrantIds(session.user.id, seriesIdsForAccess),
        ])
      : [new Set<string>(), new Set<string>()];

    const items = seriesList.map((s) => {
      const assetCount = countsMap.get(s.id) ?? 0;
      return {
        ...s,
        assetCount,
        isSellable: isSeriesSellable({
          salesEnabled: s.salesEnabled,
          priceInCents: s.priceInCents ?? 0,
          isPublished: s.isPublished,
          assetCount,
        }),
        hasPurchased: purchasedIds.has(s.id),
        hasSeriesGrant: seriesGrantIds.has(s.id),
      };
    });

    return c.json({
      items,
      pagination: { page, pageSize, total: Number(totalResult?.value ?? 0) },
    });
  });

  // Get single series with assets
  app.get('/series/:id', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, 401);
    }

    const idParam = c.req.param('id');
    const idParsed = uuidParamSchema.safeParse(idParam);
    if (!idParsed.success) {
      return c.json(
        { error: { code: 'INVALID_PARAM', message: 'Series ID must be a valid UUID.' } },
        400,
      );
    }
    const id = idParsed.data;

    const [role, seriesRows] = await Promise.all([
      getOptionalUserRole(session.user.id),
      db
        .select({
          id: series.id,
          title: series.title,
          description: series.description,
          imageUrl: series.imageUrl,
          sortOrder: series.sortOrder,
          isPublished: series.isPublished,
          isPremium: series.isPremium,
          priceInCents: series.priceInCents,
          salesEnabled: series.salesEnabled,
          trackId: series.trackId,
          createdAt: series.createdAt,
          updatedAt: series.updatedAt,
        })
        .from(series)
        .where(eq(series.id, id))
        .limit(1),
    ]);
    const isStaff = role ? ['owner', 'admin', 'manager'].includes(role) : false;
    const [seriesRecord] = seriesRows;

    if (!seriesRecord) {
      return c.json({ error: { code: 'SERIES_NOT_FOUND', message: 'Series not found.' } }, 404);
    }

    // Non-staff can only see published series
    if (!isStaff && !seriesRecord.isPublished) {
      return c.json({ error: { code: 'SERIES_NOT_FOUND', message: 'Series not found.' } }, 404);
    }

    const isSubscriber = !isStaff ? await hasActiveSubscription(session.user.id) : false;
    let hasTrackBooking = false;
    let hasSeriesGrant = false;
    if (!isStaff && !isSubscriber) {
      const [bookingRows, grantRows] = await Promise.all([
        seriesRecord.trackId
          ? db
              .select({ id: trackBookings.id })
              .from(trackBookings)
              .where(
                activeTrackBookingWhere(
                  eq(trackBookings.trackId, seriesRecord.trackId),
                  eq(trackBookings.userId, session.user.id),
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
              eq(seriesAccessGrants.userId, session.user.id),
              isNull(seriesAccessGrants.revokedAt),
            ),
          )
          .limit(1),
      ]);

      hasTrackBooking = Boolean(bookingRows[0]);
      hasSeriesGrant = Boolean(grantRows[0]);
    }

    const accessContext = {
      isStaff,
      isSubscriber,
      hasTrackBooking,
      hasSeriesGrant,
      seriesIsPremium: seriesRecord.isPremium,
    };
    const hasSeriesAccess = resolveSeriesAccess(accessContext);
    const isPremiumLocked = !hasSeriesAccess;
    const purchasedIds =
      !isStaff && session.user.id
        ? await getPurchasedSeriesIds(session.user.id, [seriesRecord.id])
        : new Set<string>();

    // Get assets in series with permission fields
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

    const recordingCount = seriesAssetsList.length;
    const isSellable = isSeriesSellable({
      salesEnabled: seriesRecord.salesEnabled,
      priceInCents: seriesRecord.priceInCents ?? 0,
      isPublished: seriesRecord.isPublished,
      assetCount: recordingCount,
    });

    // Get user's registered event IDs for permission checking
    let userEventIds = new Set<string>();
    if (!isStaff && !isSubscriber && !hasTrackBooking && !hasSeriesGrant && !isPremiumLocked) {
      const registrations = await db
        .select({ eventId: eventAttendees.eventId })
        .from(eventAttendees)
        .where(
          and(eq(eventAttendees.userId, session.user.id), eq(eventAttendees.status, 'active')),
        );
      userEventIds = new Set(registrations.map((r) => r.eventId));
    }

    // Map assets with access control
    const assets = seriesAssetsList.map((sa) => {
      const hasAccess = resolveSeriesAssetAccess({
        ...accessContext,
        assetIsPremium: sa.asset.isPremium,
        assetIsPublic: sa.asset.isPublic,
        assetEventId: sa.asset.eventId,
        userEventIds,
      });

      return {
        id: sa.asset.id,
        title: sa.asset.title,
        description: sa.asset.description,
        fileType: sa.asset.fileType,
        thumbnailUrl: sa.asset.thumbnailUrl,
        // Only include content URLs if user has access
        videoUrl: hasAccess ? sa.asset.videoUrl : null,
        documentUrl: hasAccess ? sa.asset.documentUrl : null,
        embedUrl: hasAccess ? sa.asset.embedUrl : null,
        embedType: sa.asset.embedType,
        viewCount: sa.asset.viewCount,
        createdAt: sa.asset.createdAt,
        sortOrder: sa.sortOrder,
        eventId: sa.asset.eventId,
        isPublic: sa.asset.isPublic,
        isPremium: sa.asset.isPremium,
        hasAccess,
      };
    });

    return c.json({
      ...seriesRecord,
      assetCount: assets.length,
      assets,
      hasAccess: hasSeriesAccess,
      hasPurchased: purchasedIds.has(seriesRecord.id),
      hasSeriesGrant,
      isSellable,
    });
  });

  // Create series
  app.post('/series', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = await c.req.json().catch(() => ({}));
    const parsed = createSeriesSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
    }

    const payload = parsed.data;

    const [created] = await db
      .insert(series)
      .values({
        title: payload.title,
        description: payload.description ?? null,
        imageUrl: payload.imageUrl || null,
        isPublished: payload.isPublished,
        isPremium: payload.isPremium,
        priceInCents: payload.priceInCents ?? null,
        salesEnabled: payload.salesEnabled,
      })
      .returning();

    return c.json({ series: created }, 201);
  });

  // Update series
  app.put('/series/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParam = c.req.param('id');
    const idParsed = uuidParamSchema.safeParse(idParam);
    if (!idParsed.success) {
      return c.json(
        { error: { code: 'INVALID_PARAM', message: 'Series ID must be a valid UUID.' } },
        400,
      );
    }
    const id = idParsed.data;

    const body = await c.req.json().catch(() => ({}));
    const parsed = updateSeriesSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
    }

    const updates = parsed.data;
    const [currentSeries] = await db.select().from(series).where(eq(series.id, id)).limit(1);
    if (!currentSeries) {
      return c.json({ error: { code: 'SERIES_NOT_FOUND', message: 'Series not found.' } }, 404);
    }

    const nextSalesEnabled = updates.salesEnabled ?? currentSeries.salesEnabled;
    const nextPriceInCents =
      updates.priceInCents !== undefined ? updates.priceInCents : currentSeries.priceInCents;

    if (nextSalesEnabled) {
      try {
        await assertSeriesSalesReady(id, nextPriceInCents);
      } catch (error) {
        const code = error instanceof Error ? error.message : 'SALES_NOT_READY';
        const message =
          code === 'SALES_RECORDINGS_REQUIRED'
            ? 'Add at least one recording before enabling sales.'
            : 'Set a price greater than zero before enabling sales.';
        return c.json({ error: { code, message } }, 400);
      }
    }

    const updateValues: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.title !== undefined) updateValues.title = updates.title;
    if (updates.description !== undefined) updateValues.description = updates.description ?? null;
    if (updates.imageUrl !== undefined) updateValues.imageUrl = updates.imageUrl || null;
    if (updates.isPublished !== undefined) updateValues.isPublished = updates.isPublished;
    if (updates.isPremium !== undefined) updateValues.isPremium = updates.isPremium;
    if (updates.priceInCents !== undefined) updateValues.priceInCents = updates.priceInCents;
    if (updates.salesEnabled !== undefined) updateValues.salesEnabled = updates.salesEnabled;
    if (updates.sortOrder !== undefined) updateValues.sortOrder = updates.sortOrder;

    const [updated] = await db
      .update(series)
      .set(updateValues)
      .where(eq(series.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: { code: 'SERIES_NOT_FOUND', message: 'Series not found.' } }, 404);
    }

    return c.json({ series: updated });
  });

  // Delete series
  app.delete('/series/:id', async (c) => {
    const admin = await requireAdmin(c);
    if ('response' in admin) return admin.response;

    const idParam = c.req.param('id');
    const idParsed = uuidParamSchema.safeParse(idParam);
    if (!idParsed.success) {
      return c.json(
        { error: { code: 'INVALID_PARAM', message: 'Series ID must be a valid UUID.' } },
        400,
      );
    }
    const id = idParsed.data;

    const deleted = await db.delete(series).where(eq(series.id, id)).returning({ id: series.id });

    if (deleted.length === 0) {
      return c.json({ error: { code: 'SERIES_NOT_FOUND', message: 'Series not found.' } }, 404);
    }

    return c.json({ success: true });
  });

  // Add assets to series
  app.post('/series/:id/assets', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const seriesIdParam = c.req.param('id');
    const seriesIdParsed = uuidParamSchema.safeParse(seriesIdParam);
    if (!seriesIdParsed.success) {
      return c.json(
        { error: { code: 'INVALID_PARAM', message: 'Series ID must be a valid UUID.' } },
        400,
      );
    }
    const seriesId = seriesIdParsed.data;

    const body = await c.req.json().catch(() => ({}));
    const parsed = addAssetsSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
    }

    // Verify series exists
    const [seriesRecord] = await db
      .select({ id: series.id })
      .from(series)
      .where(eq(series.id, seriesId));
    if (!seriesRecord) {
      return c.json({ error: { code: 'SERIES_NOT_FOUND', message: 'Series not found.' } }, 404);
    }

    // Get current max sort order
    const [maxSort] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${seriesAssets.sortOrder}), -1)` })
      .from(seriesAssets)
      .where(eq(seriesAssets.seriesId, seriesId));

    let sortOrder = (maxSort?.maxOrder ?? -1) + 1;

    // Get existing asset IDs to avoid duplicates
    const existing = await db
      .select({ assetId: seriesAssets.assetId })
      .from(seriesAssets)
      .where(eq(seriesAssets.seriesId, seriesId));

    const existingIds = new Set(existing.map((e) => e.assetId));
    const newAssetIds = parsed.data.assetIds.filter((id) => !existingIds.has(id));

    if (newAssetIds.length === 0) {
      return c.json({ success: true, addedCount: 0 });
    }

    // Verify assets exist
    const validAssets = await db
      .select({ id: libraryAssets.id })
      .from(libraryAssets)
      .where(inArray(libraryAssets.id, newAssetIds));

    const validIds = new Set(validAssets.map((a) => a.id));
    const toInsert = newAssetIds.filter((id) => validIds.has(id));

    if (toInsert.length > 0) {
      await db.insert(seriesAssets).values(
        toInsert.map((assetId) => ({
          seriesId,
          assetId,
          sortOrder: sortOrder++,
        })),
      );
    }

    return c.json({ success: true, addedCount: toInsert.length });
  });

  // Remove asset from series
  app.delete('/series/:id/assets/:assetId', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const seriesIdParam = c.req.param('id');
    const seriesIdParsed = uuidParamSchema.safeParse(seriesIdParam);
    if (!seriesIdParsed.success) {
      return c.json(
        { error: { code: 'INVALID_PARAM', message: 'Series ID must be a valid UUID.' } },
        400,
      );
    }
    const seriesId = seriesIdParsed.data;

    const assetIdParam = c.req.param('assetId');
    const assetIdParsed = uuidParamSchema.safeParse(assetIdParam);
    if (!assetIdParsed.success) {
      return c.json(
        { error: { code: 'INVALID_PARAM', message: 'Asset ID must be a valid UUID.' } },
        400,
      );
    }
    const assetId = assetIdParsed.data;

    const deleted = await db
      .delete(seriesAssets)
      .where(and(eq(seriesAssets.seriesId, seriesId), eq(seriesAssets.assetId, assetId)))
      .returning({ id: seriesAssets.id });

    if (deleted.length === 0) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Asset not found in series.' } }, 404);
    }

    return c.json({ success: true });
  });

  // Reorder assets in series
  app.put('/series/:id/assets/reorder', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const seriesIdParam = c.req.param('id');
    const seriesIdParsed = uuidParamSchema.safeParse(seriesIdParam);
    if (!seriesIdParsed.success) {
      return c.json(
        { error: { code: 'INVALID_PARAM', message: 'Series ID must be a valid UUID.' } },
        400,
      );
    }
    const seriesId = seriesIdParsed.data;

    const body = await c.req.json().catch(() => ({}));
    const parsed = reorderAssetsSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
    }

    const { assetIds } = parsed.data;

    // Update sort order for all assets in parallel within a transaction
    await db.transaction(async (tx) => {
      await Promise.all(
        assetIds.map((assetId, i) =>
          tx
            .update(seriesAssets)
            .set({ sortOrder: i })
            .where(and(eq(seriesAssets.seriesId, seriesId), eq(seriesAssets.assetId, assetId))),
        ),
      );
    });

    return c.json({ success: true });
  });
}
