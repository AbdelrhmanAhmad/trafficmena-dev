import type { AppLocale } from './locale.js';
import { resolveLocalizedText, resolveOptionalLocalizedText } from './localize.js';

export type ExpertBilingualRow = {
  id: string;
  slug: string;
  displayNameEn: string;
  displayNameAr: string;
  headlineEn?: string | null;
  headlineAr?: string | null;
  bioEn?: string | null;
  bioAr?: string | null;
  avatarUrl?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  isPublished?: boolean;
  publishedAt?: Date | null;
  archivedAt?: Date | null;
  assignedUserId?: string | null;
};

export function presentPublicExpert(row: ExpertBilingualRow, locale: AppLocale) {
  return {
    id: row.id,
    slug: row.slug,
    displayName: resolveLocalizedText(row.displayNameEn, row.displayNameAr, locale),
    headline: resolveOptionalLocalizedText(row.headlineEn, row.headlineAr, locale),
    bio: resolveOptionalLocalizedText(row.bioEn, row.bioAr, locale),
    avatarUrl: row.avatarUrl ?? null,
    websiteUrl: row.websiteUrl ?? null,
    linkedinUrl: row.linkedinUrl ?? null,
    twitterUrl: row.twitterUrl ?? null,
  };
}

export function presentAdminExpert(row: ExpertBilingualRow & { assignedUserEmail?: string | null }) {
  return {
    id: row.id,
    slug: row.slug,
    displayNameEn: row.displayNameEn,
    displayNameAr: row.displayNameAr,
    headlineEn: row.headlineEn ?? null,
    headlineAr: row.headlineAr ?? null,
    bioEn: row.bioEn ?? null,
    bioAr: row.bioAr ?? null,
    avatarUrl: row.avatarUrl ?? null,
    websiteUrl: row.websiteUrl ?? null,
    linkedinUrl: row.linkedinUrl ?? null,
    twitterUrl: row.twitterUrl ?? null,
    isPublished: row.isPublished ?? false,
    publishedAt: row.publishedAt ?? null,
    archivedAt: row.archivedAt ?? null,
    assignedUserId: row.assignedUserId ?? null,
    assignedUserEmail: row.assignedUserEmail ?? null,
  };
}

export function isExpertPubliclyVisible(expert: { isPublished: boolean; archivedAt: Date | null }) {
  return expert.isPublished && expert.archivedAt == null;
}

export function presentPublicGuestExpertFromEntity(
  row: ExpertBilingualRow,
  locale: AppLocale,
) {
  const localized = presentPublicExpert(row, locale);
  return {
    name: localized.displayName,
    bio: localized.bio,
    image_url: localized.avatarUrl,
    slug: row.isPublished && !row.archivedAt ? row.slug : null,
    ...(row.isPublished && !row.archivedAt ? { expertId: row.id } : {}),
  };
}
