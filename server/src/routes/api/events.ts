import { and, count, desc, eq, gte, ilike, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import {
  eventAttendees,
  events,
  libraryAssets,
  profiles,
  trackEvents,
  tracks,
  users,
} from '../../db/schema/index.js';
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

const registerBodySchema = z.object({});

const isoDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid date value.' })
  .transform((value) => new Date(value));

const meetingLinkSchema = z
  .string()
  .url('Provide a valid URL.')
  .max(500, 'Meeting link is too long.')
  .optional()
  .or(z.literal('').transform(() => undefined))
  .or(z.null().transform(() => undefined));

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

const baseEventSchema = z.object({
  title: z.string().trim().min(3, 'Title is required.').max(180),
  description: z.string().trim().min(1, 'Description is required.').max(8000),
  date: isoDateSchema,
  location: stringOrNull,
  meetingLink: meetingLinkSchema,
  maxAttendees: maxAttendeesSchema,
  imageUrl: imageUrlSchema,
  tags: tagsSchema,
  eventType: z.enum(['Event', 'Meetup', 'Mastermind', 'Retreat']).default('Event'),
});

const createEventSchema = baseEventSchema;
const updateEventSchema = baseEventSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

export function registerEventRoutes(app: Hono) {
  app.get('/events', async (c) => {
    try {
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
        const hiddenTrackEvents = db
          .select({ id: trackEvents.eventId })
          .from(trackEvents)
          .innerJoin(tracks, eq(tracks.id, trackEvents.trackId))
          .where(eq(tracks.isPublished, false));

        // This is a bit complex in SQL, typically we'd do NOT IN or LEFT JOIN check.
        // For simplicity with Drizzle/MVP, we can filter out IDs if the list is small,
        // but robustly: events where ID NOT IN (hiddenTrackEvents)
        // Drizzle `notInArray` might work if subquery is supported, else CTE or Join.
        // Let's use a WHERE NOT EXISTS or join strategy on the main query for performance.
        // Actually, easiest is:
        // filters.push(sql`NOT EXISTS (
        //   SELECT 1 FROM track_events te
        //   JOIN tracks t ON t.id = te.track_id
        //   WHERE te.event_id = events.id AND t.is_published = false
        // )`);
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
          maxAttendees: events.maxAttendees,
          meetingLink: events.meetingLink,
          imageUrl: events.imageUrl,
          tags: events.tags,
          eventType: events.eventType,
          attendeeCount: sql<number>`COALESCE(COUNT(${eventAttendees.id}), 0)`,
        })
        .from(events)
        .leftJoin(eventAttendees, eq(events.id, eventAttendees.eventId))
        .where(whereClause)
        .groupBy(events.id)
        .orderBy(events.date)
        .limit(pageSize)
        .offset(offset);

      const sanitizedItems = items.map(({ meetingLink, ...rest }) => ({
        ...rest,
        meetingLink: null,
      }));

      return c.json({
        items: sanitizedItems,
        pagination: {
          page,
          pageSize,
          total: Number(totalResult?.value ?? 0),
        },
      });
    } catch (error) {
      // Using simpler error log here or delegate to handleRoute if I wrapped it,
      // but for now keeping compatible with current style or updating.
      // The plan implies using handleRoute, but maybe I'll mix for now to minimize diffs.
      console.error('[api:events.list] failed to load events', error);
      return c.json(
        { error: { code: 'EVENTS_FETCH_FAILED', message: 'Unable to load events.' } },
        500,
      );
    }
  });

  app.get('/events/:id', async (c) => {
    const eventId = c.req.param('id');
    const session = await getSessionFromRequest(c);
    const viewerId = session?.user?.id;

    // Get event details
    const [event] = await db
      .select({
        id: events.id,
        title: events.title,
        eventDescription: events.eventDescription,
        date: events.date,
        location: events.location,
        maxAttendees: events.maxAttendees,
        meetingLink: events.meetingLink,
        imageUrl: events.imageUrl,
        tags: events.tags,
        eventType: events.eventType,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      return c.json({ error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' } }, 404);
    }

    // Check if event is part of a track (unpublished tracks hide events from non-staff)
    // Also fetch track booking info
    const [trackInfo] = await db
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
      .limit(1);

    const role = viewerId ? await getOptionalUserRole(viewerId) : null;
    const isStaff = role && ['owner', 'admin', 'manager'].includes(role);

    // Hide if track is strictly unpublished and user is not staff
    // Note: If event is NOT in a track, it is standalone and visible.
    if (trackInfo && !trackInfo.isPublished && !isStaff) {
      return c.json({ error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' } }, 404);
    }

    const [{ value: attendeeCount }] = await db
      .select({ value: count(eventAttendees.id) })
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId));

    let attending = false;
    if (viewerId) {
      const [existing] = await db
        .select({ id: eventAttendees.id })
        .from(eventAttendees)
        .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, viewerId)))
        .limit(1);
      attending = !!existing;
    }

    const canAccessMeetingLink = attending || isStaff;

    return c.json({
      ...event,
      attendeeCount: Number(attendeeCount ?? 0),
      attending,
      meetingLink: canAccessMeetingLink ? event.meetingLink : null,
      trackInfo: trackInfo
        ? {
            id: trackInfo.id,
            title: trackInfo.title,
            trackBookingStart: trackInfo.trackBookingStart,
            trackBookingEnd: trackInfo.trackBookingEnd,
            singleBookingStart: trackInfo.singleBookingStart,
            singleBookingEnd: trackInfo.singleBookingEnd,
          }
        : null,
    });
  });

  app.get('/events/:id/attendees', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const eventId = c.req.param('id');
    const parsed = listQuerySchema.safeParse({
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
    });

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_QUERY',
            message: parsed.error.message,
          },
        },
        400,
      );
    }

    const { page, pageSize } = parsed.data;
    const offset = (page - 1) * pageSize;

    // Verify event exists first
    const [eventExists] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!eventExists) {
      return c.json({ error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' } }, 404);
    }

    const totalResult = await db
      .select({ value: count(eventAttendees.id) })
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId));

    const items = await db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        phoneNumber: profiles.phoneNumber,
        registeredAt: eventAttendees.registeredAt,
      })
      .from(eventAttendees)
      .leftJoin(users, eq(eventAttendees.userId, users.id))
      .leftJoin(profiles, eq(users.id, profiles.id))
      .where(eq(eventAttendees.eventId, eventId))
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
  });

  app.post('/events', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = await c.req.json().catch(() => ({}));
    const parsed = createEventSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: parsed.error.message,
          },
        },
        400,
      );
    }

    const payload = parsed.data;

    // Use transaction to ensure event + auto-created asset are atomic
    const created = await db.transaction(async (tx) => {
      const [event] = await tx
        .insert(events)
        .values({
          title: payload.title,
          eventDescription: normalizeDescription(payload.description),
          date: new Date(payload.date),
          location: payload.location ?? null,
          meetingLink: payload.meetingLink ?? null,
          maxAttendees: payload.maxAttendees === undefined ? null : payload.maxAttendees,
          imageUrl: payload.imageUrl ?? null,
          tags: payload.tags ?? [],
          eventType: payload.eventType,
          guestExperts: [],
        })
        .returning({
          id: events.id,
          title: events.title,
          eventDescription: events.eventDescription,
          date: events.date,
          location: events.location,
          maxAttendees: events.maxAttendees,
          meetingLink: events.meetingLink,
          imageUrl: events.imageUrl,
          tags: events.tags,
          eventType: events.eventType,
        });

      // Auto-create draft library asset for event recordings
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
  });

  // Update event with capacity checks
  app.put(
    '/events/:id',
    handleRoute(
      async (c) => {
        const staff = await requireManager(c);
        if ('response' in staff) return staff.response;

        const eventId = c.req.param('id');
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
        if (updates.meetingLink !== undefined)
          updateValues.meetingLink = updates.meetingLink ?? null;
        if (updates.maxAttendees !== undefined)
          updateValues.maxAttendees = updates.maxAttendees ?? null;
        if (updates.imageUrl !== undefined) updateValues.imageUrl = updates.imageUrl ?? null;
        if (updates.tags !== undefined) updateValues.tags = updates.tags ?? [];
        if (updates.eventType !== undefined) updateValues.eventType = updates.eventType;

        // If reducing capacity, verify it's valid
        if (updates.maxAttendees !== undefined) {
          const [{ count: currentAttendees }] = await db
            .select({ count: count(eventAttendees.id) })
            .from(eventAttendees)
            .where(eq(eventAttendees.eventId, eventId));

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
            maxAttendees: events.maxAttendees,
            meetingLink: events.meetingLink,
            imageUrl: events.imageUrl,
            tags: events.tags,
            eventType: events.eventType,
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

  app.delete('/events/:id', async (c) => {
    const admin = await requireAdmin(c);
    if ('response' in admin) return admin.response;

    const eventId = c.req.param('id');

    const deleted = await db
      .delete(events)
      .where(eq(events.id, eventId))
      .returning({ id: events.id });

    if (deleted.length === 0) {
      return c.json(
        {
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'Event not found.',
          },
        },
        404,
      );
    }

    return c.json({ success: true });
  });

  // Register for event
  app.post(
    '/events/:id/register',
    handleRoute(
      async (c) => {
        const eventId = c.req.param('id');
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

          const [existing] = await tx
            .select({ id: eventAttendees.id })
            .from(eventAttendees)
            .where(
              and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)),
            )
            .limit(1);

          if (existing) {
            return { success: true, message: 'Already registered.', alreadyRegistered: true };
          }

          const [{ count: currentAttendees }] = await tx
            .select({ count: count(eventAttendees.id) })
            .from(eventAttendees)
            .where(eq(eventAttendees.eventId, eventId));

          if (event.maxAttendees !== null && Number(currentAttendees) >= event.maxAttendees) {
            throw new ApiError('EVENT_FULL', 'Event capacity reached.', 409);
          }

          await tx.insert(eventAttendees).values({
            eventId,
            userId,
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

  app.delete('/events/:id/register', async (c) => {
    const eventId = c.req.param('id');
    const session = await getSessionFromRequest(c);

    if (!session || !session.user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to cancel registration.',
          },
        },
        401,
      );
    }

    const deleted = await db
      .delete(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, session.user.id)))
      .returning({ id: eventAttendees.id });

    if (deleted.length === 0) {
      return c.json({
        success: false,
        message: 'You were not registered for this event.',
      });
    }

    return c.json({
      success: true,
      message: 'Your registration has been cancelled.',
    });
  });
}
