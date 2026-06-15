import { API_BASE, fetchJson } from './client';
import type { PaginatedResult } from './types';

type ApiEvent = {
  id: string;
  title: string;
  eventDescription: string | null;
  date: string;
  location: string | null;
  locationUrl: string | null;
  maxAttendees: number | null;
  meetingLink: string | null;
  imageUrl: string | null;
  tags: string[] | null;
  eventType: 'Event' | 'Meetup' | 'Mastermind' | 'Retreat';
  attendeeCount?: number | null;
  priceInCents: number | null;
};

type ApiEventDetail = ApiEvent & {
  attending?: boolean;
  registrationStatus?: 'active' | 'cancelled' | 'refund_requested' | null;
  trackInfo?: {
    id: string;
    title: string;
    trackBookingStart: string | null;
    trackBookingEnd: string | null;
    singleBookingStart: string | null;
    singleBookingEnd: string | null;
    booked?: boolean;
  } | null;
};

export type EventRecord = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  location_url: string | null;
  max_attendees: number | null;
  meeting_link: string | null;
  image_url: string | null;
  tags: string[];
  event_type: ApiEvent['eventType'];
  attendee_count: number;
  guest_experts: { name: string }[];
  price_in_cents: number | null;
};

export interface EventDetailRecord extends EventRecord {
  attendeeCount: number;
  attending: boolean;
  registrationStatus: 'active' | 'cancelled' | 'refund_requested' | null;
  meetingLink: string | null;
  trackInfo?: {
    id: string;
    title: string;
    trackBookingStart: Date | null;
    trackBookingEnd: Date | null;
    singleBookingStart: Date | null;
    singleBookingEnd: Date | null;
    booked: boolean;
  } | null;
}

const mapApiEventToRecord = (event: ApiEvent): EventRecord => ({
  id: event.id,
  title: event.title,
  description: event.eventDescription,
  date: event.date,
  location: event.location,
  location_url: event.locationUrl ?? null,
  max_attendees: event.maxAttendees ?? null,
  meeting_link: event.meetingLink ?? null,
  image_url: event.imageUrl ?? null,
  tags: event.tags ?? [],
  event_type: event.eventType,
  attendee_count: Number(event.attendeeCount ?? 0),
  guest_experts: [],
  price_in_cents: event.priceInCents ?? null,
});

export function mapApiEventDetailToRecord(api: ApiEventDetail): EventDetailRecord {
  return {
    ...mapApiEventToRecord(api),
    attendeeCount: api.attendeeCount,
    attending: api.attending,
    registrationStatus: api.registrationStatus ?? null,
    meetingLink: api.meetingLink,
    trackInfo: api.trackInfo
      ? {
          id: api.trackInfo.id,
          title: api.trackInfo.title,
          trackBookingStart: api.trackInfo.trackBookingStart
            ? new Date(api.trackInfo.trackBookingStart)
            : null,
          trackBookingEnd: api.trackInfo.trackBookingEnd
            ? new Date(api.trackInfo.trackBookingEnd)
            : null,
          singleBookingStart: api.trackInfo.singleBookingStart
            ? new Date(api.trackInfo.singleBookingStart)
            : null,
          singleBookingEnd: api.trackInfo.singleBookingEnd
            ? new Date(api.trackInfo.singleBookingEnd)
            : null,
          booked: api.trackInfo.booked ?? false,
        }
      : null,
  };
}

export type CreateEventPayload = {
  title: string;
  description: string;
  date: string;
  location?: string | null;
  locationUrl?: string | null;
  meetingLink?: string | null;
  maxAttendees?: number | null;
  imageUrl?: string | null;
  tags?: string[];
  eventType?: ApiEvent['eventType'];
  priceInCents?: number | null;
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
    items: (data.items ?? []).map(mapApiEventToRecord),
    pagination: data.pagination,
  };
}

export async function fetchEventById(id: string): Promise<EventDetailRecord> {
  const data = await fetchJson<ApiEventDetail>(`${API_BASE}/events/${id}`, {
    method: 'GET',
  });

  return mapApiEventDetailToRecord(data);
}

