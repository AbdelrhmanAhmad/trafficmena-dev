import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createTransactionCard,
  createTransactionFawry,
  createTransactionFawryFlat,
  createTransactionHosted,
  createTransactionMeeza,
  createTransactionNoIntentKey,
  createTransactionUnknownShape,
  createTransactionValidationError,
  getTransactionData422Object,
  getTransactionData422String,
  getTransactionDataPaid,
  getTransactionDataUnpaid,
  INTENT_KEY,
  oauthTokenSuccess,
  TRANSACTION_ID,
  trPaymentMethodsResponse,
} from './fixtures/fawaterk-v3.ts';

// fawaterk.ts -> config/env.ts parses process.env at import time. Prime the required vars plus the
// v3 OAuth credentials the client needs to fetch a bearer token.
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';
process.env.FAWATERK_API_KEY ??= 'test-vendor-api-key-fawaterk-v3';
process.env.FAWATERK_CLIENT_ID ??= '11111111-2222-4333-8444-555555555555';
process.env.FAWATERK_CLIENT_SECRET ??= 'test-client-secret-value';
process.env.FAWATERK_ENV ??= 'staging';

const { createTransaction, getPaymentMethods, getTransactionData } = await import(
  '../../server/src/services/fawaterk.ts'
);

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Route requests by URL substring. The OAuth token endpoint always succeeds unless the route
// overrides it, so the v3 calls under test see a valid bearer token.
const installFetch = (route) => {
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    let body = null;
    if (init.body) {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    const call = { url: String(url), method: (init.method || 'GET').toUpperCase(), body };
    calls.push(call);
    const routed = route?.(call);
    if (routed) return routed;
    if (call.url.includes('/oauth/token')) return jsonResponse(200, oauthTokenSuccess);
    return jsonResponse(200, {});
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = realFetch;
    },
  };
};

const withFetch = async (route, fn) => {
  const ctx = installFetch(route);
  try {
    return await fn(ctx);
  } finally {
    ctx.restore();
  }
};

const cartArgs = {
  paymentMethodId: 2,
  cartTotal: 250,
  currency: 'EGP',
  customer: { first_name: 'Test', last_name: 'User', email: 't@example.com' },
  cartItems: [{ name: 'Event ticket', price: 250, quantity: 1 }],
  redirectionUrls: {
    successUrl: 'https://www.trafficmena.com/payment/success?payment_id=p1',
    failUrl: 'https://www.trafficmena.com/payment/failed?payment_id=p1',
    pendingUrl: 'https://www.trafficmena.com/payment/pending?payment_id=p1',
    webhookUrl: 'https://www.trafficmena.com/api/payments/webhook_json',
  },
  payload: { paymentId: 'p1' },
  dueDate: new Date('2026-07-06T12:00:00Z'),
};

describe('fawaterk v3 — getPaymentMethods', () => {
  it('reads live `paymentId` and falls back to `payment_method_id`, preserving name/redirect/logo', async () => {
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/getTrPaymentmethods')
          ? jsonResponse(200, trPaymentMethodsResponse)
          : null,
      async () => {
        const methods = await getPaymentMethods();
        assert.ok(Array.isArray(methods) && methods.length === 6);
        // Visa is provided with the live `paymentId` field.
        const visa = methods.find((m) => m.name_en === 'Visa-Mastercard');
        assert.equal(visa.paymentId, 2);
        assert.equal(visa.redirect, 'true');
        assert.equal(visa.name_ar, 'فيزا-ماستركارد');
        // Meeza is provided with the legacy `payment_method_id` — the fallback must still resolve it.
        const meeza = methods.find((m) => m.name_en === 'Meeza');
        assert.equal(meeza.paymentId, 4);
        // No raw v2 field leaks through.
        assert.equal('payment_method_id' in visa, false);
      },
    );
  });

  it('serves the stale cache when a later refresh fails', async () => {
    // First call (fresh) populates the cache; then force a failure and confirm the stale data serves.
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/getTrPaymentmethods')
          ? jsonResponse(200, trPaymentMethodsResponse)
          : null,
      async () => {
        await getPaymentMethods();
      },
    );
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/getTrPaymentmethods')
          ? jsonResponse(500, { status: 'error' })
          : null,
      async () => {
        const methods = await getPaymentMethods();
        assert.equal(methods.length, 6, 'stale cache should serve on refresh failure');
      },
    );
  });
});

