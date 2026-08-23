import { type EventFormat, filterLiveIncludedEvents, type TicketType } from './ticketAccess.js';

type AddedEvent = {
  id: string;
  title: string;
  eventFormat: EventFormat;
};

type ActiveBooking = {
  id: string;
  userId: string;
  ticketType: TicketType | null;
  paidAt: Date | null;
  pricePaidCents: number | null;
  paymentId: string | null;
};

type ExistingAttendee = {
  id: string;
  eventId: string;
  userId: string;
  status: 'active' | 'cancelled' | 'refund_requested';
};

type TrackEventBackfillValues = {
  eventId: string;
  userId: string;
  registeredAt: Date;
  paidAt: Date | null;
  pricePaidCents: number | null;
  paymentId: string | null;
  sourceTrackBookingId: string;
};

type TrackEventReactivation = TrackEventBackfillValues & {
  attendeeId: string;
};

type TrackEventBackfillPlan = {
  eventId: string;
  notEntitled: string[];
  toSkip: string[];
  toReactivate: TrackEventReactivation[];
  toInsert: TrackEventBackfillValues[];
};

function backfillValues(
  booking: ActiveBooking,
  eventId: string,
  registeredAt: Date,
): TrackEventBackfillValues {
  return {
    eventId,
    userId: booking.userId,
    registeredAt,
    paidAt: booking.paidAt,
    pricePaidCents: booking.pricePaidCents,
    paymentId: booking.paymentId,
    sourceTrackBookingId: booking.id,
  };
}

export function classifyTrackEventBackfill(input: {
  bookings: ActiveBooking[];
  events: AddedEvent[];
  existingAttendees: ExistingAttendee[];
  registeredAt: Date;
}): TrackEventBackfillPlan[] {
  const attendeeByEventAndUser = new Map(
    input.existingAttendees.map((row) => [`${row.eventId}:${row.userId}`, row]),
  );

  return input.events.map((event) => {
    const plan: TrackEventBackfillPlan = {
      eventId: event.id,
      notEntitled: [],
      toSkip: [],
      toReactivate: [],
      toInsert: [],
    };

    for (const booking of input.bookings) {
      const entitled = filterLiveIncludedEvents([event], booking.ticketType).length === 1;
      if (!entitled) {
        plan.notEntitled.push(booking.userId);
        continue;
      }

      const attendee = attendeeByEventAndUser.get(`${event.id}:${booking.userId}`);
      if (attendee?.status === 'active' || attendee?.status === 'refund_requested') {
        plan.toSkip.push(attendee.id);
        continue;
      }

      const values = backfillValues(booking, event.id, input.registeredAt);
      if (attendee) {
        plan.toReactivate.push({ attendeeId: attendee.id, ...values });
      } else {
        plan.toInsert.push(values);
      }
    }

    return plan;
  });
}

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired';
type PaymentItemType = 'event' | 'track' | 'subscription' | 'order' | 'masterclass';

type VerifiedTrackReservation = {
  userId: string;
  paymentId: string;
  ticketType: TicketType | null;
  expiresAt: Date;
};

type HoldAttendee = {
  eventId: string;
  userId: string;
  status: 'active' | 'cancelled' | 'refund_requested';
};

type ExistingEventReservation = {
  id: string;
  eventId: string;
  userId: string;
  paymentId: string;
  expiresAt: Date;
  owningPaymentStatus: PaymentStatus;
  owningPaymentItemType: PaymentItemType;
};

type StandalonePayment = {
  eventId: string;
  status: PaymentStatus;
  hasGatewayIntent: boolean;
};

type TrackEventHold = {
  eventId: string;
  userId: string;
  paymentId: string;
  expiresAt: Date;
};

type TrackEventHoldPlan =
  | {
      blocked: true;
      code: 'EVENT_HAS_PENDING_CHECKOUTS';
      message: string;
      event: AddedEvent;
    }
  | {
      blocked: false;
      staleRowsToDelete: string[];
      holdsToInsert: TrackEventHold[];
      newHoldCountsByEvent: Record<string, number>;
    };

function unresolvedStandalonePayment(payment: StandalonePayment): boolean {
  return payment.status === 'pending' || (payment.status === 'expired' && payment.hasGatewayIntent);
}

function pendingStandaloneReservation(row: ExistingEventReservation, referenceTime: Date): boolean {
  return (
    row.owningPaymentItemType === 'event' &&
    row.owningPaymentStatus === 'pending' &&
    row.expiresAt > referenceTime
  );
}

function standaloneCheckoutBlock(event: AddedEvent): TrackEventHoldPlan {
  return {
    blocked: true,
    code: 'EVENT_HAS_PENDING_CHECKOUTS',
    message: `Event "${event.title}" has unresolved checkouts. Wait for them to become paid or failed, or use a fresh event.`,
    event,
  };
}

