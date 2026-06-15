import type { SQL } from 'drizzle-orm';
import { and, count, eq, ilike, inArray, isNull, notInArray, or } from 'drizzle-orm';
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
import { hasActiveSubscription } from './subscriptionShared.js';
import { escapeLikePattern, getOptionalUserRole, requireAdmin, requireManager } from './utils.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().optional(),
  type: z.enum(['Document', 'Video', 'Presentation']).optional(),
  eventIds: z.string().optional(), // Comma-separated UUIDs for filtering by event
  excludeInTracks: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
});

const optionalText = z.union([z.string().trim().max(8000), z.null()]).optional();

const urlSchema = z
  .union([z.string().trim().url('Provide a valid URL.').max(1000), z.null()])
  .optional();

const optionalShortString = z.union([z.string().trim().max(120), z.null()]).optional();

const assetObjectSchema = z.object({
  title: z.string().trim().min(3, 'Title is required.').max(200),
  description: optionalText,
  fileType: z.enum(['Document', 'Video', 'Presentation']),
  videoUrl: urlSchema,
  documentUrl: urlSchema,
  embedUrl: urlSchema,
  embedType: optionalShortString,
  thumbnailUrl: z.union([z.string().url().max(500), z.literal(''), z.null()]).optional(),
  eventId: z.union([z.string().uuid('Link an existing event by its ID.'), z.null()]).optional(),
  isPublic: z.boolean().optional().default(false),
  isPremium: z.boolean().optional().default(false),
  fileSizeBytes: z
    .union([z.number().int().min(0), z.null()])
    .optional()
    .refine((value) => value == null || value <= 20 * 1024 * 1024, {
      message: 'File size must be 20 MB or less.',
    }),
});

const uuidParamSchema = z.string().uuid();

const createAssetSchema = assetObjectSchema.superRefine((payload, ctx) => {
  if (payload.fileType === 'Video') {
    if (!payload.videoUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['videoUrl'],
        message: 'Video URL is required for video assets.',
      });
    }
  }
  if (payload.fileType === 'Document') {
    if (!payload.documentUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documentUrl'],
        message: 'Document URL is required for document assets.',
      });
    }
  }
  if (payload.fileType === 'Presentation') {
    if (!payload.embedUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['embedUrl'],
        message: 'Embed URL is required for presentation assets.',
      });
    }
  }
});

const updateAssetSchema = assetObjectSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

