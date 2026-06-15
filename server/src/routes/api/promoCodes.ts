import { and, desc, eq, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { events, promoCodes, trackEvents, tracks } from '../../db/schema/index.js';
import { PROMO_CODE_REGEX } from '../../services/promoCodes.js';
import { ApiError, respondError } from '../../utils/errors.js';
import { isKnownDatabaseConflict, requireAdmin, requireManager } from './utils.js';

const createSchema = z
  .object({
    code: z.string().regex(PROMO_CODE_REGEX, 'Invalid promo code format.'),
    targetType: z.enum(['track', 'event']),
    targetId: z.string().uuid(),
    discountPercent: z.number().int().min(1).max(99),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  })
  .refine((data) => new Date(data.startsAt) < new Date(data.endsAt), {
    message: 'Start date must be before end date.',
  });

const updateSchema = z
  .object({
    discountPercent: z.number().int().min(1).max(99),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  })
  .refine((data) => new Date(data.startsAt) < new Date(data.endsAt), {
    message: 'Start date must be before end date.',
  });

function parseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError('INVALID_INPUT', 'Invalid date value.', 400);
  }
  return date;
}

async function validateTarget(targetType: 'track' | 'event', targetId: string) {
  if (targetType === 'track') {
    const [track] = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.id, targetId));
    if (!track) {
      throw new ApiError('TRACK_NOT_FOUND', 'Track not found.', 404);
    }
    return;
  }

  const [event] = await db.select({ id: events.id }).from(events).where(eq(events.id, targetId));
  if (!event) {
    throw new ApiError('EVENT_NOT_FOUND', 'Event not found.', 404);
  }

  const [trackEvent] = await db
    .select({ id: trackEvents.id })
    .from(trackEvents)
    .where(eq(trackEvents.eventId, targetId))
    .limit(1);

  if (trackEvent) {
    throw new ApiError('EVENT_IN_TRACK', 'Promo codes can only target standalone events.', 400);
  }
}

async function fetchPromoDetail(promoId: string) {
  const [row] = await db
    .select({
      id: promoCodes.id,
      code: promoCodes.code,
      targetType: promoCodes.targetType,
      targetId: promoCodes.targetId,
      discountPercent: promoCodes.discountPercent,
      startsAt: promoCodes.startsAt,
      endsAt: promoCodes.endsAt,
      createdAt: promoCodes.createdAt,
      trackTitle: tracks.title,
      eventTitle: events.title,
      usageCount: sql<number>`(
        SELECT COUNT(*) FROM payments
        WHERE payments.promo_code_id = promo_codes.id
        AND payments.status = 'paid'
      )`,
    })
    .from(promoCodes)
    .leftJoin(tracks, and(eq(promoCodes.targetType, 'track'), eq(tracks.id, promoCodes.targetId)))
    .leftJoin(events, and(eq(promoCodes.targetType, 'event'), eq(events.id, promoCodes.targetId)))
    .where(and(eq(promoCodes.id, promoId), eq(promoCodes.isDeleted, false)))
    .limit(1);

  if (!row) return null;
  const now = new Date();
  return {
    id: row.id,
    code: row.code,
    targetType: row.targetType as 'track' | 'event',
    targetId: row.targetId,
    targetName: row.trackTitle ?? row.eventTitle ?? 'Deleted item',
    discountPercent: row.discountPercent,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    createdAt: row.createdAt,
    usageCount: Number(row.usageCount ?? 0),
    isActive: now >= row.startsAt && now <= row.endsAt,
  };
}

