import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import {
  digitalProductPurchases,
  digitalProducts,
  orderItems,
  orders,
  series,
  seriesAccessGrants,
  users,
} from '../../db/schema/index.js';
import { assertDigitalProductIdsSellable, getPurchasedDigitalProductIds } from '../../services/digitalProductSales.js';
import { assertSeriesIdsSellable, getPurchasedSeriesIds } from '../../services/seriesSales.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { ApiError } from '../../utils/errors.js';
import { requireRole } from './utils.js';

const createOrderSchema = z
  .object({
    seriesIds: z.array(z.string().uuid()).max(20).optional(),
    digitalProductIds: z.array(z.string().uuid()).max(20).optional(),
  })
  .refine(
    (data) => (data.seriesIds?.length ?? 0) + (data.digitalProductIds?.length ?? 0) > 0,
    'Add at least one item to the order.',
  );

const uuidParamSchema = z.string().uuid();

const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['pending', 'paid', 'failed', 'expired', 'all']).optional().default('all'),
});

type RawOrderItem = typeof orderItems.$inferSelect;

async function enrichOrderItems(rawItems: RawOrderItem[]) {
  if (rawItems.length === 0) return [];

  const seriesIds = [
    ...new Set(rawItems.filter((i) => i.seriesId).map((i) => i.seriesId as string)),
  ];
  const productIds = [
    ...new Set(
      rawItems.filter((i) => i.digitalProductId).map((i) => i.digitalProductId as string),
    ),
  ];

  const [seriesRows, productRows] = await Promise.all([
    seriesIds.length > 0
      ? db
          .select({ id: series.id, title: series.title, imageUrl: series.imageUrl })
          .from(series)
          .where(inArray(series.id, seriesIds))
      : Promise.resolve([]),
    productIds.length > 0
      ? db
          .select({
            id: digitalProducts.id,
            title: digitalProducts.title,
            imageUrl: digitalProducts.imageUrl,
          })
          .from(digitalProducts)
          .where(inArray(digitalProducts.id, productIds))
      : Promise.resolve([]),
  ]);

  const seriesMetaMap = new Map(seriesRows.map((row) => [row.id, row]));
  const productMetaMap = new Map(productRows.map((row) => [row.id, row]));

  return rawItems.map((item) => {
    let title: string | null = null;
    let imageUrl: string | null = null;
    if (item.itemType === 'series' && item.seriesId) {
      const meta = seriesMetaMap.get(item.seriesId);
      title = meta?.title ?? null;
      imageUrl = meta?.imageUrl ?? null;
    } else if (item.itemType === 'digital_product' && item.digitalProductId) {
      const meta = productMetaMap.get(item.digitalProductId);
      title = meta?.title ?? null;
      imageUrl = meta?.imageUrl ?? null;
    }
    return { ...item, title, imageUrl };
  });
}

async function loadItemsByOrderId(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, Awaited<ReturnType<typeof enrichOrderItems>>>();

  const rawItems = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));

  const enriched = await enrichOrderItems(rawItems);
  const map = new Map<string, typeof enriched>();
  for (const item of enriched) {
    const list = map.get(item.orderId) ?? [];
    list.push(item);
    map.set(item.orderId, list);
  }
  return map;
}

function buildStatusFilter(status: z.infer<typeof orderListQuerySchema>['status']) {
  if (!status || status === 'all') return undefined;
  return eq(orders.status, status);
}

