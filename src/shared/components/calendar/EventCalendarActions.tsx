import { useQuery } from '@tanstack/react-query';
import { Download, ExternalLink } from 'lucide-react';
import type React from 'react';
import {
  downloadCalendarIcs,
  fetchEventCalendar,
  fetchTrackCalendar,
} from '@/app/api/calendar';
import { trackAddToCalendar } from '@/lib/analytics/events';
import { Button } from '@/shared/components/ui/button';

type EventCalendarActionsProps = {
  kind: 'event';
  resourceId: string;
  analyticsItemName: string;
  className?: string;
};

type TrackCalendarActionsProps = {
  kind: 'track';
  resourceId: string;
  analyticsItemName: string;
  className?: string;
};

type Props = EventCalendarActionsProps | TrackCalendarActionsProps;

const EventCalendarActions: React.FC<Props> = (props) => {
  const { kind, resourceId, analyticsItemName, className } = props;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['calendar', kind, resourceId],
    queryFn: () =>
      kind === 'event' ? fetchEventCalendar(resourceId) : fetchTrackCalendar(resourceId),
    enabled: Boolean(resourceId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <p className={`text-center text-sm text-neutral-500 ${className ?? ''}`}>
        Loading calendar options…
      </p>
    );
  }

  if (isError || !data) {
    return null;
  }

  const handleIcsDownload = async () => {
    trackAddToCalendar({
      itemId: resourceId,
      itemName: analyticsItemName,
      calendarType: 'ics_download',
    });
    const filename =
      kind === 'event'
        ? `trafficmena-event-${resourceId}.ics`
        : `trafficmena-track-${resourceId}.ics`;
    await downloadCalendarIcs(data.icsPath, filename);
  };

  if (kind === 'event') {
    return (
      <div className={`space-y-4 ${className ?? ''}`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Button
            asChild
            variant="outline"
            className="flex h-12 items-center gap-2 border-neutral-300 hover:bg-neutral-50"
          >
            <a
              href={data.googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackAddToCalendar({
                  itemId: resourceId,
                  itemName: analyticsItemName,
                  calendarType: 'google_calendar',
                })
              }
            >
              <ExternalLink className="h-5 w-5" />
              Add to Google Calendar
            </a>
          </Button>

          <Button
            type="button"
            onClick={() => void handleIcsDownload()}
            variant="outline"
            className="flex h-12 items-center gap-2 border-neutral-300 hover:bg-neutral-50"
          >
            <Download className="h-5 w-5" />
            Download .ics File
          </Button>
        </div>
      </div>
    );
  }

  const sessions = data.sessions;

  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      {sessions.length > 0 && (
        <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-medium text-neutral-700">Add sessions to Google Calendar</p>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.eventId}
                className="flex flex-col gap-2 rounded-lg bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm font-medium text-neutral-900">{session.title}</span>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <a
                    href={session.googleCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackAddToCalendar({
                        itemId: session.eventId,
                        itemName: session.title,
                        calendarType: 'google_calendar',
                      })
                    }
                  >
                    <ExternalLink className="mr-1 h-4 w-4" />
                    Google Calendar
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={() => void handleIcsDownload()}
        variant="outline"
        className="flex h-12 w-full items-center gap-2 border-neutral-300 hover:bg-neutral-50"
        disabled={sessions.length === 0}
      >
        <Download className="h-5 w-5" />
        Download All Sessions (.ics)
      </Button>
    </div>
  );
};

export default EventCalendarActions;
