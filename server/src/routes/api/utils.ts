import { getConnInfo } from '@hono/node-server/conninfo';
import { eq, sql } from 'drizzle-orm';
import type { Context } from 'hono';
import { db } from '../../db/client.js';
import { profiles } from '../../db/schema/index.js';
import { paymentRateLimiter } from '../../services/rateLimiter.js';
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
  const cfConnectingIp = c.req.header('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.split(',')[0]?.trim() ?? cfConnectingIp.trim();
  }

  const forwardedFor = c.req.header('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? forwardedFor.trim();
  }

  const realIp = c.req.header('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

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

export const MAX_CSV_PAYLOAD_BYTES = 1_000_000;
export const MAX_CSV_ROWS = 500;

type CsvPayloadOk = {
  ok: true;
  csv: string;
};

type CsvPayloadError = {
  ok: false;
  code: 'INVALID_REQUEST' | 'PAYLOAD_TOO_LARGE';
  message: string;
};

export type CsvPayloadResult = CsvPayloadOk | CsvPayloadError;

function csvTooLarge(maxBytes: number): CsvPayloadError {
  return {
    ok: false,
    code: 'PAYLOAD_TOO_LARGE',
    message: `CSV payload exceeds ${(maxBytes / 1_000_000).toFixed(1)} MB.`,
  };
}

function csvInvalid(message: string): CsvPayloadError {
  return {
    ok: false,
    code: 'INVALID_REQUEST',
    message,
  };
}

function getStringByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export async function extractCsvPayload(
  c: Context,
  options: { maxBytes?: number } = {},
): Promise<CsvPayloadResult> {
  const maxBytes = options.maxBytes ?? MAX_CSV_PAYLOAD_BYTES;
  const contentType = c.req.header('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const body = await c.req.parseBody();
    const candidate = body.file ?? body.files ?? body.csv;

    if (!candidate) {
      return csvInvalid('Upload a CSV file.');
    }

    const first = Array.isArray(candidate) ? candidate[0] : candidate;
    if (!first) {
      return csvInvalid('Upload a CSV file.');
    }

    if (typeof first === 'string') {
      if (getStringByteLength(first) > maxBytes) {
        return csvTooLarge(maxBytes);
      }
      return { ok: true, csv: first };
    }

    if (typeof File !== 'undefined' && first instanceof File) {
      if (first.size > maxBytes) {
        return csvTooLarge(maxBytes);
      }
      const csv = await first.text();
      if (getStringByteLength(csv) > maxBytes) {
        return csvTooLarge(maxBytes);
      }
      return { ok: true, csv };
    }

    if (typeof Blob !== 'undefined' && first instanceof Blob) {
      if (first.size > maxBytes) {
        return csvTooLarge(maxBytes);
      }
      const csv = await first.text();
      if (getStringByteLength(csv) > maxBytes) {
        return csvTooLarge(maxBytes);
      }
      return { ok: true, csv };
    }

    return csvInvalid('Upload a valid CSV file.');
  }

  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    const contentLength = Number(c.req.header('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      return csvTooLarge(maxBytes);
    }

    const csv = await c.req.text();
    if (getStringByteLength(csv) > maxBytes) {
      return csvTooLarge(maxBytes);
    }

    return { ok: true, csv };
  }

  return csvInvalid('Upload a CSV file.');
}

export type RateLimitRule = { limit: number; windowMs: number };

// Returns a 429 Response if rate-limited, or null if the request is allowed.
export function consumeRateLimit(c: Context, key: string, rule: RateLimitRule): Response | null {
  // Use the caller-provided key as the sole limiter identity.
  // Keys should include stable identity (for example actor user ID) so
  // rotating forwarded IP headers cannot bypass server-side throttling.
  const { allowed, resetAt } = paymentRateLimiter.consume(key, rule);
  if (!allowed) {
    c.header('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)));
    return c.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again shortly.',
        },
      },
      429,
    );
  }
  return null;
}

export function extractDatabaseErrorCode(error: unknown, depth = 0): string | null {
  if (!error || typeof error !== 'object' || depth > 3) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string') {
    return code;
  }

  return extractDatabaseErrorCode((error as { cause?: unknown }).cause, depth + 1);
}

export const DATABASE_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
} as const;

export function isKnownDatabaseConflict(error: unknown): 'unique' | 'fk' | null {
  const code = extractDatabaseErrorCode(error);
  if (code === DATABASE_ERROR_CODES.UNIQUE_VIOLATION) return 'unique';
  if (code === DATABASE_ERROR_CODES.FOREIGN_KEY_VIOLATION) return 'fk';
  return null;
}
