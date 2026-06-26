import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

describe('replacement checkout safety wiring', () => {
  it('validates payment method before expiring the existing pending hold', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/payments.ts', import.meta.url),
      'utf8',
    );
    const checkoutRoute = source.indexOf("app.post('/payments/checkout'");
    const methodLookup = source.indexOf('const selectedMethod = methods.find', checkoutRoute);
    const expirePending = source.indexOf(
      'expirePendingPaymentsForReplacement(tx, replacedPendingPaymentIds)',
      checkoutRoute,
    );

    assert.ok(checkoutRoute >= 0);
    assert.ok(methodLookup > checkoutRoute, 'checkout must validate the requested method');
    assert.ok(
      expirePending > checkoutRoute,
      'replacement checkout must expire the old pending row',
    );
    assert.ok(
      methodLookup < expirePending,
      'replacement checkout can expire the current hold before method/phone validation succeeds',
    );
  });

  it('restores the old pending payment when replacement invoice creation fails', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/payments.ts', import.meta.url),
      'utf8',
    );

    assert.ok(source.includes('restoreReplacedPendingPayment'));
    assert.ok(source.includes('replacedPendingPaymentIds'));
    assert.ok(source.includes('deleteReplacedPendingReservations'));
  });

  // Regression: the replaced payment's reservation rows must be deleted INSIDE the checkout
  // transaction, after expiring the old payment but before inserting the new hold. The
  // (track_id,user_id)/(event_id,user_id) reservation unique indexes otherwise make the new insert
  // collide (23505), destroying the buyer's hold and 500ing the ordinary "change ticket / new code"
  // flow. The free path always did this; the paid event/track paths previously deferred the delete
  // to after gateway-invoice creation, which never ran because the in-tx insert threw first.
  const EXPIRE = 'expirePendingPaymentsForReplacement(tx, replacedPendingPaymentIds)';
  const DELETE_IN_TX = 'deleteReplacedPendingReservations(tx, replacedPendingPaymentIds)';

  for (const insertCall of [
    'tx.insert(trackReservations).values',
    'tx.insert(eventReservations).values({',
  ]) {
    it(`frees the replaced hold before "${insertCall}" within the checkout transaction`, async () => {
      const source = await readFile(
        new URL('../../server/src/routes/api/payments.ts', import.meta.url),
        'utf8',
      );
      const checkoutRoute = source.indexOf("app.post('/payments/checkout'");
      const insertIdx = source.indexOf(insertCall, checkoutRoute);
      assert.ok(insertIdx > checkoutRoute, `${insertCall} not found in checkout`);

      const expireIdx = source.lastIndexOf(EXPIRE, insertIdx);
      const deleteIdx = source.lastIndexOf(DELETE_IN_TX, insertIdx);
      assert.ok(expireIdx > checkoutRoute, 'expected an in-tx expire before the new hold insert');
      assert.ok(
        deleteIdx > expireIdx && deleteIdx < insertIdx,
        'replaced reservations must be deleted between the in-tx expire and the new hold insert',
      );
    });
  }
});
