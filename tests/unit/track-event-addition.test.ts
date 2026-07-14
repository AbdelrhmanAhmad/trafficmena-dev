import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyTrackEventBackfill,
  evaluateTrackEventAdditionCapacity,
  planTrackEventReservationHolds,
} from '../../server/src/routes/api/trackEventAddition.ts';

const onlineEvent = {
  id: 'event-online',
  title: 'Online session',
  eventFormat: 'online' as const,
};
const offlineEvent = {
  id: 'event-offline',
  title: 'Offline session',
  eventFormat: 'offline' as const,
};
const registeredAt = new Date('2026-07-14T10:00:00.000Z');
const defaultPaidAt = new Date('2026-07-01T10:00:00.000Z');

const booking = (
  id: string,
  userId: string,
  ticketType: 'online_only' | 'online_offline' | 'offline_only' | null,
  pricePaidCents = 1000,
  paidAt = defaultPaidAt,
) => ({
  id,
  userId,
  ticketType,
  paidAt,
  pricePaidCents,
  paymentId: `payment-${id}`,
});

describe('evaluateTrackEventAdditionCapacity', () => {
  it('checks booked-track capacity before event capacity comparisons (AE5)', () => {
    const decision = evaluateTrackEventAdditionCapacity({
      mode: 'booked',
      maxTrackBookings: null,
      events: [
        {
          ...offlineEvent,
          maxAttendees: 50,
          occupiedRows: 0,
          unexpiredReservations: 0,
          newHolds: 0,
          netNewRows: 0,
        },
      ],
    });

    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, 'TRACK_CAPACITY_REQUIRED');
    }
  });

  it('requires event capacity before checking equality', () => {
    const decision = evaluateTrackEventAdditionCapacity({
      mode: 'booked',
      maxTrackBookings: 100,
      events: [
        {
          ...offlineEvent,
          maxAttendees: null,
          occupiedRows: 0,
          unexpiredReservations: 0,
          newHolds: 0,
          netNewRows: 0,
        },
      ],
    });

    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, 'CAPACITY_REQUIRED');
    }
  });

  it('requires exact capacity on booked tracks and names both values (AE2)', () => {
    const blocked = evaluateTrackEventAdditionCapacity({
      mode: 'booked',
      maxTrackBookings: 100,
      events: [
        {
          ...offlineEvent,
          maxAttendees: 50,
          occupiedRows: 0,
          unexpiredReservations: 0,
          newHolds: 0,
          netNewRows: 0,
        },
      ],
    });
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) {
      assert.equal(blocked.code, 'CAPACITY_MISMATCH');
      assert.match(blocked.message, /50/);
      assert.match(blocked.message, /100/);
    }

    const allowed = evaluateTrackEventAdditionCapacity({
      mode: 'booked',
      maxTrackBookings: 100,
      events: [
        {
          ...offlineEvent,
          maxAttendees: 100,
          occupiedRows: 0,
          unexpiredReservations: 0,
          newHolds: 0,
          netNewRows: 0,
        },
      ],
    });
    assert.deepEqual(allowed, { allowed: true });
  });

  it('keeps the reservation-only greater-than-or-equal capacity rule', () => {
    const allowed = evaluateTrackEventAdditionCapacity({
      mode: 'reservation-only',
      maxTrackBookings: 100,
      events: [
        {
          ...offlineEvent,
          maxAttendees: 120,
          occupiedRows: 0,
          unexpiredReservations: 0,
          newHolds: 0,
          netNewRows: 0,
        },
      ],
    });
    assert.deepEqual(allowed, { allowed: true });

    const blocked = evaluateTrackEventAdditionCapacity({
      mode: 'reservation-only',
      maxTrackBookings: 100,
      events: [
        {
          ...offlineEvent,
          maxAttendees: 80,
          occupiedRows: 0,
          unexpiredReservations: 0,
          newHolds: 0,
          netNewRows: 0,
        },
      ],
    });
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) {
      assert.equal(blocked.code, 'CAPACITY_TOO_LOW');
    }
  });

  it('blocks only above the fit boundary and reports the additive counts (AE3/AE8)', () => {
    const blocked = evaluateTrackEventAdditionCapacity({
      mode: 'booked',
      maxTrackBookings: 100,
      events: [
        {
          ...offlineEvent,
          maxAttendees: 100,
          occupiedRows: 11,
          unexpiredReservations: 0,
          newHolds: 0,
          netNewRows: 93,
        },
      ],
    });
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) {
      assert.equal(blocked.code, 'CAPACITY_INSUFFICIENT');
      assert.equal(
        blocked.message,
        'Event "Offline session" cannot seat everyone: 11 registered + 0 reserved + 93 to add exceeds capacity 100.',
      );
    }

    const allowed = evaluateTrackEventAdditionCapacity({
      mode: 'booked',
      maxTrackBookings: 100,
      events: [
        {
          ...offlineEvent,
          maxAttendees: 100,
          occupiedRows: 11,
          unexpiredReservations: 0,
          newHolds: 0,
          netNewRows: 85,
        },
      ],
    });
    assert.deepEqual(allowed, { allowed: true });
  });

  it('counts unexpired reservations and physical new holds exactly once', () => {
    const decision = evaluateTrackEventAdditionCapacity({
      mode: 'booked',
      maxTrackBookings: 10,
      events: [
        {
          ...offlineEvent,
          maxAttendees: 10,
          occupiedRows: 3,
          unexpiredReservations: 2,
          newHolds: 1,
          netNewRows: 5,
        },
      ],
    });
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, 'CAPACITY_INSUFFICIENT');
      assert.match(decision.message, /3 registered \+ 3 reserved \+ 5 to add/);
    }
  });

  it('names the first failing event', () => {
    const decision = evaluateTrackEventAdditionCapacity({
      mode: 'booked',
      maxTrackBookings: 100,
      events: [
        {
          ...onlineEvent,
          maxAttendees: 100,
          occupiedRows: 0,
          unexpiredReservations: 0,
          newHolds: 0,
          netNewRows: 0,
        },
        {
          ...offlineEvent,
          maxAttendees: 90,
          occupiedRows: 0,
          unexpiredReservations: 0,
          newHolds: 0,
          netNewRows: 0,
        },
      ],
    });
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.match(decision.message, /Offline session/);
    }
  });
});

