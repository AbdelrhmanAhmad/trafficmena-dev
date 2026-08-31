import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { Context, Hono } from 'hono';
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
import {
  applyFirstPublishLaunch,
  getEffectiveProductVisibility,
  isDiscoveryBlocked,
} from '../../services/productVisibility.js';
import {
  bilingualDescriptionFields,
  bilingualDescriptionFromLegacy,
  bilingualDisplayNameFields,
  bilingualDisplayNameFromLegacy,
  bilingualTitleFields,
  bilingualTitleFromLegacy,
} from '../../utils/bilingualDb.js';
import {
  optionalBilingualDescriptionFields,
  optionalBilingualDisplayNameFields,
  requiredBilingualTitleFields,
} from '../../utils/bilingualSchemas.js';
import {
  presentAdminContent,
  presentAdminDisplayName,
  presentPublicContent,
  presentPublicDisplayName,
  presentPublicTitleOnly,
} from '../../utils/contentPresentation.js';
import { resolveLocaleFromRequest, type AppLocale } from '../../utils/locale.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { getOptionalUserRole, requireManager, requireContentDelete } from './utils.js';

const STAFF_ROLES = new Set(['owner', 'admin', 'manager']);

type BilingualProductRow = {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
};

async function resolvePresentationContext(c: Context) {
  const locale = resolveLocaleFromRequest(c);
  const session = await getSessionFromRequest(c);
  const role = session?.user ? await getOptionalUserRole(session.user.id) : null;
  const isStaff = Boolean(role && STAFF_ROLES.has(role));
  return { locale, isStaff };
}

function presentProductFields(row: BilingualProductRow, locale: AppLocale, isStaff: boolean) {
  const contentRow = {
    id: row.id,
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    descriptionEn: row.descriptionEn,
    descriptionAr: row.descriptionAr,
  };
  if (isStaff) {
    return presentAdminContent(contentRow);
  }
  const presented = presentPublicContent(contentRow, locale);
  return { title: presented.title, description: presented.description };
}

function presentVideoFields(
  row: { id: string; titleEn: string; titleAr: string },
  locale: AppLocale,
  isStaff: boolean,
) {
  if (isStaff) {
    return { id: row.id, titleEn: row.titleEn, titleAr: row.titleAr };
  }
  return presentPublicTitleOnly(row, locale);
}

const fileTypeSchema = z.enum(['excel', 'markdown', 'html', 'text', 'powerpoint']);

const productFieldsSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(8000).optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    priceInCents: z.number().int().min(0).optional().nullable(),
    salesEnabled: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  })
  .merge(requiredBilingualTitleFields.partial())
  .merge(optionalBilingualDescriptionFields);

const createProductSchema = productFieldsSchema.refine(
  (data) => (data.titleEn && data.titleAr) || data.title,
  { message: 'Provide title or titleEn/titleAr.' },
);

const updateProductSchema = productFieldsSchema.partial();

const baseFileInputSchema = z
  .object({
    fileType: fileTypeSchema,
    displayName: z.string().min(1).max(200).optional(),
    fileUrl: z.string().url(),
    sortOrder: z.number().int().optional(),
  })
  .merge(optionalBilingualDisplayNameFields.partial());

const fileInputSchema = baseFileInputSchema.refine(
  (data) => (data.displayNameEn && data.displayNameAr) || data.displayName,
  { message: 'Provide displayName or displayNameEn/displayNameAr.' },
);

const baseVideoInputSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    videoUrl: z.string().trim().min(1).max(1000),
    sortOrder: z.number().int().optional(),
  })
  .merge(requiredBilingualTitleFields.partial());

