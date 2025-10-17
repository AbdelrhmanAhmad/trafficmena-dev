import { and, count, eq, ilike } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { libraryAssets } from '../../db/schema/index.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { notImplemented } from './utils.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().optional(),
  type: z.enum(['Document', 'Video', 'Presentation']).optional(),
});

const updateAssetSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
});

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

  app.post('/library', (c) => notImplemented(c, { feature: 'library.create' }));

  app.put('/library/:id', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session || !session.user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to update assets.',
          },
        },
        401,
      );
    }

    const id = c.req.param('id');
    const body = updateAssetSchema.safeParse(await c.req.json().catch(() => ({})));

    if (!body.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: body.error.message,
          },
        },
        400,
      );
    }

    if (Object.keys(body.data).length === 0) {
      return c.json({ success: true, message: 'No changes applied.' });
    }

    await db.update(libraryAssets).set(body.data).where(eq(libraryAssets.id, id));

    return c.json({ success: true });
  });

  app.delete('/library/:id', (c) => notImplemented(c, { feature: 'library.delete' }));
  app.post('/library/upload', (c) => notImplemented(c, { feature: 'library.upload' }));
  app.get('/library/files/:assetId', (c) => notImplemented(c, { feature: 'library.download' }));
}
