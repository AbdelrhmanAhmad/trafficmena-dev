import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import {
  digitalProductFiles,
  digitalProductVideos,
  digitalProducts,
} from '../../db/schema/index.js';
import {
  getPurchasedDigitalProductIds,
  isDigitalProductSellable,
} from '../../services/digitalProductSales.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { requireManager, requireContentDelete } from './utils.js';

const fileTypeSchema = z.enum(['excel', 'markdown', 'html', 'text', 'powerpoint']);

const createProductSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(8000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  priceInCents: z.number().int().min(0).optional().nullable(),
  salesEnabled: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const updateProductSchema = createProductSchema.partial();

const fileInputSchema = z.object({
  fileType: fileTypeSchema,
  displayName: z.string().min(1).max(200),
  fileUrl: z.string().url(),
  sortOrder: z.number().int().optional(),
});

const videoInputSchema = z.object({
  title: z.string().min(1).max(200),
  videoUrl: z.string().trim().min(1).max(1000),
  sortOrder: z.number().int().optional(),
});

/** Max downloadable files attached to one digital product */
const MAX_FILES_PER_PRODUCT = 30;
/** Max video URLs attached to one digital product */
const MAX_VIDEOS_PER_PRODUCT = 20;

const addProductFilesBodySchema = z.union([
  fileInputSchema,
  z.object({
    files: z.array(fileInputSchema).min(1).max(20),
  }),
]);

const addProductVideosBodySchema = z.union([
  videoInputSchema,
  z.object({
    videos: z.array(videoInputSchema).min(1).max(10),
  }),
]);

const uuidParamSchema = z.string().uuid();

const publicListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

async function getProductFileCount(productId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(digitalProductFiles)
    .where(eq(digitalProductFiles.productId, productId));
  return row?.count ?? 0;
}

async function getProductVideoCount(productId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(digitalProductVideos)
    .where(eq(digitalProductVideos.productId, productId));
  return row?.count ?? 0;
}

async function loadProductVideos(productId: string) {
  return db
    .select()
    .from(digitalProductVideos)
    .where(eq(digitalProductVideos.productId, productId))
    .orderBy(asc(digitalProductVideos.sortOrder), asc(digitalProductVideos.createdAt));
}

export function registerDigitalProductRoutes(app: Hono) {
  // --- Store (authenticated members) — register before /:id ------------------

  app.get('/digital-products/store', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const filter = c.req.query('filter') === 'mine' ? 'mine' : 'all';
    const purchasedIds = await getPurchasedDigitalProductIds(session.user.id);

    const rows = await db
      .select({
        id: digitalProducts.id,
        title: digitalProducts.title,
        description: digitalProducts.description,
        imageUrl: digitalProducts.imageUrl,
        priceInCents: digitalProducts.priceInCents,
        salesEnabled: digitalProducts.salesEnabled,
        isPublished: digitalProducts.isPublished,
        sortOrder: digitalProducts.sortOrder,
        fileCount: sql<number>`count(distinct ${digitalProductFiles.id})::int`,
        firstVideoUrl: sql<string | null>`(
          SELECT v.video_url
          FROM digital_product_videos v
          WHERE v.product_id = ${digitalProducts.id}
          ORDER BY v.sort_order ASC, v.created_at ASC
          LIMIT 1
        )`,
      })
      .from(digitalProducts)
      .leftJoin(digitalProductFiles, eq(digitalProductFiles.productId, digitalProducts.id))
      .groupBy(digitalProducts.id)
      .orderBy(asc(digitalProducts.sortOrder), desc(digitalProducts.createdAt));

    const items = rows
      .filter((row) => {
        const purchased = purchasedIds.has(row.id);
        if (filter === 'mine') return purchased;
        return isDigitalProductSellable(row) || purchased;
      })
      .map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        image_url: row.imageUrl,
        price_in_cents: row.priceInCents,
        is_purchased: purchasedIds.has(row.id),
        is_sellable: isDigitalProductSellable(row),
        file_count: row.fileCount,
        first_video_url: row.firstVideoUrl,
      }));

    return c.json({ data: { items } });
  });

  app.get('/digital-products/store/:id', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid product id.' } }, 400);
    }

    const [product] = await db
      .select()
      .from(digitalProducts)
      .where(eq(digitalProducts.id, idParsed.data))
      .limit(1);

    if (!product) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Product not found.' } }, 404);
    }

    const fileCount = await getProductFileCount(product.id);
    const purchasedIds = await getPurchasedDigitalProductIds(session.user.id, [product.id]);
    const isPurchased = purchasedIds.has(product.id);
    const sellable = isDigitalProductSellable({ ...product, fileCount });

    if (!isPurchased && !sellable) {
      return c.json({ error: { code: 'NOT_AVAILABLE', message: 'Product not available.' } }, 404);
    }

    const files = isPurchased
      ? await db
          .select()
          .from(digitalProductFiles)
          .where(eq(digitalProductFiles.productId, product.id))
          .orderBy(asc(digitalProductFiles.sortOrder), asc(digitalProductFiles.createdAt))
      : [];

    const videos = isPurchased ? await loadProductVideos(product.id) : [];

    return c.json({
      data: {
        product: {
          id: product.id,
          title: product.title,
          description: product.description,
          image_url: product.imageUrl,
          price_in_cents: product.priceInCents,
          is_purchased: isPurchased,
          is_sellable: sellable,
          file_count: fileCount,
        },
        files: isPurchased
          ? files.map((f) => ({
              id: f.id,
              file_type: f.fileType,
              display_name: f.displayName,
              file_url: f.fileUrl,
            }))
          : [],
        videos: isPurchased
          ? videos.map((v) => ({
              id: v.id,
              title: v.title,
              video_url: v.videoUrl,
            }))
          : [],
      },
    });
  });

  // --- Public catalog (guests + optional auth for purchase flags) ----------

  app.get('/digital-products/public', async (c) => {
    const parsed = publicListQuerySchema.safeParse({
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
    });
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_QUERY', message: parsed.error.message } }, 400);
    }

    const { page, pageSize } = parsed.data;
    const session = await getSessionFromRequest(c);
    const userId = session?.user?.id ?? null;

    const rows = await db
      .select({
        id: digitalProducts.id,
        title: digitalProducts.title,
        description: digitalProducts.description,
        imageUrl: digitalProducts.imageUrl,
        priceInCents: digitalProducts.priceInCents,
        salesEnabled: digitalProducts.salesEnabled,
        isPublished: digitalProducts.isPublished,
        sortOrder: digitalProducts.sortOrder,
        fileCount: sql<number>`count(distinct ${digitalProductFiles.id})::int`,
        firstVideoUrl: sql<string | null>`(
          SELECT v.video_url
          FROM digital_product_videos v
          WHERE v.product_id = ${digitalProducts.id}
          ORDER BY v.sort_order ASC, v.created_at ASC
          LIMIT 1
        )`,
      })
      .from(digitalProducts)
      .leftJoin(digitalProductFiles, eq(digitalProductFiles.productId, digitalProducts.id))
      .groupBy(digitalProducts.id)
      .orderBy(asc(digitalProducts.sortOrder), desc(digitalProducts.createdAt));

    let items = rows
      .filter((row) => isDigitalProductSellable(row))
      .map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        image_url: row.imageUrl,
        price_in_cents: row.priceInCents,
        is_sellable: true,
        file_count: row.fileCount,
        first_video_url: row.firstVideoUrl,
        is_purchased: false,
      }));

    if (userId && items.length > 0) {
      const purchasedIds = await getPurchasedDigitalProductIds(
        userId,
        items.map((item) => item.id),
      );
      items = items.map((item) => ({
        ...item,
        is_purchased: purchasedIds.has(item.id),
      }));
    }

    const total = items.length;
    const offset = (page - 1) * pageSize;
    const pageItems = items.slice(offset, offset + pageSize);

    return c.json({
      data: {
        items: pageItems,
        pagination: { page, pageSize, total },
      },
    });
  });

  app.get('/digital-products/public/:id', async (c) => {
    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid product id.' } }, 400);
    }

    const session = await getSessionFromRequest(c);
    const userId = session?.user?.id ?? null;

    const [product] = await db
      .select()
      .from(digitalProducts)
      .where(eq(digitalProducts.id, idParsed.data))
      .limit(1);

    if (!product) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Product not found.' } }, 404);
    }

    const fileCount = await getProductFileCount(product.id);
    const sellable = isDigitalProductSellable({ ...product, fileCount });

    if (!sellable) {
      return c.json({ error: { code: 'NOT_AVAILABLE', message: 'Product not available.' } }, 404);
    }

    let isPurchased = false;
    if (userId) {
      const purchasedIds = await getPurchasedDigitalProductIds(userId, [product.id]);
      isPurchased = purchasedIds.has(product.id);
    }

    const [files, videos] = await Promise.all([
      db
        .select({
          id: digitalProductFiles.id,
          displayName: digitalProductFiles.displayName,
          fileType: digitalProductFiles.fileType,
        })
        .from(digitalProductFiles)
        .where(eq(digitalProductFiles.productId, product.id))
        .orderBy(asc(digitalProductFiles.sortOrder), asc(digitalProductFiles.createdAt)),
      db
        .select({
          id: digitalProductVideos.id,
          title: digitalProductVideos.title,
        })
        .from(digitalProductVideos)
        .where(eq(digitalProductVideos.productId, product.id))
        .orderBy(asc(digitalProductVideos.sortOrder), asc(digitalProductVideos.createdAt)),
    ]);

    return c.json({
      data: {
        product: {
          id: product.id,
          title: product.title,
          description: product.description,
          image_url: product.imageUrl,
          price_in_cents: product.priceInCents,
          is_purchased: isPurchased,
          is_sellable: sellable,
          file_count: fileCount,
          video_count: videos.length,
        },
        files: files.map((f) => ({
          id: f.id,
          display_name: f.displayName,
          file_type: f.fileType,
        })),
        videos: videos.map((v) => ({
          id: v.id,
          title: v.title,
        })),
      },
    });
  });

  // --- Admin ----------------------------------------------------------------

  app.get('/digital-products', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const rows = await db
      .select({
        id: digitalProducts.id,
        title: digitalProducts.title,
        description: digitalProducts.description,
        imageUrl: digitalProducts.imageUrl,
        priceInCents: digitalProducts.priceInCents,
        salesEnabled: digitalProducts.salesEnabled,
        isPublished: digitalProducts.isPublished,
        sortOrder: digitalProducts.sortOrder,
        createdAt: digitalProducts.createdAt,
        updatedAt: digitalProducts.updatedAt,
        fileCount: sql<number>`count(distinct ${digitalProductFiles.id})::int`,
        videoCount: sql<number>`(
          SELECT count(*)::int
          FROM digital_product_videos v
          WHERE v.product_id = ${digitalProducts.id}
        )`,
      })
      .from(digitalProducts)
      .leftJoin(digitalProductFiles, eq(digitalProductFiles.productId, digitalProducts.id))
      .groupBy(digitalProducts.id)
      .orderBy(asc(digitalProducts.sortOrder), desc(digitalProducts.createdAt));

    return c.json({ data: { items: rows } });
  });

  app.post('/digital-products', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = await c.req.json().catch(() => ({}));
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const [product] = await db
      .insert(digitalProducts)
      .values({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        imageUrl: parsed.data.imageUrl ?? null,
        priceInCents: parsed.data.priceInCents ?? null,
        salesEnabled: parsed.data.salesEnabled ?? false,
        isPublished: parsed.data.isPublished ?? true,
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();

    return c.json({ data: product }, 201);
  });

  app.get('/digital-products/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid product id.' } }, 400);
    }

    const [product] = await db
      .select()
      .from(digitalProducts)
      .where(eq(digitalProducts.id, idParsed.data))
      .limit(1);

    if (!product) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Product not found.' } }, 404);
    }

    const [files, videos] = await Promise.all([
      db
        .select()
        .from(digitalProductFiles)
        .where(eq(digitalProductFiles.productId, product.id))
        .orderBy(asc(digitalProductFiles.sortOrder), asc(digitalProductFiles.createdAt)),
      loadProductVideos(product.id),
    ]);

    return c.json({ data: { product, files, videos } });
  });

  app.put('/digital-products/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid product id.' } }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const [product] = await db
      .update(digitalProducts)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(digitalProducts.id, idParsed.data))
      .returning();

    if (!product) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Product not found.' } }, 404);
    }

    return c.json({ data: product });
  });

  app.delete('/digital-products/:id', async (c) => {
    const staff = await requireContentDelete(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid product id.' } }, 400);
    }

    const [deleted] = await db
      .delete(digitalProducts)
      .where(eq(digitalProducts.id, idParsed.data))
      .returning({ id: digitalProducts.id });

    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Product not found.' } }, 404);
    }

    return c.json({ data: { id: deleted.id } });
  });

  app.post('/digital-products/:id/files', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid product id.' } }, 400);
    }

    const [product] = await db
      .select({ id: digitalProducts.id })
      .from(digitalProducts)
      .where(eq(digitalProducts.id, idParsed.data))
      .limit(1);

    if (!product) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Product not found.' } }, 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = addProductFilesBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const incomingFiles = 'files' in parsed.data ? parsed.data.files : [parsed.data];

    const existingCount = await getProductFileCount(product.id);
    if (existingCount + incomingFiles.length > MAX_FILES_PER_PRODUCT) {
      return c.json(
        {
          error: {
            code: 'TOO_MANY_FILES',
            message: `A product can have at most ${MAX_FILES_PER_PRODUCT} files.`,
            maxFiles: MAX_FILES_PER_PRODUCT,
            currentCount: existingCount,
          },
        },
        409,
      );
    }

    const baseSortOrder = existingCount;
    const inserted = await db
      .insert(digitalProductFiles)
      .values(
        incomingFiles.map((entry, index) => ({
          productId: product.id,
          fileType: entry.fileType,
          displayName: entry.displayName,
          fileUrl: entry.fileUrl,
          sortOrder: entry.sortOrder ?? baseSortOrder + index,
        })),
      )
      .returning();

    if (inserted.length === 1) {
      return c.json({ data: inserted[0] }, 201);
    }

    return c.json({ data: { files: inserted, count: inserted.length } }, 201);
  });

  app.put('/digital-products/:id/files/:fileId', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    const fileIdParsed = uuidParamSchema.safeParse(c.req.param('fileId'));
    if (!idParsed.success || !fileIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const updateFileSchema = fileInputSchema
      .partial()
      .refine(
        (data) =>
          data.fileType !== undefined ||
          data.displayName !== undefined ||
          data.fileUrl !== undefined ||
          data.sortOrder !== undefined,
        'Provide at least one field to update.',
      );
    const parsed = updateFileSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const [updated] = await db
      .update(digitalProductFiles)
      .set(parsed.data)
      .where(
        and(
          eq(digitalProductFiles.id, fileIdParsed.data),
          eq(digitalProductFiles.productId, idParsed.data),
        ),
      )
      .returning();

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'File not found.' } }, 404);
    }

    return c.json({ data: updated });
  });

  app.delete('/digital-products/:id/files/:fileId', async (c) => {
    const staff = await requireContentDelete(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    const fileIdParsed = uuidParamSchema.safeParse(c.req.param('fileId'));
    if (!idParsed.success || !fileIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    const [deleted] = await db
      .delete(digitalProductFiles)
      .where(
        and(
          eq(digitalProductFiles.id, fileIdParsed.data),
          eq(digitalProductFiles.productId, idParsed.data),
        ),
      )
      .returning({ id: digitalProductFiles.id });

    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'File not found.' } }, 404);
    }

    return c.json({ data: { id: deleted.id } });
  });

  app.post('/digital-products/:id/videos', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid product id.' } }, 400);
    }

    const [product] = await db
      .select({ id: digitalProducts.id })
      .from(digitalProducts)
      .where(eq(digitalProducts.id, idParsed.data))
      .limit(1);

    if (!product) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Product not found.' } }, 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = addProductVideosBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const incomingVideos = 'videos' in parsed.data ? parsed.data.videos : [parsed.data];

    const existingCount = await getProductVideoCount(product.id);
    if (existingCount + incomingVideos.length > MAX_VIDEOS_PER_PRODUCT) {
      return c.json(
        {
          error: {
            code: 'TOO_MANY_VIDEOS',
            message: `A product can have at most ${MAX_VIDEOS_PER_PRODUCT} video URLs.`,
            maxVideos: MAX_VIDEOS_PER_PRODUCT,
            currentCount: existingCount,
          },
        },
        409,
      );
    }

    const baseSortOrder = existingCount;
    const inserted = await db
      .insert(digitalProductVideos)
      .values(
        incomingVideos.map((entry, index) => ({
          productId: product.id,
          title: entry.title.trim(),
          videoUrl: entry.videoUrl.trim(),
          sortOrder: entry.sortOrder ?? baseSortOrder + index,
        })),
      )
      .returning();

    if (inserted.length === 1) {
      return c.json({ data: inserted[0] }, 201);
    }

    return c.json({ data: { videos: inserted, count: inserted.length } }, 201);
  });

  app.put('/digital-products/:id/videos/:videoId', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    const videoIdParsed = uuidParamSchema.safeParse(c.req.param('videoId'));
    if (!idParsed.success || !videoIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const updateVideoSchema = videoInputSchema
      .partial()
      .refine(
        (data) =>
          data.title !== undefined || data.videoUrl !== undefined || data.sortOrder !== undefined,
        'Provide at least one field to update.',
      );
    const parsed = updateVideoSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const patch: Partial<{ title: string; videoUrl: string; sortOrder: number }> = {};
    if (parsed.data.title !== undefined) patch.title = parsed.data.title.trim();
    if (parsed.data.videoUrl !== undefined) patch.videoUrl = parsed.data.videoUrl.trim();
    if (parsed.data.sortOrder !== undefined) patch.sortOrder = parsed.data.sortOrder;

    const [updated] = await db
      .update(digitalProductVideos)
      .set(patch)
      .where(
        and(
          eq(digitalProductVideos.id, videoIdParsed.data),
          eq(digitalProductVideos.productId, idParsed.data),
        ),
      )
      .returning();

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Video not found.' } }, 404);
    }

    return c.json({ data: updated });
  });

  app.delete('/digital-products/:id/videos/:videoId', async (c) => {
    const staff = await requireContentDelete(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    const videoIdParsed = uuidParamSchema.safeParse(c.req.param('videoId'));
    if (!idParsed.success || !videoIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    const [deleted] = await db
      .delete(digitalProductVideos)
      .where(
        and(
          eq(digitalProductVideos.id, videoIdParsed.data),
          eq(digitalProductVideos.productId, idParsed.data),
        ),
      )
      .returning({ id: digitalProductVideos.id });

    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Video not found.' } }, 404);
    }

    return c.json({ data: { id: deleted.id } });
  });
}
