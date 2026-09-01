import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  eventAttendees,
  events,
  trackBookings,
  trackEvents,
  tracks,
  users,
} from '../db/schema/index.js';
import { activeTrackBookingWhere } from '../utils/booking.js';
import { ApiError } from '../utils/errors.js';
import { isEventHiddenFromNonStaff } from '../routes/api/eventVisibility.js';
import { getOptionalUserRole } from '../routes/api/utils.js';
import type { AppLocale } from '../utils/locale.js';
import { resolveLocalizedText } from '../utils/localize.js';
import type { EventCalendarSource } from './eventCalendar.js';

type EventCalendarRow = {
  id: string;
  title: string;
  titleEn: string | null;
  titleAr: string | null;
  eventDescription: string | null;
  eventDescriptionEn: string | null;
  eventDescriptionAr: string | null;
  date: Date;
  location: string | null;
  locationEn: string | null;
  locationAr: string | null;
  locationUrl: string | null;
  eventFormat: 'online' | 'offline';
  meetingLink: string | null;
};

function toEventCalendarSource(row: EventCalendarRow, locale: AppLocale): EventCalendarSource {
  return {
    id: row.id,
    title: resolveLocalizedText(row.titleEn ?? row.title, row.titleAr ?? row.title, locale),
    eventDescription: resolveLocalizedText(
      row.eventDescriptionEn ?? row.eventDescription,
      row.eventDescriptionAr ?? row.eventDescription,
      locale,
    ),
    date: row.date,
    location: resolveLocalizedText(row.locationEn ?? row.location, row.locationAr ?? row.location, locale),
    locationUrl: row.locationUrl,
    eventFormat: row.eventFormat,
    meetingLink: row.meetingLink,
  };
}

export async function loadEventCalendarSource(
  eventId: string,
  locale: AppLocale = 'en',
): Promise<EventCalendarSource | null> {
  const [row] = await db
    .select({
      id: events.id,
      title: events.title,
      titleEn: events.titleEn,
      titleAr: events.titleAr,
      eventDescription: events.eventDescription,
      eventDescriptionEn: events.eventDescriptionEn,
      eventDescriptionAr: events.eventDescriptionAr,
      date: events.date,
      location: events.location,
      locationEn: events.locationEn,
      locationAr: events.locationAr,
      locationUrl: events.locationUrl,
      eventFormat: events.eventFormat,
      meetingLink: events.meetingLink,
      isPublished: events.isPublished,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!row) return null;

  return toEventCalendarSource(row, locale);
}

export async function assertEventCalendarAccess(userId: string, eventId: string): Promise<void> {
  const role = await getOptionalUserRole(userId);
  const isStaff = Boolean(role && ['owner', 'admin', 'manager'].includes(role));

  const [eventRow] = await db
    .select({
      id: events.id,
      isPublished: events.isPublished,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!eventRow) {
    throw new ApiError('NOT_FOUND', 'Event not found.', 404);
  }

  const [trackLink] = await db
    .select({ isPublished: tracks.isPublished })
    .from(trackEvents)
    .innerJoin(tracks, eq(tracks.id, trackEvents.trackId))
    .where(eq(trackEvents.eventId, eventId))
    .limit(1);

  if (
    isEventHiddenFromNonStaff({
      isPublished: eventRow.isPublished,
      linkedTrackIsPublished: trackLink ? trackLink.isPublished : null,
      isStaff,
    })
  ) {
    throw new ApiError('NOT_FOUND', 'Event not found.', 404);
  }

  if (isStaff) return;

  const [registration] = await db
    .select({ id: eventAttendees.id })
    .from(eventAttendees)
    .where(
      and(
        eq(eventAttendees.eventId, eventId),
        eq(eventAttendees.userId, userId),
        inArray(eventAttendees.status, ['active', 'refund_requested']),
      ),
    )
    .limit(1);

  if (!registration) {
    throw new ApiError('FORBIDDEN', 'Calendar is available after registration.', 403);
  }
}

export async function assertTrackCalendarAccess(userId: string, trackId: string): Promise<void> {
  const role = await getOptionalUserRole(userId);
  const isStaff = Boolean(role && ['owner', 'admin', 'manager'].includes(role));

  const [track] = await db
    .select({ id: tracks.id, isPublished: tracks.isPublished })
    .from(tracks)
    .where(eq(tracks.id, trackId))
    .limit(1);

  if (!track || (!track.isPublished && !isStaff)) {
    throw new ApiError('NOT_FOUND', 'Track not found.', 404);
  }

  if (isStaff) return;

  const [booking] = await db
    .select({ id: trackBookings.id })
    .from(trackBookings)
    .where(
      activeTrackBookingWhere(
        eq(trackBookings.trackId, trackId),
        eq(trackBookings.userId, userId),
      ),
    )
    .limit(1);

  if (!booking) {
    throw new ApiError('FORBIDDEN', 'Calendar is available after track booking.', 403);
  }
}

export async function loadTrackCalendarEvents(
  trackId: string,
  locale: AppLocale = 'en',
): Promise<EventCalendarSource[]> {
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      titleEn: events.titleEn,
      titleAr: events.titleAr,
      eventDescription: events.eventDescription,
      eventDescriptionEn: events.eventDescriptionEn,
      eventDescriptionAr: events.eventDescriptionAr,
      date: events.date,
      location: events.location,
      locationEn: events.locationEn,
      locationAr: events.locationAr,
      locationUrl: events.locationUrl,
      eventFormat: events.eventFormat,
      meetingLink: events.meetingLink,
    })
    .from(trackEvents)
    .innerJoin(events, eq(events.id, trackEvents.eventId))
    .where(and(eq(trackEvents.trackId, trackId), eq(events.isPublished, true)))
    .orderBy(trackEvents.sortOrder);

  return rows.map((row) => toEventCalendarSource(row, locale));
}

export async function loadUserEmail(userId: string): Promise<string | null> {
  const [row] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.email ?? null;
}

export async function loadTrackTitle(trackId: string, locale: AppLocale = 'en'): Promise<string | null> {
  const [row] = await db
    .select({ title: tracks.title, titleEn: tracks.titleEn, titleAr: tracks.titleAr })
    .from(tracks)
    .where(eq(tracks.id, trackId))
    .limit(1);
  if (!row) return null;
  return resolveLocalizedText(row.titleEn ?? row.title, row.titleAr ?? row.title, locale);
}
