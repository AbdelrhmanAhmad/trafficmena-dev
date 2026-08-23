import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  digitalProductFiles,
  digitalProductPurchases,
  digitalProducts,
} from '../db/schema/index.js';
import { ApiError } from '../utils/errors.js';

export type SellableDigitalProduct = {
  id: string;
  title: string;
  priceInCents: number;
  imageUrl: string | null;
};

export function isDigitalProductSellable(product: {
  priceInCents: number | null;
  salesEnabled: boolean;
  isPublished: boolean;
  fileCount: number;
}): boolean {
  return (
    product.isPublished &&
    product.salesEnabled &&
    (product.priceInCents ?? 0) > 0 &&
    product.fileCount > 0
  );
}

export async function getPurchasedDigitalProductIds(
  userId: string,
  productIds?: string[],
): Promise<Set<string>> {
  const conditions = [eq(digitalProductPurchases.userId, userId)];
  if (productIds && productIds.length > 0) {
    conditions.push(inArray(digitalProductPurchases.productId, productIds));
  }

  const rows = await db
    .select({ productId: digitalProductPurchases.productId })
    .from(digitalProductPurchases)
    .where(and(...conditions));

  return new Set(rows.map((row) => row.productId));
}

export async function assertDigitalProductIdsSellable(
  productIds: string[],
): Promise<SellableDigitalProduct[]> {
  if (productIds.length === 0) return [];

  const rows = await db
    .select({
      id: digitalProducts.id,
      title: digitalProducts.title,
      priceInCents: digitalProducts.priceInCents,
      imageUrl: digitalProducts.imageUrl,
      salesEnabled: digitalProducts.salesEnabled,
      isPublished: digitalProducts.isPublished,
      fileCount: sql<number>`count(${digitalProductFiles.id})::int`,
    })
    .from(digitalProducts)
    .leftJoin(digitalProductFiles, eq(digitalProductFiles.productId, digitalProducts.id))
    .where(inArray(digitalProducts.id, productIds))
    .groupBy(digitalProducts.id);

  if (rows.length !== productIds.length) {
    throw new ApiError('PRODUCT_NOT_FOUND', 'One or more digital products were not found.', 404);
  }

  const notSellable = rows.filter((row) => !isDigitalProductSellable(row));
  if (notSellable.length > 0) {
    throw new ApiError(
      'PRODUCT_NOT_SELLABLE',
      'One or more digital products are not available for purchase.',
      409,
      { productIds: notSellable.map((row) => row.id) },
    );
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    priceInCents: row.priceInCents ?? 0,
    imageUrl: row.imageUrl,
  }));
}
