import { and, count, desc, eq, gt, ilike, inArray, or, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import {
  eventAttendees,
  events,
  libraryAssets,
  payments,
  profiles,
  series,
  seriesAssets,
  trackBookings,
  trackEvents,
  trackReservations,
  tracks,
  users,
} from '../../db/schema/index.js';
import { activeTrackBookingWhere, hasTrackBookingRow } from '../../utils/booking.js';
import { ApiError, handleRoute } from '../../utils/errors.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { executeTrackBookingWrite } from './trackBookingShared.js';
import { isPaidTrack } from './trackPaidStatus.js';
import { shouldPublishTrackSeries } from './trackSeriesPublishing.js';
import { escapeLikePattern, getOptionalUserRole, requireAdmin, requireManager } from './utils.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().max(200).optional(),
});

const priceInCentsSchema = z
  .union([
    z.coerce.number().int().min(0, 'Price cannot be negative.').max(10000000, 'Price too large.'),
    z.null(),
  ])
  .optional()
  .transform((value) => (value === undefined ? undefined : value));

const locationSchema = z.string().trim().max(255).optional().or(z.literal(''));
const locationUrlSchema = z
  .string()
  .url()
  .max(500)
  .refine((value) => {
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Location URL must start with https://')
  .optional()
  .or(z.literal(''));

const createTrackSchema = z.object({
  title: z.string().trim().min(3, 'Title is required.').max(180),
  description: z.union([z.string().trim().max(4000), z.null()]).optional(),
  imageUrl: z.union([z.string().url().max(500), z.literal(''), z.null()]).optional(),
  isPublished: z.boolean().default(false),
  trackBookingStart: z.coerce.date().nullable().optional(),
  trackBookingEnd: z.coerce.date().nullable().optional(),
  singleBookingStart: z.coerce.date().nullable().optional(),
  singleBookingEnd: z.coerce.date().nullable().optional(),
  allowIndividualBooking: z.boolean().default(false),
  maxTrackBookings: z.number().int().positive().nullable().optional(),
  priceInCents: priceInCentsSchema,
  location: locationSchema,
  locationUrl: locationUrlSchema,
});

const updateTrackSchema = z
  .object({
    title: z.string().trim().min(3, 'Title is required.').max(180).optional(),
    description: z.union([z.string().trim().max(4000), z.null()]).optional(),
    imageUrl: z.union([z.string().url().max(500), z.literal(''), z.null()]).optional(),
    isPublished: z.boolean().optional(), // No default - truly optional for updates
    sortOrder: z.number().int().min(0).optional(),
    trackBookingStart: z.coerce.date().nullable().optional(),
    trackBookingEnd: z.coerce.date().nullable().optional(),
    singleBookingStart: z.coerce.date().nullable().optional(),
    singleBookingEnd: z.coerce.date().nullable().optional(),
    allowIndividualBooking: z.boolean().optional(),
    maxTrackBookings: z.number().int().positive().nullable().optional(),
    priceInCents: priceInCentsSchema,
    location: z.union([z.string().trim().max(255), z.null()]).optional(),
    locationUrl: z
      .union([
        z
          .string()
          .url()
          .max(500)
          .refine((value) => {
            try {
              return new URL(value).protocol === 'https:';
            } catch {
              return false;
            }
          }, 'Location URL must start with https://'),
        z.literal(''),
        z.null(),
      ])
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

type BookingFields = {
  trackBookingStart: Date | null;
  trackBookingEnd: Date | null;
  singleBookingStart: Date | null;
  singleBookingEnd: Date | null;
  allowIndividualBooking: boolean;
  maxTrackBookings: number | null;
  isPublished: boolean;
};

function validateBookingWindows(
  current: Partial<BookingFields>,
  payload: Partial<BookingFields>,
): { valid: boolean; error?: string } {
  const merged: BookingFields = {
    trackBookingStart:
      payload.trackBookingStart !== undefined
        ? payload.trackBookingStart
        : (current.trackBookingStart ?? null),
    trackBookingEnd:
      payload.trackBookingEnd !== undefined
        ? payload.trackBookingEnd
        : (current.trackBookingEnd ?? null),
    singleBookingStart:
      payload.singleBookingStart !== undefined
        ? payload.singleBookingStart
        : (current.singleBookingStart ?? null),
    singleBookingEnd:
      payload.singleBookingEnd !== undefined
        ? payload.singleBookingEnd
        : (current.singleBookingEnd ?? null),
    allowIndividualBooking:
      payload.allowIndividualBooking !== undefined
        ? payload.allowIndividualBooking
        : (current.allowIndividualBooking ?? false),
    maxTrackBookings:
      payload.maxTrackBookings !== undefined
        ? payload.maxTrackBookings
        : (current.maxTrackBookings ?? null),
    isPublished:
      payload.isPublished !== undefined ? payload.isPublished : (current.isPublished ?? false),
  };

  // Track dates must be set together
  const trackDates = [merged.trackBookingStart, merged.trackBookingEnd];
  const trackSetCount = trackDates.filter((f) => f !== null).length;
  if (trackSetCount !== 0 && trackSetCount !== 2) {
    return {
      valid: false,
      error: 'Track booking start and end must be set together, or both left empty.',
    };
  }

  // Individual dates must be set together (only if allowIndividualBooking is true)
  const individualDates = [merged.singleBookingStart, merged.singleBookingEnd];
  const individualSetCount = individualDates.filter((f) => f !== null).length;
  if (merged.allowIndividualBooking) {
    if (individualSetCount !== 0 && individualSetCount !== 2) {
      return {
        valid: false,
        error: 'Individual booking start and end must be set together when enabled.',
      };
    }
  }

  // maxTrackBookings required when track dates are set
  if (trackSetCount > 0 && merged.maxTrackBookings === null) {
    return {
      valid: false,
      error: 'maxTrackBookings is required when track booking period is set.',
    };
  }

  if (merged.isPublished) {
    const hadPeriods =
      current.trackBookingStart !== null && current.trackBookingStart !== undefined;
    if (hadPeriods && trackSetCount === 0) {
      return {
        valid: false,
        error: 'Cannot clear track booking periods while track is published.',
      };
    }
    if (current.maxTrackBookings !== null && merged.maxTrackBookings === null) {
      return { valid: false, error: 'Cannot clear maxTrackBookings while track is published.' };
    }
  }

  // Validate date ordering
  if (trackSetCount === 2 && merged.trackBookingStart !== null && merged.trackBookingEnd !== null) {
    const tStart = new Date(merged.trackBookingStart);
    const tEnd = new Date(merged.trackBookingEnd);
    if (!(tStart < tEnd)) {
      return {
        valid: false,
        error: 'Track booking start must be before track booking end.',
      };
    }

    // If individual booking is enabled and dates are set, validate full ordering
    if (
      merged.allowIndividualBooking &&
      individualSetCount === 2 &&
      merged.singleBookingStart !== null &&
      merged.singleBookingEnd !== null
    ) {
      const sStart = new Date(merged.singleBookingStart);
      const sEnd = new Date(merged.singleBookingEnd);
      if (!(tEnd < sStart && sStart < sEnd)) {
        return {
          valid: false,
          error: 'Periods must be ordered: trackEnd < singleStart < singleEnd.',
        };
      }
    }
  }

  return { valid: true };
}

const addEventsSchema = z.object({
  eventIds: z.array(z.string().uuid()).min(1, 'Provide at least one event.'),
});

const reorderEventsSchema = z.object({
  eventIds: z.array(z.string().uuid()),
});

const uuidSchema = z.string().uuid('Invalid ID format');

function validateUuid(
  value: string,
  paramName = 'id',
): { valid: true; value: string } | { valid: false; error: { code: string; message: string } } {
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    return { valid: false, error: { code: 'INVALID_ID', message: `Invalid ${paramName} format.` } };
  }
  return { valid: true, value: result.data };
}

export function registerTrackRoutes(app: Hono) {
  // Public tracks list (no auth required) - returns only published tracks
  app.get(
    '/tracks/public',
    handleRoute(
      async (c) => {
        const parsed = listQuerySchema.safeParse({
          page: c.req.query('page'),
          pageSize: c.req.query('pageSize'),
        });

        if (!parsed.success) {
          return c.json({ error: { code: 'INVALID_QUERY', message: parsed.error.message } }, 400);
        }

        const { page, pageSize } = parsed.data;
        const offset = (page - 1) * pageSize;

        // Get total count of published tracks
        const [totalResult] = await db
          .select({ value: count(tracks.id) })
          .from(tracks)
          .where(eq(tracks.isPublished, true));

        // Get published tracks with event counts and first event date
        const trackList = await db
          .select({
            id: tracks.id,
            title: tracks.title,
            description: tracks.description,
            imageUrl: tracks.imageUrl,
            trackBookingStart: tracks.trackBookingStart,
            trackBookingEnd: tracks.trackBookingEnd,
            maxTrackBookings: tracks.maxTrackBookings,
            priceInCents: tracks.priceInCents,
            location: tracks.location,
            locationUrl: tracks.locationUrl,
          })
          .from(tracks)
          .where(eq(tracks.isPublished, true))
          .orderBy(tracks.sortOrder, desc(tracks.createdAt))
          .limit(pageSize)
          .offset(offset);

        const trackIds = trackList.map((t) => t.id);

        // Get event counts and first event date for each track
        const eventStats = new Map<string, { count: number; firstDate: Date | null }>();

        if (trackIds.length > 0) {
          const stats = await db
            .select({
              trackId: trackEvents.trackId,
              eventCount: count(trackEvents.eventId),
              firstEventDate: sql<Date>`MIN(${events.date})`,
            })
            .from(trackEvents)
            .innerJoin(events, eq(events.id, trackEvents.eventId))
            .where(inArray(trackEvents.trackId, trackIds))
            .groupBy(trackEvents.trackId);

          for (const s of stats) {
            eventStats.set(s.trackId, {
              count: Number(s.eventCount),
              firstDate: s.firstEventDate,
            });
          }
        }

        // Get booking counts
        const bookingCounts = new Map<string, number>();
        if (trackIds.length > 0) {
          const bookings = await db
            .select({
              trackId: trackBookings.trackId,
              bookingCount: count(trackBookings.id),
            })
            .from(trackBookings)
            .where(activeTrackBookingWhere(inArray(trackBookings.trackId, trackIds)))
            .groupBy(trackBookings.trackId);

          for (const b of bookings) {
            bookingCounts.set(b.trackId, Number(b.bookingCount));
          }
        }

        const items = trackList.map((t) => {
          const stats = eventStats.get(t.id) ?? { count: 0, firstDate: null };
          const currentBookings = bookingCounts.get(t.id) ?? 0;
          return {
            id: t.id,
            title: t.title,
            description: t.description,
            imageUrl: t.imageUrl,
            eventCount: stats.count,
            firstEventDate: stats.firstDate,
            trackBookingStart: t.trackBookingStart,
            trackBookingEnd: t.trackBookingEnd,
            spotsRemaining:
              t.maxTrackBookings !== null ? t.maxTrackBookings - currentBookings : null,
            priceInCents: t.priceInCents,
            location: t.location,
            locationUrl: null, // Only reveal URL to booked users (via detail endpoint)
          };
        });

        // Sort by first event date (upcoming first)
        items.sort((a, b) => {
          if (!a.firstEventDate && !b.firstEventDate) return 0;
          if (!a.firstEventDate) return 1;
          if (!b.firstEventDate) return -1;
          return new Date(a.firstEventDate).getTime() - new Date(b.firstEventDate).getTime();
        });

        return c.json({
          items,
          pagination: { page, pageSize, total: Number(totalResult?.value ?? 0) },
        });
      },
      'TRACKS_PUBLIC_FAILED',
      'Unable to load tracks.',
      'list public tracks',
    ),
  );

  // Public track detail (no auth required for published tracks)
  app.get(
    '/tracks/:id/public',
    handleRoute(
      async (c) => {
        const idValidation = validateUuid(c.req.param('id'), 'track ID');
        if (!idValidation.valid) {
          return c.json({ error: idValidation.error }, 400);
        }
        const id = idValidation.value;
        const session = await getSessionFromRequest(c);

        const [track] = await db
          .select({
            id: tracks.id,
            title: tracks.title,
            description: tracks.description,
            imageUrl: tracks.imageUrl,
            isPublished: tracks.isPublished,
            trackBookingStart: tracks.trackBookingStart,
            trackBookingEnd: tracks.trackBookingEnd,
            singleBookingStart: tracks.singleBookingStart,
            singleBookingEnd: tracks.singleBookingEnd,
            allowIndividualBooking: tracks.allowIndividualBooking,
            maxTrackBookings: tracks.maxTrackBookings,
            priceInCents: tracks.priceInCents,
            location: tracks.location,
            locationUrl: tracks.locationUrl,
          })
          .from(tracks)
          .where(eq(tracks.id, id))
          .limit(1);

        if (!track || !track.isPublished) {
          return c.json({ error: { code: 'TRACK_NOT_FOUND', message: 'Track not found.' } }, 404);
        }

        // Get events in track
        const trackEventsList = await db
          .select({
            eventId: trackEvents.eventId,
            sortOrder: trackEvents.sortOrder,
            event: {
              id: events.id,
              title: events.title,
              description: events.eventDescription,
              date: events.date,
              location: events.location,
              eventType: events.eventType,
              imageUrl: events.imageUrl,
              maxAttendees: events.maxAttendees,
            },
          })
          .from(trackEvents)
          .innerJoin(events, eq(events.id, trackEvents.eventId))
          .where(eq(trackEvents.trackId, id))
          .orderBy(trackEvents.sortOrder);

        // Get attendee counts for each event
        const eventIds = trackEventsList.map((te) => te.eventId);
        const attendeeCountsMap = new Map<string, number>();

        if (eventIds.length > 0) {
          const attendeeCounts = await db
            .select({
              eventId: eventAttendees.eventId,
              attendeeCount: count(),
            })
            .from(eventAttendees)
            .where(
              and(inArray(eventAttendees.eventId, eventIds), eq(eventAttendees.status, 'active')),
            )
            .groupBy(eventAttendees.eventId);

          for (const ac of attendeeCounts) {
            attendeeCountsMap.set(ac.eventId, Number(ac.attendeeCount));
          }
        }

        const trackEventsFormatted = trackEventsList.map((te) => ({
          id: te.event.id,
          title: te.event.title,
          description: te.event.description,
          date: te.event.date,
          location: te.event.location,
          eventType: te.event.eventType,
          imageUrl: te.event.imageUrl,
          maxAttendees: te.event.maxAttendees,
          attendeeCount: attendeeCountsMap.get(te.eventId) ?? 0,
        }));

        // Get booking stats
        const [bookingStats] = await db
          .select({ value: count(trackBookings.id) })
          .from(trackBookings)
          .where(activeTrackBookingWhere(eq(trackBookings.trackId, id)));

        // Check if current user has booked
        let userHasBooked = false;
        let isStaff = false;
        let userHasPendingPayment = false;
        let pendingPaymentId: string | null = null;
        let pendingInvoiceId: string | null = null;
        if (session?.user) {
          const [bookingRows, role, pendingPayment] = await Promise.all([
            db
              .select({ id: trackBookings.id })
              .from(trackBookings)
              .where(
                activeTrackBookingWhere(
                  eq(trackBookings.trackId, id),
                  eq(trackBookings.userId, session.user.id),
                ),
              )
              .limit(1),
            getOptionalUserRole(session.user.id),
            db
              .select({
                id: payments.id,
                invoiceId: payments.fawaterkInvoiceId,
              })
              .from(payments)
              .where(
                and(
                  eq(payments.userId, session.user.id),
                  eq(payments.itemType, 'track'),
                  eq(payments.itemId, id),
                  eq(payments.status, 'pending'),
                ),
              )
              .orderBy(desc(payments.createdAt))
              .limit(1),
          ]);
          userHasBooked = hasTrackBookingRow(bookingRows);
          isStaff = role ? ['owner', 'admin', 'manager'].includes(role) : false;

          const [pending] = pendingPayment;
          if (pending) {
            const now = new Date();
            const [reservation] = await db
              .select({ id: trackReservations.id })
              .from(trackReservations)
              .where(
                and(
                  eq(trackReservations.paymentId, pending.id),
                  eq(trackReservations.trackId, id),
                  eq(trackReservations.userId, session.user.id),
                  gt(trackReservations.expiresAt, now),
                ),
              )
              .limit(1);

            if (reservation) {
              userHasPendingPayment = true;
              pendingPaymentId = pending.id;
              pendingInvoiceId = pending.invoiceId ?? null;
            }
          }
        }

        return c.json({
          track: {
            id: track.id,
            title: track.title,
            description: track.description,
            imageUrl: track.imageUrl,
            trackBookingStart: track.trackBookingStart,
            trackBookingEnd: track.trackBookingEnd,
            singleBookingStart: track.singleBookingStart,
            singleBookingEnd: track.singleBookingEnd,
            maxTrackBookings: track.maxTrackBookings,
            currentBookings: Number(bookingStats?.value ?? 0),
            spotsRemaining:
              track.maxTrackBookings !== null
                ? track.maxTrackBookings - Number(bookingStats?.value ?? 0)
                : null,
            eventCount: trackEventsFormatted.length,
            userHasBooked,
            userHasPendingPayment,
            pendingPaymentId,
            pendingInvoiceId,
            priceInCents: track.priceInCents,
            location: track.location,
            locationUrl: userHasBooked || isStaff ? track.locationUrl : null, // Only reveal URL to booked users or staff
          },
          events: trackEventsFormatted,
        });
      },
      'TRACK_PUBLIC_DETAIL_FAILED',
      'Unable to load track.',
      'get public track',
    ),
  );

  // List tracks (users see published only, admins see all)
  app.get('/tracks', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, 401);
    }

    const parsed = listQuerySchema.safeParse({
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
      search: c.req.query('search'),
    });

    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_QUERY', message: parsed.error.message } }, 400);
    }

    const { page, pageSize, search } = parsed.data;
    const role = session?.user ? await getOptionalUserRole(session.user.id) : null;
    const isStaff = role && ['owner', 'admin', 'manager'].includes(role);

    const filters: any[] = [];
    if (!isStaff) {
      filters.push(eq(tracks.isPublished, true));
    }
    if (search) {
      filters.push(ilike(tracks.title, `%${escapeLikePattern(search)}%`));
    }

    const whereClause = filters.length ? and(...filters) : undefined;

    // Get total count
    const [totalResult] = await db
      .select({ value: count(tracks.id) })
      .from(tracks)
      .where(whereClause);

    const offset = (page - 1) * pageSize;

    // Get tracks with event and asset counts
    const trackList = await db
      .select({
        id: tracks.id,
        title: tracks.title,
        description: tracks.description,
        imageUrl: tracks.imageUrl,
        sortOrder: tracks.sortOrder,
        isPublished: tracks.isPublished,
        createdAt: tracks.createdAt,
        trackBookingStart: tracks.trackBookingStart,
        trackBookingEnd: tracks.trackBookingEnd,
        singleBookingStart: tracks.singleBookingStart,
        singleBookingEnd: tracks.singleBookingEnd,
        allowIndividualBooking: tracks.allowIndividualBooking,
        maxTrackBookings: tracks.maxTrackBookings,
        priceInCents: tracks.priceInCents,
        location: tracks.location,
        locationUrl: tracks.locationUrl,
      })
      .from(tracks)
      .where(whereClause)
      .orderBy(tracks.sortOrder, desc(tracks.createdAt))
      .limit(pageSize)
      .offset(offset);

    // Get event counts for each track
    const trackIds = trackList.map((t) => t.id);
    const countsMap = new Map<string, number>();

    if (trackIds.length > 0) {
      const eventCounts = await db
        .select({
          trackId: trackEvents.trackId,
          eventCount: count(trackEvents.eventId),
        })
        .from(trackEvents)
        .where(inArray(trackEvents.trackId, trackIds))
        .groupBy(trackEvents.trackId);

      for (const ec of eventCounts) {
        countsMap.set(ec.trackId, Number(ec.eventCount));
      }
    }

    const items = trackList.map((t) => ({
      ...t,
      eventCount: countsMap.get(t.id) ?? 0,
    }));

    return c.json({
      items,
      pagination: { page, pageSize, total: Number(totalResult?.value ?? 0) },
    });
  });

  // Get single track with events
  app.get('/tracks/:id', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, 401);
    }

    const idValidation = validateUuid(c.req.param('id'), 'track ID');
    if (!idValidation.valid) {
      return c.json({ error: idValidation.error }, 400);
    }
    const id = idValidation.value;
    const role = await getOptionalUserRole(session.user.id);
    const isStaff = role && ['owner', 'admin', 'manager'].includes(role);

    const [track] = await db
      .select({
        id: tracks.id,
        title: tracks.title,
        description: tracks.description,
        imageUrl: tracks.imageUrl,
        sortOrder: tracks.sortOrder,
        isPublished: tracks.isPublished,
        createdAt: tracks.createdAt,
        updatedAt: tracks.updatedAt,
        trackBookingStart: tracks.trackBookingStart,
        trackBookingEnd: tracks.trackBookingEnd,
        singleBookingStart: tracks.singleBookingStart,
        singleBookingEnd: tracks.singleBookingEnd,
        allowIndividualBooking: tracks.allowIndividualBooking,
        maxTrackBookings: tracks.maxTrackBookings,
        priceInCents: tracks.priceInCents,
        location: tracks.location,
        locationUrl: tracks.locationUrl,
      })
      .from(tracks)
      .where(eq(tracks.id, id))
      .limit(1);

    if (!track) {
      return c.json({ error: { code: 'TRACK_NOT_FOUND', message: 'Track not found.' } }, 404);
    }

    // Non-staff can only see published tracks
    if (!isStaff && !track.isPublished) {
      return c.json({ error: { code: 'TRACK_NOT_FOUND', message: 'Track not found.' } }, 404);
    }

    // Get events in track with their asset counts
    const trackEventsList = await db
      .select({
        eventId: trackEvents.eventId,
        sortOrder: trackEvents.sortOrder,
        event: {
          id: events.id,
          title: events.title,
          eventDescription: events.eventDescription,
          date: events.date,
          location: events.location,
          eventType: events.eventType,
          imageUrl: events.imageUrl,
        },
      })
      .from(trackEvents)
      .innerJoin(events, eq(events.id, trackEvents.eventId))
      .where(eq(trackEvents.trackId, id))
      .orderBy(trackEvents.sortOrder);

    // Get asset counts for each event
    const eventIds = trackEventsList.map((te) => te.eventId);
    const assetCountsMap = new Map<string, number>();

    if (eventIds.length > 0) {
      const assetCounts = await db
        .select({
          eventId: libraryAssets.eventId,
          assetCount: count(libraryAssets.id),
        })
        .from(libraryAssets)
        .where(inArray(libraryAssets.eventId, eventIds))
        .groupBy(libraryAssets.eventId);

      for (const ac of assetCounts) {
        if (ac.eventId) {
          assetCountsMap.set(ac.eventId, Number(ac.assetCount));
        }
      }
    }

    const eventsWithAssets = trackEventsList.map((te) => ({
      id: te.event.id,
      title: te.event.title,
      description: te.event.eventDescription,
      date: te.event.date,
      location: te.event.location,
      eventType: te.event.eventType,
      imageUrl: te.event.imageUrl,
      assetCount: assetCountsMap.get(te.eventId) ?? 0,
    }));

    const [bookingStats] = await db
      .select({ value: count(trackBookings.id) })
      .from(trackBookings)
      .where(activeTrackBookingWhere(eq(trackBookings.trackId, id)));

    let userHasBooked = false;
    if (session?.user) {
      const [booking] = await db
        .select({ id: trackBookings.id })
        .from(trackBookings)
        .where(
          activeTrackBookingWhere(
            eq(trackBookings.trackId, id),
            eq(trackBookings.userId, session.user.id),
          ),
        )
        .limit(1);
      userHasBooked = Boolean(booking);
    }

    return c.json({
      ...track,
      eventCount: eventsWithAssets.length,
      events: eventsWithAssets,
      bookingsCount: Number(bookingStats?.value ?? 0),
      trackBookingSpotsRemaining:
        track.maxTrackBookings !== null
          ? track.maxTrackBookings - Number(bookingStats?.value ?? 0)
          : null,
      userHasBooked,
    });
  });

  // Get track attendees (users who booked this track)
  app.get('/tracks/:id/attendees', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idValidation = validateUuid(c.req.param('id'), 'track ID');
    if (!idValidation.valid) {
      return c.json({ error: idValidation.error }, 400);
    }
    const trackId = idValidation.value;

    const parsed = listQuerySchema.safeParse({
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
      search: c.req.query('search'),
    });

    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_QUERY', message: parsed.error.message } }, 400);
    }

    const { page, pageSize, search } = parsed.data;
    const offset = (page - 1) * pageSize;
    const normalizedSearch = search?.trim();
    const searchPattern = normalizedSearch ? `%${escapeLikePattern(normalizedSearch)}%` : null;

    // Verify track exists
    const [trackExists] = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .limit(1);

    if (!trackExists) {
      return c.json({ error: { code: 'TRACK_NOT_FOUND', message: 'Track not found.' } }, 404);
    }

    const attendeeFilter = activeTrackBookingWhere(
      eq(trackBookings.trackId, trackId),
      searchPattern
        ? or(
            ilike(users.name, searchPattern),
            ilike(users.email, searchPattern),
            ilike(sql`COALESCE(${profiles.phoneNumber}, '')`, searchPattern),
            ilike(sql`COALESCE(${payments.fawaterkInvoiceKey}, '')`, searchPattern),
            ilike(sql`COALESCE(${trackBookings.manualReference}, '')`, searchPattern),
            sql`CAST(${payments.fawaterkInvoiceId} AS TEXT) ILIKE ${searchPattern}`,
          )
        : undefined,
    );

    const normalizedBookingSource = sql<'paid' | 'free' | 'manual'>`CASE
      WHEN ${trackBookings.bookingSource} = 'manual' THEN 'manual'
      WHEN ${payments.id} IS NOT NULL AND COALESCE(${payments.amountCents}, 0) > 0 THEN 'paid'
      WHEN ${payments.id} IS NOT NULL THEN 'free'
      ELSE ${trackBookings.bookingSource}::text
    END`;

    const totalResult = await db
      .select({ value: count(trackBookings.id) })
      .from(trackBookings)
      .leftJoin(users, eq(trackBookings.userId, users.id))
      .leftJoin(profiles, eq(users.id, profiles.id))
      .leftJoin(payments, eq(trackBookings.paymentId, payments.id))
      .where(attendeeFilter);

    const items = await db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        phoneNumber: profiles.phoneNumber,
        bookedAt: trackBookings.bookedAt,
        invoiceId: payments.fawaterkInvoiceId,
        invoiceNumber: payments.fawaterkInvoiceKey,
        source: normalizedBookingSource,
        reference: sql<string | null>`CASE
          WHEN ${trackBookings.bookingSource} = 'manual' THEN ${trackBookings.manualReference}
          WHEN ${payments.id} IS NOT NULL AND COALESCE(${payments.amountCents}, 0) > 0 THEN ${payments.fawaterkInvoiceKey}
          ELSE NULL
        END`,
      })
      .from(trackBookings)
      .leftJoin(users, eq(trackBookings.userId, users.id))
      .leftJoin(profiles, eq(users.id, profiles.id))
      .leftJoin(payments, eq(trackBookings.paymentId, payments.id))
      .where(attendeeFilter)
      .orderBy(desc(trackBookings.bookedAt))
      .limit(pageSize)
      .offset(offset);

    return c.json({
      items,
      pagination: {
        page,
        pageSize,
        total: Number(totalResult?.[0]?.value ?? 0),
      },
    });
  });

  // Create track
  app.post(
    '/tracks',
    handleRoute(
      async (c) => {
        const staff = await requireManager(c);
        if ('response' in staff) return staff.response;

        const body = await c.req.json().catch(() => ({}));
        const parsed = createTrackSchema.safeParse(body);

        if (!parsed.success) {
          throw new ApiError('INVALID_REQUEST', parsed.error.message, 400);
        }

        const payload = parsed.data;

        const windowValidation = validateBookingWindows({}, payload);
        if (!windowValidation.valid) {
          throw new ApiError(
            'INVALID_BOOKING_WINDOWS',
            windowValidation.error ?? 'Invalid booking windows.',
            400,
          );
        }

        if (payload.isPublished) {
          throw new ApiError(
            'EMPTY_TRACK',
            'Cannot publish track without events. Create first, add events, then publish.',
            400,
          );
        }

        // Use transaction to ensure track + auto-created series are atomic
        const created = await db.transaction(async (tx) => {
          const [track] = await tx
            .insert(tracks)
            .values({
              title: payload.title,
              description: payload.description ?? null,
              imageUrl: payload.imageUrl || null,
              isPublished: false,
              trackBookingStart: payload.trackBookingStart ?? null,
              trackBookingEnd: payload.trackBookingEnd ?? null,
              singleBookingStart: payload.singleBookingStart ?? null,
              singleBookingEnd: payload.singleBookingEnd ?? null,
              allowIndividualBooking: payload.allowIndividualBooking ?? false,
              maxTrackBookings: payload.maxTrackBookings ?? null,
              priceInCents: payload.priceInCents ?? null,
              location: payload.location || null,
              locationUrl: payload.locationUrl || null,
            })
            .returning();

          // Auto-create Series for track recordings
          await tx.insert(series).values({
            title: `${payload.title} Recordings`,
            description: `Session recordings and materials from ${payload.title}`,
            trackId: track.id,
            isPublished: false,
          });

          return track;
        });

        return c.json({ track: created }, 201);
      },
      'TRACK_CREATE_FAILED',
      'Unable to create track.',
      'create track',
    ),
  );

  // Update track
  app.put(
    '/tracks/:id',
    handleRoute(
      async (c) => {
        const staff = await requireManager(c);
        if ('response' in staff) return staff.response;

        const idValidation = validateUuid(c.req.param('id'), 'track ID');
        if (!idValidation.valid) {
          throw new ApiError('INVALID_ID', idValidation.error.message, 400);
        }
        const id = idValidation.value;
        const body = await c.req.json().catch(() => ({}));
        const parsed = updateTrackSchema.safeParse(body);

        if (!parsed.success) {
          throw new ApiError('INVALID_REQUEST', parsed.error.message, 400);
        }

        const updates = parsed.data;
        const updatedAt = new Date();
        const updateValues: Record<string, unknown> = { updatedAt };

        if (updates.title !== undefined) updateValues.title = updates.title;
        if (updates.description !== undefined)
          updateValues.description = updates.description ?? null;
        if (updates.imageUrl !== undefined) updateValues.imageUrl = updates.imageUrl || null;
        if (updates.isPublished !== undefined) updateValues.isPublished = updates.isPublished;
        if (updates.sortOrder !== undefined) updateValues.sortOrder = updates.sortOrder;
        if (updates.trackBookingStart !== undefined)
          updateValues.trackBookingStart = updates.trackBookingStart ?? null;
        if (updates.trackBookingEnd !== undefined)
          updateValues.trackBookingEnd = updates.trackBookingEnd ?? null;
        if (updates.singleBookingStart !== undefined)
          updateValues.singleBookingStart = updates.singleBookingStart ?? null;
        if (updates.singleBookingEnd !== undefined)
          updateValues.singleBookingEnd = updates.singleBookingEnd ?? null;
        if (updates.allowIndividualBooking !== undefined)
          updateValues.allowIndividualBooking = updates.allowIndividualBooking;
        if (updates.maxTrackBookings !== undefined)
          updateValues.maxTrackBookings = updates.maxTrackBookings ?? null;
        if (updates.priceInCents !== undefined)
          updateValues.priceInCents = updates.priceInCents ?? null;
        if (updates.location !== undefined) updateValues.location = updates.location || null;
        if (updates.locationUrl !== undefined)
          updateValues.locationUrl = updates.locationUrl || null;

        const [currentTrack] = await db.select().from(tracks).where(eq(tracks.id, id)).limit(1);
        if (!currentTrack) {
          throw new ApiError('TRACK_NOT_FOUND', 'Track not found.', 404);
        }

        const windowValidation = validateBookingWindows(currentTrack, updates);
        if (!windowValidation.valid) {
          throw new ApiError(
            'INVALID_BOOKING_WINDOWS',
            windowValidation.error ?? 'Invalid booking windows.',
            400,
          );
        }

        const mergedIsPublished = updates.isPublished ?? currentTrack.isPublished;
        if (mergedIsPublished && !currentTrack.isPublished) {
          const [{ count: eventCount }] = await db
            .select({ count: count(trackEvents.id) })
            .from(trackEvents)
            .where(eq(trackEvents.trackId, id));
          if (Number(eventCount) === 0) {
            throw new ApiError('EMPTY_TRACK', 'Cannot publish track without events.', 400);
          }
          const mergedHasTrackPeriod =
            (updates.trackBookingStart ?? currentTrack.trackBookingStart) !== null &&
            (updates.trackBookingEnd ?? currentTrack.trackBookingEnd) !== null;
          const mergedMax = updates.maxTrackBookings ?? currentTrack.maxTrackBookings;
          if (!mergedHasTrackPeriod || mergedMax === null) {
            throw new ApiError(
              'PERIODS_REQUIRED',
              'Published tracks must have track booking period and maxTrackBookings configured.',
              400,
            );
          }
        }

        if (updates.maxTrackBookings !== undefined) {
          const [{ count: currentBookings }] = await db
            .select({ count: count(trackBookings.id) })
            .from(trackBookings)
            .where(eq(trackBookings.trackId, id));
          if (
            updates.maxTrackBookings !== null &&
            updates.maxTrackBookings < Number(currentBookings)
          ) {
            throw new ApiError(
              'CAPACITY_BELOW_BOOKINGS',
              `Cannot set maxTrackBookings (${updates.maxTrackBookings}) below current bookings (${currentBookings}).`,
              400,
            );
          }

          const [minCap] = await db
            .select({ min: sql<number>`MIN(${events.maxAttendees})` })
            .from(trackEvents)
            .innerJoin(events, eq(events.id, trackEvents.eventId))
            .where(eq(trackEvents.trackId, id));
          if (
            minCap?.min !== null &&
            updates.maxTrackBookings !== null &&
            updates.maxTrackBookings > minCap.min
          ) {
            throw new ApiError(
              'CAPACITY_EXCEEDS_EVENTS',
              `maxTrackBookings cannot exceed smallest event capacity (${minCap.min}).`,
              400,
            );
          }
        }

        const shouldPublishSeries = shouldPublishTrackSeries({
          previousIsPublished: currentTrack.isPublished,
          nextIsPublished: updates.isPublished,
        });

        const mergedPriceInCents = updates.priceInCents ?? currentTrack.priceInCents;
        const trackIsPaid = shouldPublishSeries ? isPaidTrack(mergedPriceInCents) : false;

        const updated = await db.transaction(async (tx) => {
          const [trackResult] = await tx
            .update(tracks)
            .set(updateValues)
            .where(eq(tracks.id, id))
            .returning();

          if (shouldPublishSeries) {
            const seriesUpdate: Record<string, unknown> = { isPublished: true, updatedAt };
            if (trackIsPaid) {
              seriesUpdate.isPremium = true;
            }

            await tx.update(series).set(seriesUpdate).where(eq(series.trackId, id));

            if (trackIsPaid) {
              const assetIdsInSeries = tx
                .select({ assetId: seriesAssets.assetId })
                .from(seriesAssets)
                .innerJoin(series, eq(series.id, seriesAssets.seriesId))
                .where(eq(series.trackId, id));

              await tx
                .update(libraryAssets)
                .set({ isPremium: true, updatedAt })
                .where(inArray(libraryAssets.id, assetIdsInSeries));
            }
          }

          return trackResult;
        });

        return c.json({ track: updated });
      },
      'TRACK_UPDATE_FAILED',
      'Unable to update track.',
      'update track',
    ),
  );

  // Delete track
  app.delete('/tracks/:id', async (c) => {
    const admin = await requireAdmin(c);
    if ('response' in admin) return admin.response;

    const idValidation = validateUuid(c.req.param('id'), 'track ID');
    if (!idValidation.valid) {
      return c.json({ error: idValidation.error }, 400);
    }
    const id = idValidation.value;
    const deleted = await db.delete(tracks).where(eq(tracks.id, id)).returning({ id: tracks.id });

    if (deleted.length === 0) {
      return c.json({ error: { code: 'TRACK_NOT_FOUND', message: 'Track not found.' } }, 404);
    }

    return c.json({ success: true });
  });

  // Add events to track
  app.post(
    '/tracks/:id/events',
    handleRoute(
      async (c) => {
        const staff = await requireManager(c);
        if ('response' in staff) return staff.response;

        const idValidation = validateUuid(c.req.param('id'), 'track ID');
        if (!idValidation.valid) {
          throw new ApiError('INVALID_ID', idValidation.error.message, 400);
        }
        const trackId = idValidation.value;
        const body = await c.req.json().catch(() => ({}));
        const parsed = addEventsSchema.safeParse(body);

        if (!parsed.success) {
          throw new ApiError('INVALID_REQUEST', parsed.error.message, 400);
        }

        // Verify track exists
        const [track] = await db
          .select({
            id: tracks.id,
            maxTrackBookings: tracks.maxTrackBookings,
            priceInCents: tracks.priceInCents,
          })
          .from(tracks)
          .where(eq(tracks.id, trackId));
        if (!track) {
          throw new ApiError('TRACK_NOT_FOUND', 'Track not found.', 404);
        }

        const trackIsPaid = isPaidTrack(track.priceInCents);

        const [{ count: bookingCount }] = await db
          .select({ count: count(trackBookings.id) })
          .from(trackBookings)
          .where(eq(trackBookings.trackId, trackId));
        if (Number(bookingCount) > 0) {
          throw new ApiError(
            'TRACK_HAS_BOOKINGS',
            `Cannot modify events on track with ${bookingCount} bookings.`,
            400,
          );
        }

        // Get current max sort order
        const [maxSort] = await db
          .select({ maxOrder: sql<number>`COALESCE(MAX(${trackEvents.sortOrder}), -1)` })
          .from(trackEvents)
          .where(eq(trackEvents.trackId, trackId));

        let sortOrder = (maxSort?.maxOrder ?? -1) + 1;

        // Get existing event IDs to avoid duplicates
        const existing = await db
          .select({ eventId: trackEvents.eventId })
          .from(trackEvents)
          .where(eq(trackEvents.trackId, trackId));

        const existingIds = new Set(existing.map((e) => e.eventId));
        const newEventIds = parsed.data.eventIds.filter((id) => !existingIds.has(id));

        if (newEventIds.length === 0) {
          return c.json({ success: true, addedCount: 0 });
        }

        // Verify events exist and check capacities
        const eventCapacities = await db
          .select({ id: events.id, title: events.title, maxAttendees: events.maxAttendees })
          .from(events)
          .where(inArray(events.id, newEventIds));

        for (const event of eventCapacities) {
          if (event.maxAttendees === null) {
            throw new ApiError(
              'CAPACITY_REQUIRED',
              `Event "${event.title}" must have maxAttendees set.`,
              400,
            );
          }
          if (track.maxTrackBookings !== null && event.maxAttendees < track.maxTrackBookings) {
            throw new ApiError(
              'CAPACITY_TOO_LOW',
              `Event "${event.title}" capacity (${event.maxAttendees}) < track maxTrackBookings (${track.maxTrackBookings}).`,
              400,
            );
          }
        }

        const validIds = new Set(eventCapacities.map((e) => e.id));
        const toInsert = newEventIds.filter((id) => validIds.has(id));

        if (toInsert.length > 0) {
          await db.transaction(async (tx) => {
            await tx.insert(trackEvents).values(
              toInsert.map((eventId) => ({
                trackId,
                eventId,
                sortOrder: sortOrder++,
              })),
            );

            // Link event assets to track's Series
            const [trackSeries] = await tx
              .select({ id: series.id })
              .from(series)
              .where(eq(series.trackId, trackId))
              .limit(1);

            if (trackSeries) {
              const eventAssets = await tx
                .select({ id: libraryAssets.id })
                .from(libraryAssets)
                .where(inArray(libraryAssets.eventId, toInsert));

              if (eventAssets.length > 0) {
                const [maxSeriesSort] = await tx
                  .select({ maxOrder: sql<number>`COALESCE(MAX(${seriesAssets.sortOrder}), -1)` })
                  .from(seriesAssets)
                  .where(eq(seriesAssets.seriesId, trackSeries.id));

                let assetSortOrder = (maxSeriesSort?.maxOrder ?? -1) + 1;

                await tx.insert(seriesAssets).values(
                  eventAssets.map((asset) => ({
                    seriesId: trackSeries.id,
                    assetId: asset.id,
                    sortOrder: assetSortOrder++,
                  })),
                );

                if (trackIsPaid) {
                  const updatedAt = new Date();
                  await tx
                    .update(libraryAssets)
                    .set({ isPremium: true, updatedAt })
                    .where(
                      inArray(
                        libraryAssets.id,
                        eventAssets.map((asset) => asset.id),
                      ),
                    );
                }
              }
            }
          });
        }

        return c.json({ success: true, addedCount: toInsert.length });
      },
      'ADD_EVENTS_FAILED',
      'Unable to add events to track.',
      'add track events',
    ),
  );

  // Remove event from track
  app.delete(
    '/tracks/:id/events/:eventId',
    handleRoute(
      async (c) => {
        const staff = await requireManager(c);
        if ('response' in staff) return staff.response;

        const trackIdValidation = validateUuid(c.req.param('id'), 'track ID');
        if (!trackIdValidation.valid) {
          throw new ApiError('INVALID_ID', trackIdValidation.error.message, 400);
        }
        const trackId = trackIdValidation.value;

        const eventIdValidation = validateUuid(c.req.param('eventId'), 'event ID');
        if (!eventIdValidation.valid) {
          throw new ApiError('INVALID_ID', eventIdValidation.error.message, 400);
        }
        const eventId = eventIdValidation.value;

        const [{ count: bookingCount }] = await db
          .select({ count: count(trackBookings.id) })
          .from(trackBookings)
          .where(eq(trackBookings.trackId, trackId));
        if (Number(bookingCount) > 0) {
          throw new ApiError(
            'TRACK_HAS_BOOKINGS',
            `Cannot modify events on track with ${bookingCount} bookings.`,
            400,
          );
        }

        const deleted = await db
          .delete(trackEvents)
          .where(and(eq(trackEvents.trackId, trackId), eq(trackEvents.eventId, eventId)))
          .returning({ id: trackEvents.id });

        if (deleted.length === 0) {
          throw new ApiError('NOT_FOUND', 'Event not found in track.', 404);
        }

        return c.json({ success: true });
      },
      'REMOVE_EVENT_FAILED',
      'Unable to remove event from track.',
      'remove track event',
    ),
  );

  // Reorder events in track
  app.put('/tracks/:id/events/reorder', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idValidation = validateUuid(c.req.param('id'), 'track ID');
    if (!idValidation.valid) {
      return c.json({ error: idValidation.error }, 400);
    }
    const trackId = idValidation.value;
    const body = await c.req.json().catch(() => ({}));
    const parsed = reorderEventsSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
    }

    const { eventIds } = parsed.data;

    const [trackExists] = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .limit(1);
    if (!trackExists) {
      return c.json({ error: { code: 'TRACK_NOT_FOUND', message: 'Track not found.' } }, 404);
    }

    const existingEvents = await db
      .select({ eventId: trackEvents.eventId })
      .from(trackEvents)
      .where(eq(trackEvents.trackId, trackId));

    const existingIds = existingEvents.map((event) => event.eventId);
    const existingIdSet = new Set(existingIds);
    const uniqueEventIds = new Set(eventIds);

    if (uniqueEventIds.size !== eventIds.length) {
      return c.json(
        { error: { code: 'INVALID_REQUEST', message: 'Event IDs must be unique.' } },
        400,
      );
    }

    const missingIds = existingIds.filter((id) => !uniqueEventIds.has(id));
    const extraIds = eventIds.filter((id) => !existingIdSet.has(id));

    if (missingIds.length > 0 || extraIds.length > 0) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Event IDs must include all events in this track.',
          },
        },
        400,
      );
    }

    // Update sort order for all events in parallel within a transaction
    await db.transaction(async (tx) => {
      await Promise.all(
        eventIds.map((eventId, i) =>
          tx
            .update(trackEvents)
            .set({ sortOrder: i })
            .where(and(eq(trackEvents.trackId, trackId), eq(trackEvents.eventId, eventId))),
        ),
      );
    });

    return c.json({ success: true });
  });

  // Track Booking
  app.post(
    '/tracks/:id/book',
    handleRoute(
      async (c) => {
        const session = await getSessionFromRequest(c);
        if (!session?.user) {
          throw new ApiError('UNAUTHORIZED', 'Authentication required.', 401);
        }

        const idValidation = validateUuid(c.req.param('id'), 'track ID');
        if (!idValidation.valid) {
          throw new ApiError('INVALID_ID', idValidation.error.message, 400);
        }
        const trackId = idValidation.value;
        const userId = session.user.id;

        const result = await db.transaction(async (tx) => {
          const [track] = await tx
            .select({
              id: tracks.id,
              title: tracks.title,
              trackBookingStart: tracks.trackBookingStart,
              trackBookingEnd: tracks.trackBookingEnd,
              maxTrackBookings: tracks.maxTrackBookings,
              isPublished: tracks.isPublished,
              priceInCents: tracks.priceInCents,
            })
            .from(tracks)
            .where(eq(tracks.id, trackId))
            .for('update')
            .limit(1);

          if (!track || !track.isPublished) {
            throw new ApiError('TRACK_NOT_FOUND', 'Track not found.', 404);
          }

          if (track.priceInCents && track.priceInCents > 0) {
            throw new ApiError(
              'PAYMENT_REQUIRED',
              'This track requires payment. Use the checkout flow.',
              402,
            );
          }

          if (track.trackBookingStart === null || track.trackBookingEnd === null) {
            throw new ApiError('BOOKING_NOT_CONFIGURED', 'Track booking not configured.', 400);
          }

          const now = new Date();
          if (now < new Date(track.trackBookingStart)) {
            throw new ApiError('BOOKING_NOT_OPEN', 'Track booking not yet open.', 400, {
              opensAt: track.trackBookingStart,
            });
          }
          if (now > new Date(track.trackBookingEnd)) {
            throw new ApiError('BOOKING_PERIOD_CLOSED', 'Track booking period closed.', 400);
          }

          const [existingBooking] = await tx
            .select({ id: trackBookings.id })
            .from(trackBookings)
            .where(
              activeTrackBookingWhere(
                eq(trackBookings.trackId, trackId),
                eq(trackBookings.userId, userId),
              ),
            )
            .limit(1);

          if (existingBooking) {
            return { success: true, message: 'Already booked.', alreadyBooked: true };
          }

          const bookingResult = await executeTrackBookingWrite(tx, {
            trackId,
            userId,
            bookingSource: 'free',
            maxTrackBookings: track.maxTrackBookings,
            bookedAt: now,
            referenceTime: now,
            paidAt: null,
            pricePaidCents: null,
            paymentId: null,
          });

          if (bookingResult.type === 'already_booked') {
            return { success: true, message: 'Already booked.', alreadyBooked: true };
          }

          return {
            success: true,
            message: `Booked "${track.title}" and registered for ${bookingResult.grantedCount} events.`,
            eventsRegistered: bookingResult.grantedCount,
            alreadyRegisteredEvents: bookingResult.existingCount,
          };
        });

        return c.json(result);
      },
      'TRACK_BOOKING_FAILED',
      'Unable to book track.',
      'track booking',
    ),
  );
}
