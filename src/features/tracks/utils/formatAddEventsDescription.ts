import type { AddEventsToTrackResult } from '@/app/api/tracks';

export function formatAddEventsDescription(result: AddEventsToTrackResult): string {
  const registrations = (result.backfilledCount ?? 0) + (result.reactivatedCount ?? 0);
  if (registrations === 0) {
    return `Added ${result.addedCount} event${result.addedCount > 1 ? 's' : ''} to the track.`;
  }

  let description = `Session added. ${registrations} registration${registrations === 1 ? '' : 's'} created.`;
  const skipped = result.skippedExistingCount ?? 0;
  if (skipped > 0) {
    description += ` ${skipped} existing registration${skipped === 1 ? '' : 's'} skipped.`;
  }
  return description;
}
