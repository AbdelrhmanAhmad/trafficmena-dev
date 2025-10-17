import { and, count, eq, gte, ilike, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { eventAttendees, events } from '../../db/schema/index.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { notImplemented } from './utils.js';

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

export function registerEventRoutes(app: Hono) {
  app.get('/events', async (c) => {
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

  app.post('/events', (c) => notImplemented(c, { feature: 'events.create' }));
  app.put('/events/:id', (c) => notImplemented(c, { feature: 'events.update' }));
  app.delete('/events/:id', (c) => notImplemented(c, { feature: 'events.delete' }));

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
