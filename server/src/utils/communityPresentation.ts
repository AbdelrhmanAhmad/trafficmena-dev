import type { AppLocale } from './locale.js';
import { resolveLocalizedText, resolveOptionalLocalizedText } from './localize.js';

export function presentChannel(
  row: {
    id: string;
    slug: string;
    nameEn: string;
    nameAr: string;
    descriptionEn?: string | null;
    descriptionAr?: string | null;
    channelType: string;
    coverImageUrl: string;
    requiresApproval: boolean;
    sortOrder: number;
    archivedAt?: Date | null;
  },
  locale: AppLocale,
  isStaff: boolean,
) {
  return {
    id: row.id,
    slug: row.slug,
    name: resolveLocalizedText(row.nameEn, row.nameAr, locale),
    description: resolveOptionalLocalizedText(row.descriptionEn, row.descriptionAr, locale),
    channelType: row.channelType,
    coverImageUrl: row.coverImageUrl,
    requiresApproval: row.requiresApproval,
    sortOrder: row.sortOrder,
    archivedAt: isStaff ? row.archivedAt ?? null : undefined,
  };
}

export function presentAdminChannel(
  row: {
    id: string;
    slug: string;
    nameEn: string;
    nameAr: string;
    descriptionEn?: string | null;
    descriptionAr?: string | null;
    channelType: string;
    coverImageUrl: string;
    requiresApproval: boolean;
    sortOrder: number;
    archivedAt?: Date | null;
  },
  entitlements: Array<{ trackId: string | null; masterclassId: string | null }>,
) {
  return {
    id: row.id,
    slug: row.slug,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    descriptionEn: row.descriptionEn ?? '',
    descriptionAr: row.descriptionAr ?? '',
    channelType: row.channelType,
    coverImageUrl: row.coverImageUrl,
    requiresApproval: row.requiresApproval,
    sortOrder: row.sortOrder,
    archivedAt: row.archivedAt ?? null,
    entitlements: entitlements.map((ent) => ({
      trackId: ent.trackId,
      masterclassId: ent.masterclassId,
    })),
  };
}

export function presentPost(
  row: {
    id: string;
    channelId: string;
    title?: string | null;
    bodyHtml: string;
    localeHint?: string | null;
    linkUrl?: string | null;
    imageUrl?: string | null;
    status: string;
    isPinned: boolean;
    publishedAt?: Date | null;
    archivedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  author: { id: string; name: string; image?: string | null },
  isStaff: boolean,
) {
  return {
    id: row.id,
    channelId: row.channelId,
    title: row.title ?? null,
    bodyHtml: row.bodyHtml,
    dir: row.localeHint === 'ar' ? 'rtl' : row.localeHint === 'en' ? 'ltr' : 'auto',
    linkUrl: row.linkUrl ?? null,
    imageUrl: row.imageUrl ?? null,
    isPinned: row.isPinned,
    publishedAt: row.publishedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: {
      id: author.id,
      displayName: author.name,
      avatarUrl: author.image ?? null,
    },
    status: isStaff ? row.status : undefined,
    archivedAt: isStaff ? row.archivedAt ?? null : undefined,
  };
}

export function presentAnnouncement(
  row: {
    id: string;
    channelId?: string | null;
    titleEn: string;
    titleAr: string;
    bodyEn: string;
    bodyAr: string;
    status: string;
    scheduledAt?: Date | null;
    publishedAt?: Date | null;
    cancelledAt?: Date | null;
    archivedAt?: Date | null;
  },
  locale: AppLocale,
  isStaff: boolean,
) {
  return {
    id: row.id,
    channelId: row.channelId ?? null,
    title: resolveLocalizedText(row.titleEn, row.titleAr, locale),
    body: resolveLocalizedText(row.bodyEn, row.bodyAr, locale),
    publishedAt: row.publishedAt ?? null,
    isAnnouncement: true,
    status: isStaff ? row.status : undefined,
    scheduledAt: isStaff ? row.scheduledAt ?? null : undefined,
    cancelledAt: isStaff ? row.cancelledAt ?? null : undefined,
    archivedAt: isStaff ? row.archivedAt ?? null : undefined,
  };
}

export function presentAdminAnnouncement(row: {
  id: string;
  channelId?: string | null;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  status: string;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  cancelledAt?: Date | null;
  archivedAt?: Date | null;
}) {
  return {
    id: row.id,
    channelId: row.channelId ?? null,
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    bodyEn: row.bodyEn,
    bodyAr: row.bodyAr,
    status: row.status,
    scheduledAt: row.scheduledAt ?? null,
    publishedAt: row.publishedAt ?? null,
    cancelledAt: row.cancelledAt ?? null,
    archivedAt: row.archivedAt ?? null,
  };
}
