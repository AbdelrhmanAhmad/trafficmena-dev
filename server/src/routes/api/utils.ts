import { getConnInfo } from '@hono/node-server/conninfo';
import { eq, sql } from 'drizzle-orm';
import type { Context } from 'hono';
import { db } from '../../db/client.js';
import { profiles } from '../../db/schema/index.js';
import { getSessionFromRequest } from '../../utils/session.js';

export type UserRole = 'owner' | 'admin' | 'manager' | 'expert' | 'user';

const ROLE_PRIORITY: Record<UserRole, number> = {
  user: 0,
  expert: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

type RoleGuardSuccess = { userId: string; role: UserRole };
type RoleGuardFailure = { response: Response };

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

export function normalizeRole(value: string | null | undefined): UserRole {
  const normalized = (value ?? '').toLowerCase();
  if (normalized === 'owner' || normalized === 'admin' || normalized === 'manager') {
    return normalized;
  }
  if (normalized === 'expert') return 'expert';
  if (normalized === 'member') return 'user';
  return 'user';
}

export async function getOptionalUserRole(userId: string): Promise<UserRole | null> {
  const [record] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  if (!record?.role) return null;
  return normalizeRole(record.role);
}

function isRoleAllowed(role: UserRole, allowed: UserRole[]) {
  return allowed.includes(role);
}

export async function requireRole(
  c: Context,
  allowedRoles: UserRole[],
  options?: { forbiddenMessage?: string },
): Promise<RoleGuardSuccess | RoleGuardFailure> {
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

  const role = normalizeRole(record?.role ?? null);

  if (!isRoleAllowed(role, allowedRoles)) {
    return {
      response: c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: options?.forbiddenMessage ?? 'Insufficient permissions for this action.',
          },
        },
        403,
      ),
    };
  }

  return { userId: session.user.id, role };
}

export async function requireAdmin(c: Context): Promise<RoleGuardSuccess | RoleGuardFailure> {
  return requireRole(c, ['owner', 'admin'], { forbiddenMessage: 'Admin privileges required.' });
}

export async function requireManager(c: Context): Promise<RoleGuardSuccess | RoleGuardFailure> {
  return requireRole(c, ['owner', 'admin', 'manager'], {
    forbiddenMessage: 'Manager or admin privileges required.',
  });
}

export function getRolePriority(role: UserRole): number {
  return ROLE_PRIORITY[role];
}

/**
 * Escapes special characters in a string for safe use in SQL LIKE patterns.
 * Prevents users from injecting wildcards (%, _) or escape characters (\).
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, (char) => `\\${char}`);
}
