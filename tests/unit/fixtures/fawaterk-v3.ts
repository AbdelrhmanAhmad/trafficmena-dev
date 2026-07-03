// Fawaterk API v3 contract fixtures — verbatim shapes from the OpenAPI 3.1 spec embedded at
// app.fawaterk.com/documentation ("Fawaterak API", 3.0.0), as reproduced in the migration plan's
// "v3 API Contract Reference". These are the single source of truth for the client rewrite; do not
// re-derive shapes from v2 code. Webhook payloads are provided UNSIGNED — tests compute the HMAC
// with TEST_WEBHOOK_KEY using the documented StringToSign recipes below so the verifier tests are
// deterministic and independently cross-check the recipe.

// A stable UUID standing in for a real createTransaction intent_key.
export const INTENT_KEY = '3f9a2b1c-1234-4abc-8def-0123456789ab';
export const TRANSACTION_ID = 987_654;
export const PAYMENT_METHOD_NAME = 'Visa-Mastercard';

// Key used to sign the webhook fixtures in tests (stands in for FAWATERK_API_KEY / vendor API key).
export const TEST_WEBHOOK_KEY = 'test-vendor-api-key-fawaterk-v3';

// --- OAuth ---

export const oauthTokenSuccess = {
  token_type: 'Bearer',
  expires_in: 31_536_000, // ~1 year, per the spec example
  access_token: 'v3-access-token-abc123',
};

export const oauthTokenError = {
  status: 'error',
  message: 'Invalid client credentials',
};

// --- GET /api/v3/getTrPaymentmethods ---
// The LIVE staging API returns the id as `paymentId` (probed 2026-07-03) — the spec's claimed
// `payment_method_id` rename did NOT happen. This fixture deliberately MIXES both keys: the first two
// items use the real `paymentId`, the rest use `payment_method_id`, so the client's `paymentId ??
// payment_method_id` normalization is exercised on both. `redirect` stays the string "true"/"false".
export const trPaymentMethodsResponse = {
  status: 'success',
  vendorSettingsData: { custome_iframe_title: null },
  data: [
    {
      paymentId: 2,
      name_en: 'Visa-Mastercard',
      name_ar: 'فيزا-ماستركارد',
      redirect: 'true',
      logo: 'https://cdn.fawaterk.com/visa.png',
    },
    {
      paymentId: 3,
      name_en: 'Fawry',
      name_ar: 'فوري',
      redirect: 'false',
      logo: 'https://cdn.fawaterk.com/fawry.png',
    },
    {
      payment_method_id: 4,
      name_en: 'Meeza',
      name_ar: 'ميزة',
      redirect: 'false',
      logo: 'https://cdn.fawaterk.com/meeza.png',
    },
    {
      payment_method_id: 5,
      name_en: 'Aman',
      name_ar: 'أمان',
      redirect: 'false',
      logo: 'https://cdn.fawaterk.com/aman.png',
    },
    {
      payment_method_id: 6,
      name_en: 'Masary',
      name_ar: 'مصاري',
      redirect: 'false',
      logo: 'https://cdn.fawaterk.com/masary.png',
    },
    {
      payment_method_id: 7,
      name_en: 'MobileWallet',
      name_ar: 'محفظة إلكترونية',
      redirect: 'false',
      logo: 'https://cdn.fawaterk.com/wallet.png',
    },
  ],
};

// --- POST /api/v3/createTransaction (200 is a oneOf) ---

// Hosted-checkout variant (no payment_method_id, or link mode applies): data.url carries the redirect.
export const createTransactionHosted = {
  status: 'success',
  message: 'Transaction intent created',
  data: {
    intent_key: INTENT_KEY,
    url: 'https://staging.fawaterk.com/checkout/3f9a2b1c',
    expires_in: 259_200,
  },
};

// Direct payment — card: payment_data.redirectTo.
export const createTransactionCard = {
  status: 'success',
  message: 'Transaction intent created',
  data: {
    intent_key: INTENT_KEY,
    expires_in: 259_200,
    payment_data: { redirectTo: 'https://staging.fawaterk.com/pay/card/3f9a2b1c' },
  },
};

