import type { AppLocale } from './locale.js';
import { resolveLocalizedText, resolveOptionalLocalizedText } from './localize.js';

export type BilingualTitleDescriptionRow = {
  titleEn: string;
  titleAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
};

export type BilingualLocationRow = {
  locationEn?: string | null;
  locationAr?: string | null;
};

export function mapPublicTitleDescription(
  row: BilingualTitleDescriptionRow,
  locale: AppLocale,
) {
  return {
    title: resolveLocalizedText(row.titleEn, row.titleAr, locale),
    description: resolveOptionalLocalizedText(
      row.descriptionEn,
      row.descriptionAr,
      locale,
    ),
  };
}

export function mapPublicLocation(row: BilingualLocationRow, locale: AppLocale) {
  return resolveOptionalLocalizedText(row.locationEn, row.locationAr, locale);
}

export function mapAdminBilingualTitleDescription(row: BilingualTitleDescriptionRow) {
  return {
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    descriptionEn: row.descriptionEn ?? null,
    descriptionAr: row.descriptionAr ?? null,
  };
}

export function mapAdminBilingualLocation(row: BilingualLocationRow) {
  return {
    locationEn: row.locationEn ?? null,
    locationAr: row.locationAr ?? null,
  };
}

export function buildLegacyMirrorValues(params: {
  titleEn: string;
  titleAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  locationEn?: string | null;
  locationAr?: string | null;
}) {
  return {
    title: params.titleEn,
    description: params.descriptionEn ?? null,
    location: params.locationEn ?? null,
  };
}

export type GuestExpertBilingual = {
  name_en?: string;
  name_ar?: string;
  bio_en?: string;
  bio_ar?: string;
  image_url?: string | null;
  // legacy keys during read
  name?: string;
  bio?: string;
};

export function normalizeGuestExpert(expert: GuestExpertBilingual, locale: AppLocale) {
  const nameEn = expert.name_en ?? expert.name ?? '';
  const nameAr = expert.name_ar ?? expert.name ?? '';
  const bioEn = expert.bio_en ?? expert.bio ?? '';
  const bioAr = expert.bio_ar ?? expert.bio ?? '';
  return {
    name: resolveLocalizedText(nameEn, nameAr, locale),
    bio: resolveOptionalLocalizedText(bioEn, bioAr, locale),
    image_url: expert.image_url ?? null,
  };
}

export function mapAdminGuestExpert(expert: GuestExpertBilingual) {
  return {
    nameEn: expert.name_en ?? expert.name ?? '',
    nameAr: expert.name_ar ?? expert.name ?? '',
    bioEn: expert.bio_en ?? expert.bio ?? '',
    bioAr: expert.bio_ar ?? expert.bio ?? '',
    imageUrl: expert.image_url ?? null,
  };
}

export function guestExpertsToDb(experts: Array<{
  nameEn: string;
  nameAr: string;
  bioEn?: string | null;
  bioAr?: string | null;
  imageUrl?: string | null;
}>) {
  return experts.map((expert) => ({
    name_en: expert.nameEn,
    name_ar: expert.nameAr,
    bio_en: expert.bioEn ?? '',
    bio_ar: expert.bioAr ?? '',
    image_url: expert.imageUrl ?? null,
  }));
}
