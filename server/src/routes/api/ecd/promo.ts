import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../../db/client.js';
import { ecdBookings, ecdPromoCodes } from '../../../db/schema/ecd.js';
import { requireManager } from '../utils.js';
import {
  calcEcdTotals,
  ecdRateLimiter,
  formatMoneyEgp,
  resolveEcdPromo,
} from './helpers.js';

const codePattern = /^[A-Z0-9_-]{2,40}$/;

const validateSchema = z.object({
  code: z.string().trim().min(1).max(40),
  ticketType: z.enum(['ct', 'fj']),
  qty: z.coerce.number().int().min(1).max(20).optional().default(1),
});

const upsertSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .transform((v) => v.toUpperCase())
    .refine((v) => codePattern.test(v), 'Use A-Z, 0-9, _ or - only.'),
  discountPercent: z.coerce.number().int().min(1).max(100),
  appliesTo: z.enum(['all', 'ct', 'fj']).default('all'),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  maxRedemptions: z.coerce.number().int().min(1).max(1_000_000).nullable().optional(),
});

function serializePromo(
  row: typeof ecdPromoCodes.$inferSelect,
  redemptionCount: number,
) {
  return {
    id: row.id,
    code: row.code,
    discountPercent: row.discountPercent,
    appliesTo: row.appliesTo,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    maxRedemptions: row.maxRedemptions,
    redemptionCount,
    isDeleted: row.isDeleted === 1,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function redemptionCounts(codes: string[]) {
  const map = new Map<string, number>();
  if (codes.length === 0) return map;
  const upper = codes.map((c) => c.toUpperCase());
  const rows = await db
    .select({
      code: ecdBookings.promoCode,
      total: sql<number>`count(*)::int`,
    })
    .from(ecdBookings)
    .where(eq(ecdBookings.paymentStatus, 'paid'))
    .groupBy(ecdBookings.promoCode);
  for (const r of rows) {
    const key = (r.code || '').toUpperCase();
    if (!key || !upper.includes(key)) continue;
    map.set(key, Number(r.total ?? 0));
  }
  return map;
}

export function registerEcdPromoRoutes(app: Hono) {
  /** Public: validate + preview totals for checkout Apply. */
  app.post('/promo/validate', async (c) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const limited = ecdRateLimiter.consume(`ecd:promo:${ip}`, { limit: 30, windowMs: 60_000 });
    if (!limited.allowed) {
      return c.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many promo attempts. Try again shortly.' } },
        429,
      );
    }

    const body = await c.req.json().catch(() => null);
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid promo request.' } }, 400);
    }

    const totals = await calcEcdTotals({
      ticketType: parsed.data.ticketType,
      qty: parsed.data.qty,
      promoCode: parsed.data.code,
    });
    const resolved = await resolveEcdPromo({
      promoCode: parsed.data.code,
      ticketType: parsed.data.ticketType,
    });

    return c.json({
      data: {
        status: totals.promoStatus,
        valid: totals.promoStatus === 'valid',
        promoCode: totals.promoCode,
        discountPercent: totals.discountPercent,
        unitPriceCents: totals.unitPriceCents,
        discountCents: totals.discountCents,
        subtotalCents: totals.subtotalCents,
        totalCents: totals.totalCents,
        amountFormatted: formatMoneyEgp(totals.totalCents),
        discountFormatted: formatMoneyEgp(totals.discountCents),
        ticketName: totals.ticketName,
        appliesTo: resolved.row?.appliesTo ?? null,
      },
    });
  });

  app.get('/admin/promo-codes', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const includeDeleted = c.req.query('includeDeleted') === '1';
    const rows = await db
      .select()
      .from(ecdPromoCodes)
      .where(includeDeleted ? undefined : eq(ecdPromoCodes.isDeleted, 0))
      .orderBy(desc(ecdPromoCodes.createdAt), asc(ecdPromoCodes.code));

    const counts = await redemptionCounts(rows.map((r) => r.code.toUpperCase()));
    return c.json({
      data: {
        items: rows.map((r) => serializePromo(r, counts.get(r.code.toUpperCase()) || 0)),
      },
    });
  });

  app.post('/admin/promo-codes', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = await c.req.json().catch(() => null);
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: { code: 'INVALID_REQUEST', message: parsed.error.issues[0]?.message || 'Invalid promo.' } },
        400,
      );
    }

    const data = parsed.data;
    const [existing] = await db
      .select({ id: ecdPromoCodes.id })
      .from(ecdPromoCodes)
      .where(eq(ecdPromoCodes.code, data.code))
      .limit(1);
    if (existing) {
      return c.json(
        { error: { code: 'DUPLICATE_CODE', message: 'A promo with this code already exists.' } },
        409,
      );
    }

    const [row] = await db
      .insert(ecdPromoCodes)
      .values({
        code: data.code,
        discountPercent: data.discountPercent,
        appliesTo: data.appliesTo,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        maxRedemptions: data.maxRedemptions ?? null,
        isDeleted: 0,
      })
      .returning();

    return c.json({ data: { item: serializePromo(row, 0) } }, 201);
  });

  app.put('/admin/promo-codes/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = c.req.param('id');
    const body = await c.req.json().catch(() => null);
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: { code: 'INVALID_REQUEST', message: parsed.error.issues[0]?.message || 'Invalid promo.' } },
        400,
      );
    }

    const data = parsed.data;
    const [dup] = await db
      .select({ id: ecdPromoCodes.id })
      .from(ecdPromoCodes)
      .where(and(eq(ecdPromoCodes.code, data.code), sql`${ecdPromoCodes.id} <> ${id}`))
      .limit(1);
    if (dup) {
      return c.json(
        { error: { code: 'DUPLICATE_CODE', message: 'A promo with this code already exists.' } },
        409,
      );
    }

    const [row] = await db
      .update(ecdPromoCodes)
      .set({
        code: data.code,
        discountPercent: data.discountPercent,
        appliesTo: data.appliesTo,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        maxRedemptions: data.maxRedemptions ?? null,
        updatedAt: new Date(),
      })
      .where(eq(ecdPromoCodes.id, id))
      .returning();

    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Promo not found.' } }, 404);
    }

    const counts = await redemptionCounts([row.code.toUpperCase()]);
    return c.json({
      data: { item: serializePromo(row, counts.get(row.code.toUpperCase()) || 0) },
    });
  });

  app.delete('/admin/promo-codes/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = c.req.param('id');
    const [row] = await db
      .update(ecdPromoCodes)
      .set({ isDeleted: 1, updatedAt: new Date() })
      .where(eq(ecdPromoCodes.id, id))
      .returning();

    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Promo not found.' } }, 404);
    }

    return c.json({ data: { ok: true } });
  });
}
