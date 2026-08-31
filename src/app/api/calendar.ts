import { API_BASE, fetchJson } from './client';

export type EventCalendarMeta = {
  googleCalendarUrl: string;
  icsPath: string;
};

export type TrackCalendarSession = {
  eventId: string;
  title: string;
  googleCalendarUrl: string;
};

export type TrackCalendarMeta = {
  sessions: TrackCalendarSession[];
  icsPath: string;
};

export function fetchEventCalendar(eventId: string) {
  return fetchJson<EventCalendarMeta>(`${API_BASE}/events/${eventId}/calendar`);
}

export function fetchTrackCalendar(trackId: string) {
  return fetchJson<TrackCalendarMeta>(`${API_BASE}/tracks/${trackId}/calendar`);
}

export async function downloadCalendarIcs(icsPath: string, filename: string) {
  const response = await fetch(icsPath, { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Unable to download calendar file.');
  }
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(link.href);
}