export function registerLibraryRoutes(app: Hono) {
  app.get('/library', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session || !session.user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          },
        },
        401,
      );
    }

    const parsed = listQuerySchema.safeParse({
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
      search: c.req.query('search'),
      type: c.req.query('type'),
      eventIds: c.req.query('eventIds'),
      excludeInTracks: c.req.query('excludeInTracks'),
    });

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_QUERY',
            message: parsed.error.message,
          },
        },
        400,
      );
    }

    const { page, pageSize, search, type, eventIds, excludeInTracks } = parsed.data;
    const filters: SQL<unknown>[] = [];

    // Permission filtering: staff/subscribers see all, free users see accessible + premium assets
    const role = await getOptionalUserRole(session.user.id);
    const isStaff = role && ['owner', 'admin', 'manager'].includes(role);
    const isSubscriber = !isStaff ? await hasActiveSubscription(session.user.id) : false;
    let registeredEventIds = new Set<string>();

    if (!isStaff && !isSubscriber) {
      const registrations = await db
        .select({ eventId: eventAttendees.eventId })
        .from(eventAttendees)
        .where(
          and(eq(eventAttendees.userId, session.user.id), eq(eventAttendees.status, 'active')),
        );
      const registeredEventList = registrations.map((r) => r.eventId);
      registeredEventIds = new Set(registeredEventList);

      const accessConditions = [
        eq(libraryAssets.isPremium, true),
        eq(libraryAssets.isPublic, true),
        isNull(libraryAssets.eventId),
      ];

      if (registeredEventList.length > 0) {
        accessConditions.push(inArray(libraryAssets.eventId, registeredEventList));
      }

      const accessFilter = or(...accessConditions);
      if (accessFilter) {
        filters.push(accessFilter);
      }
    }

    if (type) {
      filters.push(eq(libraryAssets.fileType, type));
    }

    if (search) {
      filters.push(ilike(libraryAssets.title, `%${escapeLikePattern(search)}%`));
    }

    // Filter by event IDs (comma-separated UUIDs)
    if (eventIds) {
      const ids = eventIds.split(',').filter((id) => id.length === 36);
      if (ids.length > 0) {
        filters.push(inArray(libraryAssets.eventId, ids));
      }
    }

    // Exclude assets that are in any series
    if (excludeInTracks) {
      const assetIdsInSeries = db.select({ assetId: seriesAssets.assetId }).from(seriesAssets);
      filters.push(notInArray(libraryAssets.id, assetIdsInSeries));
    }

    const whereClause = filters.length ? and(...filters) : undefined;

    const offset = (page - 1) * pageSize;

    const baseItemsQuery = db
      .select({
        id: libraryAssets.id,
        title: libraryAssets.title,
        description: libraryAssets.description,
        fileType: libraryAssets.fileType,
        fileUrl: libraryAssets.fileUrl,
        videoUrl: libraryAssets.videoUrl,
        documentUrl: libraryAssets.documentUrl,
        embedUrl: libraryAssets.embedUrl,
        embedType: libraryAssets.embedType,
        thumbnailUrl: libraryAssets.thumbnailUrl,
        eventId: libraryAssets.eventId,
        isPublic: libraryAssets.isPublic,
        isPremium: libraryAssets.isPremium,
        viewCount: libraryAssets.viewCount,
        downloadCount: libraryAssets.downloadCount,
        fileSizeBytes: libraryAssets.fileSizeBytes,
        createdAt: libraryAssets.createdAt,
      })
      .from(libraryAssets);

    const filteredItemsQuery = whereClause ? baseItemsQuery.where(whereClause) : baseItemsQuery;

    const totalQuery = whereClause
      ? db
          .select({ value: count(libraryAssets.id) })
          .from(libraryAssets)
          .where(whereClause)
      : db.select({ value: count(libraryAssets.id) }).from(libraryAssets);

    const [totalResult, items] = await Promise.all([
      totalQuery,
      filteredItemsQuery.orderBy(libraryAssets.createdAt).limit(pageSize).offset(offset),
    ]);

    let bookedAssetIds = new Set<string>();
    let grantedAssetIds = new Set<string>();
    if (!isStaff && !isSubscriber) {
      const premiumAssetIds = items.filter((item) => item.isPremium).map((item) => item.id);

      if (premiumAssetIds.length > 0) {
        const [bookedAssets, grantedAssets] = await Promise.all([
          db
            .select({ assetId: seriesAssets.assetId })
            .from(seriesAssets)
            .innerJoin(series, eq(series.id, seriesAssets.seriesId))
            .innerJoin(trackBookings, eq(trackBookings.trackId, series.trackId))
            .where(
              activeTrackBookingWhere(
                eq(trackBookings.userId, session.user.id),
                inArray(seriesAssets.assetId, premiumAssetIds),
              ),
            ),
          db
            .select({ assetId: seriesAssets.assetId })
            .from(seriesAssets)
            .innerJoin(seriesAccessGrants, eq(seriesAccessGrants.seriesId, seriesAssets.seriesId))
            .where(
              and(
                eq(seriesAccessGrants.userId, session.user.id),
                isNull(seriesAccessGrants.revokedAt),
                inArray(seriesAssets.assetId, premiumAssetIds),
              ),
            ),
        ]);

        bookedAssetIds = new Set(bookedAssets.map((asset) => asset.assetId));
        grantedAssetIds = new Set(grantedAssets.map((asset) => asset.assetId));
      }
    }

    const mappedItems = items.map((item) => {
      let hasAccess = isStaff || isSubscriber;
      if (!hasAccess) {
        if (item.isPremium) {
          hasAccess =
            bookedAssetIds.has(item.id) ||
            grantedAssetIds.has(item.id) ||
            (item.eventId ? registeredEventIds.has(item.eventId) : false);
        } else {
          hasAccess = item.isPublic || !item.eventId || registeredEventIds.has(item.eventId);
        }
      }

      if (hasAccess) {
        return { ...item, hasAccess };
      }

      return {
        ...item,
        fileUrl: null,
        videoUrl: null,
        documentUrl: null,
        embedUrl: null,
        hasAccess: false,
      };
    });

    return c.json({
      items: mappedItems,
      pagination: {
        page,
        pageSize,
        total: Number(totalResult?.[0]?.value ?? 0),
      },
    });
  });

  app.get('/library/:id', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session || !session.user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          },
        },
        401,
      );
    }

    const idParam = c.req.param('id');
    const idParsed = uuidParamSchema.safeParse(idParam);
    if (!idParsed.success) {
      return c.json(
        { error: { code: 'INVALID_PARAM', message: 'Asset ID must be a valid UUID.' } },
        400,
      );
    }
    const id = idParsed.data;

    const asset = await db
      .select({
        id: libraryAssets.id,
        title: libraryAssets.title,
        description: libraryAssets.description,
        fileType: libraryAssets.fileType,
        fileUrl: libraryAssets.fileUrl,
        videoUrl: libraryAssets.videoUrl,
        documentUrl: libraryAssets.documentUrl,
        embedUrl: libraryAssets.embedUrl,
        embedType: libraryAssets.embedType,
        thumbnailUrl: libraryAssets.thumbnailUrl,
        eventId: libraryAssets.eventId,
        isPublic: libraryAssets.isPublic,
        isPremium: libraryAssets.isPremium,
        viewCount: libraryAssets.viewCount,
        downloadCount: libraryAssets.downloadCount,
        fileSizeBytes: libraryAssets.fileSizeBytes,
        createdAt: libraryAssets.createdAt,
      })
      .from(libraryAssets)
      .where(eq(libraryAssets.id, id))
      .limit(1);

    if (!asset[0]) {
      return c.json(
        {
          error: {
            code: 'ASSET_NOT_FOUND',
            message: 'Library asset not found',
          },
        },
        404,
      );
    }

    const role = await getOptionalUserRole(session.user.id);
    const isStaff = role && ['owner', 'admin', 'manager'].includes(role);
    const isSubscriber = !isStaff ? await hasActiveSubscription(session.user.id) : false;

    if (!isStaff && !isSubscriber) {
      let hasTrackBooking = false;
      let hasSeriesGrant = false;
      let hasRegistration = false;

      const registrationPromise = asset[0].eventId
        ? db
            .select({ id: eventAttendees.id })
            .from(eventAttendees)
            .where(
              and(
                eq(eventAttendees.eventId, asset[0].eventId),
                eq(eventAttendees.userId, session.user.id),
                eq(eventAttendees.status, 'active'),
              ),
            )
            .limit(1)
        : Promise.resolve([]);

      if (asset[0].isPremium) {
        const [registrationRows, bookingRows, seriesGrantRows] = await Promise.all([
          registrationPromise,
          db
            .select({ assetId: seriesAssets.assetId })
            .from(seriesAssets)
            .innerJoin(series, eq(series.id, seriesAssets.seriesId))
            .innerJoin(trackBookings, eq(trackBookings.trackId, series.trackId))
            .where(
              activeTrackBookingWhere(
                eq(trackBookings.userId, session.user.id),
                eq(seriesAssets.assetId, asset[0].id),
              ),
            )
            .limit(1),
          db
            .select({ assetId: seriesAssets.assetId })
            .from(seriesAssets)
            .innerJoin(seriesAccessGrants, eq(seriesAccessGrants.seriesId, seriesAssets.seriesId))
            .where(
              and(
                eq(seriesAssets.assetId, asset[0].id),
                eq(seriesAccessGrants.userId, session.user.id),
                isNull(seriesAccessGrants.revokedAt),
              ),
            )
            .limit(1),
        ]);

        hasRegistration = Boolean(registrationRows[0]);
        hasTrackBooking = Boolean(bookingRows[0]);
        hasSeriesGrant = Boolean(seriesGrantRows[0]);

        if (!hasTrackBooking && !hasSeriesGrant && !hasRegistration) {
          return c.json(
            {
              id: asset[0].id,
              title: asset[0].title,
              description: asset[0].description,
              fileType: asset[0].fileType,
              thumbnailUrl: asset[0].thumbnailUrl,
              eventId: asset[0].eventId,
              isPremium: asset[0].isPremium,
              hasAccess: false,
              error: {
                code: 'SUBSCRIPTION_REQUIRED',
                message: 'Subscribe to access this content.',
              },
            },
            403,
          );
        }
      } else if (asset[0].eventId) {
        const registrationRows = await registrationPromise;
        hasRegistration = Boolean(registrationRows[0]);
      }

      if (!asset[0].isPremium && asset[0].eventId && !asset[0].isPublic && !hasRegistration) {
        // Return metadata without content URLs
        return c.json(
          {
            id: asset[0].id,
            title: asset[0].title,
            description: asset[0].description,
            fileType: asset[0].fileType,
            thumbnailUrl: asset[0].thumbnailUrl,
            eventId: asset[0].eventId,
            isPremium: asset[0].isPremium,
            hasAccess: false,
            error: { code: 'REGISTRATION_REQUIRED', message: 'Register for event to access.' },
          },
          403,
        );
      }
    }

    return c.json({ ...asset[0], hasAccess: true });
  });

  app.post('/library', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = await c.req.json().catch(() => ({}));
    const parsed = createAssetSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: parsed.error.message,
          },
        },
        400,
      );
    }

    const payload = parsed.data;

    const [created] = await db
      .insert(libraryAssets)
      .values({
        title: payload.title,
        description: payload.description ?? null,
        fileType: payload.fileType,
        fileUrl: payload.documentUrl ?? payload.videoUrl ?? payload.embedUrl ?? null,
        videoUrl: payload.videoUrl ?? null,
        documentUrl: payload.documentUrl ?? null,
        embedUrl: payload.embedUrl ?? null,
        embedType: payload.embedType ?? null,
        thumbnailUrl: payload.thumbnailUrl || null,
        eventId: payload.eventId ?? null,
        isPublic: payload.isPublic ?? false,
        isPremium: payload.isPremium ?? false,
        fileSizeBytes: payload.fileSizeBytes ?? null,
      })
      .returning({
        id: libraryAssets.id,
        title: libraryAssets.title,
        description: libraryAssets.description,
        fileType: libraryAssets.fileType,
        fileUrl: libraryAssets.fileUrl,
        videoUrl: libraryAssets.videoUrl,
        documentUrl: libraryAssets.documentUrl,
        embedUrl: libraryAssets.embedUrl,
        embedType: libraryAssets.embedType,
        thumbnailUrl: libraryAssets.thumbnailUrl,
        eventId: libraryAssets.eventId,
        isPublic: libraryAssets.isPublic,
        isPremium: libraryAssets.isPremium,
        viewCount: libraryAssets.viewCount,
        downloadCount: libraryAssets.downloadCount,
        fileSizeBytes: libraryAssets.fileSizeBytes,
        createdAt: libraryAssets.createdAt,
      });

    return c.json({ asset: created }, 201);
  });

  app.put('/library/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParam = c.req.param('id');
    const idParsed = uuidParamSchema.safeParse(idParam);
    if (!idParsed.success) {
      return c.json(
        { error: { code: 'INVALID_PARAM', message: 'Asset ID must be a valid UUID.' } },
        400,
      );
    }
    const id = idParsed.data;

    const body = await c.req.json().catch(() => ({}));
    const parsed = updateAssetSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: parsed.error.message,
          },
        },
        400,
      );
    }

    const updates = parsed.data;
    const updateValues: Record<string, unknown> = {};

    if (updates.title !== undefined) updateValues.title = updates.title;
    if (updates.description !== undefined) updateValues.description = updates.description ?? null;
    if (updates.fileType !== undefined) updateValues.fileType = updates.fileType;
    if (updates.videoUrl !== undefined) updateValues.videoUrl = updates.videoUrl ?? null;
    if (updates.documentUrl !== undefined) updateValues.documentUrl = updates.documentUrl ?? null;
    if (updates.embedUrl !== undefined) updateValues.embedUrl = updates.embedUrl ?? null;
    if (updates.embedType !== undefined) updateValues.embedType = updates.embedType ?? null;
    if (updates.thumbnailUrl !== undefined)
      updateValues.thumbnailUrl = updates.thumbnailUrl || null;
    if (updates.eventId !== undefined) updateValues.eventId = updates.eventId ?? null;
    if (updates.isPublic !== undefined) updateValues.isPublic = updates.isPublic;
    if (updates.isPremium !== undefined) updateValues.isPremium = updates.isPremium;
    if (updates.fileSizeBytes !== undefined)
      updateValues.fileSizeBytes = updates.fileSizeBytes ?? null;

    const fileUrlCandidate =
      updates.documentUrl !== undefined
        ? updates.documentUrl
        : updates.videoUrl !== undefined
          ? updates.videoUrl
          : updates.embedUrl !== undefined
            ? updates.embedUrl
            : undefined;

    if (fileUrlCandidate !== undefined) {
      updateValues.fileUrl = fileUrlCandidate ?? null;
    }

    if (Object.keys(updateValues).length === 0) {
      return c.json({ success: true, message: 'No changes applied.' });
    }

    const [updated] = await db
      .update(libraryAssets)
      .set(updateValues)
      .where(eq(libraryAssets.id, id))
      .returning({
        id: libraryAssets.id,
        title: libraryAssets.title,
        description: libraryAssets.description,
        fileType: libraryAssets.fileType,
        fileUrl: libraryAssets.fileUrl,
        videoUrl: libraryAssets.videoUrl,
        documentUrl: libraryAssets.documentUrl,
        embedUrl: libraryAssets.embedUrl,
        embedType: libraryAssets.embedType,
        thumbnailUrl: libraryAssets.thumbnailUrl,
        eventId: libraryAssets.eventId,
        isPublic: libraryAssets.isPublic,
        isPremium: libraryAssets.isPremium,
        viewCount: libraryAssets.viewCount,
        downloadCount: libraryAssets.downloadCount,
        fileSizeBytes: libraryAssets.fileSizeBytes,
        createdAt: libraryAssets.createdAt,
      });

    if (!updated) {
      return c.json(
        {
          error: {
            code: 'ASSET_NOT_FOUND',
            message: 'Library asset not found',
          },
        },
        404,
      );
    }

    return c.json({ asset: updated });
  });

  app.delete('/library/:id', async (c) => {
    const admin = await requireAdmin(c);
    if ('response' in admin) return admin.response;

    const idParam = c.req.param('id');
    const idParsed = uuidParamSchema.safeParse(idParam);
    if (!idParsed.success) {
      return c.json(
        { error: { code: 'INVALID_PARAM', message: 'Asset ID must be a valid UUID.' } },
        400,
      );
    }
    const id = idParsed.data;

    const deleted = await db
      .delete(libraryAssets)
      .where(eq(libraryAssets.id, id))
      .returning({ id: libraryAssets.id });

    if (deleted.length === 0) {
      return c.json(
        {
          error: {
            code: 'ASSET_NOT_FOUND',
            message: 'Library asset not found',
          },
        },
        404,
      );
    }

    return c.json({ success: true });
  });
}