// Direct payment — Fawry: fawryCode + expireDate ("YYYY-MM-DD HH:mm:ss").
export const createTransactionFawry = {
  status: 'success',
  message: 'Transaction intent created',
  data: {
    intent_key: INTENT_KEY,
    expires_in: 259_200,
    payment_data: { fawryCode: '9284736', expireDate: '2026-07-06 12:00:00' },
  },
};

// Direct payment — Fawry as the LIVE staging gateway actually returns it (probed 2026-07-03): a FLAT
// top-level body with NO `data` wrapper — intent_key and fawryCode are siblings. The spec/docs
// describe the nested data.payment_data shape (createTransactionFawry above); the live API does not
// follow it for Fawry, so the client must accept both envelopes or Fawry checkout throws.
export const createTransactionFawryFlat = {
  status: 'pending',
  referenceNumber: '783380810',
  expirationTime: '07 Jul 2026, 04:30 AM',
  expireDate: '07 Jul 2026, 04:30 AM',
  fawryCode: '783380810',
  reference: 'TR-1620',
  intent_key: INTENT_KEY,
};

// Direct payment — mobile wallet (Meeza): meezaReference arrives as an INTEGER in v3; QR string.
export const createTransactionMeeza = {
  status: 'success',
  message: 'Transaction intent created',
  data: {
    intent_key: INTENT_KEY,
    expires_in: 259_200,
    payment_data: {
      meezaReference: 123_456_789,
      meezaQrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCA',
    },
  },
};

// Direct payment — undocumented shape (Aman / Masary / Apple Pay): must parse leniently. The intent
// exists, so the client must still return intentKey with empty codes and never throw (KTD-4).
export const createTransactionUnknownShape = {
  status: 'success',
  message: 'Transaction intent created',
  data: {
    intent_key: INTENT_KEY,
    expires_in: 259_200,
    payment_data: { someUndocumentedReference: 'AB-99182', extraField: { nested: true } },
  },
};

// 200 with no intent_key — the call effectively failed; the client must throw (R4 strict on intent_key).
export const createTransactionNoIntentKey = {
  status: 'success',
  message: 'Transaction intent created',
  data: { expires_in: 259_200, payment_data: { redirectTo: 'https://x' } },
};

// 422 — Laravel validation: message is an object of field errors (our request is malformed).
export const createTransactionValidationError = {
  status: 'error',
  message: { 'cartItems.0.price': ['The price must be a number.'] },
};

// 503 — transient intent-cache outage.
export const createTransactionServiceUnavailable = {
  status: 'error',
  message: 'Transaction intent cache unavailable',
};

// --- POST /api/v3/getTransactionData ---

export const getTransactionDataPaid = {
  status: 'success',
  data: {
    intent_key: INTENT_KEY,
    transaction_id: TRANSACTION_ID,
    paid: 1,
    paid_at: '2026-07-03 14:22:05',
    status_text: 'Paid',
    total: 250,
    currency: 'EGP',
    payment_method: PAYMENT_METHOD_NAME,
    pay_load: '{"paymentId":"local-uuid"}',
    due_date: '2026-07-06 12:00:00',
    transaction_link: 'https://staging.fawaterk.com/tr/987654',
    transaction_history: [{ reference: 'REF-1' }],
  },
};

export const getTransactionDataUnpaid = {
  status: 'success',
  data: {
    intent_key: INTENT_KEY,
    transaction_id: 0, // cache-only, not yet a real gateway transaction
    paid: 0,
    paid_at: null,
    status_text: 'Pending',
    total: 250,
    currency: 'EGP',
    payment_method: PAYMENT_METHOD_NAME,
    pay_load: '{"paymentId":"local-uuid"}',
    due_date: '2026-07-06 12:00:00',
    transaction_link: 'https://staging.fawaterk.com/tr/pending',
    transaction_history: [],
  },
};

// 422 with a STRING message → invalid/expired/not-found intent → treat as "not paid, possibly expired".
export const getTransactionData422String = {
  status: 'error',
  message: 'Transaction intent not found or expired',
};

