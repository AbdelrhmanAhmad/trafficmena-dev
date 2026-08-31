import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { payments } from '../db/schema/index.js';
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
  loadUserEmail,
} from './eventCalendarAccess.js';
import { sendRegistrationConfirmationEmail } from './email.js';

type SendEventRegistrationConfirmationArgs = {
  email: string;
  event: EventCalendarSource;
};

type SendTrackRegistrationConfirmationArgs = {
  email: string;
  trackId: string;
  trackTitle: string;
  events: EventCalendarSource[];
};

export async function notifyEventRegistrationConfirmation(
  args: SendEventRegistrationConfirmationArgs,
): Promise<void> {
  const calendarData = buildEventCalendarData(args.event);
  const googleCalendarUrl = buildGoogleCalendarUrl(calendarData);
  const icsAttachment = {
    filename: `trafficmena-${sanitizeFilename(args.event.title)}.ics`,
    content: buildIcsCalendarBody([calendarData]),
  };

  await sendRegistrationConfirmationEmail({
    to: args.email,
    subject: `You're registered: ${args.event.title}`,
    headline: "You're registered!",
    intro: `Your registration for ${args.event.title} is confirmed.`,
    googleCalendarUrl,
    webCalendarUrl: `${env.APP_BASE_URL.replace(/\/$/, '')}/thank-you-event/${args.event.id}`,
    icsDownloadUrl: buildApiCalendarIcsUrl('event', args.event.id),
    attachment: icsAttachment,
  });
}

export async function notifyTrackRegistrationConfirmation(
  args: SendTrackRegistrationConfirmationArgs,
): Promise<void> {
  if (args.events.length === 0) return;

  const calendarEvents = args.events.map((event) => buildEventCalendarData(event));
  const firstSession = calendarEvents[0];
  const googleCalendarUrl = buildGoogleCalendarUrl(firstSession);
  const trackThankYouUrl = `${env.APP_BASE_URL.replace(/\/$/, '')}/thank-you-track/${args.trackId}`;
  const icsAttachment = {
    filename: `trafficmena-${sanitizeFilename(args.trackTitle)}-sessions.ics`,
    content: buildIcsCalendarBody(calendarEvents, '-//TrafficMENA//Track//EN'),
  };

  await sendRegistrationConfirmationEmail({
    to: args.email,
    subject: `Track booking confirmed: ${args.trackTitle}`,
    headline: 'Track booking confirmed',
    intro: `Your booking for ${args.trackTitle} is confirmed. Add all ${calendarEvents.length} session(s) to your calendar.`,
    googleCalendarUrl,
    webCalendarUrl: trackThankYouUrl,
    icsDownloadUrl: buildApiCalendarIcsUrl('track', args.trackId),
    attachment: icsAttachment,
  });
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'event';
}

export function queueEventRegistrationConfirmation(
  userId: string,
  event: EventCalendarSource,
): void {
  void loadUserEmail(userId)
    .then(async (email) => {
      if (!email) return;
      await notifyEventRegistrationConfirmation({ email, event });
    })
    .catch((error) => {
      console.error('[calendar-email] event confirmation failed', error);
    });
}

export function queueTrackRegistrationConfirmation(
  userId: string,
  trackId: string,
  trackTitle: string,
  events: EventCalendarSource[],
): void {
  void loadUserEmail(userId)
    .then(async (email) => {
      if (!email) return;
      await notifyTrackRegistrationConfirmation({ email, trackId, trackTitle, events });
    })
    .catch((error) => {
      console.error('[calendar-email] track confirmation failed', error);
    });
}

export function queuePaymentRegistrationConfirmation(paymentId: string): void {
  void (async () => {
    const [payment] = await db
      .select({
        userId: payments.userId,
        itemType: payments.itemType,
        itemId: payments.itemId,
        status: payments.status,
      })
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment || payment.status !== 'paid') return;

    const email = await loadUserEmail(payment.userId);
    if (!email) return;

    if (payment.itemType === 'event' && payment.itemId) {
      const source = await loadEventCalendarSource(payment.itemId);
      if (source) {
        await notifyEventRegistrationConfirmation({ email, event: source });
      }
      return;
    }

    if (payment.itemType === 'track' && payment.itemId) {
      const trackTitle = await loadTrackTitle(payment.itemId);
      const events = await loadTrackCalendarEvents(payment.itemId);
      if (trackTitle && events.length > 0) {
        await notifyTrackRegistrationConfirmation({
          email,
          trackId: payment.itemId,
          trackTitle,
          events,
        });
      }
    }
  })().catch((error) => {
    console.error('[calendar-email] payment confirmation failed', error);
  });
}
