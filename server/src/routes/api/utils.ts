import { getConnInfo } from '@hono/node-server/conninfo';
import { eq, sql } from 'drizzle-orm';
import type { Context } from 'hono';
import { db } from '../../db/client.js';
import { profiles } from '../../db/schema/index.js';
import { getSessionFromRequest } from '../../utils/session.js';

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
  try {
    const info = getConnInfo(c);
    if (info?.remote?.address) {
      return info.remote.address;
    }
  } catch {
    // getConnInfo is unavailable when running in certain environments; fall back to socket data below
  }

  const incoming: unknown = (c.env as { incoming?: { socket?: { remoteAddress?: string } } })
    ?.incoming;
  const socketAddress = (incoming as { socket?: { remoteAddress?: string } } | undefined)?.socket
    ?.remoteAddress;

  if (socketAddress) {
    return socketAddress;
  }

  return 'unknown';
}

export async function requireAdmin(
  c: Context,
): Promise<{ adminId: string } | { response: Response }> {
  const session = await getSessionFromRequest(c);
  if (!session || !session.user) {
    return {
      response: c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          },
        },
        401,
      ),
    };
  }

  const [record] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1);

  if ((record?.role ?? 'user') !== 'admin') {
    return {
      response: c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Admin privileges required.',
          },
        },
        403,
      ),
    };
  }

  return { adminId: session.user.id };
}
