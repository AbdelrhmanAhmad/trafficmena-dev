import { and, count, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { series, seriesAccessGrants, users } from '../../db/schema/index.js';
import { extractJsonPayload, jsonPayloadErrorStatusCode } from './jsonPayload.js';
import { handleSeriesBulkGrant } from './seriesGrantsBulk.js';
import {
  consumeRateLimit,
  escapeLikePattern,
  isKnownDatabaseConflict,
  requireManager,
} from './utils.js';

const listGrantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  search: z.string().trim().max(120).optional(),
});

const uuidPathParamSchema = z.string().uuid();

const GRANT_MUTATION_RATE_LIMIT = { limit: 40, windowMs: 60_000 };
const SERIES_GRANT_MAX_USER_IDS = 500;

const grantUsersSchema = z.object({
  userIds: z
    .array(z.string().uuid())
    .min(1, 'Provide at least one user ID.')
    .max(
      SERIES_GRANT_MAX_USER_IDS,
      `You can grant up to ${SERIES_GRANT_MAX_USER_IDS} users per request.`,
    ),
  reason: z.string().trim().min(3).max(500),
});

const revokeGrantSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export function registerSeriesGrantsRoutes(app: Hono) {
  app.get('/series/:id/grants', async (c) => {
    const actor = await requireManager(c);
    if ('response' in actor) return actor.response;

    const idParsed = uuidPathParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json(
        { error: { code: 'INVALID_PARAM', message: 'Series ID must be a valid UUID.' } },
        400,
      );
    }

    const queryParsed = listGrantsQuerySchema.safeParse({
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
      search: c.req.query('search'),
    });
    if (!queryParsed.success) {
      return c.json({ error: { code: 'INVALID_QUERY', message: queryParsed.error.message } }, 400);
    }

    const seriesId = idParsed.data;
    const { page, pageSize, search } = queryParsed.data;

    const [seriesRecord] = await db
      .select({ id: series.id })
      .from(series)
      .where(eq(series.id, seriesId))
      .limit(1);

    if (!seriesRecord) {
      return c.json({ error: { code: 'SERIES_NOT_FOUND', message: 'Series not found.' } }, 404);
    }

    const filters = [
      eq(seriesAccessGrants.seriesId, seriesId),
      isNull(seriesAccessGrants.revokedAt),
    ];

    if (search) {
      const pattern = `%${escapeLikePattern(search)}%`;
      const searchFilter = or(ilike(users.email, pattern), ilike(users.name, pattern));
      if (searchFilter) {
        filters.push(searchFilter);
      }
    }

    const whereClause = and(...filters);
    const offset = (page - 1) * pageSize;

    const [totalResult, items] = await Promise.all([
      db
        .select({ value: count(seriesAccessGrants.id) })
        .from(seriesAccessGrants)
        .innerJoin(users, eq(users.id, seriesAccessGrants.userId))
        .where(whereClause),
      db
        .select({
          id: seriesAccessGrants.id,
          userId: seriesAccessGrants.userId,
          email: users.email,
          name: users.name,
          grantedBy: seriesAccessGrants.grantedBy,
          grantReason: seriesAccessGrants.grantReason,
          grantedAt: seriesAccessGrants.grantedAt,
        })
        .from(seriesAccessGrants)
        .innerJoin(users, eq(users.id, seriesAccessGrants.userId))
        .where(whereClause)
        .orderBy(desc(seriesAccessGrants.grantedAt))
        .limit(pageSize)
        .offset(offset),
    ]);
    const [totalRow] = totalResult;

    return c.json({
      items,
      pagination: {
        page,
        pageSize,
        total: Number(totalRow?.value ?? 0),
      },
    });
  });

  app.post('/series/:id/grants', async (c) => {
    const actor = await requireManager(c);
    if ('response' in actor) return actor.response;

    const rateLimited = consumeRateLimit(
      c,
      `series-grant:create:${actor.userId}`,
      GRANT_MUTATION_RATE_LIMIT,
    );
    if (rateLimited) return rateLimited;

    const idParsed = uuidPathParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json(
        { error: { code: 'INVALID_PARAM', message: 'Series ID must be a valid UUID.' } },
        400,
      );
    }

    const bodyResult = await extractJsonPayload(c);
    if (!bodyResult.ok) {
      return c.json(
        { error: { code: bodyResult.code, message: bodyResult.message } },
        jsonPayloadErrorStatusCode(bodyResult.code),
      );
    }

    const parsed = grantUsersSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
    }

    const seriesId = idParsed.data;
    const uniqueUserIds = [...new Set(parsed.data.userIds)];

    try {
      const txResult = await db.transaction(async (tx) => {
        const [targetSeries, existingUsers] = await Promise.all([
          tx
            .select({ id: series.id, isPremium: series.isPremium })
            .from(series)
            .where(eq(series.id, seriesId))
            .limit(1)
            .for('update'),
          tx.select({ id: users.id }).from(users).where(inArray(users.id, uniqueUserIds)),
        ]);

        const firstSeries = targetSeries[0];
        if (!firstSeries) {
          return { type: 'series_not_found' as const };
        }

        if (!firstSeries.isPremium) {
          return { type: 'series_not_premium' as const };
        }

        if (existingUsers.length !== uniqueUserIds.length) {
          return { type: 'user_not_found' as const };
        }

        const inserted = await tx
          .insert(seriesAccessGrants)
          .values(
            uniqueUserIds.map((userId) => ({
              seriesId,
              userId,
              grantedBy: actor.userId,
              grantReason: parsed.data.reason,
            })),
          )
          .onConflictDoNothing({
            target: [seriesAccessGrants.seriesId, seriesAccessGrants.userId],
            where: isNull(seriesAccessGrants.revokedAt),
          })
          .returning({ id: seriesAccessGrants.id });

        return { type: 'created' as const, insertedCount: inserted.length };
      });

      if (txResult.type === 'series_not_found') {
        return c.json({ error: { code: 'SERIES_NOT_FOUND', message: 'Series not found.' } }, 404);
      }

      if (txResult.type === 'series_not_premium') {
        return c.json(
          {
            error: {
              code: 'SERIES_NOT_PREMIUM',
              message: 'Only premium series can have manual access grants.',
            },
          },
          400,
        );
      }

      if (txResult.type === 'user_not_found') {
        return c.json(
          {
            error: {
              code: 'USER_NOT_FOUND',
              message: 'One or more users do not exist.',
            },
          },
          404,
        );
      }

      return c.json({
        success: true,
        grantedCount: txResult.insertedCount,
        alreadyGrantedCount: uniqueUserIds.length - txResult.insertedCount,
      });
    } catch (error) {
      if (isKnownDatabaseConflict(error) === 'fk') {
        return c.json(
          {
            error: {
              code: 'CONFLICT',
              message: 'Series or user records changed while granting access. Refresh and retry.',
            },
          },
          409,
        );
      }

      throw error;
    }
  });

  app.post('/series/:id/grants/:userId/revoke', async (c) => {
    const actor = await requireManager(c);
    if ('response' in actor) return actor.response;

    const rateLimited = consumeRateLimit(
      c,
      `series-grant:revoke:${actor.userId}`,
      GRANT_MUTATION_RATE_LIMIT,
    );
    if (rateLimited) return rateLimited;

    const idParsed = uuidPathParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json(
        { error: { code: 'INVALID_PARAM', message: 'Series ID must be a valid UUID.' } },
        400,
      );
    }

    const userIdParsed = uuidPathParamSchema.safeParse(c.req.param('userId'));
    if (!userIdParsed.success) {
      return c.json(
        { error: { code: 'INVALID_PARAM', message: 'User ID must be a valid UUID.' } },
        400,
      );
    }

    const bodyResult = await extractJsonPayload(c);
    if (!bodyResult.ok) {
      return c.json(
        { error: { code: bodyResult.code, message: bodyResult.message } },
        jsonPayloadErrorStatusCode(bodyResult.code),
      );
    }

    const parsed = revokeGrantSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
    }

    const [updated] = await db
      .update(seriesAccessGrants)
      .set({
        revokedAt: new Date(),
        revokedBy: actor.userId,
        revokeReason: parsed.data.reason,
      })
      .where(
        and(
          eq(seriesAccessGrants.seriesId, idParsed.data),
          eq(seriesAccessGrants.userId, userIdParsed.data),
          isNull(seriesAccessGrants.revokedAt),
        ),
      )
      .returning({ id: seriesAccessGrants.id });

    if (!updated) {
      return c.json(
        { error: { code: 'GRANT_NOT_FOUND', message: 'Active grant not found.' } },
        404,
      );
    }

    return c.json({ success: true, revokedGrantId: updated.id });
  });

  app.post('/series/grants/bulk', async (c) => {
    const actor = await requireManager(c);
    if ('response' in actor) return actor.response;

    return handleSeriesBulkGrant(c, actor.userId);
  });
}
