import { and, asc, count, desc, eq, gt, ilike, inArray, isNotNull, or, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import {
  eventAttendees,
  eventReservations,
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
import { buildTrackAttendeesQuery } from '../../utils/attendeesQuery.js';
import { activeTrackBookingWhere, hasTrackBookingRow } from '../../utils/booking.js';
import {
  bilingualDescriptionFields,
  bilingualDescriptionFromLegacy,
  bilingualTitleFields,
  bilingualTitleFromLegacy,
} from '../../utils/bilingualDb.js';
import {
  optionalBilingualDescriptionFields,
  requiredBilingualTitleFields,
} from '../../utils/bilingualSchemas.js';
import { queueTrackRegistrationConfirmation } from '../../services/registrationConfirmationEmail.js';
import {
  presentAdminContent,
  presentPublicContent,
  presentPublicRow,
} from '../../utils/contentPresentation.js';
import { presentAdminEvent, presentPublicEvent } from '../../utils/eventPresentation.js';
import { ApiError, handleRoute } from '../../utils/errors.js';
import { resolveLocaleFromRequest } from '../../utils/locale.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { extractJsonPayload } from './jsonPayload.js';
import {
  bookingGrantsLiveAttendance,
  hasTicketTypes,
  TICKET_TYPES,
  type TicketType,
  ticketEventCoverageError,
} from './ticketAccess.js';
import { executeTrackBookingWrite } from './trackBookingShared.js';
import {
  classifyTrackEventBackfill,
  evaluateTrackEventAdditionCapacity,
  planTrackEventReservationHolds,
} from './trackEventAddition.js';
import { evaluateTrackEventRemoval } from './trackEventRemoval.js';
import { isPaidTrack, isPaidTrackOffering } from './trackPaidStatus.js';
import { shouldPublishTrackSeries } from './trackSeriesPublishing.js';
import { loadRecordingsSeriesForTrack } from '../../services/trackRecordingsSeries.js';
import {
  DATABASE_ERROR_CODES,
  escapeLikePattern,
  extractDatabaseErrorCode,
  getOptionalUserRole,
  requireAdmin,
  requireManager,
} from './utils.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().max(200).optional(),
});

