import { API_BASE, fetchJson } from './client';
import type { PaginatedResult } from './types';

// API response types (camelCase from server)
export interface ApiTrack {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string;
  eventCount: number;
  // Booking fields
  trackBookingStart?: string | null;
  trackBookingEnd?: string | null;
  singleBookingStart?: string | null;
  singleBookingEnd?: string | null;
  allowIndividualBooking?: boolean;
  maxTrackBookings?: number | null;
  bookingsCount?: number;
  trackBookingSpotsRemaining?: number | null;
  userHasBooked?: boolean;
  priceInCents?: number | null;
  // Location fields
  location?: string | null;
  locationUrl?: string | null;
}

type ApiTrackEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  eventType: string;
  imageUrl: string | null;
  assetCount: number;
};

type ApiTrackDetail = ApiTrack & {
  events: ApiTrackEvent[];
};

// Frontend types (snake_case for consistency)
export interface TrackRecord {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_published: boolean;
  event_count: number;
  created_at: Date;
  // Booking fields
  track_booking_start: Date | null;
  track_booking_end: Date | null;
  single_booking_start: Date | null;
  single_booking_end: Date | null;
  allow_individual_booking: boolean;
  max_track_bookings: number | null;
  bookings_count: number;
  track_booking_spots_remaining: number | null;
  user_has_booked: boolean;
  price_in_cents: number | null;
  // Location fields
  location: string | null;
  location_url: string | null;
}

export interface TrackBookingSuccess {
  success: boolean;
  message: string;
  eventsRegistered: number;
  alreadyRegisteredEvents: number;
  alreadyBooked?: boolean;
}

export type TrackEventRecord = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  event_type: string;
  image_url: string | null;
  asset_count: number;
};

export type TrackDetailRecord = TrackRecord & {
  updated_at: string;
  events: TrackEventRecord[];
};

// Mappers
const mapTrack = (api: ApiTrack): TrackRecord => ({
  id: api.id,
  title: api.title,
  description: api.description,
  image_url: api.imageUrl,
  sort_order: api.sortOrder,
  is_published: api.isPublished,
  event_count: api.eventCount ?? 0,
  created_at: new Date(api.createdAt),
  track_booking_start: api.trackBookingStart ? new Date(api.trackBookingStart) : null,
  track_booking_end: api.trackBookingEnd ? new Date(api.trackBookingEnd) : null,
  single_booking_start: api.singleBookingStart ? new Date(api.singleBookingStart) : null,
  single_booking_end: api.singleBookingEnd ? new Date(api.singleBookingEnd) : null,
  allow_individual_booking: api.allowIndividualBooking ?? false,
  max_track_bookings: api.maxTrackBookings ?? null,
  bookings_count: api.bookingsCount ?? 0,
  track_booking_spots_remaining: api.trackBookingSpotsRemaining ?? null,
  user_has_booked: api.userHasBooked ?? false,
  price_in_cents: api.priceInCents ?? null,
  location: api.location ?? null,
  location_url: api.locationUrl ?? null,
});

const mapTrackEvent = (event: ApiTrackEvent): TrackEventRecord => ({
  id: event.id,
  title: event.title,
  description: event.description,
  date: event.date,
  location: event.location,
  event_type: event.eventType,
  image_url: event.imageUrl,
  asset_count: event.assetCount,
});

const mapTrackDetail = (track: ApiTrackDetail): TrackDetailRecord => ({
  ...mapTrack(track),
  updated_at: track.updatedAt ?? track.createdAt,
  events: (track.events ?? []).map(mapTrackEvent),
});

// Params and payloads
export type FetchTracksParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type CreateTrackPayload = {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  isPublished?: boolean;
  trackBookingStart?: string | null;
  trackBookingEnd?: string | null;
  singleBookingStart?: string | null;
  singleBookingEnd?: string | null;
  allowIndividualBooking?: boolean;
  maxTrackBookings?: number | null;
  priceInCents?: number | null;
  location?: string | null;
  locationUrl?: string | null;
};

export type UpdateTrackPayload = Partial<CreateTrackPayload> & {
  sortOrder?: number;
};

