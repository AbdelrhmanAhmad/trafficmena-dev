export type AppLocale = 'en' | 'ar';

export const LOCALE_STORAGE_KEY = 'trafficmena:locale';
export const LOCALE_COOKIE_NAME = 'tm_locale';
export const DEFAULT_LOCALE: AppLocale = 'en';

export function parseAppLocale(value: string | null | undefined): AppLocale | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'ar' || normalized.startsWith('ar-')) return 'ar';
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  return null;
}

export function readStoredLocale(): AppLocale {
  if (typeof globalThis.localStorage === 'undefined') {
    return DEFAULT_LOCALE;
  }
  try {
    return parseAppLocale(globalThis.localStorage.getItem(LOCALE_STORAGE_KEY)) ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function writeStoredLocale(locale: AppLocale): void {
  if (typeof globalThis.localStorage === 'undefined') return;
  try {
    globalThis.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore quota/private mode
  }
  if (typeof document !== 'undefined') {
    document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

export function localeToDir(locale: AppLocale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function applyDocumentLocale(locale: AppLocale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.dir = localeToDir(locale);
}