const priceInCentsSchema = z
  // z.null() MUST be first: z.coerce.number() coerces null -> Number(null) === 0, which would turn a
  // disabled ticket (null) into an enabled, free one (0). Null input must stay null.
  .union([
    z.null(),
    z.coerce.number().int().min(0, 'Price cannot be negative.').max(10000000, 'Price too large.'),
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

const createTrackSchema = z
  .object({
    title: z.string().trim().min(3, 'Title is required.').max(180).optional(),
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
    onlineOnlyPriceCents: priceInCentsSchema,
    onlineOfflinePriceCents: priceInCentsSchema,
    offlineOnlyPriceCents: priceInCentsSchema,
    location: locationSchema,
    locationUrl: locationUrlSchema,
  })
  .merge(requiredBilingualTitleFields.partial())
  .merge(optionalBilingualDescriptionFields)
  .refine((data) => (data.titleEn && data.titleAr) || data.title, {
    message: 'Provide title or titleEn/titleAr.',
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
    onlineOnlyPriceCents: priceInCentsSchema,
    onlineOfflinePriceCents: priceInCentsSchema,
    offlineOnlyPriceCents: priceInCentsSchema,
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
  .merge(requiredBilingualTitleFields.partial())
  .merge(optionalBilingualDescriptionFields)
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

const TRACK_EVENT_ADDITION_MAX_ATTEMPTS = 3;

async function withTrackEventAdditionRetry<T>(
  operation: () => Promise<T>,
  attempt = 1,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (extractDatabaseErrorCode(error) !== DATABASE_ERROR_CODES.LOCK_NOT_AVAILABLE) throw error;
    if (attempt >= TRACK_EVENT_ADDITION_MAX_ATTEMPTS) {
      throw new ApiError(
        'TRACK_BUSY',
        'The track is processing payments right now. Try again in a moment.',
        409,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 25));
    return withTrackEventAdditionRetry(operation, attempt + 1);
  }
}

const reorderEventsSchema = z.object({
  eventIds: z.array(z.string().uuid()),
});

const uuidSchema = z.string().uuid('Invalid ID format');

function serializeTrackLocationUrl(params: {
  locationUrl: string | null;
  isStaff: boolean;
  userHasBooked: boolean;
  bookingTicketType: TicketType | null;
}): string | null {
  if (params.isStaff) {
    return params.locationUrl;
  }
  if (params.userHasBooked && bookingGrantsLiveAttendance(params.bookingTicketType, 'offline')) {
    return params.locationUrl;
  }
  return null;
}

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
        const locale = resolveLocaleFromRequest(c);
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
            titleEn: tracks.titleEn,
            titleAr: tracks.titleAr,
            descriptionEn: tracks.descriptionEn,
            descriptionAr: tracks.descriptionAr,
            imageUrl: tracks.imageUrl,
            trackBookingStart: tracks.trackBookingStart,
            trackBookingEnd: tracks.trackBookingEnd,
            maxTrackBookings: tracks.maxTrackBookings,
            priceInCents: tracks.priceInCents,
            locationEn: tracks.locationEn,
            locationAr: tracks.locationAr,
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
          const presented = presentPublicContent(t, locale);
          return {
            id: presented.id,
            title: presented.title,
            description: presented.description,
            imageUrl: t.imageUrl,
            eventCount: stats.count,
            firstEventDate: stats.firstDate,
            trackBookingStart: t.trackBookingStart,
            trackBookingEnd: t.trackBookingEnd,
            spotsRemaining:
              t.maxTrackBookings !== null ? t.maxTrackBookings - currentBookings : null,
            priceInCents: t.priceInCents,
            location: presented.location,
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
        const idValidation = validateUuid(c.req.param('id')!, 'track ID');
        if (!idValidation.valid) {
          return c.json({ error: idValidation.error }, 400);
        }
        const id = idValidation.value;
        const locale = resolveLocaleFromRequest(c);
        const session = await getSessionFromRequest(c);

        const [track] = await db
          .select({
            id: tracks.id,
            titleEn: tracks.titleEn,
            titleAr: tracks.titleAr,
            descriptionEn: tracks.descriptionEn,
            descriptionAr: tracks.descriptionAr,
            imageUrl: tracks.imageUrl,
            isPublished: tracks.isPublished,
            trackBookingStart: tracks.trackBookingStart,
            trackBookingEnd: tracks.trackBookingEnd,
            singleBookingStart: tracks.singleBookingStart,
            singleBookingEnd: tracks.singleBookingEnd,
            allowIndividualBooking: tracks.allowIndividualBooking,
            maxTrackBookings: tracks.maxTrackBookings,
            priceInCents: tracks.priceInCents,
            onlineOnlyPriceCents: tracks.onlineOnlyPriceCents,
            onlineOfflinePriceCents: tracks.onlineOfflinePriceCents,
            offlineOnlyPriceCents: tracks.offlineOnlyPriceCents,
            locationEn: tracks.locationEn,
            locationAr: tracks.locationAr,
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
              titleEn: events.titleEn,
              titleAr: events.titleAr,
              eventDescriptionEn: events.eventDescriptionEn,
              eventDescriptionAr: events.eventDescriptionAr,
              date: events.date,
              locationEn: events.locationEn,
              locationAr: events.locationAr,
              eventType: events.eventType,
              eventFormat: events.eventFormat,
              imageUrl: events.imageUrl,
              maxAttendees: events.maxAttendees,
              isPublished: events.isPublished,
            },
          })
          .from(trackEvents)
          .innerJoin(events, eq(events.id, trackEvents.eventId))
          .where(and(eq(trackEvents.trackId, id), eq(events.isPublished, true)))
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

        let userHasBooked = false;
        let isStaff = false;
        let userHasPendingPayment = false;
        let pendingPaymentId: string | null = null;
        let pendingInvoiceId: string | null = null;
        let pendingTicketType: TicketType | null = null;
        let bookingTicketType: TicketType | null = null;
        if (session?.user) {
          const [bookingRows, role, pendingPayment] = await Promise.all([
            db
              .select({ id: trackBookings.id, ticketType: trackBookings.ticketType })
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
                ticketType: payments.ticketType,
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
          bookingTicketType = bookingRows[0]?.ticketType ?? null;
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
              pendingTicketType = pending.ticketType ?? null;
            }
          }
        }

        const trackEventsFormatted = trackEventsList.map((te) => {
          const eventRow = {
            ...te.event,
            attendeeCount: attendeeCountsMap.get(te.eventId) ?? 0,
          };
          return isStaff ? presentAdminEvent(eventRow) : presentPublicEvent(eventRow, locale);
        });

        const [bookingStats] = await db
          .select({ value: count(trackBookings.id) })
          .from(trackBookings)
          .where(activeTrackBookingWhere(eq(trackBookings.trackId, id)));

        const presentedTrack = isStaff
          ? presentAdminContent(track)
          : presentPublicContent(track, locale);

        const recordingsSeries = await loadRecordingsSeriesForTrack(
          id,
          null,
          {
            userId: session?.user?.id ?? null,
            isStaff,
            userHasTrackBooking: userHasBooked,
          },
          locale,
        );

        return c.json({
          track: {
            ...presentedTrack,
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
            pendingTicketType,
            priceInCents: track.priceInCents,
            onlineOnlyPriceCents: track.onlineOnlyPriceCents,
            onlineOfflinePriceCents: track.onlineOfflinePriceCents,
            offlineOnlyPriceCents: track.offlineOnlyPriceCents,
            locationUrl: serializeTrackLocationUrl({
              locationUrl: track.locationUrl,
              isStaff,
              userHasBooked,
              bookingTicketType,
            }),
            recordingsSeries,
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
    const locale = resolveLocaleFromRequest(c);
    const role = session?.user ? await getOptionalUserRole(session.user.id) : null;
    const isStaff = role && ['owner', 'admin', 'manager'].includes(role);

    const filters: any[] = [];
    if (!isStaff) {
      filters.push(eq(tracks.isPublished, true));
    }
    if (search) {
      const pattern = `%${escapeLikePattern(search)}%`;
      filters.push(
        or(
          ilike(tracks.titleEn, pattern),
          ilike(tracks.titleAr, pattern),
          ilike(tracks.title, pattern),
        ),
      );
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
        titleEn: tracks.titleEn,
        titleAr: tracks.titleAr,
        descriptionEn: tracks.descriptionEn,
        descriptionAr: tracks.descriptionAr,
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
        locationEn: tracks.locationEn,
        locationAr: tracks.locationAr,
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

    const bookingTicketTypesByTrackId = new Map<string, TicketType | null>();
    if (!isStaff && trackIds.length > 0) {
      const bookingRows = await db
        .select({ trackId: trackBookings.trackId, ticketType: trackBookings.ticketType })
        .from(trackBookings)
        .where(
          activeTrackBookingWhere(
            inArray(trackBookings.trackId, trackIds),
            eq(trackBookings.userId, session.user.id),
          ),
        );
      for (const booking of bookingRows) {
        bookingTicketTypesByTrackId.set(booking.trackId, booking.ticketType ?? null);
      }
    }

    const items = trackList.map((t) => {
      const bookingTicketType = bookingTicketTypesByTrackId.get(t.id) ?? null;
      const userHasBooked = isStaff ? false : bookingTicketTypesByTrackId.has(t.id);
      const presented = presentPublicRow(t, locale, Boolean(isStaff));
      return {
        ...presented,
        locationUrl: serializeTrackLocationUrl({
          locationUrl: t.locationUrl,
          isStaff: Boolean(isStaff),
          userHasBooked,
          bookingTicketType,
        }),
        eventCount: countsMap.get(t.id) ?? 0,
      };
    });

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

    const idValidation = validateUuid(c.req.param('id')!, 'track ID');
    if (!idValidation.valid) {
      return c.json({ error: idValidation.error }, 400);
    }
    const id = idValidation.value;
    const locale = resolveLocaleFromRequest(c);
    const role = await getOptionalUserRole(session.user.id);
    const isStaff = role && ['owner', 'admin', 'manager'].includes(role);

    const [track] = await db
      .select({
        id: tracks.id,
        titleEn: tracks.titleEn,
        titleAr: tracks.titleAr,
        descriptionEn: tracks.descriptionEn,
        descriptionAr: tracks.descriptionAr,
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
        onlineOnlyPriceCents: tracks.onlineOnlyPriceCents,
        onlineOfflinePriceCents: tracks.onlineOfflinePriceCents,
        offlineOnlyPriceCents: tracks.offlineOnlyPriceCents,
        locationEn: tracks.locationEn,
        locationAr: tracks.locationAr,
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
          titleEn: events.titleEn,
          titleAr: events.titleAr,
          eventDescriptionEn: events.eventDescriptionEn,
          eventDescriptionAr: events.eventDescriptionAr,
          date: events.date,
          locationEn: events.locationEn,
          locationAr: events.locationAr,
          eventType: events.eventType,
          eventFormat: events.eventFormat,
          imageUrl: events.imageUrl,
          isPublished: events.isPublished,
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

    const eventsWithAssets = trackEventsList.map((te) => {
      const presented = isStaff
        ? presentAdminEvent(te.event)
        : presentPublicEvent(te.event, locale);
      return {
        ...presented,
        assetCount: assetCountsMap.get(te.eventId) ?? 0,
      };
    });

    const [bookingStats] = await db
      .select({ value: count(trackBookings.id) })
      .from(trackBookings)
      .where(activeTrackBookingWhere(eq(trackBookings.trackId, id)));

    let userHasBooked = false;
    let bookingTicketType: TicketType | null = null;
    if (session?.user) {
      const [booking] = await db
        .select({ id: trackBookings.id, ticketType: trackBookings.ticketType })
        .from(trackBookings)
        .where(
          activeTrackBookingWhere(
            eq(trackBookings.trackId, id),
            eq(trackBookings.userId, session.user.id),
          ),
        )
        .limit(1);
      userHasBooked = Boolean(booking);
      bookingTicketType = booking?.ticketType ?? null;
    }

    const recordingsSeries = await loadRecordingsSeriesForTrack(
      id,
      null,
      {
        userId: session?.user?.id ?? null,
        isStaff: Boolean(isStaff),
        userHasTrackBooking: userHasBooked,
      },
      locale,
    );

    const presentedTrack = isStaff
      ? presentAdminContent(track)
      : presentPublicContent(track, locale);

    return c.json({
      ...presentedTrack,
      locationUrl: serializeTrackLocationUrl({
        locationUrl: track.locationUrl,
        isStaff: Boolean(isStaff),
        userHasBooked,
        bookingTicketType,
      }),
      eventCount: eventsWithAssets.length,
      events: eventsWithAssets,
      bookingsCount: Number(bookingStats?.value ?? 0),
      trackBookingSpotsRemaining:
        track.maxTrackBookings !== null
          ? track.maxTrackBookings - Number(bookingStats?.value ?? 0)
          : null,
      userHasBooked,
      recordingsSeries,
    });
  });

  // Get track attendees (users who booked this track)
  app.get('/tracks/:id/attendees', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idValidation = validateUuid(c.req.param('id')!, 'track ID');
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

    const ticketTypeParam = c.req.query('ticketType');
    const ticketTypeFilter = TICKET_TYPES.find((value) => value === ticketTypeParam);

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
      ticketTypeFilter ? eq(trackBookings.ticketType, ticketTypeFilter) : undefined,
      searchPattern
        ? or(
            ilike(users.name, searchPattern),
            ilike(users.email, searchPattern),
            ilike(sql`COALESCE(${profiles.phoneNumber}, '')`, searchPattern),
            ilike(sql`COALESCE(${payments.fawaterkInvoiceKey}, '')`, searchPattern),
            ilike(sql`COALESCE(${trackBookings.manualReference}, '')`, searchPattern),
            sql`CAST(${payments.fawaterkInvoiceId} AS TEXT) ILIKE ${searchPattern}`,
            sql`CAST(${payments.fawaterkTransactionId} AS TEXT) ILIKE ${searchPattern}`,
          )
        : undefined,
    );

    const totalResult = await db
      .select({ value: count(trackBookings.id) })
      .from(trackBookings)
      .leftJoin(users, eq(trackBookings.userId, users.id))
      .leftJoin(profiles, eq(users.id, profiles.id))
      .leftJoin(payments, eq(trackBookings.paymentId, payments.id))
      .where(attendeeFilter);

    const items = await buildTrackAttendeesQuery(db, attendeeFilter)
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

        const titleFields =
          payload.titleEn && payload.titleAr
            ? bilingualTitleFields(payload.titleEn, payload.titleAr)
            : bilingualTitleFromLegacy(payload.title!);
        const descriptionFields =
          payload.descriptionEn !== undefined || payload.descriptionAr !== undefined
            ? bilingualDescriptionFields(
                payload.descriptionEn ?? payload.description ?? null,
                payload.descriptionAr ?? payload.description ?? null,
              )
            : bilingualDescriptionFromLegacy(payload.description);
        const titleEn = titleFields.titleEn;
        const titleAr = titleFields.titleAr;

        // Use transaction to ensure track + auto-created series are atomic
        const created = await db.transaction(async (tx) => {
          const [track] = await tx
            .insert(tracks)
            .values({
              ...titleFields,
              ...descriptionFields,
              imageUrl: payload.imageUrl || null,
              isPublished: false,
              trackBookingStart: payload.trackBookingStart ?? null,
              trackBookingEnd: payload.trackBookingEnd ?? null,
              singleBookingStart: payload.singleBookingStart ?? null,
              singleBookingEnd: payload.singleBookingEnd ?? null,
              allowIndividualBooking: payload.allowIndividualBooking ?? false,
              maxTrackBookings: payload.maxTrackBookings ?? null,
              priceInCents: payload.priceInCents ?? null,
              onlineOnlyPriceCents: payload.onlineOnlyPriceCents ?? null,
              onlineOfflinePriceCents: payload.onlineOfflinePriceCents ?? null,
              offlineOnlyPriceCents: payload.offlineOnlyPriceCents ?? null,
              location: payload.location || null,
              locationUrl: payload.locationUrl || null,
            })
            .returning();

          // Auto-create Series for track recordings
          await tx.insert(series).values({
            ...bilingualTitleFields(`${titleEn} Recordings`, `${titleAr} Recordings`),
            ...bilingualDescriptionFields(
              `Session recordings and materials from ${titleEn}`,
              `Session recordings and materials from ${titleAr}`,
            ),
            trackId: track.id,
            isPublished: false,
          });

          return track;
        });

        return c.json({ track: presentAdminContent(created) }, 201);
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

        const idValidation = validateUuid(c.req.param('id')!, 'track ID');
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
        if (updates.onlineOnlyPriceCents !== undefined)
          updateValues.onlineOnlyPriceCents = updates.onlineOnlyPriceCents ?? null;
        if (updates.onlineOfflinePriceCents !== undefined)
          updateValues.onlineOfflinePriceCents = updates.onlineOfflinePriceCents ?? null;
        if (updates.offlineOnlyPriceCents !== undefined)
          updateValues.offlineOnlyPriceCents = updates.offlineOnlyPriceCents ?? null;
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
        if (mergedIsPublished) {
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

          const mergedTicketPrices = {
            onlineOnlyPriceCents:
              updates.onlineOnlyPriceCents !== undefined
                ? (updates.onlineOnlyPriceCents ?? null)
                : currentTrack.onlineOnlyPriceCents,
            onlineOfflinePriceCents:
              updates.onlineOfflinePriceCents !== undefined
                ? (updates.onlineOfflinePriceCents ?? null)
                : currentTrack.onlineOfflinePriceCents,
            offlineOnlyPriceCents:
              updates.offlineOnlyPriceCents !== undefined
                ? (updates.offlineOnlyPriceCents ?? null)
                : currentTrack.offlineOnlyPriceCents,
          };
          if (hasTicketTypes(mergedTicketPrices)) {
            const formatRows = await db
              .select({ eventFormat: events.eventFormat })
              .from(trackEvents)
              .innerJoin(events, eq(events.id, trackEvents.eventId))
              .where(eq(trackEvents.trackId, id));
            const coverageError = ticketEventCoverageError(mergedTicketPrices, {
              hasOnlineEvent: formatRows.some((row) => row.eventFormat === 'online'),
              hasOfflineEvent: formatRows.some((row) => row.eventFormat === 'offline'),
            });
            if (coverageError) {
              throw new ApiError('TICKET_EVENT_COVERAGE', coverageError, 400);
            }
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

        const mergedTrackOffering = {
          priceInCents: updates.priceInCents ?? currentTrack.priceInCents,
          onlineOnlyPriceCents:
            updates.onlineOnlyPriceCents !== undefined
              ? (updates.onlineOnlyPriceCents ?? null)
              : currentTrack.onlineOnlyPriceCents,
          onlineOfflinePriceCents:
            updates.onlineOfflinePriceCents !== undefined
              ? (updates.onlineOfflinePriceCents ?? null)
              : currentTrack.onlineOfflinePriceCents,
          offlineOnlyPriceCents:
            updates.offlineOnlyPriceCents !== undefined
              ? (updates.offlineOnlyPriceCents ?? null)
              : currentTrack.offlineOnlyPriceCents,
        };
        const trackIsPaid = shouldPublishSeries ? isPaidTrackOffering(mergedTrackOffering) : false;

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

        return c.json({ track: presentAdminContent(updated) });
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

    const idValidation = validateUuid(c.req.param('id')!, 'track ID');
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

        const idValidation = validateUuid(c.req.param('id')!, 'track ID');
        if (!idValidation.valid) {
          throw new ApiError('INVALID_ID', idValidation.error.message, 400);
        }
        const trackId = idValidation.value;
        const body = await c.req.json().catch(() => ({}));
        const parsed = addEventsSchema.safeParse(body);

        if (!parsed.success) {
          throw new ApiError('INVALID_REQUEST', parsed.error.message, 400);
        }

        const result = await withTrackEventAdditionRetry(() =>
          db.transaction(async (tx) => {
            const referenceTime = new Date();
            const [track] = await tx
              .select({
                id: tracks.id,
                maxTrackBookings: tracks.maxTrackBookings,
                priceInCents: tracks.priceInCents,
                onlineOnlyPriceCents: tracks.onlineOnlyPriceCents,
                onlineOfflinePriceCents: tracks.onlineOfflinePriceCents,
                offlineOnlyPriceCents: tracks.offlineOnlyPriceCents,
              })
              .from(tracks)
              .where(eq(tracks.id, trackId))
              .for('update')
              .limit(1);
            if (!track) {
              throw new ApiError('TRACK_NOT_FOUND', 'Track not found.', 404);
            }

            const existing = await tx
              .select({ eventId: trackEvents.eventId })
              .from(trackEvents)
              .where(eq(trackEvents.trackId, trackId));
            const existingIds = new Set(existing.map((row) => row.eventId));
            const newEventIds = parsed.data.eventIds.filter((id) => !existingIds.has(id));
            if (newEventIds.length === 0) {
              return { success: true, addedCount: 0 };
            }

            const [maxSort] = await tx
              .select({ maxOrder: sql<number>`COALESCE(MAX(${trackEvents.sortOrder}), -1)` })
              .from(trackEvents)
              .where(eq(trackEvents.trackId, trackId));
            let sortOrder = (maxSort?.maxOrder ?? -1) + 1;

            const initialBooking = await tx
              .select({ id: trackBookings.id })
              .from(trackBookings)
              .where(activeTrackBookingWhere(eq(trackBookings.trackId, trackId)))
              .limit(1);
            const initialTrackReservations = await tx
              .select({
                userId: trackReservations.userId,
                paymentId: trackReservations.paymentId,
                expiresAt: trackReservations.expiresAt,
              })
              .from(trackReservations)
              .where(
                and(
                  eq(trackReservations.trackId, trackId),
                  gt(trackReservations.expiresAt, referenceTime),
                ),
              );
            const quietPath = initialBooking.length === 0 && initialTrackReservations.length === 0;

            if (quietPath) {
              // Preserve the historical zero-booking/zero-reservation path, including its >= guard
              // and exact response shape.
              const eventCapacities = await tx
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
                if (
                  track.maxTrackBookings !== null &&
                  event.maxAttendees < track.maxTrackBookings
                ) {
                  throw new ApiError(
                    'CAPACITY_TOO_LOW',
                    `Event "${event.title}" capacity (${event.maxAttendees}) < track maxTrackBookings (${track.maxTrackBookings}).`,
                    400,
                  );
                }
              }

              const validIds = new Set(eventCapacities.map((event) => event.id));
              const toInsert = newEventIds.filter((id) => validIds.has(id));
              if (toInsert.length > 0) {
                await tx
                  .insert(trackEvents)
                  .values(
                    toInsert.map((eventId) => ({ trackId, eventId, sortOrder: sortOrder++ })),
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
                      .select({
                        maxOrder: sql<number>`COALESCE(MAX(${seriesAssets.sortOrder}), -1)`,
                      })
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
                    if (isPaidTrackOffering(track)) {
                      await tx
                        .update(libraryAssets)
                        .set({ isPremium: true, updatedAt: referenceTime })
                        .where(
                          inArray(
                            libraryAssets.id,
                            eventAssets.map((asset) => asset.id),
                          ),
                        );
                    }
                  }
                }
              }
              return { success: true, addedCount: toInsert.length };
            }

            const addedEvents = await tx
              .select({
                id: events.id,
                title: events.title,
                eventFormat: events.eventFormat,
                maxAttendees: events.maxAttendees,
              })
              .from(events)
              .where(inArray(events.id, newEventIds))
              .orderBy(asc(events.id))
              .for('update');
            if (addedEvents.length === 0) {
              return { success: true, addedCount: 0 };
            }
            const validIds = new Set(addedEvents.map((event) => event.id));
            const toInsert = newEventIds.filter((id) => validIds.has(id));

            const standalonePayments = await tx
              .select({
                eventId: payments.itemId,
                status: payments.status,
                fawaterkIntentKey: payments.fawaterkIntentKey,
              })
              .from(payments)
              .where(
                and(
                  eq(payments.itemType, 'event'),
                  inArray(
                    payments.itemId,
                    addedEvents.map((event) => event.id),
                  ),
                  or(
                    eq(payments.status, 'pending'),
                    and(eq(payments.status, 'expired'), isNotNull(payments.fawaterkIntentKey)),
                  ),
                ),
              )
              .orderBy(asc(payments.itemId))
              .limit(1);

            const existingReservationRows = await tx
              .select({
                id: eventReservations.id,
                eventId: eventReservations.eventId,
                userId: eventReservations.userId,
                paymentId: eventReservations.paymentId,
                expiresAt: eventReservations.expiresAt,
                owningPaymentStatus: payments.status,
                owningPaymentItemType: payments.itemType,
              })
              .from(eventReservations)
              .innerJoin(payments, eq(payments.id, eventReservations.paymentId))
              .where(
                inArray(
                  eventReservations.eventId,
                  addedEvents.map((event) => event.id),
                ),
              );

            const candidatePaymentIds = [
              ...new Set(initialTrackReservations.map((row) => row.paymentId)),
            ].sort();
            const lockedPayments =
              candidatePaymentIds.length > 0
                ? await tx
                    .select({
                      id: payments.id,
                      userId: payments.userId,
                      status: payments.status,
                      itemType: payments.itemType,
                      itemId: payments.itemId,
                      ticketType: payments.ticketType,
                    })
                    .from(payments)
                    .where(inArray(payments.id, candidatePaymentIds))
                    .orderBy(asc(payments.id))
                    .for('update', { noWait: true })
                : [];
            const pendingTrackPayments = new Map(
              lockedPayments
                .filter(
                  (payment) =>
                    payment.status === 'pending' &&
                    payment.itemType === 'track' &&
                    payment.itemId === trackId,
                )
                .map((payment) => [payment.id, payment]),
            );
            const verifiedTrackReservations =
              candidatePaymentIds.length > 0
                ? (
                    await tx
                      .select({
                        userId: trackReservations.userId,
                        paymentId: trackReservations.paymentId,
                        expiresAt: trackReservations.expiresAt,
                      })
                      .from(trackReservations)
                      .where(
                        and(
                          eq(trackReservations.trackId, trackId),
                          inArray(trackReservations.paymentId, candidatePaymentIds),
                          gt(trackReservations.expiresAt, referenceTime),
                        ),
                      )
                  ).filter((row) => pendingTrackPayments.has(row.paymentId))
                : [];

            const bookingRows = await tx
              .select({
                id: trackBookings.id,
                userId: trackBookings.userId,
                ticketType: trackBookings.ticketType,
                paidAt: trackBookings.paidAt,
                pricePaidCents: trackBookings.pricePaidCents,
                paymentId: trackBookings.paymentId,
              })
              .from(trackBookings)
              .where(activeTrackBookingWhere(eq(trackBookings.trackId, trackId)))
              .for('update');

            const existingAttendeeRows = await tx
              .select({
                id: eventAttendees.id,
                eventId: eventAttendees.eventId,
                userId: eventAttendees.userId,
                status: eventAttendees.status,
              })
              .from(eventAttendees)
              .where(
                inArray(
                  eventAttendees.eventId,
                  addedEvents.map((event) => event.id),
                ),
              )
              .for('update');

            const backfillPlans = classifyTrackEventBackfill({
              bookings: bookingRows,
              events: addedEvents,
              existingAttendees: existingAttendeeRows,
              registeredAt: referenceTime,
            });
            const holdPlan = planTrackEventReservationHolds({
              trackReservations: verifiedTrackReservations.map((reservation) => ({
                ...reservation,
                ticketType: pendingTrackPayments.get(reservation.paymentId)?.ticketType ?? null,
              })),
              events: addedEvents,
              existingAttendees: existingAttendeeRows,
              existingReservations: existingReservationRows,
              unresolvedStandalonePayments: standalonePayments.flatMap((payment) =>
                payment.eventId
                  ? [
                      {
                        eventId: payment.eventId,
                        status: payment.status,
                        hasGatewayIntent: payment.fawaterkIntentKey !== null,
                      },
                    ]
                  : [],
              ),
              referenceTime,
            });
            if (holdPlan.blocked) {
              throw new ApiError(holdPlan.code, holdPlan.message, 409);
            }

            const backfillByEventId = new Map(backfillPlans.map((plan) => [plan.eventId, plan]));
            const occupiedCountByEventId = new Map<string, number>();
            for (const row of existingAttendeeRows) {
              if (row.status === 'active' || row.status === 'refund_requested') {
                occupiedCountByEventId.set(
                  row.eventId,
                  (occupiedCountByEventId.get(row.eventId) ?? 0) + 1,
                );
              }
            }
            const unexpiredReservationCountByEventId = new Map<string, number>();
            for (const row of existingReservationRows) {
              if (row.expiresAt > referenceTime) {
                unexpiredReservationCountByEventId.set(
                  row.eventId,
                  (unexpiredReservationCountByEventId.get(row.eventId) ?? 0) + 1,
                );
              }
            }
            const capacityDecision = evaluateTrackEventAdditionCapacity({
              maxTrackBookings: track.maxTrackBookings,
              mode: bookingRows.length > 0 ? 'booked' : 'reservation-only',
              events: addedEvents.map((event) => {
                const backfill = backfillByEventId.get(event.id);
                return {
                  ...event,
                  occupiedRows: occupiedCountByEventId.get(event.id) ?? 0,
                  unexpiredReservations: unexpiredReservationCountByEventId.get(event.id) ?? 0,
                  newHolds: holdPlan.newHoldCountsByEvent[event.id] ?? 0,
                  netNewRows:
                    (backfill?.toInsert.length ?? 0) + (backfill?.toReactivate.length ?? 0),
                };
              }),
            });
            if (!capacityDecision.allowed) {
              throw new ApiError(
                capacityDecision.code,
                capacityDecision.message,
                capacityDecision.status,
              );
            }

            if (toInsert.length > 0) {
              await tx
                .insert(trackEvents)
                .values(toInsert.map((eventId) => ({ trackId, eventId, sortOrder: sortOrder++ })));
            }

            const attendeeInserts = backfillPlans.flatMap((plan) => plan.toInsert);
            if (attendeeInserts.length > 0) {
              await tx.insert(eventAttendees).values(
                attendeeInserts.map((row) => ({
                  eventId: row.eventId,
                  userId: row.userId,
                  registeredAt: row.registeredAt,
                  paidAt: row.paidAt,
                  pricePaidCents: row.pricePaidCents,
                  paymentId: row.paymentId,
                  sourceTrackBookingId: row.sourceTrackBookingId,
                })),
              );
            }

            const reactivations = backfillPlans.flatMap((plan) => plan.toReactivate);
            await Promise.all(
              reactivations.map((row) =>
                tx
                  .update(eventAttendees)
                  .set({
                    registeredAt: row.registeredAt,
                    paidAt: row.paidAt,
                    pricePaidCents: row.pricePaidCents,
                    paymentId: row.paymentId,
                    sourceTrackBookingId: row.sourceTrackBookingId,
                    status: 'active',
                    cancelledAt: null,
                    refundRequestedAt: null,
                    adminNote: null,
                  })
                  .where(eq(eventAttendees.id, row.attendeeId)),
              ),
            );

            if (holdPlan.staleRowsToDelete.length > 0) {
              await tx
                .delete(eventReservations)
                .where(inArray(eventReservations.id, holdPlan.staleRowsToDelete));
            }
            if (holdPlan.holdsToInsert.length > 0) {
              await tx.insert(eventReservations).values(holdPlan.holdsToInsert);
            }
            for (const eventId of toInsert) {
              await tx.delete(series).where(eq(series.eventId, eventId));
            }

            // Link event assets to track's Series
            const [trackSeries] = await tx
              .select({ id: series.id })
              .from(series)
              .where(eq(series.trackId, trackId))
              .limit(1);
            if (trackSeries && toInsert.length > 0) {
              const eventAssets = await tx
                .select({ id: libraryAssets.id })
                .from(libraryAssets)
                .where(inArray(libraryAssets.eventId, toInsert));
              if (eventAssets.length > 0) {
                const [maxSeriesSort] = await tx
                  .select({
                    maxOrder: sql<number>`COALESCE(MAX(${seriesAssets.sortOrder}), -1)`,
                  })
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
                if (isPaidTrackOffering(track)) {
                  await tx
                    .update(libraryAssets)
                    .set({ isPremium: true, updatedAt: referenceTime })
                    .where(
                      inArray(
                        libraryAssets.id,
                        eventAssets.map((asset) => asset.id),
                      ),
                    );
                }
              }
            }

            if (bookingRows.length === 0) {
              return { success: true, addedCount: toInsert.length };
            }
            return {
              success: true,
              addedCount: toInsert.length,
              backfilledCount: attendeeInserts.length,
              reactivatedCount: reactivations.length,
              skippedExistingCount: backfillPlans.reduce(
                (total, plan) => total + plan.toSkip.length,
                0,
              ),
            };
          }),
        );

        return c.json(result);
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

        const trackIdValidation = validateUuid(c.req.param('id')!, 'track ID');
        if (!trackIdValidation.valid) {
          throw new ApiError('INVALID_ID', trackIdValidation.error.message, 400);
        }
        const trackId = trackIdValidation.value;

        const eventIdValidation = validateUuid(c.req.param('eventId')!, 'event ID');
        if (!eventIdValidation.valid) {
          throw new ApiError('INVALID_ID', eventIdValidation.error.message, 400);
        }
        const eventId = eventIdValidation.value;

        // Optional reason body, parsed best-effort (KTD1). fetchJson tags every request as
        // application/json, so a body-less DELETE arrives as empty JSON and extractJsonPayload
        // returns INVALID_JSON — that must resolve to "no reason", never surface as a parse error.
        let reason: string | undefined;
        const bodyResult = await extractJsonPayload(c);
        if (bodyResult.ok && bodyResult.data && typeof bodyResult.data === 'object') {
          const rawReason = (bodyResult.data as { reason?: unknown }).reason;
          if (typeof rawReason === 'string') {
            reason = rawReason;
          }
        }

        const now = new Date();

        const result = await db.transaction(async (tx) => {
          // Lock the track row first so an in-flight booking fulfillment (which also locks this row
          // first) is serialized against the guard count — mirrors executeTrackBookingWrite (KTD4).
          const [track] = await tx
            .select({
              isPublished: tracks.isPublished,
              onlineOnlyPriceCents: tracks.onlineOnlyPriceCents,
              onlineOfflinePriceCents: tracks.onlineOfflinePriceCents,
              offlineOnlyPriceCents: tracks.offlineOnlyPriceCents,
            })
            .from(tracks)
            .where(eq(tracks.id, trackId))
            .for('update')
            .limit(1);

          if (!track) {
            throw new ApiError('TRACK_NOT_FOUND', 'Track not found.', 404);
          }

          // All bookings of the track: the active (non-revoked) count gates the removal, and every
          // booking id — even revoked ones — is a safe cancellation-join target (KTD3/KTD5).
          const bookingRows = await tx
            .select({ id: trackBookings.id, revokedAt: trackBookings.revokedAt })
            .from(trackBookings)
            .where(eq(trackBookings.trackId, trackId));
          const bookingIds = bookingRows.map((row) => row.id);
          const activeBookingCount = bookingRows.filter((row) => row.revokedAt === null).length;

          const decision = evaluateTrackEventRemoval({
            role: staff.role,
            activeBookingCount,
            reason,
          });
          if (!decision.allowed) {
            throw new ApiError(decision.code, decision.message, 400);
          }

          // Coverage stays hard for every role and path (R7).
          if (track.isPublished && hasTicketTypes(track)) {
            const remainingFormats = await tx
              .select({ eventFormat: events.eventFormat })
              .from(trackEvents)
              .innerJoin(events, eq(events.id, trackEvents.eventId))
              .where(
                and(eq(trackEvents.trackId, trackId), sql`${trackEvents.eventId} <> ${eventId}`),
              );
            const coverageError = ticketEventCoverageError(track, {
              hasOnlineEvent: remainingFormats.some((row) => row.eventFormat === 'online'),
              hasOfflineEvent: remainingFormats.some((row) => row.eventFormat === 'offline'),
            });
            if (coverageError) {
              throw new ApiError('TICKET_EVENT_COVERAGE', coverageError, 400);
            }
          }

          const deleted = await tx
            .delete(trackEvents)
            .where(and(eq(trackEvents.trackId, trackId), eq(trackEvents.eventId, eventId)))
            .returning({ id: trackEvents.id });
          if (deleted.length === 0) {
            throw new ApiError('NOT_FOUND', 'Event not found in track.', 404);
          }

          let cancelledRegistrations = 0;
          let pendingRefundsUntouched = 0;

          if (bookingIds.length > 0) {
            // Cancel only active registrations sourced from this track's bookings; refund_requested
            // rows stay in the review queue and standalone (null-source) rows are untouched (R5).
            const cancelled = await tx
              .update(eventAttendees)
              .set({
                status: 'cancelled' as const,
                cancelledAt: now,
                refundRequestedAt: null,
                adminNote: decision.reason
                  ? `Event removed from track by ${staff.userId}: ${decision.reason}`
                  : `Event removed from track by ${staff.userId}`,
              })
              .where(
                and(
                  eq(eventAttendees.eventId, eventId),
                  eq(eventAttendees.status, 'active'),
                  inArray(eventAttendees.sourceTrackBookingId, bookingIds),
                ),
              )
              .returning({ id: eventAttendees.id });
            cancelledRegistrations = cancelled.length;

            const [pendingRefunds] = await tx
              .select({ count: count(eventAttendees.id) })
              .from(eventAttendees)
              .where(
                and(
                  eq(eventAttendees.eventId, eventId),
                  eq(eventAttendees.status, 'refund_requested'),
                  inArray(eventAttendees.sourceTrackBookingId, bookingIds),
                ),
              );
            pendingRefundsUntouched = Number(pendingRefunds?.count ?? 0);
          }

          // Reverse of the add path: unlink the removed session's assets from the track's series;
          // isPremium curation stays manual (KTD7).
          const [trackSeries] = await tx
            .select({ id: series.id })
            .from(series)
            .where(eq(series.trackId, trackId))
            .limit(1);
          if (trackSeries) {
            const eventAssets = await tx
              .select({ id: libraryAssets.id })
              .from(libraryAssets)
              .where(eq(libraryAssets.eventId, eventId));
            if (eventAssets.length > 0) {
              await tx.delete(seriesAssets).where(
                and(
                  eq(seriesAssets.seriesId, trackSeries.id),
                  inArray(
                    seriesAssets.assetId,
                    eventAssets.map((asset) => asset.id),
                  ),
                ),
              );
            }
          }

          return { cancelledRegistrations, pendingRefundsUntouched };
        });

        return c.json({ success: true, ...result });
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

    const idValidation = validateUuid(c.req.param('id')!, 'track ID');
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

        const idValidation = validateUuid(c.req.param('id')!, 'track ID');
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
              onlineOnlyPriceCents: tracks.onlineOnlyPriceCents,
              onlineOfflinePriceCents: tracks.onlineOfflinePriceCents,
              offlineOnlyPriceCents: tracks.offlineOnlyPriceCents,
            })
            .from(tracks)
            .where(eq(tracks.id, trackId))
            .for('update')
            .limit(1);

          if (!track || !track.isPublished) {
            throw new ApiError('TRACK_NOT_FOUND', 'Track not found.', 404);
          }

          if (hasTicketTypes(track) || isPaidTrack(track.priceInCents)) {
            throw new ApiError('PAYMENT_REQUIRED', 'This track requires the checkout flow.', 402);
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

        if (result.success && !('alreadyBooked' in result && result.alreadyBooked)) {
          queueTrackRegistrationConfirmation(userId, trackId, resolveLocaleFromRequest(c));
        }

        return c.json(result);
      },
      'TRACK_BOOKING_FAILED',
      'Unable to book track.',
      'track booking',
    ),
  );
}
