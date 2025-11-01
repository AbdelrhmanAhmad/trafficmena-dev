import { and, count, eq, gte, ilike, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { eventAttendees, events } from '../../db/schema/index.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { requireAdmin, requireManager } from './utils.js';

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
      const parsed = listQuerySchema.safeParse({
        page: c.req.query('page'),
        pageSize: c.req.query('pageSize'),
        search: c.req.query('search'),
        type: c.req.query('type'),
        upcoming: c.req.query('upcoming'),
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

      const { page, pageSize, search, type, upcoming } = parsed.data;
      const filters: any[] = [];

      if (type) {
        filters.push(eq(events.eventType, type));
      }

      if (upcoming) {
        filters.push(gte(events.date, new Date()));
      }

      if (search) {
        filters.push(ilike(events.title, `%${search}%`));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      const totalResult = await (whereClause
        ? db
            .select({ value: count(events.id) })
            .from(events)
            .where(whereClause)
        : db.select({ value: count(events.id) }).from(events));

      const offset = (page - 1) * pageSize;

      const baseItemsQuery = db
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
        .leftJoin(eventAttendees, eq(events.id, eventAttendees.eventId));

      const filteredItemsQuery = whereClause ? baseItemsQuery.where(whereClause) : baseItemsQuery;

      const items = await filteredItemsQuery
        .groupBy(
          events.id,
          events.title,
          events.eventDescription,
          events.date,
          events.location,
          events.maxAttendees,
          events.meetingLink,
          events.imageUrl,
          events.tags,
          events.eventType,
        )
        .orderBy(events.date)
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
    } catch (error) {
      console.error('[api:events.list] failed to load events', error);
      return c.json(
        {
          error: {
            code: 'EVENTS_FETCH_FAILED',
            message: 'Unable to load events from the database.',
          },
        },
        500,
      );
    }
  });

  app.get('/events/:id', async (c) => {
    const eventId = c.req.param('id');
    const session = await getSessionFromRequest(c);
    const viewerId = session?.user?.id;

    const eventRow = await db
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

    const event = eventRow[0];

    if (!event) {
      return c.json(
        {
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'Event not found',
          },
        },
        404,
      );
    }

    const [{ value: attendeeCount }] = await db
      .select({ value: count(eventAttendees.id) })
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId));

    let attending = false;
    if (viewerId) {
      const existing = await db
        .select({ id: eventAttendees.id })
        .from(eventAttendees)
        .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, viewerId)))
        .limit(1);
      attending = existing.length > 0;
    }

    return c.json({
      ...event,
      attendeeCount: Number(attendeeCount ?? 0),
      attending,
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

    const [created] = await db
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

    return c.json(
      {
        event: created,
      },
      201,
    );
  });

  app.put('/events/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const eventId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = updateEventSchema.safeParse(body);

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

    const updates = parsed.data;
    const updateValues: Record<string, unknown> = {};

    if (updates.title !== undefined) updateValues.title = updates.title;
    if (updates.description !== undefined)
      updateValues.eventDescription = normalizeDescription(updates.description);
    if (updates.date !== undefined) updateValues.date = new Date(updates.date);
    if (updates.location !== undefined) updateValues.location = updates.location ?? null;
    if (updates.meetingLink !== undefined) updateValues.meetingLink = updates.meetingLink ?? null;
    if (updates.maxAttendees !== undefined)
      updateValues.maxAttendees = updates.maxAttendees ?? null;
    if (updates.imageUrl !== undefined) updateValues.imageUrl = updates.imageUrl ?? null;
    if (updates.tags !== undefined) updateValues.tags = updates.tags ?? [];
    if (updates.eventType !== undefined) updateValues.eventType = updates.eventType;

    updateValues.updatedAt = new Date();

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

    return c.json({ event: updated });
  });

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

  app.post('/events/:id/register', async (c) => {
    const eventId = c.req.param('id');
    const session = await getSessionFromRequest(c);

    if (!session || !session.user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to register for events.',
          },
        },
        401,
      );
    }

    const bodyParse = registerBodySchema.safeParse(await c.req.json().catch(() => ({})));
    if (!bodyParse.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: bodyParse.error.message,
          },
        },
        400,
      );
    }

    const [eventRecord] = await db
      .select({
        id: events.id,
        maxAttendees: events.maxAttendees,
        attendeeCount: sql<number>`COALESCE(COUNT(${eventAttendees.id}), 0)`,
      })
      .from(events)
      .leftJoin(eventAttendees, eq(eventAttendees.eventId, events.id))
      .where(eq(events.id, eventId))
      .groupBy(events.id);

    if (!eventRecord) {
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

    const existing = await db
      .select({ id: eventAttendees.id })
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, session.user.id)))
      .limit(1);

    if (existing.length > 0) {
      return c.json({
        success: true,
        message: 'You are already registered for this event.',
      });
    }

    const maxAttendees = eventRecord.maxAttendees ?? null;
    const attendeeCount = Number(eventRecord.attendeeCount ?? 0);

    if (maxAttendees !== null && attendeeCount >= maxAttendees) {
      return c.json(
        {
          error: {
            code: 'EVENT_FULL',
            message: 'This event has reached its maximum capacity.',
          },
        },
        409,
      );
    }

    await db.insert(eventAttendees).values({
      eventId,
      userId: session.user.id,
    });

    return c.json({
      success: true,
      message: 'You have been registered for the event.',
    });
  });

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