export function registerOrderRoutes(app: Hono) {
  app.get('/admin/orders', async (c) => {
    const authResult = await requireRole(c, ['owner', 'admin', 'manager'], {
      forbiddenMessage: 'Manager or admin privileges required.',
    });
    if ('response' in authResult) return authResult.response;

    const parsed = orderListQuerySchema.safeParse({
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
      status: c.req.query('status'),
    });
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_QUERY', message: parsed.error.message } }, 400);
    }

    const { page, pageSize, status } = parsed.data;
    const statusFilter = buildStatusFilter(status);
    const whereClause = statusFilter ? and(statusFilter) : undefined;
    const offset = (page - 1) * pageSize;

    const [[statsRow], [totalRow], orderRows] = await Promise.all([
      db
        .select({
          totalOrders: sql<number>`COUNT(*)::int`,
          paidOrders: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'paid')::int`,
          pendingOrders: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'pending')::int`,
          revenueCents: sql<number>`COALESCE(SUM(${orders.totalCents}) FILTER (WHERE ${orders.status} = 'paid'), 0)::int`,
        })
        .from(orders),
      db.select({ value: count() }).from(orders).where(whereClause),
      db
        .select({
          id: orders.id,
          userId: orders.userId,
          status: orders.status,
          totalCents: orders.totalCents,
          currency: orders.currency,
          createdAt: orders.createdAt,
          paidAt: orders.paidAt,
          userEmail: users.email,
          userName: users.name,
        })
        .from(orders)
        .innerJoin(users, eq(users.id, orders.userId))
        .where(whereClause)
        .orderBy(desc(orders.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const itemsByOrder = await loadItemsByOrderId(orderRows.map((row) => row.id));

    return c.json({
      data: {
        stats: {
          totalOrders: Number(statsRow?.totalOrders ?? 0),
          paidOrders: Number(statsRow?.paidOrders ?? 0),
          pendingOrders: Number(statsRow?.pendingOrders ?? 0),
          revenueCents: Number(statsRow?.revenueCents ?? 0),
        },
        items: orderRows.map((order) => ({
          ...order,
          items: itemsByOrder.get(order.id) ?? [],
        })),
        pagination: {
          page,
          pageSize,
          total: Number(totalRow?.value ?? 0),
        },
      },
    });
  });

  app.get('/orders', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const parsed = orderListQuerySchema.safeParse({
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
      status: c.req.query('status'),
    });
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_QUERY', message: parsed.error.message } }, 400);
    }

    const { page, pageSize, status } = parsed.data;
    const statusFilter = buildStatusFilter(status);
    const userFilter = eq(orders.userId, session.user.id);
    const whereClause = statusFilter ? and(userFilter, statusFilter) : userFilter;
    const offset = (page - 1) * pageSize;

    const [totalRow, orderRows] = await Promise.all([
      db.select({ value: count() }).from(orders).where(whereClause),
      db
        .select()
        .from(orders)
        .where(whereClause)
        .orderBy(desc(orders.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const itemsByOrder = await loadItemsByOrderId(orderRows.map((row) => row.id));

    return c.json({
      data: {
        items: orderRows.map((order) => ({
          ...order,
          items: itemsByOrder.get(order.id) ?? [],
        })),
        pagination: {
          page,
          pageSize,
          total: Number(totalRow[0]?.value ?? 0),
        },
      },
    });
  });

  app.post('/orders', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const uniqueSeriesIds = [...new Set(parsed.data.seriesIds ?? [])];
    const uniqueProductIds = [...new Set(parsed.data.digitalProductIds ?? [])];
    const userId = session.user.id;

    const [sellableSeries, sellableProducts, purchasedSeries, purchasedProducts] = await Promise.all([
      assertSeriesIdsSellable(uniqueSeriesIds),
      assertDigitalProductIdsSellable(uniqueProductIds),
      getPurchasedSeriesIds(userId, uniqueSeriesIds),
      getPurchasedDigitalProductIds(userId, uniqueProductIds),
    ]);

    const alreadyOwnedSeries = uniqueSeriesIds.filter((id) => purchasedSeries.has(id));
    const alreadyOwnedProducts = uniqueProductIds.filter((id) => purchasedProducts.has(id));

    if (alreadyOwnedSeries.length > 0 || alreadyOwnedProducts.length > 0) {
      return c.json(
        {
          error: {
            code: 'ALREADY_OWNED',
            message: 'You already own one or more items in this order.',
            seriesIds: alreadyOwnedSeries,
            digitalProductIds: alreadyOwnedProducts,
          },
        },
        409,
      );
    }

    const totalCents =
      sellableSeries.reduce((sum, row) => sum + row.priceInCents, 0) +
      sellableProducts.reduce((sum, row) => sum + row.priceInCents, 0);

    if (totalCents <= 0) {
      return c.json({ error: { code: 'INVALID_ORDER', message: 'Order total must be positive.' } }, 400);
    }

    const created = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          status: 'pending',
          totalCents,
          currency: 'EGP',
        })
        .returning();

      const seriesItemValues = sellableSeries.map((row) => ({
        orderId: order.id,
        itemType: 'series' as const,
        seriesId: row.id,
        digitalProductId: null,
        unitPriceCents: row.priceInCents,
        lineTotalCents: row.priceInCents,
        fulfillmentStatus: 'pending' as const,
      }));

      const productItemValues = sellableProducts.map((row) => ({
        orderId: order.id,
        itemType: 'digital_product' as const,
        seriesId: null,
        digitalProductId: row.id,
        unitPriceCents: row.priceInCents,
        lineTotalCents: row.priceInCents,
        fulfillmentStatus: 'pending' as const,
      }));

      const items = await tx
        .insert(orderItems)
        .values([...seriesItemValues, ...productItemValues])
        .returning();

      return { order, items, sellableSeries, sellableProducts };
    });

    return c.json(
      {
        data: {
          order: created.order,
          items: created.items.map((item) => {
            if (item.itemType === 'series' && item.seriesId) {
              const seriesRow = created.sellableSeries.find((row) => row.id === item.seriesId);
              return {
                ...item,
                title: seriesRow?.title ?? null,
              };
            }
            if (item.itemType === 'digital_product' && item.digitalProductId) {
              const productRow = created.sellableProducts.find(
                (row) => row.id === item.digitalProductId,
              );
              return {
                ...item,
                title: productRow?.title ?? null,
              };
            }
            return { ...item, title: null };
          }),
        },
      },
      201,
    );
  });

  app.get('/orders/:id', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid order id.' } }, 400);
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, idParsed.data), eq(orders.userId, session.user.id)))
      .limit(1);

    if (!order) {
      return c.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } }, 404);
    }

    const rawItems = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const items = await enrichOrderItems(rawItems);

    return c.json({ data: { order, items } });
  });
}

