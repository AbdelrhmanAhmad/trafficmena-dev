import crypto, { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';

// Default timeout for Fawaterk API calls (10 seconds)
const API_TIMEOUT_MS = 10_000;

// Circuit breaker configuration
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 30_000; // 30 seconds

// In-memory cache for payment methods (single-instance; see rateLimiter.ts)
const METHODS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let methodsCache: { data: PaymentMethod[]; fetchedAt: number } | null = null;

// Circuit breaker state for Fawaterk API
type CircuitState = 'closed' | 'open' | 'half-open';
let circuitState: CircuitState = 'closed';
let consecutiveFailures = 0;
let circuitOpenedAt = 0;

// Helper for fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = API_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Circuit breaker wrapper for Fawaterk API calls
async function fetchWithCircuitBreaker(
  url: string,
  options: RequestInit,
  timeoutMs = API_TIMEOUT_MS,
): Promise<Response> {
  // Check if circuit is open
  if (circuitState === 'open') {
    if (Date.now() - circuitOpenedAt > CIRCUIT_COOLDOWN_MS) {
      circuitState = 'half-open';
      console.log('[fawaterk] Circuit breaker: half-open, attempting request');
    } else {
      throw new Error('Payment service temporarily unavailable. Please try again later.');
    }
  }

  try {
    const response = await fetchWithTimeout(url, options, timeoutMs);

    // Reset on successful response
    if (response.ok) {
      if (circuitState === 'half-open') {
        console.log('[fawaterk] Circuit breaker: closed after successful request');
      }
      consecutiveFailures = 0;
      circuitState = 'closed';
    }

    return response;
  } catch (error) {
    consecutiveFailures++;

    // Open circuit after threshold failures, or immediately if in half-open state
    const shouldOpen =
      circuitState === 'half-open' || consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD;

    if (shouldOpen) {
      circuitState = 'open';
      circuitOpenedAt = Date.now();
      console.error('[fawaterk] Circuit breaker: OPEN after', consecutiveFailures, 'failures');
    }

    throw error;
  }
}

// --- v3 OAuth client-credentials token manager ---
// Single-instance in-memory cache with single-flight refresh (same posture as the rate limiter /
// circuit breaker). SECURITY: never log FAWATERK_CLIENT_SECRET, the token request body, or the
// access token.
const TOKEN_REFRESH_MARGIN_MS = 60_000; // refresh slightly before expiry to avoid mid-call 401s
const DEFAULT_TOKEN_TTL_MS = 60 * 60 * 1000; // fallback if the response omits a usable expires_in

let tokenState: { accessToken: string; expiresAt: number } | null = null;
let inFlightToken: Promise<string> | null = null;

const getV3Host = () =>
  env.FAWATERK_ENV === 'live' ? 'https://app.fawaterk.com' : 'https://staging.fawaterk.com';

async function fetchAccessToken(): Promise<string> {
  if (!env.FAWATERK_CLIENT_ID || !env.FAWATERK_CLIENT_SECRET) {
    throw new Error('Fawaterk OAuth credentials not configured (FAWATERK_CLIENT_ID/SECRET).');
  }

  const response = await fetchWithCircuitBreaker(`${getV3Host()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: env.FAWATERK_CLIENT_ID,
      client_secret: env.FAWATERK_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    // Status only — the body can echo request context we must not surface.
    throw new Error(`Fawaterk OAuth token request failed: ${response.status}`);
  }

  const result = await response.json().catch(() => null);
  const accessToken = result?.access_token;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('Fawaterk OAuth token response missing access_token');
  }

  const expiresIn = Number(result?.expires_in);
  const ttlMs =
    Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn * 1000 : DEFAULT_TOKEN_TTL_MS;
  tokenState = { accessToken, expiresAt: Date.now() + ttlMs };
  return accessToken;
}

async function getAccessToken(): Promise<string> {
  if (tokenState && Date.now() < tokenState.expiresAt - TOKEN_REFRESH_MARGIN_MS) {
    return tokenState.accessToken;
  }
  if (inFlightToken) {
    return inFlightToken;
  }
  inFlightToken = fetchAccessToken().finally(() => {
    inFlightToken = null;
  });
  return inFlightToken;
}

function invalidateAccessToken() {
  tokenState = null;
}

// Every v3 call goes through here: attach the bearer token, and on a 401 (expired/revoked token)
// invalidate the cache, refresh once, and retry exactly once. A second 401 is returned as-is so the
// caller surfaces it as an error (no infinite retry).
async function v3Fetch(path: string, init: RequestInit): Promise<Response> {
  const build = (token: string): RequestInit => ({
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const url = `${getV3Host()}${path}`;
  const token = await getAccessToken();
  let response = await fetchWithCircuitBreaker(url, build(token));
  if (response.status === 401) {
    invalidateAccessToken();
    const fresh = await getAccessToken();
    response = await fetchWithCircuitBreaker(url, build(fresh));
  }
  return response;
}

type FawaterkCustomer = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
};

type FawaterkRedirectionUrls = {
  successUrl: string;
  failUrl: string;
  pendingUrl: string;
  webhookUrl?: string;
};

export type PaymentMethod = {
  paymentId: number;
  name_en: string;
  name_ar: string;
  redirect: string;
  logo?: string;
};

// Zod schemas for Fawaterk API response validation
const paymentMethodSchema = z.object({
  paymentId: z.number(),
  name_en: z.string(),
  name_ar: z.string(),
  redirect: z.string(),
  logo: z.string().optional(),
});

const referenceCodeSchema = z
  .union([z.string(), z.number(), z.null()])
  .transform((value) => (value === null ? undefined : String(value)))
  .refine((value) => value === undefined || value.length <= 64, 'reference code too long');

const paymentDataSchema = z
  .object({
    redirectTo: z.string().optional(),
    redirect_to: z.string().optional(),
    fawryCode: referenceCodeSchema.optional(),
    fawry_code: referenceCodeSchema.optional(),
    meezaReference: referenceCodeSchema.optional(),
    meeza_reference: referenceCodeSchema.optional(),
    meezaQrCode: z.string().max(2048).nullable().optional(),
    meeza_qr_code: z.string().max(2048).nullable().optional(),
    amanCode: referenceCodeSchema.optional(),
    aman_code: referenceCodeSchema.optional(),
    masaryCode: referenceCodeSchema.optional(),
    masary_code: referenceCodeSchema.optional(),
  })
  .passthrough()
  .transform((data) => ({
    redirectTo: data.redirectTo ?? data.redirect_to,
    fawryCode: data.fawryCode ?? data.fawry_code,
    meezaReference: data.meezaReference ?? data.meeza_reference,
    meezaQrCode: data.meezaQrCode ?? data.meeza_qr_code ?? undefined,
    amanCode: data.amanCode ?? data.aman_code,
    masaryCode: data.masaryCode ?? data.masary_code,
  }));

// --- v3 request/response shapes ---

type NormalizedPaymentData = {
  redirectTo?: string;
  fawryCode?: string;
  meezaReference?: string;
  meezaQrCode?: string;
  amanCode?: string;
  masaryCode?: string;
};

export type CreateTransactionArgs = {
  paymentMethodId: number;
  cartTotal: number;
  currency: string;
  customer: FawaterkCustomer;
  cartItems: { name: string; price: number; quantity: number }[];
  redirectionUrls: FawaterkRedirectionUrls;
  payload: Record<string, unknown>;
  // Aligned to our 72h pending window (RESERVATION_TTL_MS) — v3's own default is only +2 days.
  dueDate: Date;
  mobileWalletNumber?: string;
};

export type GatewayTransaction = {
  paid: number;
  total?: number;
  currency?: string;
  paymentMethod?: string;
  transactionId?: number;
  paidAt?: string | null;
  // Set when the intent is invalid/expired/not-found (422 with a string message) — treated as
  // "not paid, possibly expired" by confirm/reconcile.
  expiredOrMissing?: boolean;
};

// createTransaction 200 is a oneOf; strict only on intent_key (its absence = the call failed).
const createTransactionDataSchema = z
  .object({
    intent_key: z.string().min(1),
    url: z.string().optional(),
    payment_data: z.unknown().optional(),
  })
  .passthrough();

const transactionDetailSchema = z
  .object({
    intent_key: z.string().optional(),
    transaction_id: z.union([z.number(), z.string()]).optional(),
    paid: z.number(),
    paid_at: z.string().nullable().optional(),
    total: z.number(),
    currency: z.string(),
    payment_method: z.string().optional(),
  })
  .passthrough();

// v3 due_date wire format. The spec's response examples use "Y-m-d H:i:s" (Laravel default);
// AE8 confirms the accepted request format + timezone on staging. Formatted in UTC.
function formatFawaterkDueDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

const summarizePaymentData = (input: unknown) => {
  if (!input || typeof input !== 'object') {
    return { type: input === null ? 'null' : typeof input, keys: [] as string[] };
  }
  const record = input as Record<string, unknown>;
  const keys = Object.keys(record);
  const shapes = Object.fromEntries(
    keys.map((key) => {
      const value = record[key];
      if (value === null) return [key, 'null'];
      if (Array.isArray(value)) return [key, 'array'];
      return [key, typeof value];
    }),
  );
  const lengths = Object.fromEntries(
    keys
      .filter((key) => typeof record[key] === 'string')
      .map((key) => [key, (record[key] as string).length]),
  );
  return { type: 'object', keys, shapes, lengths };
};

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  // Return fresh cache if within TTL
  if (methodsCache && Date.now() - methodsCache.fetchedAt < METHODS_CACHE_TTL_MS) {
    return methodsCache.data;
  }

  try {
    const response = await v3Fetch('/api/v3/getTrPaymentmethods', { method: 'GET' });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Fawaterk getTrPaymentmethods failed: ${response.status} ${detail}`);
    }

    const result = await response.json();
    // Normalize the method id so the SPA contract and both heuristics (server requiresPhone, SPA
    // keyword matching) keep working. The live v3 getTrPaymentmethods returns `paymentId` (verified
    // against staging 2026-07-03); accept `payment_method_id` too in case the live tenant differs.
    const normalized = Array.isArray(result?.data)
      ? result.data.map((method: Record<string, unknown>) => ({
          paymentId: method.paymentId ?? method.payment_method_id,
          name_en: method.name_en,
          name_ar: method.name_ar,
          redirect: method.redirect,
          // Coerce an explicit null logo to undefined: z.string().optional() rejects null, and one
          // null-logo method would otherwise fail the whole-array parse and blank the method list.
          logo: method.logo ?? undefined,
        }))
      : result?.data;
    const parsed = z.array(paymentMethodSchema).safeParse(normalized);
    if (!parsed.success) {
      console.error('[fawaterk] Invalid getTrPaymentmethods response:', parsed.error.format());
      throw new Error('Invalid payment methods response from gateway');
    }

    methodsCache = { data: parsed.data, fetchedAt: Date.now() };
    return parsed.data;
  } catch (error) {
    // Stale-while-error: serve expired cache rather than failing
    if (methodsCache) {
      console.warn('[fawaterk] getTrPaymentmethods failed, serving stale cache', {
        cacheAge: `${Math.round((Date.now() - methodsCache.fetchedAt) / 1000)}s`,
        error: error instanceof Error ? error.message : String(error),
      });
      return methodsCache.data;
    }
    throw error;
  }
}

