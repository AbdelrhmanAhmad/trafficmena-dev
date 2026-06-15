import { and, desc, eq, gte, inArray, isNotNull } from 'drizzle-orm';
import { db } from '../src/db/client.js';
import {
  eventAttendees,
  eventReservations,
  payments,
  trackBookings,
  trackReservations,
} from '../src/db/schema/index.js';
import { getInvoiceData } from '../src/services/fawaterk.js';
import { isInvoicePaid } from '../src/utils/invoiceStatus.js';

type Args = {
  apply: boolean;
  since?: Date;
  limit?: number;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false };
  for (const raw of argv) {
    if (raw === '--apply') {
      args.apply = true;
      continue;
    }
    if (raw.startsWith('--since=')) {
      const value = raw.slice('--since='.length);
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid --since date: ${value}`);
      }
      args.since = date;
      continue;
    }
    if (raw.startsWith('--limit=')) {
      const value = Number(raw.slice('--limit='.length));
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid --limit value: ${raw}`);
      }
      args.limit = Math.floor(value);
    }
  }
  return args;
}

async function run() {
  const { apply, since, limit } = parseArgs(process.argv.slice(2));

  let whereClause = and(
    eq(payments.status, 'paid'),
    inArray(payments.itemType, ['track', 'event']),
    isNotNull(payments.fawaterkInvoiceId),
  );
  if (since) {
    whereClause = and(whereClause, gte(payments.createdAt, since));
  }

  const rows = await db
    .select({
      id: payments.id,
      itemType: payments.itemType,
      itemId: payments.itemId,
      invoiceId: payments.fawaterkInvoiceId,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(whereClause)
    .orderBy(desc(payments.createdAt))
    .limit(limit ?? 1000);

  console.log(
    `[reconcile] scanned=${rows.length} apply=${apply} limit=${limit ?? 1000} since=${since?.toISOString() ?? 'none'}`,
  );

  let checked = 0;
  let unpaid = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.invoiceId) continue;
    checked += 1;
    try {
      const invoice = await getInvoiceData(row.invoiceId);
      if (isInvoicePaid(invoice)) {
        continue;
      }

      unpaid += 1;
      console.log(
        `[reconcile] unpaid payment=${row.id} invoice=${row.invoiceId} item=${row.itemType}:${row.itemId ?? 'n/a'}`,
      );

      if (!apply) continue;

      await db.transaction(async (tx) => {
        await tx.delete(eventAttendees).where(eq(eventAttendees.paymentId, row.id));
        await tx.delete(trackBookings).where(eq(trackBookings.paymentId, row.id));
        await tx.delete(eventReservations).where(eq(eventReservations.paymentId, row.id));
        await tx.delete(trackReservations).where(eq(trackReservations.paymentId, row.id));
        await tx
          .update(payments)
          .set({ status: 'failed', paidAt: null })
          .where(eq(payments.id, row.id));
      });
    } catch (error) {
      failed += 1;
      console.error(
        `[reconcile] failed payment=${row.id} invoice=${row.invoiceId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log(`[reconcile] checked=${checked} unpaid=${unpaid} failed=${failed}`);
  if (!apply) {
    console.log('[reconcile] dry run only. Re-run with --apply to make changes.');
  }
}

run().catch((error) => {
  console.error('[reconcile] fatal error:', error);
  process.exit(1);
});
