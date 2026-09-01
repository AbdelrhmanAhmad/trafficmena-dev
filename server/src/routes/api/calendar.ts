import type { Hono } from 'hono';
import {
  buildEventCalendarData,
  buildGoogleCalendarUrl,
  buildIcsCalendarBody,
} from '../../services/eventCalendar.js';
import {
  assertEventCalendarAccess,
  assertTrackCalendarAccess,
  loadEventCalendarSource,
  loadTrackCalendarEvents,
} from '../../services/eventCalendarAccess.js';
import { ApiError, handleRoute } from '../../utils/errors.js';
import { resolveLocaleFromRequest } from '../../utils/locale.js';
import { getSessionFromRequest } from '../../utils/session.js';

const uuidParamSchema = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuid(value: string): string | null {
  return uuidParamSchema.test(value) ? value : null;
}

export function registerCalendarRoutes(app: Hono) {
  app.get(
    '/events/:id/calendar',
    handleRoute(
      async (c) => {
        const eventId = parseUuid(c.req.param('id') ?? '');
        if (!eventId) {
          throw new ApiError('INVALID_PARAM', 'Invalid event id.', 400);
        }

        const session = await getSessionFromRequest(c);
        if (!session?.user?.id) {
          throw new ApiError('UNAUTHORIZED', 'Authentication required.', 401);
        }

        await assertEventCalendarAccess(session.user.id, eventId);
        const locale = resolveLocaleFromRequest(c);
        const source = await loadEventCalendarSource(eventId, locale);
        if (!source) {
          throw new ApiError('NOT_FOUND', 'Event not found.', 404);
        }

        const data = buildEventCalendarData(source, undefined, locale);
        return c.json({
          googleCalendarUrl: buildGoogleCalendarUrl(data),
          icsPath: `/api/events/${eventId}/calendar.ics`,
        });
      },
      'CALENDAR_META_FAILED',
      'Unable to load calendar options.',
      'event calendar meta',
    ),
  );

  app.get(
    '/events/:id/calendar.ics',
    handleRoute(
      async (c) => {
        const eventId = parseUuid(c.req.param('id') ?? '');
        if (!eventId) {
          throw new ApiError('INVALID_PARAM', 'Invalid event id.', 400);
        }

        const session = await getSessionFromRequest(c);
        if (!session?.user?.id) {
          throw new ApiError('UNAUTHORIZED', 'Authentication required.', 401);
        }

        await assertEventCalendarAccess(session.user.id, eventId);
        const locale = resolveLocaleFromRequest(c);
        const source = await loadEventCalendarSource(eventId, locale);
        if (!source) {
          throw new ApiError('NOT_FOUND', 'Event not found.', 404);
        }

        const data = buildEventCalendarData(source, undefined, locale);
        const body = buildIcsCalendarBody([data]);
        c.header('Content-Type', 'text/calendar; charset=utf-8');
        c.header('Content-Disposition', `attachment; filename="trafficmena-event-${eventId}.ics"`);
        return c.body(body);
      },
      'CALENDAR_ICS_FAILED',
      'Unable to generate calendar file.',
      'event calendar ics',
    ),
  );

  app.get(
    '/tracks/:id/calendar',
    handleRoute(
      async (c) => {
        const trackId = parseUuid(c.req.param('id') ?? '');
        if (!trackId) {
          throw new ApiError('INVALID_PARAM', 'Invalid track id.', 400);
        }

        const session = await getSessionFromRequest(c);
        if (!session?.user?.id) {
          throw new ApiError('UNAUTHORIZED', 'Authentication required.', 401);
        }

        await assertTrackCalendarAccess(session.user.id, trackId);
        const locale = resolveLocaleFromRequest(c);
        const sources = await loadTrackCalendarEvents(trackId, locale);
        const events = sources.map((source) => buildEventCalendarData(source, undefined, locale));

        return c.json({
          sessions: events.map((data) => ({
            eventId: data.id,
            title: data.title,
            googleCalendarUrl: buildGoogleCalendarUrl(data),
          })),
          icsPath: `/api/tracks/${trackId}/calendar.ics`,
        });
      },
      'TRACK_CALENDAR_META_FAILED',
      'Unable to load track calendar options.',
      'track calendar meta',
    ),
  );

  app.get(
    '/tracks/:id/calendar.ics',
    handleRoute(
      async (c) => {
        const trackId = parseUuid(c.req.param('id') ?? '');
        if (!trackId) {
          throw new ApiError('INVALID_PARAM', 'Invalid track id.', 400);
        }

        const session = await getSessionFromRequest(c);
        if (!session?.user?.id) {
          throw new ApiError('UNAUTHORIZED', 'Authentication required.', 401);
        }

        await assertTrackCalendarAccess(session.user.id, trackId);
        const locale = resolveLocaleFromRequest(c);
        const sources = await loadTrackCalendarEvents(trackId, locale);
        if (sources.length === 0) {
          throw new ApiError('NOT_FOUND', 'No published sessions found for this track.', 404);
        }

        const events = sources.map((source) => buildEventCalendarData(source, undefined, locale));
        const body = buildIcsCalendarBody(events, '-//TrafficMENA//Track//EN');
        c.header('Content-Type', 'text/calendar; charset=utf-8');
        c.header('Content-Disposition', `attachment; filename="trafficmena-track-${trackId}.ics"`);
        return c.body(body);
      },
      'TRACK_CALENDAR_ICS_FAILED',
      'Unable to generate track calendar file.',
      'track calendar ics',
    ),
  );
}