// --- v3 transaction API ---

export async function createTransaction(args: CreateTransactionArgs): Promise<{
  intentKey: string;
  redirectUrl?: string;
  paymentData: NormalizedPaymentData;
}> {
  const body: Record<string, unknown> = {
    currency: args.currency,
    customer: args.customer,
    cartItems: args.cartItems,
    cartTotal: args.cartTotal,
    payment_method_id: args.paymentMethodId,
    pay_load: args.payload,
    due_date: formatFawaterkDueDate(args.dueDate),
    redirectionUrls: args.redirectionUrls,
  };
  // Deliberately NO redirectOption: v3 forced-link responses carry no payment_data, so reference
  // codes would never return. Direct-dispatch renders codes on our own /payment/pending page.
  if (args.mobileWalletNumber) {
    body.mobileWalletNumber = args.mobileWalletNumber;
  }

  const response = await v3Fetch('/api/v3/createTransaction', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Fawaterk createTransaction failed: ${response.status} ${detail}`);
  }

  const result = await response.json();
  // v3 nests the intent under `data` for redirect (card) and Meeza/wallet direct-dispatch, but some
  // direct-dispatch methods (Fawry) return a FLAT top-level body — intent_key and the reference code
  // are siblings with no `data` wrapper (verified against staging 2026-07-03). Accept both envelopes.
  const container =
    result && typeof result.data === 'object' && result.data !== null ? result.data : result;
  // payment_data is nested under `payment_data` for the wrapped variants; for a flat body the codes
  // sit at the top level, so fall back to the container itself.
  const nestedPaymentData = container?.payment_data;
  const rawPaymentData =
    nestedPaymentData && typeof nestedPaymentData === 'object' ? nestedPaymentData : container;
  const paymentDataSummary = summarizePaymentData(rawPaymentData);
  const parsed = createTransactionDataSchema.safeParse(container);
  if (!parsed.success) {
    console.error('[fawaterk] Invalid createTransaction response:', parsed.error.format(), {
      paymentDataSummary,
    });
    throw new Error('Invalid transaction creation response from gateway');
  }

  // Lenient on payment_data (KTD-4): once intent_key exists the intent is live at the gateway, so a
  // parsing surprise must degrade UX (pending page + webhook/verify), never fail the payment.
  let paymentData: NormalizedPaymentData = {};
  if (rawPaymentData && typeof rawPaymentData === 'object') {
    const parsedPaymentData = paymentDataSchema.safeParse(rawPaymentData);
    if (parsedPaymentData.success) {
      paymentData = parsedPaymentData.data;
    } else {
      console.warn('[fawaterk] createTransaction payment_data did not match known shapes', {
        paymentDataSummary,
      });
    }
  }
  // A present-but-primitive payment_data (e.g. a double-encoded JSON string from an undocumented
  // method) carries a code the schema can't reach; surface it for the staging parser-extension loop
  // instead of degrading silently.
  if (
    nestedPaymentData !== undefined &&
    nestedPaymentData !== null &&
    typeof nestedPaymentData !== 'object'
  ) {
    console.warn('[fawaterk] createTransaction payment_data was a primitive, not an object', {
      paymentDataSummary: summarizePaymentData(nestedPaymentData),
    });
  }

  const redirectUrl = paymentData.redirectTo ?? parsed.data.url ?? container?.url;
  return { intentKey: parsed.data.intent_key, redirectUrl, paymentData };
}

export async function getTransactionData(intentKey: string): Promise<GatewayTransaction> {
  const response = await v3Fetch('/api/v3/getTransactionData', {
    method: 'POST',
    body: JSON.stringify({ intent_key: intentKey }),
  });

  if (response.status === 422) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.message;
    if (typeof message === 'string') {
      // Invalid / expired / not-found intent → not paid, possibly expired.
      return { paid: 0, expiredOrMissing: true };
    }
    // Object of field errors → OUR request is malformed. Surface as an integration error; it must
    // never masquerade as "still pending" (silent-degradation guard, R5).
    console.error('[fawaterk] getTransactionData validation error (request shape drift)', {
      messageKeys: message && typeof message === 'object' ? Object.keys(message) : typeof message,
    });
    throw new Error('getTransactionData request rejected by gateway (validation)');
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Fawaterk getTransactionData failed: ${response.status} ${detail}`);
  }

  const result = await response.json();
  const parsed = transactionDetailSchema.safeParse(result?.data);
  if (!parsed.success) {
    console.error('[fawaterk] Invalid getTransactionData response:', parsed.error.format());
    throw new Error('Invalid transaction data response from gateway');
  }

  const detail = parsed.data;
  const transactionId =
    detail.transaction_id === undefined ? undefined : Number(detail.transaction_id);
  return {
    paid: detail.paid,
    total: detail.total,
    currency: detail.currency,
    paymentMethod: detail.payment_method,
    transactionId: Number.isFinite(transactionId) ? transactionId : undefined,
    paidAt: detail.paid_at ?? null,
  };
}

