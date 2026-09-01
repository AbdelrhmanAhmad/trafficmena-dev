import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { payments } from '../db/schema/index.js';
import {
  getEventRegistrationEmailCopy,
  getTrackRegistrationEmailCopy,
} from '../i18n/emailCopy.js';
import type { AppLocale } from '../utils/locale.js';
import { DEFAULT_LOCALE, parseAppLocale } from '../utils/locale.js';
import { sendRegistrationConfirmationEmail } from './email.js';
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

type SendEventRegistrationConfirmationArgs = {
  email: string;
  event: EventCalendarSource;
  locale?: AppLocale;
};

type SendTrackRegistrationConfirmationArgs = {
  email: string;
  trackId: string;
  trackTitle: string;
  events: EventCalendarSource[];
  locale?: AppLocale;
};

export async function notifyEventRegistrationConfirmation(
  args: SendEventRegistrationConfirmationArgs,
): Promise<void> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const calendarData = buildEventCalendarData(args.event, undefined, locale);
  const googleCalendarUrl = buildGoogleCalendarUrl(calendarData);
  const copy = getEventRegistrationEmailCopy(locale, args.event.title);
  const icsAttachment = {
    filename: `trafficmena-${sanitizeFilename(args.event.title)}.ics`,
    content: buildIcsCalendarBody([calendarData]),
  };

  await sendRegistrationConfirmationEmail({
    to: args.email,
    subject: copy.subject,
    headline: copy.headline,
    intro: copy.intro,
    googleCalendarUrl,
    webCalendarUrl: `${env.APP_BASE_URL.replace(/\/$/, '')}/thank-you-event/${args.event.id}`,
    icsDownloadUrl: buildApiCalendarIcsUrl('event', args.event.id),
    attachment: icsAttachment,
    locale,
    googleCalendarLabel: copy.googleCalendar,
    viewConfirmationLabel: copy.viewConfirmation,
    icsNote: copy.icsNote,
    footer: copy.footer,
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
  const trackThankYouUrl = `${env.APP_BASE_URL.replace(/\/$/, '')}/thank-you-track/${args.trackId}`;
  const copy = getTrackRegistrationEmailCopy(locale, args.trackTitle, calendarEvents.length);
  const icsAttachment = {
    filename: `trafficmena-${sanitizeFilename(args.trackTitle)}-sessions.ics`,
    content: buildIcsCalendarBody(calendarEvents, '-//TrafficMENA//Track//EN'),
  };

  await sendRegistrationConfirmationEmail({
    to: args.email,
    subject: copy.subject,
    headline: copy.headline,
    intro: copy.intro,
    googleCalendarUrl,
    webCalendarUrl: trackThankYouUrl,
    icsDownloadUrl: buildApiCalendarIcsUrl('track', args.trackId),
    attachment: icsAttachment,
    locale,
    googleCalendarLabel: copy.googleCalendar,
    viewConfirmationLabel: copy.viewConfirmation,
    icsNote: copy.icsNote,
    footer: copy.footer,
  });
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'event';
}

export function queueEventRegistrationConfirmation(
  userId: string,
  eventId: string,
  locale: AppLocale = DEFAULT_LOCALE,
): void {
  void loadUserEmail(userId)
    .then(async (email) => {
      if (!email) return;
      const source = await loadEventCalendarSource(eventId, locale);
      if (!source) return;
      await notifyEventRegistrationConfirmation({ email, event: source, locale });
    })
    .catch((error) => {
      console.error('[calendar-email] event confirmation failed', error);
    });
}

export function queueTrackRegistrationConfirmation(
  userId: string,
  trackId: string,
  locale: AppLocale = DEFAULT_LOCALE,
): void {
  void loadUserEmail(userId)
    .then(async (email) => {
      if (!email) return;
      const trackTitle = await loadTrackTitle(trackId, locale);
      const events = await loadTrackCalendarEvents(trackId, locale);
      if (!trackTitle || events.length === 0) return;
      await notifyTrackRegistrationConfirmation({
        email,
        trackId,
        trackTitle,
        events,
        locale,
      });
    })
    .catch((error) => {
      console.error('[calendar-email] track confirmation failed', error);
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

    const email = await loadUserEmail(payment.userId);
    if (!email) return;

    if (payment.itemType === 'event' && payment.itemId) {
      const source = await loadEventCalendarSource(payment.itemId, effectiveLocale);
      if (source) {
        await notifyEventRegistrationConfirmation({ email, event: source, locale: effectiveLocale });
      }
      return;
    }

    if (payment.itemType === 'track' && payment.itemId) {
      const trackTitle = await loadTrackTitle(payment.itemId, effectiveLocale);
      const events = await loadTrackCalendarEvents(payment.itemId, effectiveLocale);
      if (trackTitle && events.length > 0) {
        await notifyTrackRegistrationConfirmation({
          email,
          trackId: payment.itemId,
          trackTitle,
          events,
          locale: effectiveLocale,
        });
      }
    }
  })().catch((error) => {
    console.error('[calendar-email] payment confirmation failed', error);
  });
}
