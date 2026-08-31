import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';
process.env.APP_BASE_URL ??= 'http://localhost:8080';

const {
  buildCanonicalEventPageUrl,
  buildEventCalendarData,
  buildGoogleCalendarUrl,
  buildIcsCalendarBody,
  calendarDataContainsMeetingLink,
  CAIRO_TZ,
  DEFAULT_EVENT_DURATION_MS,
  formatGoogleCalendarUtc,
  formatIcsCairoLocal,
} = await import('../../server/src/services/eventCalendar.ts');

const { toCairoDatetimeLocal } = await import('../../src/shared/utils/dateUtils.ts');

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const MEETING_LINK = 'https://zoom.us/j/secret-meeting-12345';

const onlineEvent = {
  id: EVENT_ID,
  title: 'ورشة التسويق الرقمي',
  eventDescription: '<p>Learn digital marketing</p>',
  date: new Date('2026-07-15T11:30:00.000Z'),
  location: null,
  locationUrl: null,
  eventFormat: 'online' as const,
  meetingLink: MEETING_LINK,
};

const offlineEvent = {
  ...onlineEvent,
  eventFormat: 'offline' as const,
  location: 'Cairo Business Park, Building 5',
  meetingLink: null,
};

describe('buildEventCalendarData', () => {
  it('includes title, Cairo timezone, and canonical event page URL', () => {
    const data = buildEventCalendarData(onlineEvent, 'http://localhost:8080');
    assert.equal(data.title, onlineEvent.title);
    assert.equal(data.timezone, CAIRO_TZ);
    assert.equal(data.eventPageUrl, `http://localhost:8080/meetups/${EVENT_ID}`);
    assert.equal(data.endUtc.getTime() - data.startUtc.getTime(), DEFAULT_EVENT_DURATION_MS);
  });

  it('uses physical location for offline events', () => {
    const data = buildEventCalendarData(offlineEvent, 'http://localhost:8080');
    assert.equal(data.location, 'Cairo Business Park, Building 5');
  });

  it('uses event page URL as online location instead of meeting link', () => {
    const data = buildEventCalendarData(onlineEvent, 'http://localhost:8080');
    assert.equal(data.location, data.eventPageUrl);
    assert.ok(data.description.includes(data.eventPageUrl));
  });
});

describe('online meeting privacy', () => {
  it('never puts raw meeting link in Google Calendar URL', () => {
    const data = buildEventCalendarData(onlineEvent, 'http://localhost:8080');
    const url = buildGoogleCalendarUrl(data);
    assert.ok(!url.includes('zoom.us'));
    assert.ok(!url.includes(encodeURIComponent(MEETING_LINK)));
    assert.ok(url.includes(encodeURIComponent(data.eventPageUrl)));
  });

  it('never puts raw meeting link in ICS output', () => {
    const data = buildEventCalendarData(onlineEvent, 'http://localhost:8080');
    const ics = buildIcsCalendarBody([data]);
    assert.ok(!ics.includes('zoom.us'));
    assert.ok(!ics.includes(MEETING_LINK));
    assert.ok(ics.includes(data.eventPageUrl));
  });

  it('calendarDataContainsMeetingLink detects leakage', () => {
    const safe = buildEventCalendarData(onlineEvent, 'http://localhost:8080');
    assert.equal(calendarDataContainsMeetingLink(safe, MEETING_LINK), false);
  });
});

describe('ICS generation', () => {
  it('produces valid VCALENDAR with VEVENT, UID, DTSTAMP, and CRLF', () => {
    const data = buildEventCalendarData(offlineEvent, 'http://localhost:8080');
    const ics = buildIcsCalendarBody([data]);
    assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
    assert.match(ics, /VERSION:2\.0/);
    assert.match(ics, /BEGIN:VEVENT/);
    assert.match(ics, /UID:11111111-1111-4111-8111-111111111111@trafficmena\.com/);
    assert.match(ics, /DTSTAMP:/);
    assert.match(ics, /SUMMARY:ورشة التسويق الرقمي/);
    assert.match(ics, /END:VEVENT/);
    assert.match(ics, /END:VCALENDAR\r\n$/);
  });

  it('escapes commas, semicolons, and newlines in ICS text', () => {
    const data = buildEventCalendarData(
      {
        ...offlineEvent,
        title: 'Event; Part 1, intro',
        eventDescription: 'Line one\nLine two',
      },
      'http://localhost:8080',
    );
    const ics = buildIcsCalendarBody([data]);
    assert.ok(ics.includes('Event\\; Part 1\\, intro'));
    assert.ok(ics.includes('Line one\\nLine two') || ics.includes('Line one'));
  });

  it('supports UTF-8 Arabic titles', () => {
    const data = buildEventCalendarData(onlineEvent, 'http://localhost:8080');
    const ics = buildIcsCalendarBody([data]);
    assert.ok(ics.includes('ورشة التسويق الرقمي'));
  });

  it('includes multiple VEVENT entries for track ICS', () => {
    const second = {
      ...offlineEvent,
      id: '22222222-2222-4222-8222-222222222222',
      title: 'Session Two',
      date: new Date('2026-08-01T09:00:00.000Z'),
    };
    const events = [
      buildEventCalendarData(offlineEvent, 'http://localhost:8080'),
      buildEventCalendarData(second, 'http://localhost:8080'),
    ];
    const ics = buildIcsCalendarBody(events, '-//TrafficMENA//Track//EN');
    const veventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    assert.equal(veventCount, 2);
    assert.match(ics, /PRODID:-\/\/TrafficMENA\/\/Track\/\/EN/);
  });
});

