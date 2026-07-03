import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import {
  cancelStringToSign,
  refundStringToSign,
  TEST_WEBHOOK_KEY,
  transactionStringToSign,
  webhookCancelExpired,
  webhookRefund,
  webhookTrPaid,
} from './fixtures/fawaterk-v3.ts';

// The verifiers key the HMAC on env.FAWATERK_API_KEY — set it to the fixture-signing key first.
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';
process.env.FAWATERK_API_KEY = TEST_WEBHOOK_KEY;

const { verifyTransactionWebhook, verifyCancelWebhook, verifyRefundWebhook } = await import(
  '../../server/src/services/fawaterk.ts'
);
const { env } = await import('../../server/src/config/env.ts');

const sign = (stringToSign) =>
  crypto.createHmac('sha256', TEST_WEBHOOK_KEY).update(stringToSign).digest('hex');

const NON_HEX = 'z'.repeat(64);
const WRONG_LENGTH = 'abcd';

describe('verifyTransactionWebhook', () => {
  const base = {
    transaction_id: webhookTrPaid.transaction_id,
    transaction_key: webhookTrPaid.transaction_key,
    payment_method: webhookTrPaid.payment_method,
  };
  const validHash = sign(transactionStringToSign(base));

  it('accepts a correctly signed TR payload', () => {
    assert.equal(verifyTransactionWebhook({ ...base, hash: validHash }), true);
  });
  it('rejects a tampered field', () => {
    assert.equal(
      verifyTransactionWebhook({ ...base, payment_method: 'Tampered', hash: validHash }),
      false,
    );
  });
  it('rejects a wrong-length hash (length check before compare)', () => {
    assert.equal(verifyTransactionWebhook({ ...base, hash: WRONG_LENGTH }), false);
  });
  it('rejects a non-hex hash', () => {
    assert.equal(verifyTransactionWebhook({ ...base, hash: NON_HEX }), false);
  });
});

describe('verifyCancelWebhook', () => {
  const base = {
    referenceId: webhookCancelExpired.referenceId,
    paymentMethod: webhookCancelExpired.paymentMethod,
  };
  const validHash = sign(cancelStringToSign(base));

  it('accepts a correctly signed cancel payload', () => {
    assert.equal(verifyCancelWebhook({ ...base, hash: validHash }), true);
  });
  it('rejects a tampered field', () => {
    assert.equal(verifyCancelWebhook({ ...base, referenceId: 999, hash: validHash }), false);
  });
  it('rejects a non-hex hash', () => {
    assert.equal(verifyCancelWebhook({ ...base, hash: NON_HEX }), false);
  });
});

describe('verifyRefundWebhook', () => {
  const base = {
    transactionId: webhookRefund.transactionId,
    amount: webhookRefund.amount,
    currency: webhookRefund.currency,
  };
  const validHash = sign(refundStringToSign(base));

  it('accepts a correctly signed refund payload', () => {
    assert.equal(verifyRefundWebhook({ ...base, hash: validHash }), true);
  });
  it('rejects a tampered field', () => {
    assert.equal(verifyRefundWebhook({ ...base, amount: 1, hash: validHash }), false);
  });
  it('rejects a wrong-length hash', () => {
    assert.equal(verifyRefundWebhook({ ...base, hash: WRONG_LENGTH }), false);
  });
});

describe('verifier fails closed without the vendor API key', () => {
  it('returns false when FAWATERK_API_KEY is unset, even for an otherwise-valid signature', () => {
    const base = {
      transaction_id: webhookTrPaid.transaction_id,
      transaction_key: webhookTrPaid.transaction_key,
      payment_method: webhookTrPaid.payment_method,
    };
    const validHash = sign(transactionStringToSign(base));
    const original = env.FAWATERK_API_KEY;
    env.FAWATERK_API_KEY = undefined;
    try {
      assert.equal(verifyTransactionWebhook({ ...base, hash: validHash }), false);
    } finally {
      env.FAWATERK_API_KEY = original;
    }
  });
});