// API functions
export async function fetchTracks(
  params: FetchTracksParams = {},
): Promise<PaginatedResult<TrackRecord>> {
  const query = new URLSearchParams();

  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(Math.min(params.pageSize, 50)));
  if (params.search) query.set('search', params.search);

  const data = await fetchJson<{
    items: ApiTrack[];
    pagination: PaginatedResult<ApiTrack>['pagination'];
  }>(`${API_BASE}/tracks${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
  });

  return {
    items: (data.items ?? []).map(mapTrack),
    pagination: data.pagination,
  };
}

export async function fetchTrackById(id: string): Promise<TrackDetailRecord> {
  const data = await fetchJson<ApiTrackDetail>(`${API_BASE}/tracks/${id}`, {
    method: 'GET',
  });
  return mapTrackDetail(data);
}

export async function createTrack(payload: CreateTrackPayload): Promise<TrackRecord> {
  const data = await fetchJson<{ track: ApiTrack }>(`${API_BASE}/tracks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapTrack(data.track);
}

export async function updateTrack(id: string, payload: UpdateTrackPayload): Promise<TrackRecord> {
  const data = await fetchJson<{ track: ApiTrack }>(`${API_BASE}/tracks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return mapTrack(data.track);
}

export async function deleteTrack(id: string): Promise<void> {
  await fetchJson<{ success: boolean }>(`${API_BASE}/tracks/${id}`, {
    method: 'DELETE',
  });
}

export async function addEventsToTrack(
  trackId: string,
  eventIds: string[],
): Promise<{ addedCount: number }> {
  const data = await fetchJson<{ success: boolean; addedCount: number }>(
    `${API_BASE}/tracks/${trackId}/events`,
    {
      method: 'POST',
      body: JSON.stringify({ eventIds }),
    },
  );
  return { addedCount: data.addedCount };
}

export async function removeEventFromTrack(trackId: string, eventId: string): Promise<void> {
  await fetchJson<{ success: boolean }>(`${API_BASE}/tracks/${trackId}/events/${eventId}`, {
    method: 'DELETE',
  });
}

export async function reorderTrackEvents(trackId: string, eventIds: string[]): Promise<void> {
  await fetchJson<{ success: boolean }>(`${API_BASE}/tracks/${trackId}/events/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ eventIds }),
  });
}

export async function bookTrack(trackId: string): Promise<TrackBookingSuccess> {
  return fetchJson<TrackBookingSuccess>(`${API_BASE}/tracks/${trackId}/book`, {
    method: 'POST',
  });
}

// Track attendees types
export type TrackEnrollmentSource = 'paid' | 'free' | 'manual';

export interface TrackAttendee {
  userId: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  bookedAt: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  source: TrackEnrollmentSource;
  reference: string | null;
}

// Fetch track attendees (manager+ only)
export async function fetchTrackAttendees(
  trackId: string,
  params: { page?: number; pageSize?: number; search?: string } = {},
): Promise<PaginatedResult<TrackAttendee>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(Math.min(params.pageSize, 50)));
  if (params.search?.trim()) query.set('search', params.search.trim());

  return fetchJson<PaginatedResult<TrackAttendee>>(
    `${API_BASE}/tracks/${trackId}/attendees${query.toString() ? `?${query.toString()}` : ''}`,
    { method: 'GET' },
  );
}

