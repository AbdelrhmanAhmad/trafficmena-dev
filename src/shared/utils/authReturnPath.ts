/**
 * Safe internal post-auth return destinations (W5).
 * Stores pathname + search + hash only — never external origins.
 */

export const AUTH_RETURN_STORAGE_KEY = 'trafficmena:auth-return-path';
export const DEFAULT_AUTH_RETURN_PATH = '/dashboard';

type LocationLike = {
  pathname: string;
  search?: string;
  hash?: string;
};

const AUTH_ENTRY_PREFIXES = ['/signin', '/signup'];

const BLOCKED_PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/;

export function buildReturnPathFromLocation(location: LocationLike): string {
  const search = location.search ?? '';
  const hash = location.hash ?? '';
  return `${location.pathname}${search}${hash}`;
}

export function isAuthEntryPath(pathname: string): boolean {
  return AUTH_ENTRY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function normalizeCandidate(candidate: string): string {
  let value = candidate.trim();
  if (!value) return '';

  // Decode a single layer so %2F%2Fevil.com becomes //evil.com and is rejected.
  try {
    value = decodeURIComponent(value);
  } catch {
    return '';
  }

  return value.trim();
}

export function sanitizeInternalReturnPath(
  candidate: string | null | undefined,
  fallback: string = DEFAULT_AUTH_RETURN_PATH,
): string {
  const normalized = normalizeCandidate(candidate ?? '');
  if (!normalized) {
    return fallback;
  }

  if (BLOCKED_PROTOCOL_PATTERN.test(normalized)) {
    return fallback;
  }

  if (normalized.startsWith('//') || normalized.startsWith('\\\\') || normalized.startsWith('\\')) {
    return fallback;
  }

  if (!normalized.startsWith('/')) {
    return fallback;
  }

  if (normalized.includes('\\')) {
    return fallback;
  }

  if (CONTROL_CHAR_PATTERN.test(normalized)) {
    return fallback;
  }

  if (normalized.length > 2048) {
    return fallback;
  }

  const pathname = normalized.split(/[?#]/)[0] ?? normalized;
  if (isAuthEntryPath(pathname)) {
    return fallback;
  }

  return normalized;
}

function readSessionStorage(): string | null {
  if (typeof globalThis.sessionStorage === 'undefined') {
    return null;
  }
  try {
    return globalThis.sessionStorage.getItem(AUTH_RETURN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSessionStorage(path: string): void {
  if (typeof globalThis.sessionStorage === 'undefined') {
    return;
  }
  try {
    globalThis.sessionStorage.setItem(AUTH_RETURN_STORAGE_KEY, path);
  } catch {
    // Best-effort; navigation state remains a fallback.
  }
}

function removeSessionStorage(): void {
  if (typeof globalThis.sessionStorage === 'undefined') {
    return;
  }
  try {
    globalThis.sessionStorage.removeItem(AUTH_RETURN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function storeAuthReturnPath(candidate: string): string {
  const sanitized = sanitizeInternalReturnPath(candidate);
  writeSessionStorage(sanitized);
  return sanitized;
}

export function peekAuthReturnPath(): string | null {
  const stored = readSessionStorage();
  if (!stored) {
    return null;
  }
  const sanitized = sanitizeInternalReturnPath(stored, '');
  return sanitized || null;
}

export function consumeAuthReturnPath(fallback: string = DEFAULT_AUTH_RETURN_PATH): string {
  const stored = readSessionStorage();
  removeSessionStorage();
  return sanitizeInternalReturnPath(stored, fallback);
}

export function clearAuthReturnPath(): void {
  removeSessionStorage();
}

export function captureAuthReturnFromLocation(location: LocationLike): string | null {
  if (isAuthEntryPath(location.pathname)) {
    return peekAuthReturnPath();
  }
  return storeAuthReturnPath(buildReturnPathFromLocation(location));
}

export function captureAuthReturnFromSignInEntry(location: LocationLike & { search: string }): string | null {
  const returnTo = new URLSearchParams(location.search).get('returnTo');
  if (returnTo) {
    return storeAuthReturnPath(returnTo);
  }

  const from = (location as { state?: { from?: LocationLike } }).state?.from;
  if (from?.pathname) {
    return storeAuthReturnPath(buildReturnPathFromLocation(from));
  }

  return peekAuthReturnPath();
}

export function captureAuthReturnFromSignUpEntry(location: LocationLike & { search: string }): string | null {
  const returnTo = new URLSearchParams(location.search).get('returnTo');
  if (returnTo) {
    return storeAuthReturnPath(returnTo);
  }

  return peekAuthReturnPath();
}

export function locationLikeFromReturnPath(path: string): LocationLike {
  const sanitized = sanitizeInternalReturnPath(path);
  const url = new URL(sanitized, 'http://local.internal');
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  };
}
