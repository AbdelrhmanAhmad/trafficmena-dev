import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .optional()
    .transform((value) => (value ? Number.parseInt(value, 10) : undefined))
    .refine((value) => value === undefined || Number.isInteger(value), {
      message: 'PORT must be an integer',
    }),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_ADMIN_URL: z.string().optional(),
  DB_SSL: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  CORS_ORIGIN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  BETTER_AUTH_SECRET: z
    .string({
      required_error: 'BETTER_AUTH_SECRET is required',
    })
    .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters long'),
  BETTER_AUTH_ISSUER: z.string().optional(),
  APP_BASE_URL: z.string().url().optional().default('http://localhost:8080'),
  BUNNY_STORAGE_ZONE: z.string().optional(),
  BUNNY_STORAGE_ACCESS_KEY: z.string().optional(),
  BUNNY_STORAGE_CDN_URL: z
    .string()
    .url()
    .optional()
    .transform((value) => value?.replace(/\/+$/, '')),
  INVITE_SESSION_SECRET: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  // Fawaterk Payment Gateway
  FAWATERK_API_KEY: z.string().optional(),
  FAWATERK_ENV: z.enum(['staging', 'live']).optional().default('staging'),
  // v3 OAuth client credentials (client_credentials grant). Required in production.
  FAWATERK_CLIENT_ID: z.string().optional(),
  FAWATERK_CLIENT_SECRET: z.string().optional(),
  // Optional API base URL for webhook callbacks (dashboard configuration preferred)
  API_BASE_URL: z.string().url().optional(),
  // Cloudflare Turnstile CAPTCHA
  TURNSTILE_SECRET_KEY: z.string().optional(),
  // Invitation daily limit per admin (default: 1000 for launch)
  INVITATION_DAILY_LIMIT: z.coerce.number().int().min(1).max(10000).default(1000),
  // Dev/test only: use fixed OTP (000000) for Better Auth email OTP. Blocked in production.
  AUTH_TEST_FIXED_OTP: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Failed to parse environment variables');
  // eslint-disable-next-line no-console
  console.error(parsed.error.format());
  throw new Error('Invalid environment configuration');
}

const data = parsed.data;

const corsAllowlist = (data.CORS_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

if (corsAllowlist.length === 0) {
  corsAllowlist.push('http://localhost:5173');
}

if (corsAllowlist.includes('*')) {
  throw new Error(
    'CORS_ORIGIN cannot include "*" when credentials are required. Provide a comma-separated list of explicit origins instead.',
  );
}

if (
  parsed.data.NODE_ENV === 'production' &&
  (!parsed.data.INVITE_SESSION_SECRET || parsed.data.INVITE_SESSION_SECRET.length < 16)
) {
  throw new Error(
    'INVITE_SESSION_SECRET must be configured with a strong value (>=16 chars) in production.',
  );
}

// SECURITY: Fawaterk API key is required for payment processing in production. Under v3 it is no
// longer used to authenticate API calls (OAuth does that), but it remains the HMAC secret that
// signs every webhook — removing it would make webhooks unverifiable.
if (parsed.data.NODE_ENV === 'production' && !parsed.data.FAWATERK_API_KEY) {
  throw new Error('FAWATERK_API_KEY is required in production for payment webhook verification.');
}

// SECURITY: v3 authenticates API calls with OAuth client credentials. Both are required in
// production; without them the gateway client cannot obtain a bearer token and every payment call
// fails. client_id is a UUID per the v3 spec — validate its shape; the secret is opaque, so fail
// closed on presence + minimum length.
if (parsed.data.NODE_ENV === 'production') {
  const clientId = parsed.data.FAWATERK_CLIENT_ID;
  const clientSecret = parsed.data.FAWATERK_CLIENT_SECRET;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!clientId || !uuidPattern.test(clientId)) {
    throw new Error('FAWATERK_CLIENT_ID (UUID) is required in production for payment OAuth.');
  }
  if (!clientSecret || clientSecret.length < 16) {
    throw new Error(
      'FAWATERK_CLIENT_SECRET (>=16 chars) is required in production for payment OAuth.',
    );
  }
}

// SECURITY: Resend key (re_-prefixed, Full access) is required for transactional email in
// production. Without it, sends silently simulate and OTP login breaks — fail fast instead.
if (
  parsed.data.NODE_ENV === 'production' &&
  (!parsed.data.RESEND_API_KEY || !parsed.data.RESEND_API_KEY.startsWith('re_'))
) {
  throw new Error(
    'RESEND_API_KEY (re_-prefixed) is required in production for transactional email.',
  );
}

data.CORS_ORIGIN = corsAllowlist[0];

export const env = {
  ...data,
  CORS_ALLOWLIST: corsAllowlist,
};

export const isProduction = env.NODE_ENV === 'production';
