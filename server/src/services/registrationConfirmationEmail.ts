import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { payments } from '../db/schema/index.js';
import type { AppLocale } from '../utils/locale.js';
import { DEFAULT_LOCALE, parseAppLocale } from '../utils/locale.js';
import {
  buildApiCalendarIcsUrl,
  buildEventCalendarData,
  buildGoogleCalendarUrl,
  buildIcsCalendarBody,
  type EventCalendarSource,
} from './eventCalendar.js';
import {
  loadEventCalendarSource,
  loadTrackCalendarEvents,
  loadTrackTitle,
} from './eventCalendarAccess.js';
import { notifyBusinessEvent } from './notifications/notify.js';

type SendEventRegistrationConfirmationArgs = {
  userId: string;
  event: EventCalendarSource;
  locale?: AppLocale;
};

type SendTrackRegistrationConfirmationArgs = {
  userId: string;
  trackId: string;
  trackTitle: string;
  events: EventCalendarSource[];
  locale?: AppLocale;
};

function appBase(): string {
  return env.APP_BASE_URL.replace(/\/$/, '');
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'event';
}

export async function notifyEventRegistrationConfirmation(
  args: SendEventRegistrationConfirmationArgs,
): Promise<void> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const calendarData = buildEventCalendarData(args.event, undefined, locale);
  const googleCalendarUrl = buildGoogleCalendarUrl(calendarData);
  const icsFilename = `trafficmena-${sanitizeFilename(args.event.title)}.ics`;
  const icsContent = buildIcsCalendarBody([calendarData]);
  const base = appBase();

  await notifyBusinessEvent({
    type: 'event_registration',
    entityType: 'event',
    entityId: args.event.id,
    recipientUserIds: [args.userId],
    templateKey: 'event_registration',
    locale,
    payload: {
      eventTitle: args.event.title,
      eventUrl: `${base}/meetups/${args.event.id}`,
      calendarUrl: googleCalendarUrl,
      googleCalendarUrl,
      icsDownloadUrl: buildApiCalendarIcsUrl('event', args.event.id),
      webCalendarUrl: `${base}/thank-you-event/${args.event.id}`,
      icsContent,
      icsFilename,
      attachments: [{ filename: icsFilename, content: icsContent }],
    },
  });
}

export async function notifyTrackRegistrationConfirmation(
  args: SendTrackRegistrationConfirmationArgs,
): Promise<void> {
  if (args.events.length === 0) return;

  const locale = args.locale ?? DEFAULT_LOCALE;
  const calendarEvents = args.events.map((event) => buildEventCalendarData(event, undefined, locale));
  const firstSession = calendarEvents[0];
  const googleCalendarUrl = buildGoogleCalendarUrl(firstSession);
  const base = appBase();
  const trackThankYouUrl = `${base}/thank-you-track/${args.trackId}`;
  const icsFilename = `trafficmena-${sanitizeFilename(args.trackTitle)}-sessions.ics`;
  const icsContent = buildIcsCalendarBody(calendarEvents, '-//TrafficMENA//Track//EN');

  await notifyBusinessEvent({
    type: 'track_registration',
    entityType: 'track',
    entityId: args.trackId,
    recipientUserIds: [args.userId],
    templateKey: 'track_registration',
    locale,
    payload: {
      trackTitle: args.trackTitle,
      trackUrl: `${base}/tracks/${args.trackId}`,
      calendarUrl: googleCalendarUrl,
      googleCalendarUrl,
      icsDownloadUrl: buildApiCalendarIcsUrl('track', args.trackId),
      webCalendarUrl: trackThankYouUrl,
      icsContent,
      icsFilename,
      attachments: [{ filename: icsFilename, content: icsContent }],
    },
  });
}

export function queueEventRegistrationConfirmation(
  userId: string,
  eventId: string,
  locale: AppLocale = DEFAULT_LOCALE,
): void {
  void loadEventCalendarSource(eventId, locale)
    .then(async (source) => {
      if (!source) return;
      await notifyEventRegistrationConfirmation({ userId, event: source, locale });
    })
    .catch((error) => {
      console.error('[notifications]', error);
    });
}

export function queueTrackRegistrationConfirmation(
  userId: string,
  trackId: string,
  locale: AppLocale = DEFAULT_LOCALE,
): void {
  void (async () => {
    const trackTitle = await loadTrackTitle(trackId, locale);
    const events = await loadTrackCalendarEvents(trackId, locale);
    if (!trackTitle || events.length === 0) return;
    await notifyTrackRegistrationConfirmation({
      userId,
      trackId,
      trackTitle,
      events,
      locale,
    });
  })().catch((error) => {
    console.error('[notifications]', error);
  });
}

export function queuePaymentRegistrationConfirmation(
  paymentId: string,
  locale: AppLocale = DEFAULT_LOCALE,
): void {
  void (async () => {
    const [payment] = await db
      .select({
        userId: payments.userId,
        itemType: payments.itemType,
        itemId: payments.itemId,
        status: payments.status,
        checkoutLocale: payments.checkoutLocale,
      })
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment || payment.status !== 'paid') return;

    const effectiveLocale = parseAppLocale(payment.checkoutLocale) ?? locale;

    if (payment.itemType === 'event' && payment.itemId) {
      const source = await loadEventCalendarSource(payment.itemId, effectiveLocale);
      if (source) {
        await notifyEventRegistrationConfirmation({
          userId: payment.userId,
          event: source,
          locale: effectiveLocale,
        });
      }
      return;
    }

    if (payment.itemType === 'track' && payment.itemId) {
      const trackTitle = await loadTrackTitle(payment.itemId, effectiveLocale);
      const events = await loadTrackCalendarEvents(payment.itemId, effectiveLocale);
      if (trackTitle && events.length > 0) {
        await notifyTrackRegistrationConfirmation({
          userId: payment.userId,
          trackId: payment.itemId,
          trackTitle,
          events,
          locale: effectiveLocale,
        });
      }
    }
  })().catch((error) => {
    console.error('[notifications]', error);
  });
}
