type TrackCalendarEvent = {
  id: string;
  title: string;
};

export function resolveTrackCalendarAnalyticsEvent(
  events: TrackCalendarEvent[],
): { itemId: string; itemName: string } | null {
  for (const event of events) {
    const itemId = event.id.trim();
    const itemName = event.title.trim();

    if (itemId && itemName) {
      return { itemId, itemName };
    }
  }

  return null;
}
