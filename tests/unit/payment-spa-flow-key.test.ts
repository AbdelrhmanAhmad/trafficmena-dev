import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

// The SPA payment flow is keyed solely on paymentId (our UUID). invoiceId survives only as a
// read-only historical display field on attendee lists / the Payment type — never in the flow.
const readSource = (relPath) => readFile(new URL(relPath, import.meta.url), 'utf8');

const FLOW_FILES = [
  '../../src/pages/payment/pending.tsx',
  '../../src/pages/payment/success.tsx',
  '../../src/shared/components/payment/PaymentCheckoutDialog.tsx',
  '../../src/pages/dashboard/Subscribe.tsx',
];

describe('SPA payment flow key = paymentId', () => {
  for (const file of FLOW_FILES) {
    it(`${file} carries no invoiceId/invoice_id flow usage`, async () => {
      const source = await readSource(file);
      assert.equal(source.includes('invoice_id'), false, `${file} still references invoice_id`);
      assert.equal(source.includes('invoiceId'), false, `${file} still references invoiceId`);
    });
  }

  it('track resume URL is built from payment_id, not invoice_id', async () => {
    const source = await readSource('../../src/features/tracks/pages/TrackDetail.tsx');
    assert.equal(source.includes("params.set('invoice_id'"), false);
    assert.equal(source.includes('pending_invoice_id'), false);
    assert.ok(source.includes("params.set('payment_id', track.pending_payment_id)"));
  });

  it('VerifyPaymentRequest is {paymentId} and CheckoutResponse dropped invoiceId', async () => {
    const source = await readSource('../../src/app/api/payments.ts');
    const verifyStart = source.indexOf('export type VerifyPaymentRequest');
    const verifyBlock = source.slice(verifyStart, source.indexOf('};', verifyStart));
    assert.ok(verifyBlock.includes('paymentId: string'));
    assert.equal(verifyBlock.includes('invoiceId'), false);

    const checkoutStart = source.indexOf('export type CheckoutResponse');
    const checkoutBlock = source.slice(checkoutStart, source.indexOf('};', checkoutStart));
    assert.equal(checkoutBlock.includes('invoiceId'), false);
    // The Payment type keeps the historical field plus the new v3 transaction id.
    assert.ok(source.includes('fawaterkTransactionId?: number | null'));
  });

  it('useVerifyPayment invalidates the payment query unconditionally', async () => {
    const source = await readSource('../../src/app/hooks/usePayments.ts');
    const start = source.indexOf('export function useVerifyPayment');
    const block = source.slice(start, source.indexOf('export function usePayment', start));
    // The payment-query invalidation must sit OUTSIDE the status === 'paid' guard.
    const invalidateIdx = block.indexOf('queryKey: [...PAYMENT_KEY, variables.paymentId]');
    const paidGuardIdx = block.indexOf("data.status === 'paid'");
    assert.ok(invalidateIdx > 0, 'payment query must be invalidated');
    assert.ok(
      invalidateIdx < paidGuardIdx,
      'invalidation must be unconditional (before the guard)',
    );
  });
});