// --- v3 webhook signature verification ---
// All v3 webhooks are HMAC-SHA256 signed with the vendor API key (= FAWATERK_API_KEY). Shared
// hygiene: fail closed when the key is missing, guard the hash is hex, length-check before the
// timing-safe compare. The hash is NOT hard-assumed to be 64-hex — AE6 confirms the real length on
// staging; the length-equality check adapts automatically.
function verifyHmac(stringToSign: string, receivedHash: string): boolean {
  if (!env.FAWATERK_API_KEY) {
    console.error('[webhook] FAWATERK_API_KEY required for verification');
    return false;
  }
  if (typeof receivedHash !== 'string' || !/^[a-f0-9]+$/i.test(receivedHash)) {
    return false;
  }

  const expectedHash = crypto
    .createHmac('sha256', env.FAWATERK_API_KEY)
    .update(stringToSign)
    .digest('hex');

  try {
    const receivedBuffer = Buffer.from(receivedHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// Paid/failed TR webhooks. Caller passes transactionHashKey (paid) or hashKey (failed) as `hash`.
export function verifyTransactionWebhook(body: {
  transaction_id: number | string;
  transaction_key: string;
  payment_method: string;
  hash: string;
}): boolean {
  return verifyHmac(
    `TransactionId=${body.transaction_id}&TransactionKey=${body.transaction_key}&PaymentMethod=${body.payment_method}`,
    body.hash,
  );
}

export function verifyCancelWebhook(body: {
  referenceId: number | string;
  paymentMethod: string;
  hash: string;
}): boolean {
  return verifyHmac(
    `referenceId=${body.referenceId}&PaymentMethod=${body.paymentMethod}`,
    body.hash,
  );
}

export function verifyRefundWebhook(body: {
  transactionId: number | string;
  amount: number | string;
  currency: string;
  hash: string;
}): boolean {
  return verifyHmac(
    `transactionId=${body.transactionId}&amount=${body.amount}&currency=${body.currency}`,
    body.hash,
  );
}
