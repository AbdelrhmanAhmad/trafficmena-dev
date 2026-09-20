import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import type { Context, Next } from 'hono';
import { env, isProduction } from '../../../config/env.js';
import { db } from '../../../db/client.js';
import {
  ecdBookings,
  ecdCheckoutTokens,
  ecdTicketPackages,
} from '../../../db/schema/ecd.js';
import { InMemoryRateLimiter } from '../../../services/rateLimiter.js';

export const ecdRateLimiter = new InMemoryRateLimiter();

export type EcdTicketType = 'ct' | 'fj';

const FALLBACK_PACKAGE_NAMES: Record<EcdTicketType, string> = {
  ct: 'Conference Pass',
  fj: 'All Access Pass',
};

/** Short in-process cache so session/pay don't hit DB on every field read. */
let packageCache: {
  at: number;
  byType: Map<EcdTicketType, { priceCents: number; displayName: string }>;
} | null = null;
const PACKAGE_CACHE_MS = 15_000;

export function invalidateEcdPackageCache() {
  packageCache = null;
}

export async function getPackageMeta(ticketType: EcdTicketType) {
  const now = Date.now();
  if (packageCache && now - packageCache.at < PACKAGE_CACHE_MS) {
    const hit = packageCache.byType.get(ticketType);
    if (hit) return hit;
  }

  const rows = await db
    .select({
      ticketType: ecdTicketPackages.ticketType,
      priceCents: ecdTicketPackages.priceCents,
      displayName: ecdTicketPackages.displayName,
    })
    .from(ecdTicketPackages);

  const byType = new Map<EcdTicketType, { priceCents: number; displayName: string }>();
  for (const row of rows) {
    byType.set(row.ticketType as EcdTicketType, {
      priceCents: row.priceCents,
      displayName: row.displayName,
    });
  }
  packageCache = { at: now, byType };

  const hit = byType.get(ticketType);
  if (hit) return hit;

  // Emergency fallback when packages table not seeded yet
  return {
    priceCents: ticketType === 'ct' ? env.ECD_PRICE_CT_CENTS : env.ECD_PRICE_FJ_CENTS,
    displayName: FALLBACK_PACKAGE_NAMES[ticketType],
  };
}

export async function ticketDisplayName(ticketType: string) {
  const type: EcdTicketType = ticketType === 'ct' ? 'ct' : 'fj';
  const meta = await getPackageMeta(type);
  return meta.displayName;
}

export type EcdTokenContext = {
  tokenId: string;
  tokenHash: string;
  userId: string;
  bookingId: string;
  expiresAt: Date;
};

declare module 'hono' {
  interface ContextVariableMap {
    ecdToken: EcdTokenContext;
  }
}

export function isEcdEnabled() {
  return env.ECD_ENABLED !== false;
}

/** ECD-only: skip real gateway confirmation (dev / explicit flag). Never on in production unless forced. */
export function isEcdSimulatePayments() {
  if (env.ECD_SIMULATE_PAYMENTS === 'true') return true;
  if (env.ECD_SIMULATE_PAYMENTS === 'false') return false;
  return env.NODE_ENV !== 'production';
}

/**
 * Public HTML site base for Fawaterk redirects + ticket email links.
 * Prefer ECD_CONFIRM_BASE_URL. Never silently pick localhost in staging/production.
 */
export function ecdConfirmBaseUrl() {
  if (env.ECD_CONFIRM_BASE_URL) {
    return env.ECD_CONFIRM_BASE_URL.replace(/\/+$/, '');
  }

  const httpOrigins = env.ECD_CORS_ALLOWLIST.filter((o) => o.startsWith('http'));
  const publicOrigin = httpOrigins.find((o) => {
    try {
      const host = new URL(o).hostname;
      return host !== 'localhost' && host !== '127.0.0.1';
    } catch {
      return false;
    }
  });
  if (publicOrigin) return publicOrigin.replace(/\/+$/, '');

  if (env.NODE_ENV === 'production' || env.NODE_ENV === 'test') {
    console.warn(
      '[ecd] ECD_CONFIRM_BASE_URL is unset — Fawaterk may redirect to localhost. Set ECD_CONFIRM_BASE_URL to the live HTML site origin.',
    );
  }

  const local = httpOrigins.find((o) => o.startsWith('http')) || 'http://127.0.0.1:5500';
  return local.replace(/\/+$/, '');
}

