import type { QueryClient } from '@tanstack/react-query';
import type { PublicTrackDetailRecord, TrackDetailRecord } from '../../app/api/tracks';
import { trackTrackBooking } from '../../lib/analytics/events';

type CachedTrackCandidate =
  | {
      title?: string | null;
    }
  | {
      track?: {
        title?: string | null;
      } | null;
    }
  | null
  | undefined;

export function resolveTrackBookingItemName(candidates: CachedTrackCandidate[]): string {
  for (const candidate of candidates) {
    const normalizedTitle = (candidate?.track?.title ?? candidate?.title ?? '').trim();
    if (normalizedTitle) {
      return normalizedTitle;
    }
  }

  return '';
}

export function trackSuccessfulTrackBooking(
  queryClient: QueryClient,
  trackId: string,
  eventCount: number,
): void {
  const dashboardTrack = queryClient.getQueryData<TrackDetailRecord>(['tracks', 'detail', trackId]);
  const publicTrackEntries = queryClient.getQueriesData<{
    track?: PublicTrackDetailRecord | null;
  }>({
    queryKey: ['tracks', 'public', 'detail', trackId],
  });

  trackTrackBooking({
    itemId: trackId,
    itemName: resolveTrackBookingItemName([
      dashboardTrack,
      ...publicTrackEntries.map(([, cachedTrack]) => cachedTrack),
    ]),
    eventCount,
  });
}
