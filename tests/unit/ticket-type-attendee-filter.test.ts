import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergeSeriesAttendees,
  type SeriesBookingAttendeeInput,
  type SeriesGrantAttendeeInput,
} from '../../server/src/utils/seriesAttendees.ts';

const booking = (
  userId: string,
  ticketType: 'online_only' | 'online_offline' | 'offline_only',
): SeriesBookingAttendeeInput => ({
  userId,
  email: `${userId}@example.com`,
  name: userId,
  firstName: null,
  lastName: null,
  phoneNumber: null,
  bookedAt: '2026-06-01T00:00:00Z',
  invoiceId: null,
  invoiceNumber: null,
  source: 'paid',
  reference: null,
  amountPaidCents: 1000,
  ticketType,
});

const grant = (userId: string): SeriesGrantAttendeeInput => ({
  grantId: `grant-${userId}`,
  userId,
  email: `${userId}@example.com`,
  name: userId,
  firstName: null,
  lastName: null,
  phoneNumber: null,
  grantedAt: '2026-06-02T00:00:00Z',
  grantReason: 'VIP',
});

const bookings = [
  booking('a', 'online_only'),
  booking('b', 'offline_only'),
  booking('c', 'online_offline'),
];
const grants = [grant('d')];
const page = { page: 1, pageSize: 50 };

describe('series enrolled list ticket-type filter', () => {
  it('matches only booking rows of the selected type and excludes manual grants', () => {
    const { items, total } = mergeSeriesAttendees(bookings, grants, {
      ...page,
      ticketType: 'offline_only',
    });
    assert.equal(total, 1);
    assert.equal(items[0].userId, 'b');
    assert.equal(items[0].ticketType, 'offline_only');
    assert.ok(!items.some((row) => row.grantId)); // grants excluded under a specific type
  });

  it('"All" (no ticket type) includes every booking + manual grants', () => {
    const { items, total } = mergeSeriesAttendees(bookings, grants, page);
    assert.equal(total, 4);
    const grantRow = items.find((row) => row.userId === 'd');
    assert.ok(grantRow);
    assert.equal(grantRow?.ticketType, null);
    assert.equal(grantRow?.source, 'manual');
  });

  it('labels booking rows with their ticket type and grants with none', () => {
    const { items } = mergeSeriesAttendees([booking('a', 'online_offline')], grants, page);
    assert.equal(items.find((row) => row.userId === 'a')?.ticketType, 'online_offline');
    assert.equal(items.find((row) => row.userId === 'd')?.ticketType, null);
  });

  it('combines search with the ticket-type filter', () => {
    const { total } = mergeSeriesAttendees(bookings, grants, {
      ...page,
      ticketType: 'online_only',
      search: 'a@example.com',
    });
    assert.equal(total, 1);
  });
});
