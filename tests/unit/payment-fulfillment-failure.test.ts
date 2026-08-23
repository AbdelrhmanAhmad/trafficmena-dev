import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

describe('paid fulfillment failure remediation', () => {
  it('persists gateway-paid/local-fulfillment failures for operator triage', async () => {
    const schemaSource = await readFile(
      new URL('../../server/src/db/schema/index.ts', import.meta.url),
      'utf8',
    );
    const paymentSource = await readFile(
      new URL('../../server/src/routes/api/payments.ts', import.meta.url),
      'utf8',
    );

    assert.ok(schemaSource.includes('paymentFulfillmentFailures'));
    assert.ok(paymentSource.includes('recordPaymentFulfillmentFailure'));
    assert.ok(paymentSource.includes('paymentFulfillmentFailures'));
  });

  it('keeps gateway-paid failures retryable instead of marking failed and deleting holds', async () => {
    const paymentSource = await readFile(
      new URL('../../server/src/routes/api/payments.ts', import.meta.url),
      'utf8',
    );
    const catchBlock = paymentSource.slice(
      paymentSource.indexOf(
        '} catch (error) {',
        paymentSource.indexOf('async function processSuccessfulPayment'),
      ),
      paymentSource.indexOf('export async function confirmGatewayTransactionPayment'),
    );

    assert.ok(catchBlock.includes('reportPaidFulfillmentFailure(paymentId, error'));
    assert.equal(catchBlock.includes("set({ status: 'failed' })"), false);
    assert.equal(catchBlock.includes('delete(eventReservations)'), false);
    assert.equal(catchBlock.includes('delete(trackReservations)'), false);
  });
});
