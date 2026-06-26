import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { bookingGrantsLiveAttendance } from '../../server/src/routes/api/ticketAccess.ts';

describe('bookingGrantsLiveAttendance (event-detail Zoom / location gate)', () => {
  it('lets online tickets join online sessions, not offline ones', () => {
    assert.equal(bookingGrantsLiveAttendance('online_only', 'online'), true);
    assert.equal(bookingGrantsLiveAttendance('online_only', 'offline'), false);
  });

  it('lets offline tickets attend offline sessions, not online ones', () => {
    assert.equal(bookingGrantsLiveAttendance('offline_only', 'offline'), true);
    assert.equal(bookingGrantsLiveAttendance('offline_only', 'online'), false);
  });

  it('lets online_offline attend both', () => {
    assert.equal(bookingGrantsLiveAttendance('online_offline', 'online'), true);
    assert.equal(bookingGrantsLiveAttendance('online_offline', 'offline'), true);
  });

  it('gives a legacy (null) booking full live attendance', () => {
    assert.equal(bookingGrantsLiveAttendance(null, 'online'), true);
    assert.equal(bookingGrantsLiveAttendance(null, 'offline'), true);
  });
});

describe('event detail splits the access gate by format (wiring)', () => {
  it('gates the meeting link to online events and the location URL to offline events', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/events.ts', import.meta.url),
      'utf8',
    );
    assert.ok(
      source.includes(
        "const canAccessMeetingLink = event.eventFormat === 'online' && canAttendLiveSession",
      ),
    );
    assert.ok(
      source.includes(
        "const canAccessLocationUrl = event.eventFormat === 'offline' && canAttendLiveSession",
      ),
    );
    // Resolution order: staff -> track-booking ticket -> standalone direct attendee.
    assert.ok(source.includes('bookingGrantsLiveAttendance(bookingTicketType, event.eventFormat)'));
    assert.ok(source.includes('(existing?.sourceTrackBookingId ?? null) === null'));
    // Viewer's ticket type is surfaced to the client.
    assert.ok(source.includes('viewerTicketType: bookingTicketType'));
  });

  it('gates the track-level location URL to offline-entitled buyers + staff', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/tracks.ts', import.meta.url),
      'utf8',
    );
    assert.ok(
      source.includes("userHasBooked && bookingGrantsLiveAttendance(bookingTicketType, 'offline')"),
    );
    // Staff still see the URL regardless of ticket.
    assert.ok(source.includes('|| isStaff') || source.includes('isStaff\n'));
  });
});

// Regression guards for the three review findings (no DB harness, so wiring is pinned here).
describe('ticket-types review regression guards', () => {
  it('paid fulfillment requires reservations only for the ticket-included subset', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/payments.ts', import.meta.url),
      'utf8',
    );
    // The fulfillment pre-check must filter by the payment's ticket type, matching what checkout
    // reserved — otherwise online_only/offline_only buyers are falsely rejected RESERVATION_EXPIRED.
    assert.ok(
      source.includes('filterLiveIncludedEvents(trackEventRows, payment.ticketType)'),
      'fulfillment pre-check no longer scoped to live-included events',
    );
  });

  it('event detail keeps a standalone direct attendee additive to the booking verdict', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/events.ts', import.meta.url),
      'utf8',
    );
    // Must be OR (additive), not an else-if chain that lets a non-covering booking mask access.
    assert.ok(source.includes('let canAttendLiveSession = isStaff || directAttendee'));
  });

  it('series detail builds userEventIds for booking holders too', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/series.ts', import.meta.url),
      'utf8',
    );
    // The guard must NOT exclude booking holders, or the ticket-aware fallback gets an empty set.
    assert.ok(source.includes('!isStaff && !isSubscriber && !hasSeriesGrant && !isPremiumLocked'));
    assert.ok(!source.includes('!hasTrackBooking && !hasSeriesGrant && !isPremiumLocked'));
  });
});
