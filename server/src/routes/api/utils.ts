import { sql } from 'drizzle-orm';
import type { Context } from 'hono';
import { db } from '../../db/client.js';

type NotImplementedOptions = {
  feature: string;
};

export async function notImplemented(c: Context, { feature }: NotImplementedOptions) {
  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    console.error(`[api:${feature}] database connectivity error`, error);
    return c.json(
      {
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Unable to reach database. See server logs for details.',
        },
        data: null,
      },
      503,
    );
  }

  return c.json(
    {
      error: {
        code: 'NOT_IMPLEMENTED',
        message: `${feature} is not implemented yet.`,
      },
      data: null,
    },
    501,
  );
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getRequestIp(c: Context) {
  const headerValue = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
  if (headerValue) {
    return headerValue.split(',')[0]?.trim() ?? 'unknown';
  }
  return 'unknown';
}