describe('Cairo timezone / DST', () => {
  it('represents summer UTC instant correctly in Google Calendar dates param', () => {
    const data = buildEventCalendarData(onlineEvent, 'http://localhost:8080');
    const url = buildGoogleCalendarUrl(data);
    const dates = new URL(url).searchParams.get('dates');
    const summerUtc = formatGoogleCalendarUtc(new Date('2026-07-15T11:30:00.000Z'));
    assert.ok(dates?.startsWith(`${summerUtc}/`));
    assert.equal(toCairoDatetimeLocal('2026-07-15T11:30:00.000Z'), '2026-07-15T14:30');
  });

  it('represents winter UTC instant correctly in Google Calendar dates param', () => {
    const winterEvent = { ...onlineEvent, date: new Date('2026-01-15T12:30:00.000Z') };
    const data = buildEventCalendarData(winterEvent, 'http://localhost:8080');
    const url = buildGoogleCalendarUrl(data);
    const dates = new URL(url).searchParams.get('dates');
    const winterUtc = formatGoogleCalendarUtc(new Date('2026-01-15T12:30:00.000Z'));
    assert.ok(dates?.startsWith(`${winterUtc}/`));
    assert.equal(toCairoDatetimeLocal('2026-01-15T12:30:00.000Z'), '2026-01-15T14:30');
  });

  it('uses TZID=Africa/Cairo in ICS DTSTART/DTEND', () => {
    const data = buildEventCalendarData(onlineEvent, 'http://localhost:8080');
    const ics = buildIcsCalendarBody([data]);
    const cairoLocal = formatIcsCairoLocal(data.startUtc);
    assert.match(ics, new RegExp(`DTSTART;TZID=${CAIRO_TZ}:${cairoLocal}`));
    assert.equal(cairoLocal, '20260715T143000');
  });
});

describe('canonical URLs', () => {
  it('buildCanonicalEventPageUrl uses /meetups/:id', () => {
    assert.equal(
      buildCanonicalEventPageUrl(EVENT_ID, 'https://www.trafficmena.com'),
      'https://www.trafficmena.com/meetups/' + EVENT_ID,
    );
  });
});

describe('registration confirmation email wiring', () => {
  it('ThankYouEvent and ThankYouTrack use shared EventCalendarActions', () => {
    const thankYouEvent = readFileSync('src/pages/ThankYouEvent.tsx', 'utf8');
    const thankYouTrack = readFileSync('src/pages/ThankYouTrack.tsx', 'utf8');
    assert.ok(thankYouEvent.includes('EventCalendarActions'));
    assert.ok(thankYouTrack.includes('EventCalendarActions'));
  });

  it('EventDetail includes calendar actions for entitled users', () => {
    const eventDetail = readFileSync('src/features/events/pages/EventDetail.tsx', 'utf8');
    assert.ok(eventDetail.includes('EventCalendarActions'));
    assert.ok(eventDetail.includes('hasAccess'));
  });

  it('confirmation email template includes Google Calendar CTA without meeting link fields', () => {
    const emailService = readFileSync('server/src/services/email.ts', 'utf8');
    assert.ok(emailService.includes('sendRegistrationConfirmationEmail'));
    assert.ok(emailService.includes('Add to Google Calendar'));
    assert.ok(!emailService.includes('meetingLink'));
  });
});

describe('calendar access helpers', () => {
  it('loadTrackCalendarEvents filters to published events only', () => {
    const source = readFileSync('server/src/services/eventCalendarAccess.ts', 'utf8');
    assert.ok(source.includes('eq(events.isPublished, true)'));
  });

  it('assertEventCalendarAccess requires registration for non-staff', () => {
    const source = readFileSync('server/src/services/eventCalendarAccess.ts', 'utf8');
    assert.ok(source.includes('Calendar is available after registration'));
  });
});
