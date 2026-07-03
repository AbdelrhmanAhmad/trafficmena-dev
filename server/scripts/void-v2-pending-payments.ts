import { pathToFileURL } from 'node:url';
import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { db } from '../src/db/client.js';
import { eventReservations, payments, trackReservations } from '../src/db/schema/index.js';

// One-off cutover script: void every still-pending v2 payment the shipped v3 code can no longer
// verify, and release its capacity holds. Modeled on the (retired) reconcile-unpaid-payments.ts
// conventions: dry-run by default, --apply to mutate, operator table + preflight gates printed.
//
// Run:  cd server && tsx -r dotenv/config scripts/void-v2-pending-payments.ts [--apply]
//
// Preflight (see the DRY-RUN output): DB backup confirmed -> human sign-off on the table -> --apply.
// Voided rows are set to status='failed' (deliberately outside every recovery scan — they must never
// resurrect through a code path that can no longer verify them). This is the rollback boundary.

const GATEWAY_DUE_WINDOW_MS = 72 * 60 * 60 * 1000; // matches RESERVATION_TTL_MS

type Args = { apply: boolean };

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false };
  for (const raw of argv) {
    if (raw === '--apply') {
      args.apply = true;
    }
  }
  return args;
}

// Pure selection predicate: a v2 straggler to void iff it is a live hold (pending|expired) that has
// a v2 invoice but NO v3 intent — so the shipped v3 code can never verify it. Excludes terminal
// rows (paid/failed) and free rows (no invoice id). Mirrors the SQL WHERE clause below exactly.
export function isVoidCandidate(row: {
  status: string;
  fawaterkInvoiceId: number | null;
  fawaterkIntentKey: string | null;
}): boolean {
  return (
    (row.status === 'pending' || row.status === 'expired') &&
    row.fawaterkInvoiceId !== null &&
    row.fawaterkIntentKey === null
  );
}

async function run() {
  const { apply } = parseArgs(process.argv.slice(2));

  const rows = await db
    .select({
      id: payments.id,
      userId: payments.userId,
      status: payments.status,
      itemType: payments.itemType,
      itemId: payments.itemId,
      amountCents: payments.amountCents,
      invoiceId: payments.fawaterkInvoiceId,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(
      and(
        inArray(payments.status, ['pending', 'expired']),
        isNotNull(payments.fawaterkInvoiceId),
        isNull(payments.fawaterkIntentKey),
      ),
    )
    .orderBy(desc(payments.createdAt));

  const watchListStart = new Date(Date.now() - GATEWAY_DUE_WINDOW_MS);

  console.log('--- void-v2-pending-payments ---');
  console.log(`mode: ${apply ? 'APPLY' : 'DRY-RUN'}   candidates: ${rows.length}`);
  console.log('');
  console.log('payment_id | invoice_id | user_id | item | amount(EGP) | created_at | bucket');
  for (const row of rows) {
    const bucket =
      row.createdAt >= watchListStart ? 'WATCH-LIST (within gateway due window)' : 'older';
    console.log(
      `${row.id} | ${row.invoiceId} | ${row.userId} | ${row.itemType}:${row.itemId ?? 'n/a'} | ${(
        row.amountCents / 100
      ).toFixed(2)} | ${row.createdAt.toISOString()} | ${bucket}`,
    );
  }

  const watchList = rows.filter((row) => row.createdAt >= watchListStart);
  console.log('');
  console.log(
    `support watch list (a live kiosk code paid after cutover -> manual fulfilment via R31): ${watchList.length}`,
  );

  if (!apply) {
    console.log('');
    console.log('DRY RUN — no changes made. Preflight before --apply:');
    console.log('  1. Confirm a DB backup/snapshot was taken.');
    console.log('  2. Get human sign-off on the operator table above.');
    console.log(
      '  3. Re-run with --apply (status=failed + reservations released, per row atomically).',
    );
    return;
  }

  let voided = 0;
  for (const row of rows) {
    // Per-payment transaction: the status flip and both reservation releases commit together.
    await db.transaction(async (tx) => {
      await tx.delete(eventReservations).where(eq(eventReservations.paymentId, row.id));
      await tx.delete(trackReservations).where(eq(trackReservations.paymentId, row.id));
      await tx.update(payments).set({ status: 'failed' }).where(eq(payments.id, row.id));
    });
    voided += 1;
  }

  console.log('');
  console.log(
    `voided ${voided} v2 pending/expired payment(s): status=failed, reservations released.`,
  );
}

// Only execute when run directly (so the pure predicate stays importable by unit tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error('[void-v2] fatal error:', error);
    process.exit(1);
  });
}
