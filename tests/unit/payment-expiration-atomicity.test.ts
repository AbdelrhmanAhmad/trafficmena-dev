import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

// Regression: expiring stale pending payments and releasing their held reservations must be ONE
// atomic transaction. Run as separate top-level awaits, a crash (OOM/SIGKILL/deploy) between the
// payments UPDATE and the reservation DELETEs leaves the holds orphaned — they keep counting against
// event/track capacity (false EVENT_FULL/TRACK_FULL for new buyers) until their own 72h TTL fires.

describe('payment expiration job atomicity', () => {
  it('expires payments and releases their reservations inside a single transaction', async () => {
    const source = await readFile(
      new URL('../../server/src/jobs/paymentExpiration.ts', import.meta.url),
      'utf8',
    );
    const fnStart = source.indexOf('export async function expireAllStalePendingPayments');
    const fnEnd = source.indexOf('export function startPaymentExpirationJob');
    assert.ok(fnStart >= 0, 'expireAllStalePendingPayments not found');
    const body = source.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);

    const txIdx = body.indexOf('db.transaction(');
    assert.ok(txIdx >= 0, 'expiry cleanup must run inside db.transaction()');

    // The status flip and BOTH reservation deletes must open after the transaction (so they commit
    // or roll back together). Method chains span lines, so match the contiguous `.method(table)`.
    for (const stmt of [
      '.update(payments)',
      '.delete(eventReservations)',
      '.delete(trackReservations)',
    ]) {
      const idx = body.indexOf(stmt);
      assert.ok(idx > txIdx, `${stmt} must run inside the transaction`);
    }

    // And they must run on the transaction handle — no standalone db.* write can escape the tx.
    assert.equal(body.includes('db.update('), false, 'status flip must use the tx handle');
    assert.equal(body.includes('db.delete('), false, 'reservation release must use the tx handle');
  });
});
