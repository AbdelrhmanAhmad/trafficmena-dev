import { and, eq, isNull } from 'drizzle-orm';
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
} from '../../db/schema/index.js';
import { assertDigitalProductIdsSellable, getPurchasedDigitalProductIds } from '../../services/digitalProductSales.js';
import {
  assertSeriesIdsSellable,
  getActiveSeriesGrantIds,
  getPurchasedSeriesIds,
} from '../../services/seriesSales.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { ApiError } from '../../utils/errors.js';

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

export function registerOrderRoutes(app: Hono) {
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

    const [sellableSeries, sellableProducts, purchasedSeries, activeGrants, purchasedProducts] =
      await Promise.all([
        assertSeriesIdsSellable(uniqueSeriesIds),
        assertDigitalProductIdsSellable(uniqueProductIds),
        getPurchasedSeriesIds(userId, uniqueSeriesIds),
        getActiveSeriesGrantIds(userId, uniqueSeriesIds),
        getPurchasedDigitalProductIds(userId, uniqueProductIds),
      ]);

    const alreadyOwnedSeries = uniqueSeriesIds.filter(
      (id) => purchasedSeries.has(id) || activeGrants.has(id),
    );
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

    const items = await Promise.all(
      rawItems.map(async (item) => {
        if (item.itemType === 'series' && item.seriesId) {
          const [seriesRow] = await db
            .select({ title: series.title })
            .from(series)
            .where(eq(series.id, item.seriesId))
            .limit(1);
          return { ...item, title: seriesRow?.title ?? null };
        }
        if (item.itemType === 'digital_product' && item.digitalProductId) {
          const [productRow] = await db
            .select({ title: digitalProducts.title })
            .from(digitalProducts)
            .where(eq(digitalProducts.id, item.digitalProductId))
            .limit(1);
          return { ...item, title: productRow?.title ?? null };
        }
        return { ...item, title: null };
      }),
    );

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
