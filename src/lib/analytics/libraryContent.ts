import type { LibraryAssetRecord } from '@/app/api/library';

export type LibrarySeriesContext = {
  seriesId: string;
  seriesName: string;
};

type LibrarySeriesNavigationState = {
  seriesContext?: {
    id?: string | null;
    title?: string | null;
  } | null;
};

type TrackableLibraryContent = Pick<LibraryAssetRecord, 'has_access'>;

// Track view_content for any accessible library asset — regardless of content type
export function shouldTrackInlineLibraryContent(
  asset: TrackableLibraryContent | null | undefined,
): boolean {
  if (!asset || asset.has_access === false) {
    return false;
  }

  return true;
}

export function resolveLibrarySeriesContext(state: unknown): LibrarySeriesContext {
  const navigationState = state as LibrarySeriesNavigationState | null | undefined;
  const seriesContext = navigationState?.seriesContext;

  return {
    seriesId: seriesContext?.id?.trim() ?? '',
    seriesName: seriesContext?.title?.trim() ?? '',
  };
}
