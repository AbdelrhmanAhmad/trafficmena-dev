import type { Context } from 'hono';

export type AppLocale = 'en' | 'ar';

export const SUPPORTED_LOCALES: AppLocale[] = ['en', 'ar'];
export const DEFAULT_LOCALE: AppLocale = 'en';
export const LOCALE_COOKIE_NAME = 'tm_locale';

export function parseAppLocale(value: string | null | undefined): AppLocale | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'ar' || normalized.startsWith('ar-')) return 'ar';
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  return null;
}

function readCookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

function readAcceptLanguage(header: string | undefined): AppLocale | null {
  if (!header) return null;
  const tokens = header
    .split(',')
    .map((part) => part.trim().split(';')[0]?.toLowerCase())
    .filter(Boolean);
  for (const token of tokens) {
    const parsed = parseAppLocale(token);
    if (parsed) return parsed;
  }
  return null;
}

export function resolveLocaleFromRequest(c: Context): AppLocale {
  const queryLocale =
    parseAppLocale(c.req.query('lang')) ?? parseAppLocale(c.req.query('locale'));
  if (queryLocale) return queryLocale;

  const cookieLocale = parseAppLocale(readCookieValue(c.req.header('Cookie'), LOCALE_COOKIE_NAME));
  if (cookieLocale) return cookieLocale;

  const acceptLocale = readAcceptLanguage(c.req.header('Accept-Language'));
  if (acceptLocale) return acceptLocale;

  return DEFAULT_LOCALE;
}

export function localeToDir(locale: AppLocale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