describe('fawaterk v3 — createTransaction', () => {
  it('hosted variant → redirectUrl from data.url', async () => {
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/createTransaction')
          ? jsonResponse(200, createTransactionHosted)
          : null,
      async () => {
        const res = await createTransaction(cartArgs);
        assert.equal(res.intentKey, INTENT_KEY);
        assert.equal(res.redirectUrl, 'https://staging.fawaterk.com/checkout/3f9a2b1c');
      },
    );
  });

  it('direct card → redirectUrl from payment_data.redirectTo', async () => {
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/createTransaction')
          ? jsonResponse(200, createTransactionCard)
          : null,
      async () => {
        const res = await createTransaction(cartArgs);
        assert.equal(res.intentKey, INTENT_KEY);
        assert.equal(res.redirectUrl, 'https://staging.fawaterk.com/pay/card/3f9a2b1c');
      },
    );
  });

  it('direct fawry → fawryCode captured (expireDate ignored)', async () => {
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/createTransaction')
          ? jsonResponse(200, createTransactionFawry)
          : null,
      async () => {
        const res = await createTransaction(cartArgs);
        assert.equal(res.intentKey, INTENT_KEY);
        assert.equal(res.paymentData.fawryCode, '9284736');
        assert.equal(res.redirectUrl, undefined);
      },
    );
  });

  it('direct fawry FLAT top-level body (live staging shape) → intentKey + fawryCode captured', async () => {
    // The live gateway returns Fawry with no `data` wrapper; the client must still parse it.
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/createTransaction')
          ? jsonResponse(200, createTransactionFawryFlat)
          : null,
      async () => {
        const res = await createTransaction(cartArgs);
        assert.equal(res.intentKey, INTENT_KEY);
        assert.equal(res.paymentData.fawryCode, '783380810');
        assert.equal(res.redirectUrl, undefined);
      },
    );
  });

  it('direct meeza → integer meezaReference coerced to string, QR captured', async () => {
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/createTransaction')
          ? jsonResponse(200, createTransactionMeeza)
          : null,
      async () => {
        const res = await createTransaction(cartArgs);
        assert.equal(res.paymentData.meezaReference, '123456789');
        assert.ok(res.paymentData.meezaQrCode.startsWith('data:image/png;base64,'));
      },
    );
  });

  it('unknown payment_data shape → intentKey returned, no codes, never throws', async () => {
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/createTransaction')
          ? jsonResponse(200, createTransactionUnknownShape)
          : null,
      async () => {
        const res = await createTransaction(cartArgs);
        assert.equal(res.intentKey, INTENT_KEY);
        assert.equal(res.redirectUrl, undefined);
        assert.equal(res.paymentData.fawryCode, undefined);
        assert.equal(res.paymentData.meezaReference, undefined);
      },
    );
  });

  it('sends numeric price/cartTotal, integer quantity, pay_load, due_date; no redirectOption', async () => {
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/createTransaction')
          ? jsonResponse(200, createTransactionCard)
          : null,
      async ({ calls }) => {
        await createTransaction(cartArgs);
        const req = calls.find((c) => c.url.includes('/api/v3/createTransaction'));
        assert.equal(typeof req.body.cartTotal, 'number');
        assert.equal(typeof req.body.cartItems[0].price, 'number');
        assert.equal(req.body.cartItems[0].quantity, 1);
        assert.deepEqual(req.body.pay_load, { paymentId: 'p1' });
        assert.ok(req.body.due_date, 'due_date must be sent (v3 default is only +2 days)');
        assert.equal('redirectOption' in req.body, false, 'v3 must not force link mode');
      },
    );
  });

  it('200 without intent_key → throws (the call effectively failed)', async () => {
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/createTransaction')
          ? jsonResponse(200, createTransactionNoIntentKey)
          : null,
      async () => {
        await assert.rejects(() => createTransaction(cartArgs));
      },
    );
  });

  it('422 validation error → throws (our request was malformed)', async () => {
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/createTransaction')
          ? jsonResponse(422, createTransactionValidationError)
          : null,
      async () => {
        await assert.rejects(() => createTransaction(cartArgs));
      },
    );
  });
});

describe('fawaterk v3 — getTransactionData', () => {
  it('paid → paid mapping with total/currency/transaction_id/paymentMethod', async () => {
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/getTransactionData')
          ? jsonResponse(200, getTransactionDataPaid)
          : null,
      async () => {
        const res = await getTransactionData(INTENT_KEY);
        assert.equal(res.paid, 1);
        assert.equal(res.total, 250);
        assert.equal(res.currency, 'EGP');
        assert.equal(res.transactionId, TRANSACTION_ID);
        assert.equal(res.paymentMethod, 'Visa-Mastercard');
      },
    );
  });

  it('unpaid (paid:0) → paid=0, no throw', async () => {
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/getTransactionData')
          ? jsonResponse(200, getTransactionDataUnpaid)
          : null,
      async () => {
        const res = await getTransactionData(INTENT_KEY);
        assert.equal(res.paid, 0);
      },
    );
  });

  it('422 with STRING message → unpaid/expired result, no throw', async () => {
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/getTransactionData')
          ? jsonResponse(422, getTransactionData422String)
          : null,
      async () => {
        const res = await getTransactionData(INTENT_KEY);
        assert.equal(res.paid, 0);
        assert.equal(res.expiredOrMissing, true);
      },
    );
  });

  it('422 with OBJECT message → throws an integration error (must not masquerade as pending)', async () => {
    await withFetch(
      (call) =>
        call.url.includes('/api/v3/getTransactionData')
          ? jsonResponse(422, getTransactionData422Object)
          : null,
      async () => {
        await assert.rejects(() => getTransactionData(INTENT_KEY));
      },
    );
  });
});
