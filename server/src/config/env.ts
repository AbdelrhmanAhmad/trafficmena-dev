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
  PLUNK_API_KEY: z.string().optional(),
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

data.CORS_ORIGIN = corsAllowlist[0];

export const env = {
  ...data,
  CORS_ALLOWLIST: corsAllowlist,
};

export const isProduction = env.NODE_ENV === 'production';