const videoInputSchema = baseVideoInputSchema.refine(
  (data) => (data.titleEn && data.titleAr) || data.title,
  { message: 'Provide title or titleEn/titleAr.' },
);

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

    const { locale, isStaff } = await resolvePresentationContext(c);
    const filter = c.req.query('filter') === 'mine' ? 'mine' : 'all';
    const visibility = await getEffectiveProductVisibility();
    const discoveryBlocked = isDiscoveryBlocked('digitalProducts', visibility);

    if (discoveryBlocked && filter !== 'mine') {
      return c.json({ data: { items: [] } });
    }

    const purchasedIds = await getPurchasedDigitalProductIds(session.user.id);

    const rows = await db
      .select({
        id: digitalProducts.id,
        titleEn: digitalProducts.titleEn,
        titleAr: digitalProducts.titleAr,
        descriptionEn: digitalProducts.descriptionEn,
        descriptionAr: digitalProducts.descriptionAr,
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
        ...presentProductFields(row, locale, isStaff),
        id: row.id,
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

    const { locale, isStaff } = await resolvePresentationContext(c);

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid product id.' } }, 400);
    }

    const visibility = await getEffectiveProductVisibility();
    const discoveryBlocked = isDiscoveryBlocked('digitalProducts', visibility);

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

    if (discoveryBlocked && !isPurchased) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Product not found.' } }, 404);
    }

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

    const productFields = presentProductFields(product, locale, isStaff);

    return c.json({
      data: {
        product: {
          ...productFields,
          id: product.id,
          image_url: product.imageUrl,
          price_in_cents: product.priceInCents,
          is_purchased: isPurchased,
          is_sellable: sellable,
          file_count: fileCount,
        },
        files: isPurchased
          ? files.map((f) => {
              if (isStaff) {
                const adminFields = presentAdminDisplayName(f);
                return {
                  id: f.id,
                  file_type: f.fileType,
                  displayNameEn: adminFields.displayNameEn,
                  displayNameAr: adminFields.displayNameAr,
                  file_url: f.fileUrl,
                };
              }
              const { displayName } = presentPublicDisplayName(f, locale);
              return {
                id: f.id,
                file_type: f.fileType,
                display_name: displayName,
                file_url: f.fileUrl,
              };
            })
          : [],
        videos: isPurchased
          ? videos.map((v) => ({
              ...presentVideoFields(v, locale, isStaff),
              video_url: v.videoUrl,
            }))
          : [],
      },
    });
  });

  // --- Public catalog (guests + optional auth for purchase flags) ----------

  app.get('/digital-products/public', async (c) => {
    const { locale, isStaff } = await resolvePresentationContext(c);
    const visibility = await getEffectiveProductVisibility();
    if (isDiscoveryBlocked('digitalProducts', visibility)) {
      return c.json({
        data: {
          items: [],
          pagination: { page: 1, pageSize: 12, total: 0 },
        },
      });
    }

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
        titleEn: digitalProducts.titleEn,
        titleAr: digitalProducts.titleAr,
        descriptionEn: digitalProducts.descriptionEn,
        descriptionAr: digitalProducts.descriptionAr,
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
        ...presentProductFields(row, locale, isStaff),
        id: row.id,
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
    const { locale, isStaff } = await resolvePresentationContext(c);
    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid product id.' } }, 400);
    }

    const visibility = await getEffectiveProductVisibility();
    if (isDiscoveryBlocked('digitalProducts', visibility)) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Product not found.' } }, 404);
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
          displayNameEn: digitalProductFiles.displayNameEn,
          displayNameAr: digitalProductFiles.displayNameAr,
          fileType: digitalProductFiles.fileType,
        })
        .from(digitalProductFiles)
        .where(eq(digitalProductFiles.productId, product.id))
        .orderBy(asc(digitalProductFiles.sortOrder), asc(digitalProductFiles.createdAt)),
      db
        .select({
          id: digitalProductVideos.id,
          titleEn: digitalProductVideos.titleEn,
          titleAr: digitalProductVideos.titleAr,
        })
        .from(digitalProductVideos)
        .where(eq(digitalProductVideos.productId, product.id))
        .orderBy(asc(digitalProductVideos.sortOrder), asc(digitalProductVideos.createdAt)),
    ]);

    const productFields = presentProductFields(product, locale, isStaff);

    return c.json({
      data: {
        product: {
          ...productFields,
          id: product.id,
          image_url: product.imageUrl,
          price_in_cents: product.priceInCents,
          is_purchased: isPurchased,
          is_sellable: sellable,
          file_count: fileCount,
          video_count: videos.length,
        },
        files: files.map((f) => {
          if (isStaff) {
            const adminFields = presentAdminDisplayName(f);
            return {
              id: f.id,
              displayNameEn: adminFields.displayNameEn,
              displayNameAr: adminFields.displayNameAr,
              file_type: f.fileType,
            };
          }
          const { displayName } = presentPublicDisplayName(f, locale);
          return {
            id: f.id,
            display_name: displayName,
            file_type: f.fileType,
          };
        }),
        videos: videos.map((v) => presentVideoFields(v, locale, isStaff)),
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
        titleEn: digitalProducts.titleEn,
        titleAr: digitalProducts.titleAr,
        descriptionEn: digitalProducts.descriptionEn,
        descriptionAr: digitalProducts.descriptionAr,
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

    return c.json({
      data: {
        items: rows.map((row) => ({
          ...presentAdminContent({
            id: row.id,
            titleEn: row.titleEn,
            titleAr: row.titleAr,
            descriptionEn: row.descriptionEn,
            descriptionAr: row.descriptionAr,
          }),
          imageUrl: row.imageUrl,
          priceInCents: row.priceInCents,
          salesEnabled: row.salesEnabled,
          isPublished: row.isPublished,
          sortOrder: row.sortOrder,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          fileCount: row.fileCount,
          videoCount: row.videoCount,
        })),
      },
    });
  });

  app.post('/digital-products', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = await c.req.json().catch(() => ({}));
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const titleFields =
      parsed.data.titleEn && parsed.data.titleAr
        ? bilingualTitleFields(parsed.data.titleEn, parsed.data.titleAr)
        : bilingualTitleFromLegacy(parsed.data.title!);
    const descriptionFields =
      parsed.data.descriptionEn !== undefined || parsed.data.descriptionAr !== undefined
        ? bilingualDescriptionFields(
            parsed.data.descriptionEn ?? parsed.data.description ?? null,
            parsed.data.descriptionAr ?? parsed.data.description ?? null,
          )
        : bilingualDescriptionFromLegacy(parsed.data.description);

    const [product] = await db
      .insert(digitalProducts)
      .values({
        ...titleFields,
        ...descriptionFields,
        imageUrl: parsed.data.imageUrl ?? null,
        priceInCents: parsed.data.priceInCents ?? null,
        salesEnabled: parsed.data.salesEnabled ?? false,
        isPublished: parsed.data.isPublished ?? true,
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();

    await applyFirstPublishLaunch('digitalProducts', false, product.isPublished);

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

    return c.json({
      data: {
        product: presentAdminContent(product),
        files: files.map((f) => ({
          id: f.id,
          productId: f.productId,
          fileType: f.fileType,
          fileUrl: f.fileUrl,
          sortOrder: f.sortOrder,
          createdAt: f.createdAt,
          ...presentAdminDisplayName(f),
        })),
        videos: videos.map((v) => ({
          id: v.id,
          productId: v.productId,
          titleEn: v.titleEn,
          titleAr: v.titleAr,
          videoUrl: v.videoUrl,
          sortOrder: v.sortOrder,
          createdAt: v.createdAt,
        })),
      },
    });
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

    const [existingProduct] = await db
      .select({ isPublished: digitalProducts.isPublished })
      .from(digitalProducts)
      .where(eq(digitalProducts.id, idParsed.data))
      .limit(1);

    if (!existingProduct) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Product not found.' } }, 404);
    }

    const [product] = await db
      .update(digitalProducts)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(digitalProducts.id, idParsed.data))
      .returning();

    if (!product) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Product not found.' } }, 404);
    }

    const willBePublished = parsed.data.isPublished ?? product.isPublished;
    await applyFirstPublishLaunch('digitalProducts', existingProduct.isPublished, willBePublished);

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
          ...(entry.displayNameEn && entry.displayNameAr
            ? bilingualDisplayNameFields(entry.displayNameEn, entry.displayNameAr)
            : bilingualDisplayNameFromLegacy(entry.displayName!)),
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
    const updateFileSchema = baseFileInputSchema
      .partial()
      .refine(
        (data) =>
          data.fileType !== undefined ||
          data.displayName !== undefined ||
          data.displayNameEn !== undefined ||
          data.displayNameAr !== undefined ||
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
          ...(entry.titleEn && entry.titleAr
            ? bilingualTitleFields(entry.titleEn.trim(), entry.titleAr.trim())
            : bilingualTitleFromLegacy(entry.title!.trim())),
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
    const updateVideoSchema = baseVideoInputSchema
      .partial()
      .refine(
        (data) =>
          data.title !== undefined ||
          data.titleEn !== undefined ||
          data.titleAr !== undefined ||
          data.videoUrl !== undefined ||
          data.sortOrder !== undefined,
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