export function registerPromoCodeRoutes(app: Hono) {
  app.get('/promo-codes', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) {
      return staff.response;
    }

    const rows = await db
      .select({
        id: promoCodes.id,
        code: promoCodes.code,
        targetType: promoCodes.targetType,
        targetId: promoCodes.targetId,
        discountPercent: promoCodes.discountPercent,
        startsAt: promoCodes.startsAt,
        endsAt: promoCodes.endsAt,
        createdAt: promoCodes.createdAt,
        trackTitle: tracks.title,
        eventTitle: events.title,
        usageCount: sql<number>`(
          SELECT COUNT(*) FROM payments
          WHERE payments.promo_code_id = promo_codes.id
          AND payments.status = 'paid'
        )`,
      })
      .from(promoCodes)
      .leftJoin(tracks, and(eq(promoCodes.targetType, 'track'), eq(tracks.id, promoCodes.targetId)))
      .leftJoin(events, and(eq(promoCodes.targetType, 'event'), eq(events.id, promoCodes.targetId)))
      .where(eq(promoCodes.isDeleted, false))
      .orderBy(desc(promoCodes.createdAt));

    const now = new Date();

    return c.json({
      data: rows.map((row) => ({
        id: row.id,
        code: row.code,
        targetType: row.targetType as 'track' | 'event',
        targetId: row.targetId,
        targetName: row.trackTitle ?? row.eventTitle ?? 'Deleted item',
        discountPercent: row.discountPercent,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        createdAt: row.createdAt,
        usageCount: Number(row.usageCount ?? 0),
        isActive: now >= row.startsAt && now <= row.endsAt,
      })),
    });
  });

  app.get('/promo-codes/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) {
      return staff.response;
    }

    const promoId = c.req.param('id');
    const idResult = z.string().uuid().safeParse(promoId);
    if (!idResult.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid promo code ID.' } }, 400);
    }

    const detail = await fetchPromoDetail(promoId);
    if (!detail) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Promo code not found.' } }, 404);
    }

    return c.json({
      data: detail,
    });
  });

  app.post('/promo-codes', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) {
      return staff.response;
    }

    const body = await c.req
      .json()
      .then((payload) => createSchema.safeParse(payload))
      .catch(() => ({ success: false as const, error: null }));

    if (!body.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid promo payload.' } }, 400);
    }

    const payload = body.data;

    try {
      await validateTarget(payload.targetType, payload.targetId);

      const [created] = await db
        .insert(promoCodes)
        .values({
          code: payload.code.trim(),
          targetType: payload.targetType,
          targetId: payload.targetId,
          discountPercent: payload.discountPercent,
          startsAt: parseDate(payload.startsAt),
          endsAt: parseDate(payload.endsAt),
        })
        .returning();
      const detail = await fetchPromoDetail(created.id);
      return c.json({ data: detail ?? created });
    } catch (error) {
      if (error instanceof ApiError) {
        return respondError(c, error);
      }
      if (isKnownDatabaseConflict(error) === 'unique') {
        return c.json(
          { error: { code: 'PROMO_EXISTS', message: 'Promo code already exists.' } },
          409,
        );
      }
      console.error('[promo-codes] create failed', error);
      return c.json(
        { error: { code: 'PROMO_CREATE_FAILED', message: 'Failed to create code.' } },
        500,
      );
    }
  });

  app.put('/promo-codes/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) {
      return staff.response;
    }

    const promoId = c.req.param('id');
    const idResult = z.string().uuid().safeParse(promoId);
    if (!idResult.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid promo code ID.' } }, 400);
    }

    const body = await c.req
      .json()
      .then((payload) => updateSchema.safeParse(payload))
      .catch(() => ({ success: false as const, error: null }));

    if (!body.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid promo payload.' } }, 400);
    }

    const payload = body.data;

    try {
      const [updated] = await db
        .update(promoCodes)
        .set({
          discountPercent: payload.discountPercent,
          startsAt: parseDate(payload.startsAt),
          endsAt: parseDate(payload.endsAt),
        })
        .where(and(eq(promoCodes.id, promoId), eq(promoCodes.isDeleted, false)))
        .returning();

      if (!updated) {
        return c.json({ error: { code: 'NOT_FOUND', message: 'Promo code not found.' } }, 404);
      }

      const detail = await fetchPromoDetail(updated.id);
      return c.json({ data: detail ?? updated });
    } catch (error) {
      if (error instanceof ApiError) {
        return respondError(c, error);
      }
      console.error('[promo-codes] update failed', error);
      return c.json(
        { error: { code: 'PROMO_UPDATE_FAILED', message: 'Failed to update code.' } },
        500,
      );
    }
  });

  app.delete('/promo-codes/:id', async (c) => {
    const admin = await requireAdmin(c);
    if ('response' in admin) {
      return admin.response;
    }

    const promoId = c.req.param('id');
    const idResult = z.string().uuid().safeParse(promoId);
    if (!idResult.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid promo code ID.' } }, 400);
    }

    const [updated] = await db
      .update(promoCodes)
      .set({ isDeleted: true })
      .where(and(eq(promoCodes.id, promoId), eq(promoCodes.isDeleted, false)))
      .returning({ id: promoCodes.id });

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Promo code not found.' } }, 404);
    }

    return c.json({ success: true });
  });
}
