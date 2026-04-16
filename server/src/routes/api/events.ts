import { and, count, desc, eq, gt, gte, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
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
  subscriptions,
  trackBookings,
  trackEvents,
  tracks,
  users,
} from '../../db/schema/index.js';
import { activeTrackBookingWhere } from '../../utils/booking.js';
import { ApiError, handleRoute } from '../../utils/errors.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { escapeLikePattern, getOptionalUserRole, requireAdmin, requireManager } from './utils.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().optional(),
  type: z.enum(['Event', 'Meetup', 'Mastermind', 'Retreat']).optional(),
  upcoming: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

const uuidParamSchema = z.string().uuid();
const paginationQuerySchema = listQuerySchema.pick({ page: true, pageSize: true });
const rejectionReasonSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

function parseEventIdParam(eventId: string): string {
  const parsed = uuidParamSchema.safeParse(eventId);
  if (!parsed.success) {
    throw new ApiError('INVALID_PARAM', 'Event ID must be a valid UUID.', 400);
  }
  return parsed.data;
}

const registerBodySchema = z.object({});

const isoDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid date value.' })
  .transform((value) => new Date(value));

const httpsUrlSchema = (label: string) =>
  z
    .string()
    .url('Provide a valid URL.')
    .max(500, `${label} is too long.`)
    .refine((value) => {
      try {
        return new URL(value).protocol === 'https:';
      } catch {
        return false;
      }
    }, `${label} must start with https://`);

const meetingLinkSchema = httpsUrlSchema('Meeting link')
  .optional()
  .or(z.literal('').transform(() => null))
  .or(z.null());

const locationUrlSchema = httpsUrlSchema('Location URL')
  .optional()
  .or(z.literal('').transform(() => null))
  .or(z.null());

const imageUrlSchema = z
  .string()
  .url('Provide a valid image URL.')
  .max(500, 'Image URL is too long.')
  .optional()
  .or(z.literal('').transform(() => undefined))
  .or(z.null().transform(() => undefined));

const stringOrNull = z.string().trim().max(255).optional().nullable();

const tagsSchema = z
  .array(z.string().trim().min(1).max(30))
  .max(12)
  .optional()
  .transform((tags) =>
    tags ? Array.from(new Set(tags.map((tag) => tag.toLowerCase()))) : undefined,
  );

const maxAttendeesSchema = z
  .union([
    z.coerce
      .number()
      .int()
      .positive('Capacity must be positive.')
      .max(10000, 'Capacity too large.'),
    z.null(),
  ])
  .optional()
  .transform((value) => (value === undefined ? undefined : value));

const MAX_DESCRIPTION_LENGTH = 8000;

const normalizeDescription = (description: string) =>
  description.length > MAX_DESCRIPTION_LENGTH
    ? `${description.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`
    : description;

const priceInCentsSchema = z
  .union([
    z.coerce
      .number()
      .int()
      .min(0, 'Price cannot be negative.')
      .max(10000000, 'Price too large.'), // Max 100,000 EGP
    z.null(),
  ])
  .optional()
  .transform((value) => (value === undefined ? undefined : value));

const baseEventSchema = z.object({
  title: z.string().trim().min(3, 'Title is required.').max(180),
  description: z.string().trim().min(1, 'Description is required.').max(8000),
  date: isoDateSchema,
  location: stringOrNull,
  locationUrl: locationUrlSchema,
  meetingLink: meetingLinkSchema,
  maxAttendees: maxAttendeesSchema,
  imageUrl: imageUrlSchema,
  tags: tagsSchema,
  eventType: z.enum(['Event', 'Meetup', 'Mastermind', 'Retreat']).default('Event'),
  priceInCents: priceInCentsSchema,
});

const createEventSchema = baseEventSchema;
const updateEventSchema = baseEventSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