describe('classifyTrackEventBackfill', () => {
  it('partitions bookings by ticket entitlement for offline and online sessions (AE1)', () => {
    const result = classifyTrackEventBackfill({
      bookings: [
        booking('booking-1', 'user-combined', 'online_offline'),
        booking('booking-2', 'user-online', 'online_only'),
        booking('booking-3', 'user-offline', 'offline_only'),
        booking('booking-4', 'user-legacy', null),
      ],
      events: [offlineEvent, onlineEvent],
      existingAttendees: [],
      registeredAt,
    });

    const offline = result.find((event) => event.eventId === offlineEvent.id);
    assert.deepEqual(
      offline?.toInsert.map((row) => row.userId),
      ['user-combined', 'user-offline', 'user-legacy'],
    );
    assert.deepEqual(offline?.notEntitled, ['user-online']);

    const online = result.find((event) => event.eventId === onlineEvent.id);
    assert.deepEqual(
      online?.toInsert.map((row) => row.userId),
      ['user-combined', 'user-online', 'user-legacy'],
    );
    assert.deepEqual(online?.notEntitled, ['user-offline']);
  });

  it('maps inserts, skips, and per-row reactivations without smearing booking values', () => {
    const bookings = [
      booking('booking-1', 'user-insert', 'online_offline', 1100),
      booking(
        'booking-2',
        'user-reactivate-a',
        'online_offline',
        2200,
        new Date('2026-07-02T10:00:00.000Z'),
      ),
      booking('booking-3', 'user-reactivate-b', 'online_offline', 3300),
      booking('booking-4', 'user-active', 'online_offline', 4400),
      booking('booking-5', 'user-refund', 'online_offline', 5500),
    ];
    const result = classifyTrackEventBackfill({
      bookings,
      events: [offlineEvent],
      existingAttendees: [
        {
          id: 'attendee-a',
          eventId: offlineEvent.id,
          userId: 'user-reactivate-a',
          status: 'cancelled',
        },
        {
          id: 'attendee-b',
          eventId: offlineEvent.id,
          userId: 'user-reactivate-b',
          status: 'cancelled',
        },
        {
          id: 'attendee-active',
          eventId: offlineEvent.id,
          userId: 'user-active',
          status: 'active',
        },
        {
          id: 'attendee-refund',
          eventId: offlineEvent.id,
          userId: 'user-refund',
          status: 'refund_requested',
        },
      ],
      registeredAt,
    })[0];

    assert.equal(result.toInsert.length, 1);
    assert.equal(result.toInsert[0]?.sourceTrackBookingId, 'booking-1');
    assert.equal(result.toInsert[0]?.registeredAt, registeredAt);
    assert.equal(result.toInsert[0]?.pricePaidCents, 1100);
    assert.deepEqual(
      result.toReactivate.map((row) => [
        row.attendeeId,
        row.paidAt,
        row.pricePaidCents,
        row.paymentId,
      ]),
      [
        ['attendee-a', new Date('2026-07-02T10:00:00.000Z'), 2200, 'payment-booking-2'],
        ['attendee-b', defaultPaidAt, 3300, 'payment-booking-3'],
      ],
    );
    assert.deepEqual(result.toSkip, ['attendee-active', 'attendee-refund']);
  });

  it('returns empty partitions for zero bookings', () => {
    const result = classifyTrackEventBackfill({
      bookings: [],
      events: [offlineEvent],
      existingAttendees: [],
      registeredAt,
    })[0];
    assert.deepEqual(result.notEntitled, []);
    assert.deepEqual(result.toSkip, []);
    assert.deepEqual(result.toReactivate, []);
    assert.deepEqual(result.toInsert, []);
  });
});

