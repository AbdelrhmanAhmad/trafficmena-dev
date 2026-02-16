import { and, eq, gte, inArray, isNull, lt } from 'drizzle-orm';
import type { Hono } from 'hono';
import { db } from '../../db/client.js';
import { subscriptions, users } from '../../db/schema/index.js';
import { paymentRateLimiter } from '../../services/rateLimiter.js';
import { extractJsonPayload } from './jsonPayload.js';
import { activeSubscriptionWhere, ONE_YEAR_MS } from './subscriptionShared.js';
import {
  createSubscriptionGrantSchema,
  parseSubscriptionGrantCsv,
  revokeSubscriptionGrantSchema,
} from './subscriptionsGrantsCsv.js';
import {
  collectActiveSubscriptionConflicts,
  normalizeBulkSubscriptionGrantRows,
} from './subscriptionsGrantUtils.js';
import {
  DATABASE_ERROR_CODES,
  extractCsvPayload,
  extractDatabaseErrorCode,
  getRequestIp,
  requireAdmin,
} from './utils.js';

const GRANT_MUTATION_RATE_LIMIT = { limit: 30, windowMs: 60_000 };

export function registerSubscriptionGrantRoutes(app: Hono) {
  app.post('/subscriptions/grants', async (c) => {
    const actor = await requireAdmin(c);
    if ('response' in actor) {
      return actor.response;
    }

    const clientIp = getRequestIp(c);
    const { allowed, resetAt } = paymentRateLimiter.consume(
      `subscription-grant:create:${actor.userId}:${clientIp}`,
      GRANT_MUTATION_RATE_LIMIT,
    );
    if (!allowed) {
      c.header('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)));
      return c.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many grant operations. Please try again shortly.',
          },
        },
        429,
      );
    }

    const bodyResult = await extractJsonPayload(c);
    if (!bodyResult.ok) {
      return c.json({ error: { code: bodyResult.code, message: bodyResult.message } }, 400);
    }

    const parsed = createSubscriptionGrantSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
    }

    const payload = parsed.data;
    const now = new Date();

    // Invariant: at most one currently active subscription per user.
    const grantResult = await db.transaction(async (tx) => {
      await tx
        .update(subscriptions)
        .set({ status: 'expired' })
        .where(
          and(
            eq(subscriptions.userId, payload.userId),
            eq(subscriptions.status, 'active'),
            isNull(subscriptions.revokedAt),
            lt(subscriptions.endsAt, now),
          ),
        );

      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, payload.userId))
        .for('update')
        .limit(1);
      if (!user) {
        return { type: 'user_not_found' as const };
      }

      const [active] = await tx
        .select({
          id: subscriptions.id,
          endsAt: subscriptions.endsAt,
        })
        .from(subscriptions)
        .where(activeSubscriptionWhere(payload.userId, now))
        .for('update')
        .limit(1);

      if (active) {
        return {
          type: 'active_exists' as const,
          endsAt: active.endsAt,
        };
      }

      const [created] = await tx
        .insert(subscriptions)
        .values({
          userId: payload.userId,
          status: 'active',
          startsAt: now,
          endsAt: new Date(now.getTime() + ONE_YEAR_MS),
          source: payload.source,
          pricePaidCents: 0,
          paymentId: null,
          grantedBy: actor.userId,
          grantReason: payload.reason,
        })
        .returning({
          id: subscriptions.id,
          userId: subscriptions.userId,
          status: subscriptions.status,
          startsAt: subscriptions.startsAt,
          endsAt: subscriptions.endsAt,
          source: subscriptions.source,
        });

      return { type: 'created' as const, subscription: created };
    });

    if (grantResult.type === 'user_not_found') {
      return c.json({ error: { code: 'USER_NOT_FOUND', message: 'User not found.' } }, 404);
    }

    if (grantResult.type === 'active_exists') {
      return c.json(
        {
          error: {
            code: 'ACTIVE_SUBSCRIPTION_EXISTS',
            message: `Active subscription exists until ${grantResult.endsAt.toISOString()}.`,
          },
        },
        409,
      );
    }

    return c.json({ success: true, subscription: grantResult.subscription }, 201);
  });

  app.post('/subscriptions/grants/revoke', async (c) => {
    const actor = await requireAdmin(c);
    if ('response' in actor) {
      return actor.response;
    }

    const clientIp = getRequestIp(c);
    const { allowed, resetAt } = paymentRateLimiter.consume(
      `subscription-grant:revoke:${actor.userId}:${clientIp}`,
      GRANT_MUTATION_RATE_LIMIT,
    );
    if (!allowed) {
      c.header('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)));
      return c.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many grant operations. Please try again shortly.',
          },
        },
        429,
      );
    }

    const bodyResult = await extractJsonPayload(c);
    if (!bodyResult.ok) {
      return c.json({ error: { code: bodyResult.code, message: bodyResult.message } }, 400);
    }

    const parsed = revokeSubscriptionGrantSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
    }

    const now = new Date();
    const [revoked] = await db
      .update(subscriptions)
      .set({
        status: 'expired',
        endsAt: now,
        revokedAt: now,
        revokedBy: actor.userId,
        revokeReason: parsed.data.reason,
      })
      .where(
        and(
          eq(subscriptions.userId, parsed.data.userId),
          eq(subscriptions.status, 'active'),
          isNull(subscriptions.revokedAt),
          gte(subscriptions.endsAt, now),
          inArray(subscriptions.source, ['legacy', 'gift']),
        ),
      )
      .returning({ id: subscriptions.id });

    if (!revoked) {
      return c.json(
        {
          error: {
            code: 'NON_PAID_SUBSCRIPTION_NOT_FOUND',
            message: 'Active legacy/gift subscription not found.',
          },
        },
        404,
      );
    }

    return c.json({ success: true });
  });

  app.post('/subscriptions/grants/bulk', async (c) => {
    const actor = await requireAdmin(c);
    if ('response' in actor) {
      return actor.response;
    }

    const clientIp = getRequestIp(c);
    const { allowed, resetAt } = paymentRateLimiter.consume(
      `subscription-grant:bulk:${actor.userId}:${clientIp}`,
      GRANT_MUTATION_RATE_LIMIT,
    );
    if (!allowed) {
      c.header('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)));
      return c.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many grant operations. Please try again shortly.',
          },
        },
        429,
      );
    }

    const csvResult = await extractCsvPayload(c);
    if (!csvResult.ok) {
      return c.json(
        {
          error: {
            code: csvResult.code,
            message:
              csvResult.code === 'INVALID_REQUEST'
                ? 'Upload a CSV file with columns: email,source,reason.'
                : csvResult.message,
          },
        },
        csvResult.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400,
      );
    }

    const { rows, errors } = parseSubscriptionGrantCsv(csvResult.csv);
    if (errors.length > 0) {
      return c.json(
        {
          error: {
            code: 'INVALID_CSV',
            message: 'CSV validation failed. No subscriptions were granted.',
            errors,
          },
        },
        400,
      );
    }

    const emails = [...new Set(rows.map((row) => row.email))];
    const usersByEmail = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(inArray(users.email, emails));
    const userIdByEmail = new Map(usersByEmail.map((user) => [user.email.toLowerCase(), user.id]));

    const normalizedResult = normalizeBulkSubscriptionGrantRows({
      rows,
      userIdByEmail,
    });

    if (normalizedResult.errors.length > 0) {
      return c.json(
        {
          error: {
            code: 'INVALID_CSV',
            message: 'CSV validation failed. No subscriptions were granted.',
            errors: normalizedResult.errors,
          },
        },
        400,
      );
    }

    const normalizedRows = [...normalizedResult.rows].sort(
      (left, right) => left.userId.localeCompare(right.userId) || left.line - right.line,
    );
    const userIds = [...new Set(normalizedRows.map((row) => row.userId))];
    const now = new Date();

    const existingActive = await db
      .select({
        userId: subscriptions.userId,
        endsAt: subscriptions.endsAt,
      })
      .from(subscriptions)
      .where(
        and(
          inArray(subscriptions.userId, userIds),
          eq(subscriptions.status, 'active'),
          isNull(subscriptions.revokedAt),
          gte(subscriptions.endsAt, now),
        ),
      );

    const existingActiveByUser = new Map(existingActive.map((item) => [item.userId, item.endsAt]));
    const validationErrors = collectActiveSubscriptionConflicts({
      rows: normalizedRows,
      activeEndsAtByUserId: existingActiveByUser,
    });
    if (validationErrors.length > 0) {
      return c.json(
        {
          error: {
            code: 'INVALID_CSV',
            message: 'CSV validation failed. No subscriptions were granted.',
            errors: validationErrors,
          },
        },
        409,
      );
    }

    try {
      const bulkResult = await db.transaction(async (tx) => {
        await tx
          .update(subscriptions)
          .set({ status: 'expired' })
          .where(
            and(
              inArray(subscriptions.userId, userIds),
              eq(subscriptions.status, 'active'),
              isNull(subscriptions.revokedAt),
              lt(subscriptions.endsAt, now),
            ),
          );

        const lockedUsers = await tx
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.id, userIds))
          .orderBy(users.id)
          .for('update');
        if (lockedUsers.length !== userIds.length) {
          return { type: 'conflict' as const };
        }

        const txActive = await tx
          .select({
            userId: subscriptions.userId,
            endsAt: subscriptions.endsAt,
          })
          .from(subscriptions)
          .where(
            and(
              inArray(subscriptions.userId, userIds),
              eq(subscriptions.status, 'active'),
              isNull(subscriptions.revokedAt),
              gte(subscriptions.endsAt, now),
            ),
          )
          .for('update');

        const txActiveByUser = new Map(txActive.map((item) => [item.userId, item.endsAt]));
        const txValidationErrors = collectActiveSubscriptionConflicts({
          rows: normalizedRows,
          activeEndsAtByUserId: txActiveByUser,
        });
        if (txValidationErrors.length > 0) {
          return { type: 'validation_error' as const, errors: txValidationErrors };
        }

        await tx.insert(subscriptions).values(
          normalizedRows.map((row) => ({
            userId: row.userId,
            status: 'active' as const,
            startsAt: now,
            endsAt: new Date(now.getTime() + ONE_YEAR_MS),
            source: row.source,
            pricePaidCents: 0,
            paymentId: null,
            grantedBy: actor.userId,
            grantReason: row.grantReason,
          })),
        );

        return { type: 'created' as const, grantedCount: normalizedRows.length };
      });

      if (bulkResult.type === 'validation_error') {
        return c.json(
          {
            error: {
              code: 'INVALID_CSV',
              message: 'CSV validation failed. No subscriptions were granted.',
              errors: bulkResult.errors,
            },
          },
          409,
        );
      }

      if (bulkResult.type === 'conflict') {
        return c.json(
          {
            error: {
              code: 'INVALID_CSV',
              message: 'CSV validation failed. No subscriptions were granted.',
              errors: [
                {
                  line: 1,
                  email: '',
                  source: '',
                  reason: 'One or more users were removed while processing. Retry with fresh data.',
                },
              ],
            },
          },
          409,
        );
      }

      return c.json({
        success: true,
        grantedCount: bulkResult.grantedCount,
      });
    } catch (error) {
      const errorCode = extractDatabaseErrorCode(error);
      if (
        errorCode !== DATABASE_ERROR_CODES.UNIQUE_VIOLATION &&
        errorCode !== DATABASE_ERROR_CODES.FOREIGN_KEY_VIOLATION
      ) {
        throw error;
      }

      if (errorCode === DATABASE_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
        return c.json(
          {
            error: {
              code: 'INVALID_CSV',
              message: 'CSV validation failed. No subscriptions were granted.',
              errors: [
                {
                  line: 1,
                  email: '',
                  source: '',
                  reason: 'One or more users no longer exist. Refresh users and retry.',
                },
              ],
            },
          },
          409,
        );
      }

      const currentActive = await db
        .select({
          userId: subscriptions.userId,
          endsAt: subscriptions.endsAt,
        })
        .from(subscriptions)
        .where(
          and(
            inArray(subscriptions.userId, userIds),
            eq(subscriptions.status, 'active'),
            isNull(subscriptions.revokedAt),
            gte(subscriptions.endsAt, now),
          ),
        );

      const currentActiveByUser = new Map(currentActive.map((item) => [item.userId, item.endsAt]));
      const raceErrors = collectActiveSubscriptionConflicts({
        rows: normalizedRows,
        activeEndsAtByUserId: currentActiveByUser,
      });

      return c.json(
        {
          error: {
            code: 'INVALID_CSV',
            message: 'CSV validation failed. No subscriptions were granted.',
            errors:
              raceErrors.length > 0
                ? raceErrors
                : [
                    {
                      line: 1,
                      email: '',
                      source: '',
                      reason:
                        'One or more subscriptions changed while processing. Retry with a fresh CSV.',
                    },
                  ],
          },
        },
        409,
      );
    }
  });
}
