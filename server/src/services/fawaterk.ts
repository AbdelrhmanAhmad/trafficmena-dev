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

type FawaterkCustomer = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
};

type FawaterkCartItem = {
  name: string;
  price: string;
  quantity: string;
};

type FawaterkRedirectionUrls = {
  successUrl: string;
  failUrl: string;
  pendingUrl: string;
  webhookUrl?: string;
};

type InitiatePaymentArgs = {
  paymentMethodId: number;
  invoiceNumber?: string;
  cartTotal: number;
  currency: string;
  customer: FawaterkCustomer;
  cartItems: FawaterkCartItem[];
  redirectionUrls: FawaterkRedirectionUrls;
  redirectOption?: boolean;
  payload?: Record<string, unknown>;
};

export type PaymentMethod = {
  paymentId: number;
  name_en: string;
  name_ar: string;
  redirect: string;
  logo?: string;
};

type InvoiceData = {
  invoice_id: string;
  invoice_key: string;
  due_date: string;
  pay_load: unknown;
  customer_email: string;
  payment_method: string;
  currency: string;
  total: number;
  paid: number;
  paid_at: string | null;
  invoice_created_at: string;
};

// Zod schemas for Fawaterk API response validation
const paymentMethodSchema = z.object({
  paymentId: z.number(),
  name_en: z.string(),
  name_ar: z.string(),
  redirect: z.string(),
  logo: z.string().optional(),
});

// Live API returns UUID strings; staging may return numeric ids.
const invoiceRefSchema = z
  .union([z.number(), z.string()])
  .transform((value) => String(value).trim())
  .refine((value) => value.length > 0 && value !== 'NaN', 'Invalid invoice id');

// Staging legacy: invoice_id + invoice_key. Newer responses use intent_key + transaction_created_at.
const invoiceDataSchema = z
  .object({
    invoice_id: invoiceRefSchema.optional(),
    intent_key: z.string().optional(),
    invoice_key: z.string().optional(),
    transaction_id: z.union([z.number(), z.string()]).optional(),
    due_date: z.string().optional(),
    pay_load: z.unknown().optional(),
    customer_email: z.string().optional(),
    payment_method: z.string().optional(),
    currency: z.string().optional(),
    total: z.coerce.number(),
    paid: z.coerce.number(),
    paid_at: z.string().nullable().optional(),
    invoice_created_at: z.string().optional(),
    transaction_created_at: z.string().optional(),
  })
  .passthrough()
  .transform((data) => {
    const invoiceId =
      (data.invoice_id !== undefined ? String(data.invoice_id) : undefined) ??
      data.intent_key ??
      (data.transaction_id !== undefined ? String(data.transaction_id) : '');
    const invoiceKey = data.invoice_key ?? data.intent_key ?? invoiceId;
    return {
      invoice_id: invoiceId.trim(),
      invoice_key: invoiceKey,
      due_date: data.due_date ?? '',
      pay_load: data.pay_load,
      customer_email: data.customer_email ?? '',
      payment_method: data.payment_method ?? '',
      currency: data.currency ?? '',
      total: data.total,
      paid: data.paid,
      paid_at: data.paid_at ?? null,
      invoice_created_at: data.invoice_created_at ?? data.transaction_created_at ?? '',
    };
  })
  .refine((data) => data.invoice_id.length > 0 && data.invoice_id !== 'NaN', {
    path: ['invoice_id'],
    message: 'Missing invoice id',
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

const invoiceInitPayResponseSchema = z
  .object({
    invoice_id: invoiceRefSchema,
    invoice_key: z.string(),
    payment_data: paymentDataSchema,
  })
  .passthrough();

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

const getBaseUrl = () =>
  env.FAWATERK_ENV === 'live'
    ? 'https://app.fawaterk.com/api/v2'
    : 'https://staging.fawaterk.com/api/v2';

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  if (!env.FAWATERK_API_KEY) {
    throw new Error('FAWATERK_API_KEY not configured');
  }

  // Return fresh cache if within TTL
  if (methodsCache && Date.now() - methodsCache.fetchedAt < METHODS_CACHE_TTL_MS) {
    return methodsCache.data;
  }




  try {
    const response = await fetchWithCircuitBreaker(`${getBaseUrl()}/getPaymentmethods`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.FAWATERK_API_KEY}`,
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Fawaterk getPaymentMethods failed: ${response.status} ${detail}`);
    }

    const result = await response.json();
    const parsed = z.array(paymentMethodSchema).safeParse(result.data);
    if (!parsed.success) {
      console.error('[fawaterk] Invalid getPaymentMethods response:', parsed.error.format());
      throw new Error('Invalid payment methods response from gateway');
    }

    methodsCache = { data: parsed.data, fetchedAt: Date.now() };
    return parsed.data;
  } catch (error) {
    // Stale-while-error: serve expired cache rather than failing
    if (methodsCache) {
      console.warn('[fawaterk] getPaymentMethods failed, serving stale cache', {
        cacheAge: `${Math.round((Date.now() - methodsCache.fetchedAt) / 1000)}s`,
        error: error instanceof Error ? error.message : String(error),
      });
      return methodsCache.data;
    }
    throw error;
  }
}