export async function createEvent(payload: CreateEventPayload): Promise<EventDetailRecord> {
  const data = await fetchJson<{ event: ApiEventDetail }>(`${API_BASE}/events`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return mapApiEventDetailToRecord(data.event);
}

export async function updateEvent(
  id: string,
  payload: UpdateEventPayload,
): Promise<EventDetailRecord> {
  const data = await fetchJson<{ event: ApiEventDetail }>(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return mapApiEventDetailToRecord(data.event);
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

export type CancelEventRegistrationResponse = {
  success: boolean;
  message?: string;
  status?: 'cancelled' | 'refund_requested';
  wasPaid?: boolean;
};

export async function cancelEventRegistration(
  id: string,
): Promise<CancelEventRegistrationResponse> {
  return fetchJson<CancelEventRegistrationResponse>(`${API_BASE}/events/${id}/register`, {
    method: 'DELETE',
  });
}

// --- Event Attendees ---

type ApiEventAttendee = {
  userId: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  registeredAt: string;
  status: 'active' | 'cancelled' | 'refund_requested';
  invoiceId: string | null;
  invoiceNumber: string | null;
};

export type EventAttendeeRecord = {
  user_id: string;
  email: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  registered_at: string;
  status: 'active' | 'cancelled' | 'refund_requested';
  invoice_id: number | null;
  invoice_number: string | null;
};

export async function fetchEventAttendees(
  eventId: string,
  params: { page?: number; pageSize?: number; search?: string } = {},
): Promise<PaginatedResult<EventAttendeeRecord>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.search?.trim()) query.set('search', params.search.trim());

  const data = await fetchJson<{
    items: ApiEventAttendee[];
    pagination: PaginatedResult<ApiEventAttendee>['pagination'];
  }>(`${API_BASE}/events/${eventId}/attendees${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
  });

  return {
    items: (data.items ?? []).map((item) => ({
      user_id: item.userId,
      email: item.email,
      name: item.name,
      first_name: item.firstName,
      last_name: item.lastName,
      phone_number: item.phoneNumber,
      registered_at: item.registeredAt,
      status: item.status,
      invoice_id: item.invoiceId,
      invoice_number: item.invoiceNumber,
    })),
    pagination: data.pagination,
  };
}

// --- Cancellation Requests (Admin) ---

type ApiCancellationRequest = {
  registrationId: string;
  userId: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  pricePaidCents: number | null;
  refundRequestedAt: string | null;
};

export type CancellationRequest = {
  registration_id: string;
  user_id: string;
  email: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  price_paid_cents: number | null;
  refund_requested_at: string | null;
};

export async function fetchCancellationRequests(
  eventId: string,
  params: { page?: number; pageSize?: number } = {},
): Promise<PaginatedResult<CancellationRequest>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  const data = await fetchJson<{
    items: ApiCancellationRequest[];
    pagination: PaginatedResult<ApiCancellationRequest>['pagination'];
  }>(
    `${API_BASE}/events/${eventId}/cancellation-requests${query.toString() ? `?${query.toString()}` : ''}`,
    { method: 'GET' },
  );

  return {
    items: (data.items ?? []).map((item) => ({
      registration_id: item.registrationId,
      user_id: item.userId,
      email: item.email,
      name: item.name,
      first_name: item.firstName,
      last_name: item.lastName,
      price_paid_cents: item.pricePaidCents,
      refund_requested_at: item.refundRequestedAt,
    })),
    pagination: data.pagination,
  };
}

export async function approveCancellation(
  eventId: string,
  registrationId: string,
): Promise<{ success: boolean; message?: string }> {
  return fetchJson<{ success: boolean; message?: string }>(
    `${API_BASE}/events/${eventId}/cancellation-requests/${registrationId}/approve`,
    { method: 'POST' },
  );
}

export async function rejectCancellation(
  eventId: string,
  registrationId: string,
  reason?: string,
): Promise<{ success: boolean; message?: string }> {
  return fetchJson<{ success: boolean; message?: string }>(
    `${API_BASE}/events/${eventId}/cancellation-requests/${registrationId}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );
}
