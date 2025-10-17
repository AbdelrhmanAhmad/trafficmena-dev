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
  CORS_ORIGIN: z.string().optional().default('*'),
  PLUNK_API_KEY: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_ISSUER: z.string().optional(),
  APP_BASE_URL: z.string().url().optional().default('http://localhost:8080'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Failed to parse environment variables');
  // eslint-disable-next-line no-console
  console.error(parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
