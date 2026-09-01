import type { AppLocale } from './locale.js';
import {
  mapAdminBilingualLocation,
  mapAdminBilingualTitleDescription,
  mapPublicLocation,
  mapPublicTitleDescription,
  type BilingualLocationRow,
  type BilingualTitleDescriptionRow,
} from './contentMappers.js';
import { resolveLocalizedText } from './localize.js';

export type ContentBilingualRow = BilingualTitleDescriptionRow &
  BilingualLocationRow & {
    id: string;
  };

export function presentPublicContent<T extends Record<string, unknown>>(
  row: ContentBilingualRow & T,
  locale: AppLocale,
): T & { title: string; description: string | null; location?: string | null } {
  const localized = mapPublicTitleDescription(row, locale);
  const location = mapPublicLocation(row, locale);
  const {
    titleEn: _titleEn,
    titleAr: _titleAr,
    descriptionEn: _descriptionEn,
    descriptionAr: _descriptionAr,
    locationEn: _locationEn,
    locationAr: _locationAr,
    ...rest
  } = row;
  return {
    ...(rest as T),
    title: localized.title,
    description: localized.description,
    location,
  };
}

export function presentAdminContent<T extends Record<string, unknown>>(
  row: ContentBilingualRow & T,
): T & ReturnType<typeof mapAdminBilingualTitleDescription> &
  ReturnType<typeof mapAdminBilingualLocation> {
  const { titleEn, titleAr, descriptionEn, descriptionAr, locationEn, locationAr, ...rest } = row;
  return {
    ...(rest as T),
    ...mapAdminBilingualTitleDescription({ titleEn, titleAr, descriptionEn, descriptionAr }),
    ...mapAdminBilingualLocation({ locationEn, locationAr }),
  };
}

export type DisplayNameBilingualRow = {
  displayNameEn: string;
  displayNameAr: string;
};

export function presentPublicDisplayName(row: DisplayNameBilingualRow, locale: AppLocale) {
  return {
    displayName: resolveLocalizedText(row.displayNameEn, row.displayNameAr, locale),
  };
}

export function presentAdminDisplayName(row: DisplayNameBilingualRow) {
  return {
    displayNameEn: row.displayNameEn,
    displayNameAr: row.displayNameAr,
  };
}

export function presentPublicTitleOnly(
  row: { titleEn: string; titleAr: string } & Record<string, unknown>,
  locale: AppLocale,
) {
  const { titleEn, titleAr, ...rest } = row;
  return {
    ...rest,
    title: resolveLocalizedText(titleEn, titleAr, locale),
  };
}

export function presentPublicRow<T extends ContentBilingualRow>(
  row: T,
  locale: AppLocale,
  isStaff: boolean,
) {
  return isStaff ? presentAdminContent(row) : presentPublicContent(row, locale);
}

export function presentPublicNameRow<T extends { nameEn: string; nameAr: string } & Record<string, unknown>>(
  row: T,
  locale: AppLocale,
  isStaff: boolean,
) {
  if (isStaff) {
    return {
      ...row,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
    };
  }
  const { nameEn, nameAr, ...rest } = row;
  return {
    ...rest,
    name: resolveLocalizedText(nameEn, nameAr, locale),
  };
}
