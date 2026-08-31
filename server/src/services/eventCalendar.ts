import { env } from '../config/env.js';

export const CAIRO_TZ = 'Africa/Cairo';

export type EventCalendarSource = {
  id: string;
  title: string;
  eventDescription: string | null;
  date: Date;
  location: string | null;
  locationUrl: string | null;
  eventFormat: 'online' | 'offline';
  meetingLink: string | null;
};

export type EventCalendarData = {
  id: string;
  title: string;
  description: string;
  location: string;
  eventPageUrl: string;
  startUtc: Date;
  endUtc: Date;
  timezone: typeof CAIRO_TZ;
};

/** Events schema stores start instant only; default block length until end time exists. */
export const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;

export function buildCanonicalEventPageUrl(eventId: string, appBaseUrl = env.APP_BASE_URL): string {
  const base = appBaseUrl.replace(/\/$/, '');
  return `${base}/meetups/${eventId}`;
}

export function buildApiCalendarIcsUrl(
  kind: 'event' | 'track',
  id: string,
  apiBaseUrl = env.API_BASE_URL ?? env.APP_BASE_URL.replace(':8080', ':3001'),
): string {
  const base = apiBaseUrl.replace(/\/$/, '');
  if (kind === 'event') {
    return `${base}/api/events/${id}/calendar.ics`;
  }
  return `${base}/api/tracks/${id}/calendar.ics`;
}

function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();
}

export function buildEventCalendarData(
  event: EventCalendarSource,
  appBaseUrl = env.APP_BASE_URL,
): EventCalendarData {
  const eventPageUrl = buildCanonicalEventPageUrl(event.id, appBaseUrl);
  const startUtc = new Date(event.date);
  const endUtc = new Date(startUtc.getTime() + DEFAULT_EVENT_DURATION_MS);

  const plainDescription = event.eventDescription ? stripHtml(event.eventDescription) : '';
  const descriptionParts = [
    plainDescription,
    `View event details: ${eventPageUrl}`,
  ].filter(Boolean);

  const location =
    event.eventFormat === 'online'
      ? eventPageUrl
      : event.location?.trim() || event.locationUrl?.trim() || 'Location TBD';

  return {
    id: event.id,
    title: event.title,
    description: descriptionParts.join('\n\n'),
    location,
    eventPageUrl,
    startUtc,
    endUtc,
    timezone: CAIRO_TZ,
  };
}

export function formatGoogleCalendarUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

export function formatIcsUtc(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

/** Cairo wall time for ICS TZID=Africa/Cairo (IANA DST-aware, same source as dateUtils display). */
export function formatIcsCairoLocal(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${get('year')}${get('month')}${get('day')}T${get('hour')}${get('minute')}${get('second')}`;
}

export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
}

export function buildGoogleCalendarUrl(data: EventCalendarData): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: data.title,
    dates: `${formatGoogleCalendarUtc(data.startUtc)}/${formatGoogleCalendarUtc(data.endUtc)}`,
    details: data.description,
    location: data.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsCalendarBody(
  events: EventCalendarData[],
  prodId = '-//TrafficMENA//Events//EN',
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:' + prodId,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@trafficmena.com`,
      `DTSTAMP:${formatIcsUtc(new Date())}`,
      `DTSTART;TZID=${CAIRO_TZ}:${formatIcsCairoLocal(event.startUtc)}`,
      `DTEND;TZID=${CAIRO_TZ}:${formatIcsCairoLocal(event.endUtc)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(event.description)}`,
      `LOCATION:${escapeIcsText(event.location)}`,
      `URL:${escapeIcsText(event.eventPageUrl)}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function calendarDataContainsMeetingLink(
  data: EventCalendarData,
  meetingLink: string | null | undefined,
): boolean {
  if (!meetingLink?.trim()) return false;
  const needle = meetingLink.trim();
  return (
    data.description.includes(needle) ||
    data.location.includes(needle) ||
    data.eventPageUrl.includes(needle)
  );
}