describe('planTrackEventReservationHolds', () => {
  const expiresAt = new Date('2026-07-15T10:00:00.000Z');
  const referenceTime = new Date('2026-07-14T10:00:00.000Z');

  it('plans holds by ticket entitlement and skips users with counted attendee rows (AE4)', () => {
    const decision = planTrackEventReservationHolds({
      trackReservations: [
        {
          userId: 'user-combined',
          paymentId: 'payment-combined',
          ticketType: 'online_offline',
          expiresAt,
        },
        {
          userId: 'user-online',
          paymentId: 'payment-online',
          ticketType: 'online_only',
          expiresAt,
        },
        {
          userId: 'user-existing',
          paymentId: 'payment-existing',
          ticketType: null,
          expiresAt,
        },
      ],
      events: [offlineEvent],
      existingAttendees: [{ eventId: offlineEvent.id, userId: 'user-existing', status: 'active' }],
      existingReservations: [],
      unresolvedStandalonePayments: [],
      referenceTime,
    });

    assert.equal(decision.blocked, false);
    if (!decision.blocked) {
      assert.deepEqual(decision.holdsToInsert, [
        {
          eventId: offlineEvent.id,
          userId: 'user-combined',
          paymentId: 'payment-combined',
          expiresAt,
        },
      ]);
      assert.equal(decision.newHoldCountsByEvent[offlineEvent.id], 1);
    }
  });

  it('does not double-count an existing unexpired hold for the same payment', () => {
    const decision = planTrackEventReservationHolds({
      trackReservations: [
        {
          userId: 'user-combined',
          paymentId: 'payment-combined',
          ticketType: 'online_offline',
          expiresAt,
        },
      ],
      events: [offlineEvent],
      existingAttendees: [],
      existingReservations: [
        {
          id: 'reservation-existing',
          eventId: offlineEvent.id,
          userId: 'user-combined',
          paymentId: 'payment-combined',
          expiresAt,
          owningPaymentStatus: 'pending',
          owningPaymentItemType: 'track',
        },
      ],
      unresolvedStandalonePayments: [],
      referenceTime,
    });

    assert.equal(decision.blocked, false);
    if (!decision.blocked) {
      assert.deepEqual(decision.holdsToInsert, []);
      assert.deepEqual(decision.staleRowsToDelete, []);
      assert.equal(decision.newHoldCountsByEvent[offlineEvent.id], 0);
    }
  });

  it('replaces expired or non-pending conflicting holds', () => {
    const decision = planTrackEventReservationHolds({
      trackReservations: [
        {
          userId: 'user-expired',
          paymentId: 'payment-new-expired',
          ticketType: null,
          expiresAt,
        },
        {
          userId: 'user-failed',
          paymentId: 'payment-new-failed',
          ticketType: null,
          expiresAt,
        },
      ],
      events: [offlineEvent],
      existingAttendees: [],
      existingReservations: [
        {
          id: 'reservation-expired',
          eventId: offlineEvent.id,
          userId: 'user-expired',
          paymentId: 'payment-old-expired',
          expiresAt: new Date('2026-07-13T10:00:00.000Z'),
          owningPaymentStatus: 'expired',
          owningPaymentItemType: 'event',
        },
        {
          id: 'reservation-failed',
          eventId: offlineEvent.id,
          userId: 'user-failed',
          paymentId: 'payment-old-failed',
          expiresAt,
          owningPaymentStatus: 'failed',
          owningPaymentItemType: 'event',
        },
      ],
      unresolvedStandalonePayments: [],
      referenceTime,
    });

    assert.equal(decision.blocked, false);
    if (!decision.blocked) {
      assert.deepEqual(decision.staleRowsToDelete, ['reservation-expired', 'reservation-failed']);
      assert.equal(decision.holdsToInsert.length, 2);
      assert.equal(decision.newHoldCountsByEvent[offlineEvent.id], 1);
    }
  });

  it('does not consume extra capacity when replacing an unexpired failed hold', () => {
    const holdPlan = planTrackEventReservationHolds({
      trackReservations: [
        {
          userId: 'user-failed',
          paymentId: 'payment-new-failed',
          ticketType: null,
          expiresAt,
        },
      ],
      events: [offlineEvent],
      existingAttendees: [],
      existingReservations: [
        {
          id: 'reservation-failed',
          eventId: offlineEvent.id,
          userId: 'user-failed',
          paymentId: 'payment-old-failed',
          expiresAt,
          owningPaymentStatus: 'failed',
          owningPaymentItemType: 'event',
        },
      ],
      unresolvedStandalonePayments: [],
      referenceTime,
    });

    assert.equal(holdPlan.blocked, false);
    if (!holdPlan.blocked) {
      assert.equal(holdPlan.holdsToInsert.length, 1);
      assert.equal(holdPlan.newHoldCountsByEvent[offlineEvent.id], 0);

      const capacityDecision = evaluateTrackEventAdditionCapacity({
        mode: 'booked',
        maxTrackBookings: 10,
        events: [
          {
            ...offlineEvent,
            maxAttendees: 10,
            occupiedRows: 0,
            unexpiredReservations: 1,
            newHolds: holdPlan.newHoldCountsByEvent[offlineEvent.id] ?? 0,
            netNewRows: 9,
          },
        ],
      });
      assert.deepEqual(capacityDecision, { allowed: true });
    }
  });

  it('blocks unresolved pending and recoverable-expired standalone payments (AE9)', () => {
    for (const status of ['pending', 'expired'] as const) {
      const decision = planTrackEventReservationHolds({
        trackReservations: [],
        events: [offlineEvent],
        existingAttendees: [],
        existingReservations: [],
        unresolvedStandalonePayments: [
          {
            eventId: offlineEvent.id,
            status,
            hasGatewayIntent: status === 'expired',
          },
        ],
        referenceTime,
      });

      assert.equal(decision.blocked, true);
      if (decision.blocked) {
        assert.equal(decision.code, 'EVENT_HAS_PENDING_CHECKOUTS');
        assert.equal(decision.event.id, offlineEvent.id);
        assert.match(decision.message, /Offline session/);
      }
    }
  });

  it('blocks an unexpired reservation owned by a pending standalone payment', () => {
    const decision = planTrackEventReservationHolds({
      trackReservations: [],
      events: [offlineEvent],
      existingAttendees: [],
      existingReservations: [
        {
          id: 'reservation-pending-event',
          eventId: offlineEvent.id,
          userId: 'user-pending-event',
          paymentId: 'payment-pending-event',
          expiresAt,
          owningPaymentStatus: 'pending',
          owningPaymentItemType: 'event',
        },
      ],
      unresolvedStandalonePayments: [],
      referenceTime,
    });

    assert.equal(decision.blocked, true);
    if (decision.blocked) {
      assert.equal(decision.code, 'EVENT_HAS_PENDING_CHECKOUTS');
    }
  });

  it('does not block terminal standalone payments', () => {
    const decision = planTrackEventReservationHolds({
      trackReservations: [],
      events: [offlineEvent],
      existingAttendees: [],
      existingReservations: [],
      unresolvedStandalonePayments: [
        { eventId: offlineEvent.id, status: 'failed', hasGatewayIntent: true },
        { eventId: offlineEvent.id, status: 'expired', hasGatewayIntent: false },
      ],
      referenceTime,
    });
    assert.equal(decision.blocked, false);
  });
});
