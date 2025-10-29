import { API_BASE, fetchJson } from './client';
import type { PaginatedResult } from './types';

type ApiEvent = {
  id: string;
  title: string;
  eventDescription: string | null;
  date: string;
  location: string | null;
  maxAttendees: number | null;
  meetingLink: string | null;
  imageUrl: string | null;
  tags: string[] | null;
  eventType: 'Event' | 'Meetup' | 'Mastermind' | 'Retreat';
  attendeeCount?: number | null;
};

type ApiEventDetail = ApiEvent & {
  attending?: boolean;
};

export type EventRecord = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  max_attendees: number | null;
  meeting_link: string | null;
  image_url: string | null;
  tags: string[];
  event_type: ApiEvent['eventType'];
  attendee_count: number;
  guest_experts: { name: string }[];
};

export type EventDetailRecord = EventRecord & {
  attending: boolean;
};

const mapEvent = (event: ApiEvent): EventRecord => ({
  id: event.id,
  title: event.title,
  description: event.eventDescription,
  date: event.date,
  location: event.location,
  max_attendees: event.maxAttendees ?? null,
  meeting_link: event.meetingLink ?? null,
  image_url: event.imageUrl ?? null,
  tags: event.tags ?? [],
  event_type: event.eventType,
  attendee_count: Number(event.attendeeCount ?? 0),
  guest_experts: [],
});

const mapEventDetail = (event: ApiEventDetail): EventDetailRecord => ({
  ...mapEvent(event),
  attending: Boolean(event.attending),
});

export type CreateEventPayload = {
  title: string;
  description: string;
  date: string;
  location?: string | null;
  meetingLink?: string | null;
  maxAttendees?: number | null;
  imageUrl?: string | null;
  tags?: string[];
  eventType?: ApiEvent['eventType'];
};

export type UpdateEventPayload = Partial<CreateEventPayload>;

export type FetchEventsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: ApiEvent['eventType'];
  upcoming?: boolean;
};

export async function fetchEvents(
  params: FetchEventsParams = {},
): Promise<PaginatedResult<EventRecord>> {
  const query = new URLSearchParams();

  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.search) query.set('search', params.search);
  if (params.type) query.set('type', params.type);
  if (typeof params.upcoming === 'boolean')
    query.set('upcoming', params.upcoming ? 'true' : 'false');

  const data = await fetchJson<{
    items: ApiEvent[];
    pagination: PaginatedResult<ApiEvent>['pagination'];
  }>(`${API_BASE}/events${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
  });

  return {
    items: (data.items ?? []).map(mapEvent),
    pagination: data.pagination,
  };
}

export async function fetchEventById(id: string): Promise<EventDetailRecord> {
  const data = await fetchJson<ApiEventDetail>(`${API_BASE}/events/${id}`, {
    method: 'GET',
  });

  return mapEventDetail(data);
}

export async function createEvent(payload: CreateEventPayload): Promise<EventDetailRecord> {
  const data = await fetchJson<{ event: ApiEventDetail }>(`${API_BASE}/events`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return mapEventDetail(data.event);
}

export async function updateEvent(
  id: string,
  payload: UpdateEventPayload,
): Promise<EventDetailRecord> {
  const data = await fetchJson<{ event: ApiEventDetail }>(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return mapEventDetail(data.event);
}

export async function deleteEvent(id: string): Promise<void> {
  await fetchJson<{ success: boolean }>(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
  });
}

export async function registerForEvent(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  return fetchJson<{ success: boolean; message?: string }>(`${API_BASE}/events/${id}/register`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function cancelEventRegistration(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  return fetchJson<{ success: boolean; message?: string }>(`${API_BASE}/events/${id}/register`, {
    method: 'DELETE',
  });
}
