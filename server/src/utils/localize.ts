import type { AppLocale } from './locale.js';

export type BilingualPair = {
  en?: string | null;
  ar?: string | null;
};

export function resolveLocalizedText(
  en: string | null | undefined,
  ar: string | null | undefined,
  locale: AppLocale,
): string {
  const primary = locale === 'ar' ? ar : en;
  const secondary = locale === 'ar' ? en : ar;

  if (typeof primary === 'string' && primary.length > 0) {
    return primary;
  }
  if (typeof secondary === 'string' && secondary.length > 0) {
    return secondary;
  }
  return '';
}

export function resolveOptionalLocalizedText(
  en: string | null | undefined,
  ar: string | null | undefined,
  locale: AppLocale,
): string | null {
  const resolved = resolveLocalizedText(en, ar, locale);
  return resolved.length > 0 ? resolved : null;
}

export function pickLocalizedSearchColumn(
  enColumn: unknown,
  arColumn: unknown,
  locale: AppLocale,
): unknown {
  return locale === 'ar' ? arColumn : enColumn;
}

export function bilingualSearchOrClause(
  locale: AppLocale,
  enColumn: unknown,
  arColumn: unknown,
  pattern: string,
  buildLike: (column: unknown, pattern: string) => unknown,
): unknown[] {
  if (locale === 'ar') {
    return [buildLike(arColumn, pattern), buildLike(enColumn, pattern)];
  }
  return [buildLike(enColumn, pattern), buildLike(arColumn, pattern)];
}

export function toAdminBilingualFields(
  en: string | null | undefined,
  ar: string | null | undefined,
) {
  return {
    en: en ?? '',
    ar: ar ?? '',
  };
}

export type LocalizedContentFields = {
  title?: string | null;
  description?: string | null;
  location?: string | null;
};

export function localizeContentRecord<
  T extends {
    titleEn?: string | null;
    titleAr?: string | null;
    descriptionEn?: string | null;
    descriptionAr?: string | null;
    locationEn?: string | null;
    locationAr?: string | null;
  },
>(record: T, locale: AppLocale): LocalizedContentFields {
  return {
    title: resolveLocalizedText(record.titleEn, record.titleAr, locale) || null,
    description: resolveOptionalLocalizedText(
      record.descriptionEn,
      record.descriptionAr,
      locale,
    ),
    location: resolveOptionalLocalizedText(record.locationEn, record.locationAr, locale),
  };
}
