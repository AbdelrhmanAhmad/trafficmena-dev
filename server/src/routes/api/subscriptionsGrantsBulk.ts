import { and, eq, gte, inArray, isNull, lt } from 'drizzle-orm';
import type { Context } from 'hono';
import { db } from '../../db/client.js';
import { subscriptions, users } from '../../db/schema/index.js';
import { ONE_YEAR_MS } from './subscriptionShared.js';
import { parseSubscriptionGrantCsv } from './subscriptionsGrantsCsv.js';
import {
  collectActiveSubscriptionConflicts,
  normalizeBulkSubscriptionGrantRows,
} from './subscriptionsGrantUtils.js';
import { consumeRateLimit, extractCsvPayload, isKnownDatabaseConflict } from './utils.js';

const BULK_GRANT_RATE_LIMIT = { limit: 30, windowMs: 60_000 };

export async function handleSubscriptionBulkGrant(
  c: Context,
  actorUserId: string,
): Promise<Response> {
  const rateLimited = consumeRateLimit(
    c,
    `subscription-grant:bulk:${actorUserId}`,
    BULK_GRANT_RATE_LIMIT,
  );
  if (rateLimited) return rateLimited;

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
          grantedBy: actorUserId,
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
    const conflict = isKnownDatabaseConflict(error);
    if (!conflict) throw error;

    if (conflict === 'fk') {
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
}
