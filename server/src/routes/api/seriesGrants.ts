import { and, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import {
  payments,
  profiles,
  series,
  seriesAccessGrants,
  trackBookings,
  users,
} from '../../db/schema/index.js';
import { buildTrackAttendeesQuery } from '../../utils/attendeesQuery.js';
import { activeTrackBookingWhere } from '../../utils/booking.js';
import {
  isMergeTruncated,
  MAX_MERGE_ROWS,
  mergeSeriesAttendees,
} from '../../utils/seriesAttendees.js';
import { extractJsonPayload, jsonPayloadErrorStatusCode } from './jsonPayload.js';
import { handleSeriesBulkGrant } from './seriesGrantsBulk.js';
import { TICKET_TYPES } from './ticketAccess.js';
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

  // Enrolled-users parity with tracks (R1): linked-track bookers ∪ manual series grants.
  app.get('/series/:id/attendees', async (c) => {
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
      .select({ id: series.id, trackId: series.trackId })
      .from(series)
      .where(eq(series.id, seriesId))
      .limit(1);

    if (!seriesRecord) {
      return c.json({ error: { code: 'SERIES_NOT_FOUND', message: 'Series not found.' } }, 404);
    }

    const searchPattern = search ? `%${escapeLikePattern(search)}%` : null;

    // Ticket-type filter applies to track-booking rows only; a specific type excludes manual grants.
    const ticketTypeParam = c.req.query('ticketType');
    const ticketTypeFilter = TICKET_TYPES.find((value) => value === ticketTypeParam);

    const bookingFilters = seriesRecord.trackId
      ? [
          activeTrackBookingWhere(
            eq(trackBookings.trackId, seriesRecord.trackId),
            ticketTypeFilter ? eq(trackBookings.ticketType, ticketTypeFilter) : undefined,
          ),
        ]
      : [];
    const grantFilters = [
      eq(seriesAccessGrants.seriesId, seriesId),
      isNull(seriesAccessGrants.revokedAt),
    ];

    if (searchPattern) {
      const bookingSearchFilter = or(
        ilike(users.name, searchPattern),
        ilike(users.email, searchPattern),
        ilike(profiles.firstName, searchPattern),
        ilike(profiles.lastName, searchPattern),
        ilike(profiles.phoneNumber, searchPattern),
        ilike(sql`COALESCE(${trackBookings.manualReference}, '')`, searchPattern),
        ilike(sql`COALESCE(${payments.fawaterkInvoiceKey}, '')`, searchPattern),
        sql`CAST(${payments.fawaterkInvoiceId} AS TEXT) ILIKE ${searchPattern}`,
        sql`CAST(${payments.fawaterkTransactionId} AS TEXT) ILIKE ${searchPattern}`,
      );
      if (bookingSearchFilter) {
        bookingFilters.push(bookingSearchFilter);
      }

      const grantSearchFilter = or(
        ilike(users.name, searchPattern),
        ilike(users.email, searchPattern),
        ilike(profiles.firstName, searchPattern),
        ilike(profiles.lastName, searchPattern),
        ilike(profiles.phoneNumber, searchPattern),
        ilike(seriesAccessGrants.grantReason, searchPattern),
      );
      if (grantSearchFilter) {
        grantFilters.push(grantSearchFilter);
      }
    }

    // A series with no linked track yields manual grants only (no track join, no crash).
    // Both sources are capped after their own search predicates. That keeps the route bounded while
    // preserving search correctness for older matching rows in large linked tracks or grant lists.
    const bookingRows = seriesRecord.trackId
      ? await buildTrackAttendeesQuery(db, and(...bookingFilters))
          .orderBy(desc(trackBookings.bookedAt))
          .limit(MAX_MERGE_ROWS)
      : [];

    // A specific ticket-type filter excludes manual grants entirely, so skip fetching them.
    const grantRows = ticketTypeFilter
      ? []
      : await db
          .select({
            grantId: seriesAccessGrants.id,
            userId: seriesAccessGrants.userId,
            email: users.email,
            name: users.name,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            phoneNumber: profiles.phoneNumber,
            grantedAt: seriesAccessGrants.grantedAt,
            grantReason: seriesAccessGrants.grantReason,
          })
          .from(seriesAccessGrants)
          .innerJoin(users, eq(users.id, seriesAccessGrants.userId))
          .leftJoin(profiles, eq(profiles.id, users.id))
          .where(and(...grantFilters))
          .orderBy(desc(seriesAccessGrants.grantedAt))
          .limit(MAX_MERGE_ROWS);

    const { items, total } = mergeSeriesAttendees(bookingRows, grantRows, {
      search,
      page,
      pageSize,
      ticketType: ticketTypeFilter,
    });

    // Staff-facing signal: the merged total is incomplete because a source hit the cap.
    const truncated = isMergeTruncated(bookingRows.length, grantRows.length);

    return c.json({ items, pagination: { page, pageSize, total }, truncated });
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