export function registerEventRoutes(app: Hono) {
  app.get(
    '/events',
    handleRoute(
      async (c) => {
        const session = await getSessionFromRequest(c);
        const parsed = listQuerySchema.safeParse({
          page: c.req.query('page'),
          pageSize: c.req.query('pageSize'),
          search: c.req.query('search'),
          type: c.req.query('type'),
          upcoming: c.req.query('upcoming'),
        });

        if (!parsed.success) {
          throw new ApiError('INVALID_QUERY', parsed.error.message, 400);
        }

        const { page, pageSize, search, type, upcoming } = parsed.data;
        const role = session?.user ? await getOptionalUserRole(session.user.id) : null;
        const isStaff = role && ['owner', 'admin', 'manager'].includes(role);

        const filters: any[] = [];

        if (type) {
          filters.push(eq(events.eventType, type));
        }

        if (upcoming) {
          filters.push(gte(events.date, new Date()));
        }

        if (search) {
          filters.push(ilike(events.title, `%${escapeLikePattern(search)}%`));
        }

        // Hide events in unpublished tracks (unless staff)
        if (!isStaff) {
          filters.push(sql`NOT EXISTS (
            SELECT 1 FROM track_events te 
            JOIN tracks t ON t.id = te.track_id 
            WHERE te.event_id = ${events.id} AND t.is_published = false
          )`);
        }

        const whereClause = filters.length > 0 ? and(...filters) : undefined;

        const [totalResult] = await db
          .select({ value: count(events.id) })
          .from(events)
          .where(whereClause);

        const offset = (page - 1) * pageSize;

        const items = await db
          .select({
            id: events.id,
            title: events.title,
            eventDescription: events.eventDescription,
            date: events.date,
            location: events.location,
            locationUrl: events.locationUrl,
            maxAttendees: events.maxAttendees,
            meetingLink: events.meetingLink,
            imageUrl: events.imageUrl,
            tags: events.tags,
            eventType: events.eventType,
            priceInCents: events.priceInCents,
            attendeeCount: sql<number>`COALESCE(COUNT(${eventAttendees.id}) FILTER (WHERE ${eventAttendees.status} = 'active'), 0)`,
          })
          .from(events)
          .leftJoin(eventAttendees, eq(events.id, eventAttendees.eventId))
          .where(whereClause)
          .groupBy(events.id)
          .orderBy(events.date)
          .limit(pageSize)
          .offset(offset);

        const sanitizedItems = items.map(({ meetingLink, locationUrl, ...rest }) => ({
          ...rest,
          meetingLink: null,
          locationUrl: null,
        }));

        return c.json({
          items: sanitizedItems,
          pagination: {
            page,
            pageSize,
            total: Number(totalResult?.value ?? 0),
          },
        });
      },
      'EVENTS_FETCH_FAILED',
      'Unable to load events.',
      'list events',
    ),
  );

  app.get(
    '/events/:id',
    handleRoute(
      async (c) => {
        const eventIdParam = c.req.param('id');
        const eventIdParsed = uuidParamSchema.safeParse(eventIdParam);
        if (!eventIdParsed.success) {
          throw new ApiError('INVALID_PARAM', 'Event ID must be a valid UUID.', 400);
        }
        const eventId = eventIdParsed.data;
        const session = await getSessionFromRequest(c);
        const viewerId = session?.user?.id;

        const [event] = await db
          .select({
            id: events.id,
            title: events.title,
            eventDescription: events.eventDescription,
            date: events.date,
            location: events.location,
            locationUrl: events.locationUrl,
            maxAttendees: events.maxAttendees,
            meetingLink: events.meetingLink,
            imageUrl: events.imageUrl,
            tags: events.tags,
            eventType: events.eventType,
            priceInCents: events.priceInCents,
          })
          .from(events)
          .where(eq(events.id, eventId))
          .limit(1);

        if (!event) {
          return c.json({ error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' } }, 404);
        }

        const [trackInfoResult, attendeeCountResult, registrationResult, role] = await Promise.all([
          db
            .select({
              id: tracks.id,
              title: tracks.title,
              isPublished: tracks.isPublished,
              trackBookingStart: tracks.trackBookingStart,
              trackBookingEnd: tracks.trackBookingEnd,
              singleBookingStart: tracks.singleBookingStart,
              singleBookingEnd: tracks.singleBookingEnd,
            })
            .from(trackEvents)
            .innerJoin(tracks, eq(tracks.id, trackEvents.trackId))
            .where(eq(trackEvents.eventId, eventId))
            .limit(1),
          db
            .select({ value: count(eventAttendees.id) })
            .from(eventAttendees)
            .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.status, 'active'))),
          viewerId
            ? db
                .select({ id: eventAttendees.id, status: eventAttendees.status })
                .from(eventAttendees)
                .where(
                  and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, viewerId)),
                )
                .limit(1)
            : Promise.resolve([]),
          viewerId ? getOptionalUserRole(viewerId) : Promise.resolve(null),
        ]);

        const trackInfo = trackInfoResult[0];
        const roleValue = role;
        const isStaff = roleValue && ['owner', 'admin', 'manager'].includes(roleValue);

        if (trackInfo && !trackInfo.isPublished && !isStaff) {
          return c.json({ error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' } }, 404);
        }

        // Check if user has booked the track (for track events)
        let trackBooked = false;
        if (trackInfo && viewerId) {
          const [booking] = await db
            .select({ id: trackBookings.id })
            .from(trackBookings)
            .where(
              activeTrackBookingWhere(
                eq(trackBookings.trackId, trackInfo.id),
                eq(trackBookings.userId, viewerId),
              ),
            )
            .limit(1);
          trackBooked = Boolean(booking);
        }

        const attendeeCount = Number(attendeeCountResult?.[0]?.value ?? 0);

        let attending = false;
        let registrationStatus: 'active' | 'cancelled' | 'refund_requested' | null = null;
        const existing = registrationResult[0];
        if (existing) {
          registrationStatus = existing.status;
          attending = existing.status === 'active';
        }

        const canAccessMeetingLink = attending || trackBooked || isStaff;
        const locationUrl = canAccessMeetingLink ? event.locationUrl : null;

        return c.json({
          ...event,
          attendeeCount,
          attending,
          registrationStatus,
          meetingLink: canAccessMeetingLink ? event.meetingLink : null,
          locationUrl,
          trackInfo: trackInfo
            ? {
                id: trackInfo.id,
                title: trackInfo.title,
                trackBookingStart: trackInfo.trackBookingStart,
                trackBookingEnd: trackInfo.trackBookingEnd,
                singleBookingStart: trackInfo.singleBookingStart,
                singleBookingEnd: trackInfo.singleBookingEnd,
                booked: trackBooked,
              }
            : null,
        });
      },
      'EVENT_DETAIL_FAILED',
      'Unable to load event.',
      'get event detail',
    ),
  );

  app.get(
    '/events/:id/attendees',
    handleRoute(
      async (c) => {
        const staff = await requireManager(c);
        if ('response' in staff) return staff.response;

        const eventId = parseEventIdParam(c.req.param('id'));
        const parsed = listQuerySchema.safeParse({
          page: c.req.query('page'),
          pageSize: c.req.query('pageSize'),
          search: c.req.query('search'),
        });

        if (!parsed.success) {
          throw new ApiError('INVALID_QUERY', parsed.error.message, 400);
        }

        const { page, pageSize, search } = parsed.data;
        const offset = (page - 1) * pageSize;
        const normalizedSearch = search?.trim();
        const searchPattern = normalizedSearch ? `%${escapeLikePattern(normalizedSearch)}%` : null;

        const [eventExists] = await db
          .select({ id: events.id })
          .from(events)
          .where(eq(events.id, eventId))
          .limit(1);

        if (!eventExists) {
          return c.json({ error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' } }, 404);
        }

        const attendeeFilter = and(
          eq(eventAttendees.eventId, eventId),
          searchPattern
            ? or(
                ilike(users.name, searchPattern),
                ilike(users.email, searchPattern),
                ilike(sql`COALESCE(${profiles.phoneNumber}, '')`, searchPattern),
                ilike(sql`COALESCE(${payments.fawaterkInvoiceKey}, '')`, searchPattern),
                sql`CAST(${payments.fawaterkInvoiceId} AS TEXT) ILIKE ${searchPattern}`,
              )
            : undefined,
        );

        const totalResult = await db
          .select({ value: count(eventAttendees.id) })
          .from(eventAttendees)
          .leftJoin(users, eq(eventAttendees.userId, users.id))
          .leftJoin(profiles, eq(users.id, profiles.id))
          .leftJoin(payments, eq(eventAttendees.paymentId, payments.id))
          .where(attendeeFilter);

        const items = await db
          .select({
            userId: users.id,
            email: users.email,
            name: users.name,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            phoneNumber: profiles.phoneNumber,
            registeredAt: eventAttendees.registeredAt,
            status: eventAttendees.status,
            invoiceId: payments.fawaterkInvoiceId,
            invoiceNumber: payments.fawaterkInvoiceKey,
          })
          .from(eventAttendees)
          .leftJoin(users, eq(eventAttendees.userId, users.id))
          .leftJoin(profiles, eq(users.id, profiles.id))
          .leftJoin(payments, eq(eventAttendees.paymentId, payments.id))
          .where(attendeeFilter)
          .orderBy(desc(eventAttendees.registeredAt))
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
      },
      'EVENT_ATTENDEES_FAILED',
      'Unable to load attendees.',
      'list event attendees',
    ),
  );

  app.post(
    '/events',
    handleRoute(
      async (c) => {
        const staff = await requireManager(c);
        if ('response' in staff) return staff.response;

        const body = await c.req.json().catch(() => ({}));
        const parsed = createEventSchema.safeParse(body);

        if (!parsed.success) {
          throw new ApiError('INVALID_REQUEST', parsed.error.message, 400);
        }

        const payload = parsed.data;

        const created = await db.transaction(async (tx) => {
          const [event] = await tx
            .insert(events)
            .values({
              title: payload.title,
              eventDescription: normalizeDescription(payload.description),
              date: new Date(payload.date),
              location: payload.location ?? null,
              locationUrl: payload.locationUrl ?? null,
              meetingLink: payload.meetingLink ?? null,
              maxAttendees: payload.maxAttendees === undefined ? null : payload.maxAttendees,
              imageUrl: payload.imageUrl ?? null,
              tags: payload.tags ?? [],
              eventType: payload.eventType,
              priceInCents: payload.priceInCents ?? null,
              guestExperts: [],
            })
            .returning({
              id: events.id,
              title: events.title,
              eventDescription: events.eventDescription,
              date: events.date,
              location: events.location,
              locationUrl: events.locationUrl,
              maxAttendees: events.maxAttendees,
              meetingLink: events.meetingLink,
              imageUrl: events.imageUrl,
              tags: events.tags,
              eventType: events.eventType,
              priceInCents: events.priceInCents,
            });

          await tx.insert(libraryAssets).values({
            title: `${payload.title} - Recording`,
            description: `Recording from ${payload.title}`,
            fileType: 'Video',
            eventId: event.id,
            isPublic: false,
          });

          return event;
        });

        return c.json(
          {
            event: created,
          },
          201,
        );
      },
      'EVENT_CREATE_FAILED',
      'Unable to create event.',
      'create event',
    ),
  );

  // Update event with capacity checks
  app.put(
    '/events/:id',
    handleRoute(
      async (c) => {
        const staff = await requireManager(c);
        if ('response' in staff) return staff.response;

        const eventId = parseEventIdParam(c.req.param('id'));
        const body = await c.req.json().catch(() => ({}));
        const parsed = updateEventSchema.safeParse(body);

        if (!parsed.success) {
          throw new ApiError('INVALID_REQUEST', parsed.error.message, 400);
        }

        const updates = parsed.data;
        const updateValues: Record<string, unknown> = { updatedAt: new Date() };

        if (updates.title !== undefined) updateValues.title = updates.title;
        if (updates.description !== undefined)
          updateValues.eventDescription = normalizeDescription(updates.description);
        if (updates.date !== undefined) updateValues.date = new Date(updates.date);
        if (updates.location !== undefined) updateValues.location = updates.location ?? null;
        if (updates.locationUrl !== undefined)
          updateValues.locationUrl = updates.locationUrl ?? null;
        if (updates.meetingLink !== undefined)
          updateValues.meetingLink = updates.meetingLink ?? null;
        if (updates.maxAttendees !== undefined)
          updateValues.maxAttendees = updates.maxAttendees ?? null;
        if (updates.imageUrl !== undefined) updateValues.imageUrl = updates.imageUrl ?? null;
        if (updates.tags !== undefined) updateValues.tags = updates.tags ?? [];
        if (updates.eventType !== undefined) updateValues.eventType = updates.eventType;
        if (updates.priceInCents !== undefined) updateValues.priceInCents = updates.priceInCents;

        // If reducing capacity, verify it's valid
        if (updates.maxAttendees !== undefined) {
          const [{ count: currentAttendees }] = await db
            .select({ count: count(eventAttendees.id) })
            .from(eventAttendees)
            .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.status, 'active')));

          if (updates.maxAttendees !== null && updates.maxAttendees < Number(currentAttendees)) {
            throw new ApiError(
              'CAPACITY_TOO_LOW',
              `Cannot reduce capacity (${updates.maxAttendees}) below current attendees (${currentAttendees}).`,
              400,
            );
          }

          // Check track capacity
          const [trackEvent] = await db
            .select({ maxTrackBookings: tracks.maxTrackBookings })
            .from(trackEvents)
            .innerJoin(tracks, eq(tracks.id, trackEvents.trackId))
            .where(eq(trackEvents.eventId, eventId));

          if (
            trackEvent?.maxTrackBookings !== null &&
            trackEvent?.maxTrackBookings !== undefined &&
            updates.maxAttendees !== null &&
            updates.maxAttendees < trackEvent.maxTrackBookings
          ) {
            throw new ApiError(
              'CAPACITY_BELOW_TRACK_LIMIT',
              `Capacity cannot be less than track's maxTrackBookings (${trackEvent.maxTrackBookings}).`,
              400,
            );
          }
        }

        const [updated] = await db
          .update(events)
          .set(updateValues)
          .where(eq(events.id, eventId))
          .returning({
            id: events.id,
            title: events.title,
            eventDescription: events.eventDescription,
            date: events.date,
            location: events.location,
            locationUrl: events.locationUrl,
            maxAttendees: events.maxAttendees,
            meetingLink: events.meetingLink,
            imageUrl: events.imageUrl,
            tags: events.tags,
            eventType: events.eventType,
            priceInCents: events.priceInCents,
          });

        if (!updated) {
          throw new ApiError('EVENT_NOT_FOUND', 'Event not found.', 404);
        }

        return c.json({ event: updated });
      },
      'EVENT_UPDATE_FAILED',
      'Unable to update event.',
      'update event',
    ),
  );

  app.delete(
    '/events/:id',
    handleRoute(
      async (c) => {
        const admin = await requireAdmin(c);
        if ('response' in admin) return admin.response;

        const eventId = parseEventIdParam(c.req.param('id'));

        const deleted = await db
          .delete(events)
          .where(eq(events.id, eventId))
          .returning({ id: events.id });

        if (deleted.length === 0) {
          throw new ApiError('EVENT_NOT_FOUND', 'Event not found.', 404);
        }

        return c.json({ success: true });
      },
      'EVENT_DELETE_FAILED',
      'Unable to delete event.',
      'delete event',
    ),
  );

  // Register for event
  app.post(
    '/events/:id/register',
    handleRoute(
      async (c) => {
        const eventId = parseEventIdParam(c.req.param('id'));
        const session = await getSessionFromRequest(c);

        if (!session || !session.user) {
          throw new ApiError('UNAUTHORIZED', 'Authentication required.', 401);
        }

        const userId = session.user.id;

        const bodyParse = registerBodySchema.safeParse(await c.req.json().catch(() => ({})));
        if (!bodyParse.success) {
          throw new ApiError('INVALID_REQUEST', bodyParse.error.message, 400);
        }

        const result = await db.transaction(async (tx) => {
          const [event] = await tx
            .select({
              id: events.id,
              maxAttendees: events.maxAttendees,
              meetingLink: events.meetingLink,
              location: events.location,
              priceInCents: events.priceInCents,
            })
            .from(events)
            .where(eq(events.id, eventId))
            .for('update');

          if (!event) {
            throw new ApiError('EVENT_NOT_FOUND', 'Event not found.', 404);
          }

          // Check if event belongs to a track
          const [trackEvent] = await tx
            .select({
              trackId: tracks.id,
              allowIndividualBooking: tracks.allowIndividualBooking,
              singleBookingStart: tracks.singleBookingStart,
              singleBookingEnd: tracks.singleBookingEnd,
            })
            .from(trackEvents)
            .innerJoin(tracks, eq(tracks.id, trackEvents.trackId))
            .where(eq(trackEvents.eventId, eventId));

          // Enforce booking periods if in a track
          if (trackEvent) {
            // Check if individual booking is allowed for this track
            if (!trackEvent.allowIndividualBooking) {
              throw new ApiError(
                'INDIVIDUAL_BOOKING_DISABLED',
                'Individual event booking is not available for this track.',
                400,
              );
            }

            if (!trackEvent.singleBookingStart || !trackEvent.singleBookingEnd) {
              throw new ApiError(
                'BOOKING_NOT_OPEN',
                'Single event booking is not enabled for this track.',
                400,
              );
            }

            const now = new Date();
            if (now < trackEvent.singleBookingStart) {
              throw new ApiError(
                'BOOKING_NOT_OPEN',
                'Single booking period has not started.',
                400,
                {
                  opensAt: trackEvent.singleBookingStart,
                },
              );
            }
            if (now > trackEvent.singleBookingEnd) {
              throw new ApiError('BOOKING_PERIOD_CLOSED', 'Single booking period has ended.', 400);
            }
          }

          const [subscription] = await tx
            .select()
            .from(subscriptions)
            .where(
              and(
                eq(subscriptions.userId, userId),
                eq(subscriptions.status, 'active'),
                isNull(subscriptions.revokedAt),
                gte(subscriptions.endsAt, new Date()),
              ),
            );
          const isSubscriber = !!subscription;
          const isOnline = event.meetingLink && !event.location;
          const requiresPayment = (event.priceInCents ?? 0) > 0 && !(isSubscriber && isOnline);

          if (requiresPayment) {
            throw new ApiError(
              'PAYMENT_REQUIRED',
              'This event requires payment. Use the checkout flow.',
              402,
            );
          }

          // Lock existing registration row to prevent race conditions during re-registration
          const [existing] = await tx
            .select({ id: eventAttendees.id, status: eventAttendees.status })
            .from(eventAttendees)
            .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)))
            .for('update')
            .limit(1);

          if (existing) {
            // If already actively registered or pending refund, don't allow re-registration
            if (existing.status === 'active') {
              return { success: true, message: 'Already registered.', alreadyRegistered: true };
            }
            if (existing.status === 'refund_requested') {
              return {
                success: false,
                message: 'You have a pending refund request for this event.',
              };
            }
            // If cancelled, check capacity before re-activating
            // This prevents race condition where two concurrent re-registrations could exceed capacity
            if (event.maxAttendees !== null) {
              const [{ count: currentAttendees }] = await tx
                .select({ count: count(eventAttendees.id) })
                .from(eventAttendees)
                .where(
                  and(
                    eq(eventAttendees.eventId, eventId),
                    inArray(eventAttendees.status, ['active', 'refund_requested']),
                  ),
                );

              const [{ count: reservedCount }] = await tx
                .select({ count: sql<number>`count(*)::int` })
                .from(eventReservations)
                .where(
                  and(
                    eq(eventReservations.eventId, eventId),
                    gt(eventReservations.expiresAt, new Date()),
                  ),
                );

              if (Number(currentAttendees) + Number(reservedCount) >= event.maxAttendees) {
                throw new ApiError('EVENT_FULL', 'Event capacity reached.', 409);
              }
            }

            // Re-activate the cancelled registration
            await tx
              .update(eventAttendees)
              .set({
                status: 'active',
                cancelledAt: null,
                refundRequestedAt: null,
                adminNote: null,
                registeredAt: new Date(),
                sourceTrackBookingId: null,
              })
              .where(eq(eventAttendees.id, existing.id));
            return { success: true, message: 'You are now registered for the event.' };
          }

          const [{ count: currentAttendees }] = await tx
            .select({ count: count(eventAttendees.id) })
            .from(eventAttendees)
            .where(
              and(
                eq(eventAttendees.eventId, eventId),
                inArray(eventAttendees.status, ['active', 'refund_requested']),
              ),
            );

          const [{ count: reservedCount }] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(eventReservations)
            .where(
              and(
                eq(eventReservations.eventId, eventId),
                gt(eventReservations.expiresAt, new Date()),
              ),
            );

          if (
            event.maxAttendees !== null &&
            Number(currentAttendees) + Number(reservedCount) >= event.maxAttendees
          ) {
            throw new ApiError('EVENT_FULL', 'Event capacity reached.', 409);
          }

          await tx.insert(eventAttendees).values({
            eventId,
            userId,
            sourceTrackBookingId: null,
          });

          return { success: true, message: 'registered' };
        });

        return c.json(result);
      },
      'EVENT_REGISTRATION_FAILED',
      'Unable to register for event.',
      'register event',
    ),
  );

  app.delete(
    '/events/:id/register',
    handleRoute(
      async (c) => {
        const eventId = parseEventIdParam(c.req.param('id'));
        const session = await getSessionFromRequest(c);

        if (!session || !session.user) {
          throw new ApiError(
            'UNAUTHORIZED',
            'Authentication required to cancel registration.',
            401,
          );
        }

        const userId = session.user.id;

        const result = await db.transaction(async (tx) => {
          const [registration] = await tx
            .select({
              id: eventAttendees.id,
              status: eventAttendees.status,
              pricePaidCents: eventAttendees.pricePaidCents,
            })
            .from(eventAttendees)
            .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)))
            .for('update')
            .limit(1);

          if (!registration) {
            return {
              success: false,
              message: 'You were not registered for this event.',
            };
          }

          if (registration.status === 'cancelled') {
            return {
              success: false,
              message: 'Your registration was already cancelled.',
            };
          }

          if (registration.status === 'refund_requested') {
            return {
              success: false,
              message: 'Your refund request is already pending review.',
            };
          }

          const isPaidRegistration = registration.pricePaidCents && registration.pricePaidCents > 0;

          if (isPaidRegistration) {
            await tx
              .update(eventAttendees)
              .set({
                status: 'refund_requested',
                refundRequestedAt: new Date(),
              })
              .where(eq(eventAttendees.id, registration.id));

            return {
              success: true,
              status: 'refund_requested' as const,
              wasPaid: true,
              message:
                'Your refund request has been submitted. Our team will review and process it shortly.',
            };
          }

          await tx
            .update(eventAttendees)
            .set({
              status: 'cancelled',
              cancelledAt: new Date(),
            })
            .where(eq(eventAttendees.id, registration.id));

          return {
            success: true,
            status: 'cancelled' as const,
            wasPaid: false,
            message: 'Your registration has been cancelled.',
          };
        });

        return c.json(result);
      },
      'EVENT_CANCELLATION_FAILED',
      'Unable to cancel registration.',
      'cancel registration',
    ),
  );

  // Admin: List cancellation/refund requests for an event
  app.get(
    '/events/:id/cancellation-requests',
    handleRoute(
      async (c) => {
        const admin = await requireAdmin(c);
        if ('response' in admin) return admin.response;

        const eventIdParam = c.req.param('id');
        const eventIdParsed = uuidParamSchema.safeParse(eventIdParam);
        if (!eventIdParsed.success) {
          throw new ApiError('INVALID_PARAM', 'Event ID must be a valid UUID.', 400);
        }
        const eventId = eventIdParsed.data;
        const parsed = paginationQuerySchema.safeParse({
          page: c.req.query('page'),
          pageSize: c.req.query('pageSize'),
        });
        if (!parsed.success) {
          throw new ApiError('INVALID_QUERY', parsed.error.message, 400);
        }
        const { page, pageSize } = parsed.data;
        const offset = (page - 1) * pageSize;

        const [event] = await db
          .select({ id: events.id })
          .from(events)
          .where(eq(events.id, eventId))
          .limit(1);

        if (!event) {
          throw new ApiError('EVENT_NOT_FOUND', 'Event not found.', 404);
        }

        const totalResult = await db
          .select({ value: count(eventAttendees.id) })
          .from(eventAttendees)
          .where(
            and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.status, 'refund_requested')),
          );

        const requests = await db
          .select({
            registrationId: eventAttendees.id,
            userId: users.id,
            email: users.email,
            name: users.name,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            pricePaidCents: eventAttendees.pricePaidCents,
            refundRequestedAt: eventAttendees.refundRequestedAt,
          })
          .from(eventAttendees)
          .leftJoin(users, eq(eventAttendees.userId, users.id))
          .leftJoin(profiles, eq(users.id, profiles.id))
          .where(
            and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.status, 'refund_requested')),
          )
          .orderBy(desc(eventAttendees.refundRequestedAt))
          .limit(pageSize)
          .offset(offset);

        return c.json({
          items: requests,
          pagination: {
            page,
            pageSize,
            total: Number(totalResult?.[0]?.value ?? 0),
          },
        });
      },
      'CANCELLATION_LIST_FAILED',
      'Unable to load cancellation requests.',
      'list cancellation requests',
    ),
  );

  // Admin: Approve a cancellation/refund request
  app.post(
    '/events/:id/cancellation-requests/:regId/approve',
    handleRoute(
      async (c) => {
        const admin = await requireAdmin(c);
        if ('response' in admin) return admin.response;

        const eventIdParam = c.req.param('id');
        const registrationIdParam = c.req.param('regId');
        const eventIdParsed = uuidParamSchema.safeParse(eventIdParam);
        const registrationIdParsed = uuidParamSchema.safeParse(registrationIdParam);
        if (!eventIdParsed.success || !registrationIdParsed.success) {
          throw new ApiError('INVALID_PARAM', 'Invalid event or registration ID.', 400);
        }
        const eventId = eventIdParsed.data;
        const registrationId = registrationIdParsed.data;

        const result = await db.transaction(async (tx) => {
          const [registration] = await tx
            .select({ id: eventAttendees.id, status: eventAttendees.status })
            .from(eventAttendees)
            .where(and(eq(eventAttendees.id, registrationId), eq(eventAttendees.eventId, eventId)))
            .for('update')
            .limit(1);

          if (!registration) {
            throw new ApiError('REGISTRATION_NOT_FOUND', 'Registration not found.', 404);
          }

          if (registration.status !== 'refund_requested') {
            throw new ApiError('INVALID_STATUS', 'This registration is not pending refund.', 400);
          }

          await tx
            .update(eventAttendees)
            .set({
              status: 'cancelled',
              cancelledAt: new Date(),
            })
            .where(eq(eventAttendees.id, registrationId));

          return { success: true, message: 'Refund approved and registration cancelled.' };
        });

        return c.json(result);
      },
      'CANCELLATION_APPROVE_FAILED',
      'Unable to approve cancellation request.',
      'approve cancellation request',
    ),
  );

  // Admin: Reject a cancellation/refund request
  app.post(
    '/events/:id/cancellation-requests/:regId/reject',
    handleRoute(
      async (c) => {
        const admin = await requireAdmin(c);
        if ('response' in admin) return admin.response;

        const eventIdParam = c.req.param('id');
        const registrationIdParam = c.req.param('regId');
        const eventIdParsed = uuidParamSchema.safeParse(eventIdParam);
        const registrationIdParsed = uuidParamSchema.safeParse(registrationIdParam);
        if (!eventIdParsed.success || !registrationIdParsed.success) {
          throw new ApiError('INVALID_PARAM', 'Invalid event or registration ID.', 400);
        }
        const eventId = eventIdParsed.data;
        const registrationId = registrationIdParsed.data;

        const bodyParse = rejectionReasonSchema.safeParse(await c.req.json().catch(() => ({})));
        if (!bodyParse.success) {
          throw new ApiError('INVALID_REQUEST', bodyParse.error.message, 400);
        }
        const reason = bodyParse.data.reason?.trim() || null;

        const result = await db.transaction(async (tx) => {
          const [registration] = await tx
            .select({ id: eventAttendees.id, status: eventAttendees.status })
            .from(eventAttendees)
            .where(and(eq(eventAttendees.id, registrationId), eq(eventAttendees.eventId, eventId)))
            .for('update')
            .limit(1);

          if (!registration) {
            throw new ApiError('REGISTRATION_NOT_FOUND', 'Registration not found.', 404);
          }

          if (registration.status !== 'refund_requested') {
            throw new ApiError('INVALID_STATUS', 'This registration is not pending refund.', 400);
          }

          await tx
            .update(eventAttendees)
            .set({
              status: 'active',
              refundRequestedAt: null,
              adminNote: reason,
            })
            .where(eq(eventAttendees.id, registrationId));

          return {
            success: true,
            message: 'Refund request rejected. Registration restored.',
          };
        });

        return c.json(result);
      },
      'CANCELLATION_REJECT_FAILED',
      'Unable to reject cancellation request.',
      'reject cancellation request',
    ),
  );
}