// 422 with an OBJECT message → Laravel validation → our request is malformed → integration error.
export const getTransactionData422Object = {
  status: 'error',
  message: { intent_key: ['The intent key field is required.'] },
};

// --- Webhooks (unsigned; sign in tests with TEST_WEBHOOK_KEY) ---

// Paid/pending TR shape. transaction_key == the createTransaction intent_key. pay_load is a JSON
// STRING echo of our object. Signature field: transactionHashKey.
export const webhookTrPaid = {
  transaction_key: INTENT_KEY,
  transaction_id: TRANSACTION_ID,
  status: 'paid',
  payment_method: PAYMENT_METHOD_NAME,
  pay_load: '{"paymentId":"local-uuid"}',
  paidAmount: 250,
  paidCurrency: 'EGP',
  paidAt: '2026-07-03 14:22:05',
  customerData: { first_name: 'Test', last_name: 'User' },
  referenceNumber: 'REF-987654',
};

export const webhookTrPending = {
  transaction_key: INTENT_KEY,
  transaction_id: TRANSACTION_ID,
  status: 'pending',
  payment_method: 'Fawry',
  pay_load: '{"paymentId":"local-uuid"}',
  paidAmount: 250,
  paidCurrency: 'EGP',
  paidAt: null,
  customerData: { first_name: 'Test', last_name: 'User' },
  referenceNumber: '9284736',
};

// Failed TR payload. Signature field: hashKey. StringToSign is the TR shape (same as paid).
export const webhookFailed = {
  transaction_id: TRANSACTION_ID,
  transaction_key: INTENT_KEY,
  payment_method: PAYMENT_METHOD_NAME,
  pay_load: '{"paymentId":"local-uuid"}',
  amount: 250,
  paidCurrency: 'EGP',
  errorMessage: 'Card declined',
  response: 'declined',
};

// Cancel payload (async reference expired/canceled). Signature field: hashKey.
// StringToSign: referenceId={referenceId}&PaymentMethod={paymentMethod}.
export const webhookCancelExpired = {
  referenceId: 55_231,
  status: 'EXPIRED',
  paymentMethod: 'Fawry',
  pay_load: '{"paymentId":"local-uuid"}',
  transactionId: TRANSACTION_ID,
  transactionKey: INTENT_KEY,
};

export const webhookCancelCanceled = {
  referenceId: 55_232,
  status: 'CANCELED',
  paymentMethod: 'Aman',
  pay_load: '{"paymentId":"local-uuid"}',
  transactionId: TRANSACTION_ID,
  transactionKey: INTENT_KEY,
};

// Refund payload. Signature field: hashKey.
// StringToSign: transactionId={transactionId}&amount={amount}&currency={currency}.
export const webhookRefund = {
  transactionId: TRANSACTION_ID,
  amount: 250,
  currency: 'EGP',
  status: 1,
  reason: 'Customer request',
  approvedAt: '2026-07-04 10:00:00',
};

// Legacy v2 invoice webhook shape — post-cutover, this must hit the log-only tripwire (no
// transaction_key; carries invoice_id/invoice_key/hashKey).
export const webhookLegacyV2 = {
  invoice_id: 445_566,
  invoice_key: 'legacy-invoice-key-xyz',
  invoice_status: 'paid',
  payment_method: PAYMENT_METHOD_NAME,
  hashKey: '0'.repeat(64),
};

// --- StringToSign recipes (from the plan's webhook table). Kept here so both the "valid" and
// "tamper" verifier tests build a correct signature and independently cross-check the verifier. ---

export const transactionStringToSign = (b: {
  transaction_id: number | string;
  transaction_key: string;
  payment_method: string;
}) =>
  `TransactionId=${b.transaction_id}&TransactionKey=${b.transaction_key}&PaymentMethod=${b.payment_method}`;

export const cancelStringToSign = (b: { referenceId: number | string; paymentMethod: string }) =>
  `referenceId=${b.referenceId}&PaymentMethod=${b.paymentMethod}`;

export const refundStringToSign = (b: {
  transactionId: number | string;
  amount: number | string;
  currency: string;
}) => `transactionId=${b.transactionId}&amount=${b.amount}&currency=${b.currency}`;
