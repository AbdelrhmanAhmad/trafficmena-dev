import { and, count, eq, ilike } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { libraryAssets } from '../../db/schema/index.js';
import { requireAdmin, requireManager } from './utils.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().optional(),
  type: z.enum(['Document', 'Video', 'Presentation']).optional(),
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
  eventId: z.union([z.string().uuid('Link an existing event by its ID.'), z.null()]).optional(),
  fileSizeBytes: z
    .union([z.number().int().min(0), z.null()])
    .optional()
    .refine((value) => value == null || value <= 20 * 1024 * 1024, {
      message: 'File size must be 20 MB or less.',
    }),
});

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
    const parsed = listQuerySchema.safeParse({
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
      search: c.req.query('search'),
      type: c.req.query('type'),
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

    const { page, pageSize, search, type } = parsed.data;
    const filters: any[] = [];

    if (type) {
      filters.push(eq(libraryAssets.fileType, type));
    }

    if (search) {
      filters.push(ilike(libraryAssets.title, `%${search}%`));
    }

    const whereClause = filters.length ? and(...filters) : undefined;

    const totalResult = await (whereClause
      ? db
          .select({ value: count(libraryAssets.id) })
          .from(libraryAssets)
          .where(whereClause)
      : db.select({ value: count(libraryAssets.id) }).from(libraryAssets));

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
        eventId: libraryAssets.eventId,
        viewCount: libraryAssets.viewCount,
        downloadCount: libraryAssets.downloadCount,
        fileSizeBytes: libraryAssets.fileSizeBytes,
        createdAt: libraryAssets.createdAt,
      })
      .from(libraryAssets);

    const filteredItemsQuery = whereClause ? baseItemsQuery.where(whereClause) : baseItemsQuery;

    const items = await filteredItemsQuery
      .orderBy(libraryAssets.createdAt)
      .limit(pageSize)
      .offset(offset);

    return c.json({
      items,
      pagination: {
        page,
        pageSize,
        total: Number(totalResult?.[0]?.value ?? 0),
      },
    });
  });

  app.get('/library/:id', async (c) => {
    const id = c.req.param('id');

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
        eventId: libraryAssets.eventId,
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

    return c.json(asset[0]);
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
        eventId: payload.eventId ?? null,
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
        eventId: libraryAssets.eventId,
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

    const id = c.req.param('id');
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
    if (updates.eventId !== undefined) updateValues.eventId = updates.eventId ?? null;
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
        eventId: libraryAssets.eventId,
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

    const id = c.req.param('id');
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