export async function createManualTrackEnrollment(
  trackId: string,
  payload: {
    userId: string;
    reason: string;
    reference: string;
    amountPaidCents?: number | null;
  },
): Promise<{
  success: boolean;
  bookingId: string;
  trackTitle: string;
  eventsRegistered: number;
  alreadyRegisteredEvents: number;
}> {
  return fetchJson<{
    success: boolean;
    bookingId: string;
    trackTitle: string;
    eventsRegistered: number;
    alreadyRegisteredEvents: number;
  }>(`${API_BASE}/tracks/${trackId}/manual-enrollments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function revokeTrackEnrollment(
  trackId: string,
  userId: string,
  reason: string,
): Promise<{
  success: boolean;
  revokedBookingId: string;
  revokedEventCount: number;
}> {
  return fetchJson<{
    success: boolean;
    revokedBookingId: string;
    revokedEventCount: number;
  }>(`${API_BASE}/tracks/${trackId}/enrollments/${userId}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// Public track types (for non-authenticated users)
export interface PublicTrackRecord {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  event_count: number;
  first_event_date: Date | null;
  track_booking_start: Date | null;
  track_booking_end: Date | null;
  spots_remaining: number | null;
  price_in_cents: number | null;
  location: string | null;
  location_url: string | null;
}

export interface PublicTrackDetailRecord {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  track_booking_start: Date | null;
  track_booking_end: Date | null;
  single_booking_start: Date | null;
  single_booking_end: Date | null;
  max_track_bookings: number | null;
  current_bookings: number;
  spots_remaining: number | null;
  event_count: number;
  user_has_booked: boolean;
  user_has_pending_payment: boolean;
  pending_payment_id?: string | null;
  pending_invoice_id?: number | null;
  price_in_cents: number | null;
  location: string | null;
  location_url: string | null;
}

export interface PublicTrackEventRecord {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  event_type: string;
  image_url: string | null;
  max_attendees: number | null;
  attendee_count: number;
}

// Fetch published tracks (public - no auth required)
export async function fetchPublicTracks(
  params: { page?: number; pageSize?: number } = {},
): Promise<PaginatedResult<PublicTrackRecord>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(Math.min(params.pageSize, 50)));

  type ApiPublicTrack = {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    eventCount: number;
    firstEventDate: string | null;
    trackBookingStart: string | null;
    trackBookingEnd: string | null;
    spotsRemaining: number | null;
    priceInCents: number | null;
    location: string | null;
    locationUrl: string | null;
  };

  const data = await fetchJson<{
    items: ApiPublicTrack[];
    pagination: { page: number; pageSize: number; total: number };
  }>(`${API_BASE}/tracks/public${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    credentials: 'omit', // No auth needed for public endpoint
  });

  return {
    items: data.items.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      image_url: t.imageUrl,
      event_count: t.eventCount,
      first_event_date: t.firstEventDate ? new Date(t.firstEventDate) : null,
      track_booking_start: t.trackBookingStart ? new Date(t.trackBookingStart) : null,
      track_booking_end: t.trackBookingEnd ? new Date(t.trackBookingEnd) : null,
      spots_remaining: t.spotsRemaining,
      price_in_cents: t.priceInCents ?? null,
      location: t.location ?? null,
      location_url: t.locationUrl ?? null,
    })),
    pagination: data.pagination,
  };
}

// Fetch public track detail (no auth required for published tracks)
export async function fetchPublicTrackById(
  id: string,
): Promise<{ track: PublicTrackDetailRecord; events: PublicTrackEventRecord[] }> {
  type ApiPublicTrackDetail = {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    trackBookingStart: string | null;
    trackBookingEnd: string | null;
    singleBookingStart: string | null;
    singleBookingEnd: string | null;
    maxTrackBookings: number | null;
    currentBookings: number;
    spotsRemaining: number | null;
    eventCount: number;
    userHasBooked: boolean;
    userHasPendingPayment: boolean;
    pendingPaymentId?: string | null;
    pendingInvoiceId?: number | null;
    priceInCents: number | null;
    location: string | null;
    locationUrl: string | null;
  };

  type ApiPublicTrackEvent = {
    id: string;
    title: string;
    description: string | null;
    date: string;
    location: string | null;
    eventType: string;
    imageUrl: string | null;
    maxAttendees: number | null;
    attendeeCount: number;
  };

  const data = await fetchJson<{
    track: ApiPublicTrackDetail;
    events: ApiPublicTrackEvent[];
  }>(`${API_BASE}/tracks/${id}/public`, {
    method: 'GET',
  });

  return {
    track: {
      id: data.track.id,
      title: data.track.title,
      description: data.track.description,
      image_url: data.track.imageUrl,
      track_booking_start: data.track.trackBookingStart
        ? new Date(data.track.trackBookingStart)
        : null,
      track_booking_end: data.track.trackBookingEnd ? new Date(data.track.trackBookingEnd) : null,
      single_booking_start: data.track.singleBookingStart
        ? new Date(data.track.singleBookingStart)
        : null,
      single_booking_end: data.track.singleBookingEnd
        ? new Date(data.track.singleBookingEnd)
        : null,
      max_track_bookings: data.track.maxTrackBookings,
      current_bookings: data.track.currentBookings,
      spots_remaining: data.track.spotsRemaining,
      event_count: data.track.eventCount,
      user_has_booked: data.track.userHasBooked,
      user_has_pending_payment: data.track.userHasPendingPayment,
      pending_payment_id: data.track.pendingPaymentId ?? null,
      pending_invoice_id: data.track.pendingInvoiceId ?? null,
      price_in_cents: data.track.priceInCents,
      location: data.track.location,
      location_url: data.track.locationUrl,
    },
    events: data.events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      event_type: event.eventType,
      image_url: event.imageUrl,
      max_attendees: event.maxAttendees,
      attendee_count: event.attendeeCount,
    })),
  };
}
