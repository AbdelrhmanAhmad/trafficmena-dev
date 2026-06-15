import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import {
  digitalProductFiles,
  digitalProducts,
  libraryAssets,
} from '../../db/schema/index.js';
import {
  getPurchasedDigitalProductIds,
  isDigitalProductSellable,
} from '../../services/digitalProductSales.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { requireManager } from './utils.js';

const fileTypeSchema = z.enum(['excel', 'markdown', 'html', 'text', 'powerpoint']);

const createProductSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  priceInCents: z.number().int().min(0).optional().nullable(),
  salesEnabled: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  videoAssetId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const updateProductSchema = createProductSchema.partial();

const fileInputSchema = z.object({
  fileType: fileTypeSchema,
  displayName: z.string().min(1).max(200),
  fileUrl: z.string().url(),
  sortOrder: z.number().int().optional(),
});

/** Max downloadable files attached to one digital product */
const MAX_FILES_PER_PRODUCT = 30;

const addProductFilesBodySchema = z.union([
  fileInputSchema,
  z.object({
    files: z.array(fileInputSchema).min(1).max(20),
  }),
]);

const uuidParamSchema = z.string().uuid();

async function getProductFileCount(productId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(digitalProductFiles)
    .where(eq(digitalProductFiles.productId, productId));
  return row?.count ?? 0;
}

async function assertVideoAsset(videoAssetId: string | null | undefined) {
  if (!videoAssetId) return;
  const [asset] = await db
    .select({ id: libraryAssets.id, fileType: libraryAssets.fileType })
    .from(libraryAssets)
    .where(eq(libraryAssets.id, videoAssetId))
    .limit(1);
  if (!asset) {
    throw new Error('Video asset not found.');
  }
  if (asset.fileType !== 'Video') {
    throw new Error('Selected asset must be a video from the library.');
  }
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
        fileCount: sql<number>`count(${digitalProductFiles.id})::int`,
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

    let videoAsset = null;
    if (isPurchased && product.videoAssetId) {
      const [asset] = await db
        .select({
          id: libraryAssets.id,
          title: libraryAssets.title,
          embed_url: libraryAssets.embedUrl,
          video_url: libraryAssets.videoUrl,
          embed_type: libraryAssets.embedType,
          thumbnail_url: libraryAssets.thumbnailUrl,
        })
        .from(libraryAssets)
        .where(eq(libraryAssets.id, product.videoAssetId))
        .limit(1);
      videoAsset = asset ?? null;
    }

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
        video_asset: videoAsset,
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
        videoAssetId: digitalProducts.videoAssetId,
        sortOrder: digitalProducts.sortOrder,
        createdAt: digitalProducts.createdAt,
        updatedAt: digitalProducts.updatedAt,
        fileCount: sql<number>`count(${digitalProductFiles.id})::int`,
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

    try {
      await assertVideoAsset(parsed.data.videoAssetId);
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'INVALID_VIDEO',
            message: error instanceof Error ? error.message : 'Invalid video asset.',
          },
        },
        400,
      );
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
        videoAssetId: parsed.data.videoAssetId ?? null,
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

    const files = await db
      .select()
      .from(digitalProductFiles)
      .where(eq(digitalProductFiles.productId, product.id))
      .orderBy(asc(digitalProductFiles.sortOrder), asc(digitalProductFiles.createdAt));

    let videoAsset = null;
    if (product.videoAssetId) {
      const [asset] = await db
        .select({
          id: libraryAssets.id,
          title: libraryAssets.title,
          embedUrl: libraryAssets.embedUrl,
          videoUrl: libraryAssets.videoUrl,
          thumbnailUrl: libraryAssets.thumbnailUrl,
        })
        .from(libraryAssets)
        .where(eq(libraryAssets.id, product.videoAssetId))
        .limit(1);
      videoAsset = asset ?? null;
    }

    return c.json({ data: { product, files, videoAsset } });
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

    if (parsed.data.videoAssetId !== undefined) {
      try {
        await assertVideoAsset(parsed.data.videoAssetId);
      } catch (error) {
        return c.json(
          {
            error: {
              code: 'INVALID_VIDEO',
              message: error instanceof Error ? error.message : 'Invalid video asset.',
            },
          },
          400,
        );
      }
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
    const staff = await requireManager(c);
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

    const incomingFiles =
      'files' in parsed.data ? parsed.data.files : [parsed.data];

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
    const staff = await requireManager(c);
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
}
