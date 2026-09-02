export type ExpertLinkedContentKind =
  | 'event'
  | 'track'
  | 'series'
  | 'masterclass'
  | 'libraryAsset';

/** Canonical SPA href for expert linked content; null when the viewer cannot reach a detail page. */
export function getExpertLinkedContentHref(
  kind: ExpertLinkedContentKind,
  id: string,
  isAuthenticated: boolean,
): string | null {
  switch (kind) {
    case 'event':
      return `/meetups/${id}`;
    case 'track':
      return `/tracks/${id}`;
    case 'series':
      return `/series/${id}`;
    case 'masterclass':
      return isAuthenticated ? `/dashboard/masterclasses/${id}` : null;
    case 'libraryAsset':
      return isAuthenticated ? `/dashboard/library/${id}` : null;
    default:
      return null;
  }
}