export function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function safeEqualHex(a: string, b: string) {
  try {
    const aBuf = Buffer.from(a, 'hex');
    const bBuf = Buffer.from(b, 'hex');
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

export async function ticketUnitPriceCents(ticketType: EcdTicketType) {
  const meta = await getPackageMeta(ticketType);
  return meta.priceCents;
}

export async function calcEcdTotals(params: {
  ticketType: EcdTicketType;
  qty: number;
  promoCode?: string | null;
}) {
  const qty = Math.max(1, Math.min(20, Math.floor(params.qty) || 1));
  const meta = await getPackageMeta(params.ticketType);
  const unitPriceCents = meta.priceCents;
  const promo = (params.promoCode || '').trim().toUpperCase();
  let discountCents = 0;
  if (promo === 'LAUNCH' && env.ECD_LAUNCH_DISCOUNT_RATE > 0) {
    discountCents = Math.round(unitPriceCents * qty * env.ECD_LAUNCH_DISCOUNT_RATE);
  }
  const subtotalCents = unitPriceCents * qty;
  const totalCents = Math.max(0, subtotalCents - discountCents);
  return {
    qty,
    unitPriceCents,
    discountCents,
    subtotalCents,
    totalCents,
    promoCode: promo || null,
    ticketName: meta.displayName,
  };
}

export function makeOrderCode(bookedAt?: Date) {
  // Same format as ticket serials so the public ID is one family: ecd-YYYYMMDD-HHmmss-XXXXX
  return makeTicketSerial({ bookedAt });
}

/** Ambiguity-safe alphabet for short serial suffixes. */
const SERIAL_SUFFIX_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function randomSerialSuffix(length = 5) {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += SERIAL_SUFFIX_ALPHABET[bytes[i]! % SERIAL_SUFFIX_ALPHABET.length];
  }
  return out;
}

/** Format: ecd-{YYYYMMDD}-{HHmmss}-{5-char random} (Africa/Cairo booking time). */
export function makeTicketSerial(params: { bookedAt?: Date; suffix?: string } = {}) {
  const d = params.bookedAt ?? new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';
  const date = `${get('year')}${get('month')}${get('day')}`;
  const time = `${get('hour')}${get('minute')}${get('second')}`;
  const suffix = params.suffix || randomSerialSuffix(5);
  return `ecd-${date}-${time}-${suffix}`;
}

/** Signed link token so confirmation emails work without sessionStorage. */
export function makeBookingAccessToken(orderCode: string) {
  const secret = env.BETTER_AUTH_SECRET || 'ecd-dev-access';
  return createHmac('sha256', secret)
    .update(`ecd-booking-access:${orderCode}`)
    .digest('base64url')
    .slice(0, 32);
}

export function verifyBookingAccessToken(orderCode: string, token: string | undefined) {
  if (!token || !orderCode) return false;
  const expected = makeBookingAccessToken(orderCode);
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}••••@${domain}`;
}

export function splitBuyerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'Guest';
  const lastName = parts.slice(1).join(' ') || 'Buyer';
  return { firstName, lastName, name: [firstName, lastName].filter(Boolean).join(' ') };
}

export function getBearerToken(c: Context) {
  const header = c.req.header('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function resolveEcdToken(rawToken: string): Promise<EcdTokenContext | null> {
  const tokenHash = hashToken(rawToken);
  const [row] = await db
    .select({
      tokenId: ecdCheckoutTokens.id,
      tokenHash: ecdCheckoutTokens.tokenHash,
      userId: ecdCheckoutTokens.userId,
      bookingId: ecdCheckoutTokens.bookingId,
      expiresAt: ecdCheckoutTokens.expiresAt,
      revokedAt: ecdCheckoutTokens.revokedAt,
    })
    .from(ecdCheckoutTokens)
    .where(and(eq(ecdCheckoutTokens.tokenHash, tokenHash), isNull(ecdCheckoutTokens.revokedAt)))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  return {
    tokenId: row.tokenId,
    tokenHash: row.tokenHash,
    userId: row.userId,
    bookingId: row.bookingId,
    expiresAt: row.expiresAt,
  };
}

export async function requireEcdToken(c: Context, next: Next) {
  const raw = getBearerToken(c);
  if (!raw) {
    return c.json(
      { error: { code: 'ECD_TOKEN_REQUIRED', message: 'Checkout token required.' } },
      401,
    );
  }
  const resolved = await resolveEcdToken(raw);
  if (!resolved) {
    return c.json(
      { error: { code: 'ECD_TOKEN_INVALID', message: 'Checkout token is invalid or expired.' } },
      401,
    );
  }
  c.set('ecdToken', resolved);
  return next();
}

export function isEcdOriginAllowed(origin: string | undefined, referer: string | undefined) {
  const allow = [...env.ECD_CORS_ALLOWLIST, ...env.CORS_ALLOWLIST];
  const candidates = [origin];
  if (referer) {
    try {
      candidates.push(new URL(referer).origin);
    } catch {
      // ignore
    }
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (allow.includes(candidate)) return true;
    // file:// pages send the literal Origin header value "null"
    if (candidate === 'null' && allow.includes('null')) return true;
    // Dev: any localhost / 127.0.0.1 port (Live Server, VS Code preview, Python http.server, …)
    if (!isProduction && isLocalDevOrigin(candidate)) return true;
  }

  // Same-machine tools sometimes omit Origin entirely in development.
  if (!isProduction && !origin) return true;
  return false;
}

function isLocalDevOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      (url.protocol === 'http:' || url.protocol === 'https:')
    );
  } catch {
    return false;
  }
}

export async function ecdOriginGuard(c: Context, next: Next) {
  if (c.req.method.toUpperCase() === 'OPTIONS') {
    return next();
  }
  const origin = c.req.header('origin');
  const referer = c.req.header('referer');
  // Server-to-server webhooks have no browser origin
  if (c.req.path.endsWith('/payments/webhook')) {
    return next();
  }
  if (!isEcdOriginAllowed(origin, referer)) {
    return c.json(
      { error: { code: 'ECD_ORIGIN_DENIED', message: 'Request origin is not allowed.' } },
      403,
    );
  }
  return next();
}

export async function loadBookingForToken(bookingId: string) {
  const [booking] = await db.select().from(ecdBookings).where(eq(ecdBookings.id, bookingId)).limit(1);
  return booking ?? null;
}

export function formatMoneyEgp(cents: number) {
  return `${(cents / 100).toLocaleString('en-EG')} EGP`;
}