// Force-clear the methods cache (e.g. after disabling a payment method)
export function invalidatePaymentMethodsCache() {
  methodsCache = null;
}

export async function invoiceInitPay(args: InitiatePaymentArgs): Promise<{
  invoiceId: string;
  invoiceKey: string;
  paymentData: {
    redirectTo?: string;
    fawryCode?: string;
    meezaReference?: string;
    meezaQrCode?: string;
    amanCode?: string;
    masaryCode?: string;
  };
}> {
  if (!env.FAWATERK_API_KEY) {
    throw new Error('FAWATERK_API_KEY not configured');
  }

  const response = await fetchWithCircuitBreaker(`${getBaseUrl()}/invoiceInitPay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.FAWATERK_API_KEY}`,
    },
    body: JSON.stringify({
      payment_method_id: args.paymentMethodId,
      invoice_number: args.invoiceNumber,
      cartTotal: args.cartTotal.toString(),
      currency: args.currency,
      customer: args.customer,
      cartItems: args.cartItems,
      redirectionUrls: args.redirectionUrls,
      ...(args.redirectOption ? { redirectOption: true } : {}),
      payLoad: args.payload,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Fawaterk invoiceInitPay failed: ${response.status} ${detail}`);
  }

  const result = await response.json();
  const paymentDataSummary = summarizePaymentData(result?.data?.payment_data);
  const parsed = invoiceInitPayResponseSchema.safeParse(result.data);
  if (!parsed.success) {
    const dataKeys =
      result?.data && typeof result.data === 'object'
        ? Object.keys(result.data as Record<string, unknown>)
        : [];
    console.error('[fawaterk] Invalid invoiceInitPay response:', parsed.error.format(), {
      paymentDataSummary,
      dataKeys,
    });
    throw new Error('Invalid invoice initialization response from gateway');
  }
  const paymentData = parsed.data.payment_data;
  const hasRedirect = Boolean(paymentData.redirectTo);
  const hasReference = Boolean(
    paymentData.fawryCode ||
      paymentData.amanCode ||
      paymentData.masaryCode ||
      paymentData.meezaReference ||
      paymentData.meezaQrCode,
  );
  if (!hasRedirect && !hasReference) {
    console.warn('[fawaterk] invoiceInitPay returned no redirect or reference codes', {
      invoiceId: parsed.data.invoice_id,
      paymentMethodId: args.paymentMethodId,
      paymentDataSummary,
    });
  }
  return {
    invoiceId: parsed.data.invoice_id,
    invoiceKey: parsed.data.invoice_key,
    paymentData,
  };
}

export async function getInvoiceData(invoiceId: string | number): Promise<InvoiceData> {
  if (!env.FAWATERK_API_KEY) {
    throw new Error('FAWATERK_API_KEY not configured');
  }

  const response = await fetchWithCircuitBreaker(
    `${getBaseUrl()}/getInvoiceData/${encodeURIComponent(String(invoiceId))}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.FAWATERK_API_KEY}`,
      },
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Fawaterk getInvoiceData failed: ${response.status} ${detail}`);
  }

  const result = await response.json();
  const parsed = invoiceDataSchema.safeParse(result.data);
  if (!parsed.success) {
    const dataKeys =
      result?.data && typeof result.data === 'object'
        ? Object.keys(result.data as Record<string, unknown>)
        : [];
    console.error('[fawaterk] Invalid getInvoiceData response:', parsed.error.format(), {
      dataKeys,
      paid: (result?.data as { paid?: unknown } | undefined)?.paid,
    });
    throw new Error('Invalid invoice data response from gateway');
  }
  return parsed.data as InvoiceData;
}

// HMAC signature verification for webhooks (per Fawaterk docs)
// Uses API Key as secret, NOT a separate webhook secret
// SECURITY: Uses timing-safe comparison to prevent timing attacks
export function verifyFawaterkWebhook(body: {
  invoice_id: string | number;
  invoice_key: string;
  payment_method: string;
  hashKey: string;
}): boolean {
  if (!env.FAWATERK_API_KEY) {
    console.error('[webhook] FAWATERK_API_KEY required for verification');
    return false;
  }

  // Per Fawaterk docs: build query string in exact order
  const queryParam = `InvoiceId=${body.invoice_id}&InvoiceKey=${body.invoice_key}&PaymentMethod=${body.payment_method}`;

  // Use API Key as the HMAC secret (per Fawaterk documentation)
  const expectedHash = crypto
    .createHmac('sha256', env.FAWATERK_API_KEY)
    .update(queryParam)
    .digest('hex');

  // SECURITY: Use timing-safe comparison to prevent timing attacks
  try {
    const receivedBuffer = Buffer.from(body.hashKey, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    // Length check before timing-safe comparison
    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch {
    // Invalid hex string or other error
    return false;
  }
}
