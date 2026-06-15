import { inArray, isNull } from 'drizzle-orm';
import type { Context } from 'hono';
import { db } from '../../db/client.js';
import { series, seriesAccessGrants, users } from '../../db/schema/index.js';
import { parseSeriesGrantCsv, type SeriesGrantCsvError } from './seriesGrantsCsv.js';
import { consumeRateLimit, extractCsvPayload, isKnownDatabaseConflict } from './utils.js';

const BULK_GRANT_RATE_LIMIT = { limit: 40, windowMs: 60_000 };

type NormalizedSeriesGrantRow = {
  line: number;
  email: string;
  userId: string;
  seriesId: string;
  grantReason: string;
};

function dedupeSeriesGrantRows(rows: NormalizedSeriesGrantRow[]): NormalizedSeriesGrantRow[] {
  const deduped = new Map<string, NormalizedSeriesGrantRow>();
  for (const row of rows) {
    const key = `${row.userId}:${row.seriesId}`;
    if (!deduped.has(key)) {
      deduped.set(key, row);
    }
  }
  return Array.from(deduped.values());
}

export async function handleSeriesBulkGrant(c: Context, actorUserId: string): Promise<Response> {
  const rateLimited = consumeRateLimit(
    c,
    `series-grant:bulk:${actorUserId}`,
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
              ? 'Upload a CSV file with columns: email,series_id,reason.'
              : csvResult.message,
        },
      },
      csvResult.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400,
    );
  }

  const { rows, errors } = parseSeriesGrantCsv(csvResult.csv);
  if (errors.length > 0) {
    return c.json(
      {
        error: {
          code: 'INVALID_CSV',
          message: 'CSV validation failed. No grants were applied.',
          errors,
        },
      },
      400,
    );
  }

  if (rows.length === 0) {
    return c.json(
      {
        error: {
          code: 'INVALID_CSV',
          message: 'CSV contains no valid rows. No grants were applied.',
        },
      },
      400,
    );
  }

  const emails = [...new Set(rows.map((row) => row.email))];
  const seriesIds = [...new Set(rows.map((row) => row.seriesId))];

  const matchedUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, emails));

  const userIdByEmail = new Map(matchedUsers.map((user) => [user.email.toLowerCase(), user.id]));

  const targetSeries = await db
    .select({ id: series.id, isPremium: series.isPremium })
    .from(series)
    .where(inArray(series.id, seriesIds));

  const premiumSeriesById = new Map(
    targetSeries.filter((item) => item.isPremium).map((item) => [item.id, item]),
  );

  const validationErrors: SeriesGrantCsvError[] = [];
  const normalizedRows: NormalizedSeriesGrantRow[] = [];

  for (const row of rows) {
    const userId = userIdByEmail.get(row.email);
    if (!userId) {
      validationErrors.push({
        line: row.line,
        email: row.email,
        seriesId: row.seriesId,
        reason: 'User email not found.',
      });
      continue;
    }

    if (!premiumSeriesById.has(row.seriesId)) {
      validationErrors.push({
        line: row.line,
        email: row.email,
        seriesId: row.seriesId,
        reason: 'Series not found or not premium.',
      });
      continue;
    }

    normalizedRows.push({
      line: row.line,
      email: row.email,
      userId,
      seriesId: row.seriesId,
      grantReason: row.grantReason,
    });
  }

  if (validationErrors.length > 0) {
    return c.json(
      {
        error: {
          code: 'INVALID_CSV',
          message: 'CSV validation failed. No grants were applied.',
          errors: validationErrors,
        },
      },
      400,
    );
  }

  const dedupedRows = dedupeSeriesGrantRows(normalizedRows);

  const txUserIds = [...new Set(dedupedRows.map((row) => row.userId))];
  const txSeriesIds = [...new Set(dedupedRows.map((row) => row.seriesId))];

  let insertedCount = 0;
  try {
    const txResult = await db.transaction(async (tx) => {
      const [txUsers, txSeries] = await Promise.all([
        tx.select({ id: users.id }).from(users).where(inArray(users.id, txUserIds)),
        tx
          .select({ id: series.id, isPremium: series.isPremium })
          .from(series)
          .where(inArray(series.id, txSeriesIds))
          .for('update'),
      ]);

      const txUserSet = new Set(txUsers.map((row) => row.id));
      const txPremiumSeriesSet = new Set(
        txSeries.filter((row) => row.isPremium).map((row) => row.id),
      );

      const txValidationErrors: SeriesGrantCsvError[] = [];
      for (const row of dedupedRows) {
        if (!txUserSet.has(row.userId)) {
          txValidationErrors.push({
            line: row.line,
            email: row.email,
            seriesId: row.seriesId,
            reason: 'User email not found.',
          });
          continue;
        }

        if (!txPremiumSeriesSet.has(row.seriesId)) {
          txValidationErrors.push({
            line: row.line,
            email: row.email,
            seriesId: row.seriesId,
            reason: 'Series not found or not premium.',
          });
        }
      }

      if (txValidationErrors.length > 0) {
        return { type: 'conflict' as const, errors: txValidationErrors };
      }

      const inserted = await tx
        .insert(seriesAccessGrants)
        .values(
          dedupedRows.map((row) => ({
            seriesId: row.seriesId,
            userId: row.userId,
            grantedBy: actorUserId,
            grantReason: row.grantReason,
          })),
        )
        .onConflictDoNothing({
          target: [seriesAccessGrants.seriesId, seriesAccessGrants.userId],
          where: isNull(seriesAccessGrants.revokedAt),
        })
        .returning({ id: seriesAccessGrants.id });

      return { type: 'created' as const, insertedCount: inserted.length };
    });

    if (txResult.type === 'conflict') {
      return c.json(
        {
          error: {
            code: 'INVALID_CSV',
            message: 'CSV validation failed. No grants were applied.',
            errors: txResult.errors,
          },
        },
        409,
      );
    }

    insertedCount = txResult.insertedCount;
  } catch (error) {
    if (isKnownDatabaseConflict(error) === 'fk') {
      return c.json(
        {
          error: {
            code: 'INVALID_CSV',
            message: 'CSV validation failed. No grants were applied.',
            errors: [
              {
                line: 1,
                email: '',
                seriesId: '',
                reason:
                  'One or more users/series changed while processing. Retry with a fresh CSV.',
              },
            ],
          },
        },
        409,
      );
    }

    throw error;
  }

  return c.json({
    success: true,
    totalRows: rows.length,
    processedRows: dedupedRows.length,
    grantedCount: insertedCount,
    alreadyGrantedCount: dedupedRows.length - insertedCount,
  });
}
