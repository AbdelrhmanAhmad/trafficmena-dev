import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test';
process.env.BETTER_AUTH_SECRET = 'test-secret-min-32-characters-long!!';
process.env.APP_BASE_URL = 'http://localhost:8080';

const {
  buildEventCalendarData,
  buildGoogleCalendarUrl,
  buildIcsCalendarBody,
} = await import('../../server/src/services/eventCalendar.ts');

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const EVENT_ID_2 = '22222222-2222-4222-8222-222222222222';
const APP_BASE = 'http://localhost:8080';

const arabicEvent = {
  id: EVENT_ID,
  title: 'ورشة التسويق الرقمي',
  eventDescription: '<p>تعلم أساسيات التسويق</p>',
  date: new Date('2026-07-15T11:30:00.000Z'),
  location: 'Cairo Business Park',
  locationUrl: null,
  eventFormat: 'offline' as const,
  meetingLink: null,
};

const englishEvent = {
  ...arabicEvent,
  title: 'Digital Marketing Workshop',
  eventDescription: '<p>Learn marketing fundamentals</p>',
};

const secondSession = {
  ...englishEvent,
  id: EVENT_ID_2,
  title: 'Session Two',
  date: new Date('2026-08-01T09:00:00.000Z'),
};

describe('buildEventCalendarData locale', () => {
  it('preserves localized title for English and Arabic sources', () => {
    const en = buildEventCalendarData(englishEvent, APP_BASE, 'en');
    const ar = buildEventCalendarData(arabicEvent, APP_BASE, 'ar');

    assert.equal(en.title, 'Digital Marketing Workshop');
    assert.equal(ar.title, 'ورشة التسويق الرقمي');
  });

  it('includes English view-details footer in description and Google URL', () => {
    const data = buildEventCalendarData(englishEvent, APP_BASE, 'en');
    const url = buildGoogleCalendarUrl(data);
    const details = new URL(url).searchParams.get('details');

    assert.match(data.description, /View event details:/);
    assert.match(details ?? '', /View event details:/);
  });

  it('includes Arabic view-details footer in description and Google URL', () => {
    const data = buildEventCalendarData(arabicEvent, APP_BASE, 'ar');
    const url = buildGoogleCalendarUrl(data);
    const details = new URL(url).searchParams.get('details');

    assert.match(data.description, /عرض تفاصيل الفعالية:/);
    assert.match(details ?? '', /عرض تفاصيل الفعالية:/);
  });
});

describe('buildIcsCalendarBody track locale', () => {
  it('emits two VEVENT blocks with English descriptions for track ICS', () => {
    const events = [
      buildEventCalendarData(englishEvent, APP_BASE, 'en'),
      buildEventCalendarData(secondSession, APP_BASE, 'en'),
    ];
    const ics = buildIcsCalendarBody(events, '-//TrafficMENA//Track//EN');

    assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 2);
    assert.match(ics, /View event details:/);
    assert.match(ics, /PRODID:-\/\/TrafficMENA\/\/Track\/\/EN/);
    assert.match(ics, /SUMMARY:Digital Marketing Workshop/);
    assert.match(ics, /SUMMARY:Session Two/);
  });

  it('emits two VEVENT blocks with Arabic descriptions for track ICS', () => {
    const arabicSecond = {
      ...secondSession,
      title: 'الجلسة الثانية',
    };
    const events = [
      buildEventCalendarData(arabicEvent, APP_BASE, 'ar'),
      buildEventCalendarData(arabicSecond, APP_BASE, 'ar'),
    ];
    const ics = buildIcsCalendarBody(events, '-//TrafficMENA//Track//EN');

    assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 2);
    assert.match(ics, /عرض تفاصيل الفعالية:/);
    assert.match(ics, /SUMMARY:ورشة التسويق الرقمي/);
    assert.match(ics, /SUMMARY:الجلسة الثانية/);
  });
});
