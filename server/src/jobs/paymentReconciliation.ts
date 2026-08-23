import { and, asc, eq, gt, gte, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { payments } from '../db/schema/index.js';
import { confirmGatewayTransactionPayment } from '../routes/api/payments.js';
import { ApiError } from '../utils/errors.js';

const RECONCILIATION_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const RECONCILIATION_LOOKBACK_MS = 10 * 24 * 60 * 60 * 1000; // 10 days
const RECONCILIATION_BATCH_SIZE = 200;
const RECONCILIATION_MAX_PAGES_PER_RUN = 5;

type ReconciliationCursor = {
  createdAt: Date;
  paymentId: string;
};

type ReconciliationSummary = {
  pagesProcessed: number;
  scanned: number;
  paid: number;
  recoveredFromExpired: number;
  stillPending: number;
  terminalUnchanged: number;
  errors: number;
  wrappedToStart: boolean;
};

let reconciliationCursor: ReconciliationCursor | null = null;
let reconciliationInProgress = false;
let reconciliationSchemaReady: boolean | null = null;

async function isReconciliationSchemaReady(): Promise<boolean> {
  if (reconciliationSchemaReady !== null) {
    return reconciliationSchemaReady;
  }

  try {
    const result = await db.execute(sql`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'payments'
        AND column_name = 'fawaterk_intent_key'
      LIMIT 1
    `);
    reconciliationSchemaReady = result.rows.length > 0;
  } catch {
    reconciliationSchemaReady = false;
  }

  if (!reconciliationSchemaReady) {
    console.warn(
      '[payment-reconciliation] Skipping until upstream migration 0021 is applied. Run: npm --prefix server run db:migrate:safe',
    );
  }

  return reconciliationSchemaReady;
}

async function fetchReconciliationCandidatesPage(
  lookbackThreshold: Date,
  cursor: ReconciliationCursor | null,
) {
  const baseWhere = and(
    inArray(payments.status, ['pending', 'expired']),
    isNotNull(payments.fawaterkIntentKey),
    gte(payments.createdAt, lookbackThreshold),
  );

  const whereClause =
    cursor === null
      ? baseWhere
      : and(
          baseWhere,
          or(
            gt(payments.createdAt, cursor.createdAt),
            and(eq(payments.createdAt, cursor.createdAt), gt(payments.id, cursor.paymentId)),
          ),
        );

  return db
    .select({
      paymentId: payments.id,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(whereClause)
    .orderBy(asc(payments.createdAt), asc(payments.id))
    .limit(RECONCILIATION_BATCH_SIZE);
}

export async function reconcileRecentAtRiskPayments(): Promise<ReconciliationSummary> {
  const lookbackThreshold = new Date(Date.now() - RECONCILIATION_LOOKBACK_MS);
  let cursor = reconciliationCursor;

  const summary: ReconciliationSummary = {
    pagesProcessed: 0,
    scanned: 0,
    paid: 0,
    recoveredFromExpired: 0,
    stillPending: 0,
    terminalUnchanged: 0,
    errors: 0,
    wrappedToStart: false,
  };

  while (summary.pagesProcessed < RECONCILIATION_MAX_PAGES_PER_RUN) {
    const candidates = await fetchReconciliationCandidatesPage(lookbackThreshold, cursor);

    if (candidates.length === 0) {
      if (cursor !== null && !summary.wrappedToStart) {
        // Reached the tail; wrap to the head once to continue deterministic paging across runs.
        cursor = null;
        summary.wrappedToStart = true;
        continue;
      }
      break;
    }

    summary.pagesProcessed += 1;
    summary.scanned += candidates.length;

    const reconciliationTasks = candidates.map(async (candidate) => {
      // A string-message 422 ("unpaid/expired") returns a non-paid result (counted as stillPending),
      // not a throw — routine abandoned checkouts don't flood the error logs. An object-message 422
      // (request drift) throws and surfaces in `errors` (see getTransactionData / R14).
      const result = await confirmGatewayTransactionPayment({
        paymentId: candidate.paymentId,
        source: 'reconcile',
      });
      return { candidate, result };
    });
    const settled = await Promise.allSettled(reconciliationTasks);

    for (const result of settled) {
      if (result.status === 'rejected') {
        summary.errors += 1;
        const reason = result.reason;
        if (reason instanceof ApiError) {
          console.error('[payment-reconciliation] Confirmation rejected', {
            code: reason.code,
            message: reason.message,
            status: reason.status,
          });
        } else {
          console.error('[payment-reconciliation] Confirmation rejected', reason);
        }
        continue;
      }

      const { candidate, result: confirmation } = result.value;

      if (confirmation.status === 'paid') {
        summary.paid += 1;
      } else if (confirmation.status === 'pending') {
        summary.stillPending += 1;
      } else {
        summary.terminalUnchanged += 1;
      }

      if (confirmation.recoveredFromExpired) {
        summary.recoveredFromExpired += 1;
        console.info('[payment-reconciliation] Recovered expired payment', {
          paymentId: candidate.paymentId,
        });
      }
    }

    const lastCandidate = candidates[candidates.length - 1];
    cursor = {
      createdAt: lastCandidate.createdAt,
      paymentId: lastCandidate.paymentId,
    };
  }

  reconciliationCursor = cursor;
  return summary;
}

export function startPaymentReconciliationJob(): void {
  const runReconciliation = async (trigger: 'startup' | 'interval') => {
    if (reconciliationInProgress) {
      console.warn('[payment-reconciliation] Previous run still in progress, skipping', {
        trigger,
      });
      return;
    }

    reconciliationInProgress = true;
    try {
      if (!(await isReconciliationSchemaReady())) {
        return;
      }

      const summary = await reconcileRecentAtRiskPayments();
      if (summary.pagesProcessed > 0 || summary.errors > 0) {
        console.info('[payment-reconciliation] Run complete', {
          trigger,
          ...summary,
        });
      }
    } catch (error) {
      console.error('[payment-reconciliation] Run failed', { trigger, error });
    } finally {
      reconciliationInProgress = false;
    }
  };

  void runReconciliation('startup');

  setInterval(() => {
    void runReconciliation('interval');
  }, RECONCILIATION_INTERVAL_MS);

  console.log('[server] Payment reconciliation job scheduled (every 15 minutes)');
}