/** @deprecated Use fulfillOrder */
export async function fulfillSeriesOrder(args: {
  orderId: string;
  paymentId: string;
  userId: string;
  paidAt: Date;
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
}): Promise<void> {
  return fulfillOrder(args);
}

export async function fulfillOrder(args: {
  orderId: string;
  paymentId: string;
  userId: string;
  paidAt: Date;
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
}): Promise<void> {
  const { orderId, paymentId, userId, paidAt, tx } = args;

  const [order] = await tx
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .for('update')
    .limit(1);

  if (!order) {
    throw new ApiError('ORDER_NOT_FOUND', 'Order not found.', 404);
  }

  if (order.status === 'paid') {
    return;
  }

  if (order.status !== 'pending' && order.status !== 'expired') {
    throw new ApiError('ORDER_NOT_PAYABLE', 'Order cannot be fulfilled.', 409);
  }

  const items = await tx
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.orderId, orderId), eq(orderItems.fulfillmentStatus, 'pending')));

  for (const item of items) {
    if (item.itemType === 'series' && item.seriesId) {
      const [existingGrant] = await tx
        .select({ id: seriesAccessGrants.id })
        .from(seriesAccessGrants)
        .where(
          and(
            eq(seriesAccessGrants.seriesId, item.seriesId),
            eq(seriesAccessGrants.userId, userId),
            isNull(seriesAccessGrants.revokedAt),
          ),
        )
        .limit(1);

      if (!existingGrant) {
        await tx.insert(seriesAccessGrants).values({
          seriesId: item.seriesId,
          userId,
          grantReason: 'purchase',
          paymentId,
          grantedAt: paidAt,
        });
      }
    } else if (item.itemType === 'digital_product' && item.digitalProductId) {
      const [existingPurchase] = await tx
        .select({ id: digitalProductPurchases.id })
        .from(digitalProductPurchases)
        .where(
          and(
            eq(digitalProductPurchases.productId, item.digitalProductId),
            eq(digitalProductPurchases.userId, userId),
          ),
        )
        .limit(1);

      if (!existingPurchase) {
        await tx.insert(digitalProductPurchases).values({
          productId: item.digitalProductId,
          userId,
          paymentId,
          purchasedAt: paidAt,
        });
      }
    }

    await tx
      .update(orderItems)
      .set({ fulfillmentStatus: 'fulfilled' })
      .where(eq(orderItems.id, item.id));
  }

  await tx
    .update(orders)
    .set({ status: 'paid', paidAt })
    .where(eq(orders.id, orderId));
}
