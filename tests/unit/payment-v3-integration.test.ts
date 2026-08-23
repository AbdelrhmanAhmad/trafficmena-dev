import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

// payments.ts -> config/env.ts parses process.env at import time; db/client uses a lazy pg pool
// (no connection until a query runs), so importing for the pure helper is safe.
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';
process.env.FAWATERK_API_KEY ??= 'test-vendor-api-key-fawaterk-v3';
process.env.FAWATERK_CLIENT_ID ??= '11111111-2222-4333-8444-555555555555';
process.env.FAWATERK_CLIENT_SECRET ??= 'test-client-secret-value';

const { evaluateGatewayAmountCurrency } = await import('../../server/src/routes/api/payments.ts');

const readSource = (relPath) => readFile(new URL(relPath, import.meta.url), 'utf8');

describe('evaluateGatewayAmountCurrency (pure decision helper)', () => {
  it('matches when EGP total * 100 equals local cents and currencies agree', () => {
    const result = evaluateGatewayAmountCurrency({
      gatewayTotal: 250,
      gatewayCurrency: 'EGP',
      localAmountCents: 25_000,
      localCurrency: 'EGP',
    });
    assert.deepEqual(result, { ok: true, amountCents: 25_000 });
  });

  it('normalizes currency case and whitespace before comparing', () => {
    const result = evaluateGatewayAmountCurrency({
      gatewayTotal: 250,
      gatewayCurrency: ' egp ',
      localAmountCents: 25_000,
      localCurrency: 'EGP',
    });
    assert.equal(result.ok, true);
  });

  it('flags an amount mismatch', () => {
    const result = evaluateGatewayAmountCurrency({
      gatewayTotal: 249,
      gatewayCurrency: 'EGP',
      localAmountCents: 25_000,
      localCurrency: 'EGP',
    });
    assert.deepEqual(result, { ok: false, code: 'INVOICE_AMOUNT_MISMATCH' });
  });

  it('flags a currency mismatch', () => {
    const result = evaluateGatewayAmountCurrency({
      gatewayTotal: 250,
      gatewayCurrency: 'USD',
      localAmountCents: 25_000,
      localCurrency: 'EGP',
    });
    assert.deepEqual(result, { ok: false, code: 'INVOICE_CURRENCY_MISMATCH' });
  });

  it('flags an invalid (NaN/negative) gateway amount', () => {
    assert.equal(
      evaluateGatewayAmountCurrency({
        gatewayTotal: Number.NaN,
        gatewayCurrency: 'EGP',
        localAmountCents: 25_000,
        localCurrency: 'EGP',
      }).code,
      'INVALID_GATEWAY_AMOUNT',
    );
    assert.equal(
      evaluateGatewayAmountCurrency({
        gatewayTotal: -1,
        gatewayCurrency: 'EGP',
        localAmountCents: 25_000,
        localCurrency: 'EGP',
      }).code,
      'INVALID_GATEWAY_AMOUNT',
    );
  });
});

describe('checkout v3 source invariants', () => {
  it('persists fawaterk_intent_key in the post-create UPDATE before responding', async () => {
    const source = await readSource('../../server/src/routes/api/payments.ts');
    const persistIdx = source.indexOf('fawaterkIntentKey: transactionResult.intentKey');
    const respondIdx = source.indexOf('redirectUrl: transactionResult.redirectUrl');
    assert.ok(persistIdx > 0, 'intent key must be persisted');
    assert.ok(respondIdx > persistIdx, 'persist must run before the success response');
  });

  it('drops invoiceId/redirectOption and calls createTransaction (not invoiceInitPay)', async () => {
    const source = await readSource('../../server/src/routes/api/payments.ts');
    assert.equal(source.includes('redirectOption'), false, 'v3 must not force link mode');
    assert.equal(source.includes('invoiceInitPay'), false, 'v2 gateway call removed');
    assert.ok(source.includes('await createTransaction('), 'v3 createTransaction used');
    // The checkout/409 payload builders no longer carry invoiceId.
    assert.equal(source.includes('invoiceId: existingPending.fawaterkInvoiceId'), false);
    assert.equal(source.includes('invoiceId: pendingPayment.fawaterkInvoiceId'), false);
  });

  it('returns the free path before any gateway call', async () => {
    const source = await readSource('../../server/src/routes/api/payments.ts');
    const freeIdx = source.indexOf('respondCheckoutSuccess({ free: true');
    const gatewayIdx = source.indexOf('await createTransaction(');
    assert.ok(freeIdx > 0 && gatewayIdx > 0);
    assert.ok(freeIdx < gatewayIdx, 'the free branch must return before createTransaction');
  });
});

describe('confirm + reconcile + webhook source invariants', () => {
  it('confirm preserves the conditional userId ownership scoping (IDOR guard)', async () => {
    const source = await readSource('../../server/src/routes/api/payments.ts');
    const start = source.indexOf('export async function confirmGatewayTransactionPayment');
    const end = source.indexOf('// --- Routes ---');
    const fn = source.slice(start, end);
    assert.ok(fn.includes('args.userId'), 'confirm must accept an optional userId');
    assert.ok(fn.includes('eq(payments.userId, args.userId)'), 'WHERE must scope by userId');
    // Intent-less rows return local status without a gateway call.
    assert.ok(fn.includes('if (!intentKey)'));
  });

  it('reconciliation filters on fawaterk_intent_key and confirms by paymentId', async () => {
    const source = await readSource('../../server/src/jobs/paymentReconciliation.ts');
    assert.ok(source.includes('isNotNull(payments.fawaterkIntentKey)'));
    assert.ok(source.includes('confirmGatewayTransactionPayment({'));
    assert.equal(source.includes('fawaterkInvoiceId'), false);
  });

  it('all five webhook routes are registered and share the per-IP throttle', async () => {
    const source = await readSource('../../server/src/routes/api/payments.ts');
    for (const path of [
      "app.post('/payments/webhook',",
      "app.post('/payments/webhook_json',",
      "app.post('/payments/webhook_cancel',",
      "app.post('/payments/webhook_failed_json',",
      "app.post('/payments/webhook_refund',",
    ]) {
      assert.ok(source.includes(path), `missing route: ${path}`);
    }
    // The three log-only handlers verify signatures unconditionally.
    assert.ok(source.includes('verifyCancelWebhook('));
    assert.ok(source.includes('verifyRefundWebhook('));
    // Every handler enforces the shared webhook throttle (4 handlers + 1 definition).
    const throttleHits = source.split('enforceWebhookRateLimit').length - 1;
    assert.ok(throttleHits >= 5, `expected shared throttle in every handler, saw ${throttleHits}`);
  });

  it('the new webhook paths are CSRF-exempt', async () => {
    const source = await readSource('../../server/src/utils/csrf.ts');
    for (const path of [
      '/api/payments/webhook_cancel',
      '/api/payments/webhook_failed_json',
      '/api/payments/webhook_refund',
    ]) {
      assert.ok(source.includes(path), `missing CSRF exemption: ${path}`);
    }
  });
});
