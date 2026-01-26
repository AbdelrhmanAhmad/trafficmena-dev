import { randomBytes } from 'node:crypto';
import type { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { env, isProduction } from '../config/env.js';

const CSRF_COOKIE_NAME = 'tm_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set(['/api/payments/webhook', '/api/payments/webhook_json']);

const csrfAllowlist = new Set(env.CORS_ALLOWLIST);
try {
  if (env.APP_BASE_URL) {
    csrfAllowlist.add(new URL(env.APP_BASE_URL).origin);
  }
} catch {
  // Ignore invalid APP_BASE_URL
}

function isOriginAllowed(origin: string) {
  return csrfAllowlist.has(origin);
}

function getOriginFromReferer(referer: string) {
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function issueCsrfToken(c: Context) {
  const token = randomBytes(32).toString('hex');
  setCookie(c, CSRF_COOKIE_NAME, token, {
    path: '/',
    sameSite: 'Strict',
    httpOnly: false,
    secure: isProduction,
    maxAge: 60 * 60 * 24,
  });
  return token;
}

export async function csrfMiddleware(c: Context, next: Next) {
  const method = c.req.method.toUpperCase();
  const path = c.req.path;

  if (EXEMPT_PATHS.has(path)) {
    return next();
  }

  const isSafeMethod = SAFE_METHODS.has(method);
  const cookieToken = getCookie(c, CSRF_COOKIE_NAME);

  if (isSafeMethod) {
    if (!cookieToken) {
      issueCsrfToken(c);
    }
    return next();
  }

  const headerToken = c.req.header(CSRF_HEADER_NAME);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    if (!cookieToken) {
      issueCsrfToken(c);
    }
    return c.json({ error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token.' } }, 403);
  }

  const origin = c.req.header('origin');
  if (origin) {
    if (!isOriginAllowed(origin)) {
      return c.json({ error: { code: 'CSRF_ORIGIN', message: 'Invalid request origin.' } }, 403);
    }
    return next();
  }

  const referer = c.req.header('referer');
  const refererOrigin = referer ? getOriginFromReferer(referer) : null;
  if (!refererOrigin || !isOriginAllowed(refererOrigin)) {
    return c.json(
      { error: { code: 'CSRF_ORIGIN', message: 'Missing or invalid request origin.' } },
      403,
    );
  }

  return next();
}