export function planTrackEventReservationHolds(input: {
  trackReservations: VerifiedTrackReservation[];
  events: AddedEvent[];
  existingAttendees: HoldAttendee[];
  existingReservations: ExistingEventReservation[];
  unresolvedStandalonePayments: StandalonePayment[];
  referenceTime: Date;
}): TrackEventHoldPlan {
  const eventById = new Map(input.events.map((event) => [event.id, event]));
  const unresolvedPayment = input.unresolvedStandalonePayments.find((payment) =>
    unresolvedStandalonePayment(payment),
  );
  if (unresolvedPayment) {
    const event = eventById.get(unresolvedPayment.eventId);
    if (event) return standaloneCheckoutBlock(event);
  }

  const pendingStandaloneHold = input.existingReservations.find((row) =>
    pendingStandaloneReservation(row, input.referenceTime),
  );
  if (pendingStandaloneHold) {
    const event = eventById.get(pendingStandaloneHold.eventId);
    if (event) return standaloneCheckoutBlock(event);
  }

  const countedAttendees = new Set(
    input.existingAttendees
      .filter((row) => row.status === 'active' || row.status === 'refund_requested')
      .map((row) => `${row.eventId}:${row.userId}`),
  );
  const reservationByEventAndUser = new Map(
    input.existingReservations.map((row) => [`${row.eventId}:${row.userId}`, row]),
  );
  const staleRowsToDelete: string[] = [];
  const holdsToInsert: TrackEventHold[] = [];
  const newHoldCountsByEvent = Object.fromEntries(input.events.map((event) => [event.id, 0]));

  for (const reservation of input.trackReservations) {
    const includedEvents = filterLiveIncludedEvents(input.events, reservation.ticketType);
    for (const event of includedEvents) {
      const ownerKey = `${event.id}:${reservation.userId}`;
      if (countedAttendees.has(ownerKey)) continue;

      const existing = reservationByEventAndUser.get(ownerKey);
      if (existing) {
        const sameCurrentHold =
          existing.paymentId === reservation.paymentId &&
          existing.owningPaymentStatus === 'pending' &&
          existing.expiresAt > input.referenceTime;
        if (sameCurrentHold) continue;

        const stale =
          existing.expiresAt <= input.referenceTime || existing.owningPaymentStatus !== 'pending';
        if (!stale) continue;
        staleRowsToDelete.push(existing.id);
      }

      holdsToInsert.push({
        eventId: event.id,
        userId: reservation.userId,
        paymentId: reservation.paymentId,
        expiresAt: reservation.expiresAt,
      });
      if (!existing || existing.expiresAt <= input.referenceTime) {
        newHoldCountsByEvent[event.id] = (newHoldCountsByEvent[event.id] ?? 0) + 1;
      }
    }
  }

  return { blocked: false, staleRowsToDelete, holdsToInsert, newHoldCountsByEvent };
}

type CapacityEvent = AddedEvent & {
  maxAttendees: number | null;
  occupiedRows: number;
  unexpiredReservations: number;
  newHolds: number;
  netNewRows: number;
};

type CapacityBlockCode =
  | 'TRACK_CAPACITY_REQUIRED'
  | 'CAPACITY_REQUIRED'
  | 'CAPACITY_MISMATCH'
  | 'CAPACITY_TOO_LOW'
  | 'CAPACITY_INSUFFICIENT';

type TrackEventCapacityDecision =
  | { allowed: true }
  | { allowed: false; code: CapacityBlockCode; message: string; status: 400 | 409 };

export function evaluateTrackEventAdditionCapacity(input: {
  maxTrackBookings: number | null;
  mode: 'booked' | 'reservation-only';
  events: CapacityEvent[];
}): TrackEventCapacityDecision {
  if (input.mode === 'booked' && input.maxTrackBookings === null) {
    return {
      allowed: false,
      code: 'TRACK_CAPACITY_REQUIRED',
      message: "Set the track's booking capacity before adding sessions to a booked track.",
      status: 400,
    };
  }

  for (const event of input.events) {
    if (event.maxAttendees === null) {
      return {
        allowed: false,
        code: 'CAPACITY_REQUIRED',
        message: `Event "${event.title}" must have maxAttendees set.`,
        status: 400,
      };
    }

    if (input.maxTrackBookings !== null) {
      if (input.mode === 'booked' && event.maxAttendees !== input.maxTrackBookings) {
        return {
          allowed: false,
          code: 'CAPACITY_MISMATCH',
          message: `Event "${event.title}" capacity (${event.maxAttendees}) does not equal the track capacity (${input.maxTrackBookings}).`,
          status: 400,
        };
      }
      if (input.mode === 'reservation-only' && event.maxAttendees < input.maxTrackBookings) {
        return {
          allowed: false,
          code: 'CAPACITY_TOO_LOW',
          message: `Event "${event.title}" capacity (${event.maxAttendees}) < track maxTrackBookings (${input.maxTrackBookings}).`,
          status: 400,
        };
      }
    }

    const reserved = event.unexpiredReservations + event.newHolds;
    if (event.occupiedRows + reserved + event.netNewRows > event.maxAttendees) {
      return {
        allowed: false,
        code: 'CAPACITY_INSUFFICIENT',
        message: `Event "${event.title}" cannot seat everyone: ${event.occupiedRows} registered + ${reserved} reserved + ${event.netNewRows} to add exceeds capacity ${event.maxAttendees}.`,
        status: 409,
      };
    }
  }

  return { allowed: true };
}
