import type { RecordingsSeriesSummaryRecord } from '@/app/api/tracks';

export function hasRecordingsDashboardAccess(
  series: Pick<RecordingsSeriesSummaryRecord, 'has_purchased' | 'has_access'> | null | undefined,
): boolean {
  return Boolean(series?.has_purchased || series?.has_access);
}

export function resolveRecordingsNavigationPath(options: {
  series: Pick<RecordingsSeriesSummaryRecord, 'id' | 'has_purchased' | 'has_access'> | null | undefined;
  publicRecordingsPath: string;
}): string {
  const { series, publicRecordingsPath } = options;
  if (!series?.id) return publicRecordingsPath;
  if (hasRecordingsDashboardAccess(series)) {
    return `/dashboard/library/series/${series.id}`;
  }
  return publicRecordingsPath;
}
