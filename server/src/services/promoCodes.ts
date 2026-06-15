import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { promoCodes } from '../db/schema/index.js';
import { ApiError } from '../utils/errors.js';

export const PROMO_CODE_REGEX = /^[A-Z0-9_-]{3,50}$/;

const uuidSchema = z.string().uuid();

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type ValidPromoCode = {
  id: string;
  discountPercent: number;
};

export async function validatePromoCode(
  code: string,
  targetType: 'track' | 'event',
  targetId: string,
  tx?: DbTransaction,
): Promise<ValidPromoCode> {
  const isValidFormat = PROMO_CODE_REGEX.test(code);
  const isValidUuid = uuidSchema.safeParse(targetId).success;

  const dbClient = tx ?? db;
  const [promo] = await dbClient
    .select()
    .from(promoCodes)
    .where(and(eq(promoCodes.code, code), eq(promoCodes.isDeleted, false)))
    .limit(1);

  const now = new Date();
  const exists = Boolean(promo);
  const targetMatches = promo?.targetType === targetType && promo?.targetId === targetId;
  const dateValid = promo ? now >= promo.startsAt && now <= promo.endsAt : false;

  if (!isValidFormat || !isValidUuid || !exists || !targetMatches || !dateValid) {
    throw new ApiError('PROMO_INVALID', 'Invalid or inactive promo code', 400);
  }

  return { id: promo.id, discountPercent: promo.discountPercent };
}
