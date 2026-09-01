import type { AppLocale } from './locale.js';
import {
  normalizeGuestExpert,
  type GuestExpertBilingual,
} from './contentMappers.js';
import {
  presentPublicGuestExpertFromEntity,
  type ExpertBilingualRow,
} from './expertPresentation.js';

export type LinkedExpertPresentationRow = ExpertBilingualRow & {
  sortOrder?: number;
};

export function formatGuestExpertsPresentation(
  linked: LinkedExpertPresentationRow[],
  guestExpertsJson: unknown,
  locale: AppLocale,
  isStaff: boolean,
) {
  if (linked.length > 0) {
    const visibleLinked = isStaff
      ? linked
      : linked.filter((row) => row.isPublished && row.archivedAt == null);

    return visibleLinked.map((row) => {
      if (isStaff) {
        return {
          expertId: row.id,
          nameEn: row.displayNameEn,
          nameAr: row.displayNameAr,
          bioEn: row.bioEn ?? '',
          bioAr: row.bioAr ?? '',
          imageUrl: row.avatarUrl,
          slug: row.slug,
          isPublished: row.isPublished,
        };
      }
      return presentPublicGuestExpertFromEntity(row, locale);
    });
  }

  if (!Array.isArray(guestExpertsJson)) return [];
  return (guestExpertsJson as GuestExpertBilingual[]).map((expert) =>
    normalizeGuestExpert(expert, locale),
  );
}
