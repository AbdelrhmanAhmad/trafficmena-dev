import { and, eq, gt, inArray, isNull, ne, sql } from 'drizzle-orm';
import type { db } from '../../db/client.js';
import {
  eventAttendees,
  eventReservations,
  events,
  trackBookings,
  trackEvents,
  trackReservations,
  tracks,
} from '../../db/schema/index.js';
import { activeTrackBookingWhere } from '../../utils/booking.js';
import { ApiError } from '../../utils/errors.js';

const ACTIVE_EVENT_ATTENDEE_STATUSES = ['active', 'refund_requested'] as const;

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TrackBookingSource = 'paid' | 'free' | 'manual';

type TrackBookingWriteParams = {
  trackId: string;
  userId: string;
  bookingSource: TrackBookingSource;
  maxTrackBookings: number | null;
  bookedAt?: Date;
  referenceTime?: Date;
  paidAt: Date | null;
  pricePaidCents: number | null;
  paymentId: string | null;
  manualReference?: string | null;
  grantedBy?: string | null;
  grantReason?: string | null;
  excludeReservationPaymentId?: string | null;
};

export type TrackBookingWriteResult =
  | {
      type: 'already_booked';
      bookingId: string;
    }
  | {
      type: 'booked';
      bookingId: string;
      existingCount: number;
      grantedCount: number;
    };

type RevokeTrackBookingParams = {
  trackId: string;
  userId: string;
  actorUserId: string;
  reason: string;
  revokedAt?: Date;
};

export type RevokeTrackBookingResult =
  | {
      type: 'not_found';
    }
  | {
      type: 'revoked';
      bookingId: string;
      revokedEventCount: number;
    };

function optionalReservationExclusion(
  paymentIdColumn: typeof eventReservations.paymentId | typeof trackReservations.paymentId,
  excludeReservationPaymentId: string | null | undefined,
) {
  return excludeReservationPaymentId ? ne(paymentIdColumn, excludeReservationPaymentId) : undefined;
}

export async function executeTrackBookingWrite(
  tx: DbTransaction,
  params: TrackBookingWriteParams,
): Promise<TrackBookingWriteResult> {
  const bookedAt = params.bookedAt ?? new Date();
  const referenceTime = params.referenceTime ?? bookedAt;

  const [lockedTrack] = await tx
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.id, params.trackId))
    .for('update')
    .limit(1);

  if (!lockedTrack) {
    throw new ApiError('TRACK_NOT_FOUND', 'Track not found.', 404);
  }

  const trackEventRows = await tx
    .select({
      eventId: trackEvents.eventId,
      maxAttendees: events.maxAttendees,
    })
    .from(trackEvents)
    .innerJoin(events, eq(events.id, trackEvents.eventId))
    .where(eq(trackEvents.trackId, params.trackId))
    .for('update');

  if (trackEventRows.length === 0) {
    throw new ApiError('TRACK_EMPTY', 'Track has no events.', 400);
  }

  if (trackEventRows.some((row) => row.maxAttendees === null)) {
    throw new ApiError('CAPACITY_NOT_SET', 'Some events have no capacity set.', 400);
  }

  const eventIds = trackEventRows.map((row) => row.eventId);

  const [existingBooking] = await tx
    .select({
      id: trackBookings.id,
      revokedAt: trackBookings.revokedAt,
    })
    .from(trackBookings)
    .where(and(eq(trackBookings.trackId, params.trackId), eq(trackBookings.userId, params.userId)))
    .for('update')
    .limit(1);

  if (existingBooking && existingBooking.revokedAt === null) {
    return {
      type: 'already_booked',
      bookingId: existingBooking.id,
    };
  }

  const [activeBookingCountRows, activeReservationCountRows, existingEventRows, attendeeCounts] =
    await Promise.all([
      tx
        .select({ count: sql<number>`count(*)::int` })
        .from(trackBookings)
        .where(activeTrackBookingWhere(eq(trackBookings.trackId, params.trackId))),
      tx
        .select({ count: sql<number>`count(*)::int` })
        .from(trackReservations)
        .where(
          and(
            eq(trackReservations.trackId, params.trackId),
            gt(trackReservations.expiresAt, referenceTime),
            optionalReservationExclusion(
              trackReservations.paymentId,
              params.excludeReservationPaymentId,
            ),
          ),
        ),
      tx
        .select({
          id: eventAttendees.id,
          eventId: eventAttendees.eventId,
          status: eventAttendees.status,
        })
        .from(eventAttendees)
        .where(
          and(eq(eventAttendees.userId, params.userId), inArray(eventAttendees.eventId, eventIds)),
        )
        .for('update'),
      tx
        .select({
          eventId: eventAttendees.eventId,
          count: sql<number>`count(*)::int`,
        })
        .from(eventAttendees)
        .where(
          and(
            inArray(eventAttendees.eventId, eventIds),
            inArray(eventAttendees.status, ACTIVE_EVENT_ATTENDEE_STATUSES),
          ),
        )
        .groupBy(eventAttendees.eventId),
    ]);
  const [activeBookingCountRow] = activeBookingCountRows;
  const [activeReservationCountRow] = activeReservationCountRows;

  if (
    params.maxTrackBookings !== null &&
    Number(activeBookingCountRow?.count ?? 0) + Number(activeReservationCountRow?.count ?? 0) >=
      params.maxTrackBookings
  ) {
    throw new ApiError('TRACK_FULL', 'Track booking limit reached.', 409);
  }

  const reservationCounts =
    eventIds.length === 0
      ? []
      : await tx
          .select({
            eventId: eventReservations.eventId,
            count: sql<number>`count(*)::int`,
          })
          .from(eventReservations)
          .where(
            and(
              inArray(eventReservations.eventId, eventIds),
              gt(eventReservations.expiresAt, referenceTime),
              optionalReservationExclusion(
                eventReservations.paymentId,
                params.excludeReservationPaymentId,
              ),
            ),
          )
          .groupBy(eventReservations.eventId);

  const attendeeCountByEventId = new Map(
    attendeeCounts.map((row) => [row.eventId, Number(row.count)]),
  );
  const reservationCountByEventId = new Map(
    reservationCounts.map((row) => [row.eventId, Number(row.count)]),
  );
  const existingEventById = new Map(existingEventRows.map((row) => [row.eventId, row]));

  const insertEventIds: string[] = [];
  const reactivateAttendeeIds: string[] = [];
  let existingCount = 0;

  for (const trackEventRow of trackEventRows) {
    const existingEvent = existingEventById.get(trackEventRow.eventId);
    if (
      existingEvent &&
      (existingEvent.status === 'active' || existingEvent.status === 'refund_requested')
    ) {
      existingCount += 1;
      continue;
    }

    const attendeeCount = attendeeCountByEventId.get(trackEventRow.eventId) ?? 0;
    const reservationCount = reservationCountByEventId.get(trackEventRow.eventId) ?? 0;
    if (attendeeCount + reservationCount >= (trackEventRow.maxAttendees ?? 0)) {
      throw new ApiError('EVENT_FULL', 'One or more events in this track are at capacity.', 409);
    }

    if (existingEvent) {
      reactivateAttendeeIds.push(existingEvent.id);
      continue;
    }

    insertEventIds.push(trackEventRow.eventId);
  }

  const sharedBookingValues = {
    bookedAt,
    paidAt: params.paidAt,
    pricePaidCents: params.pricePaidCents,
    paymentId: params.paymentId,
    bookingSource: params.bookingSource,
    manualReference: params.bookingSource === 'manual' ? (params.manualReference ?? null) : null,
    grantedBy: params.bookingSource === 'manual' ? (params.grantedBy ?? null) : null,
    grantReason: params.bookingSource === 'manual' ? (params.grantReason ?? null) : null,
    revokedAt: null,
    revokedBy: null,
    revokeReason: null,
  } as const;

  const bookingId = existingBooking
    ? (
        await tx
          .update(trackBookings)
          .set(sharedBookingValues)
          .where(eq(trackBookings.id, existingBooking.id))
          .returning({ id: trackBookings.id })
      )[0]?.id
    : (
        await tx
          .insert(trackBookings)
          .values({
            trackId: params.trackId,
            userId: params.userId,
            ...sharedBookingValues,
          })
          .returning({ id: trackBookings.id })
      )[0]?.id;

  if (!bookingId) {
    throw new ApiError('TRACK_BOOKING_FAILED', 'Unable to create track booking.', 500);
  }

  if (reactivateAttendeeIds.length > 0) {
    await tx
      .update(eventAttendees)
      .set({
        registeredAt: bookedAt,
        paidAt: params.paidAt,
        pricePaidCents: params.pricePaidCents,
        paymentId: params.paymentId,
        sourceTrackBookingId: bookingId,
        status: 'active',
        cancelledAt: null,
        refundRequestedAt: null,
        adminNote: null,
      })
      .where(inArray(eventAttendees.id, reactivateAttendeeIds));
  }

  if (insertEventIds.length > 0) {
    await tx.insert(eventAttendees).values(
      insertEventIds.map((eventId) => ({
        eventId,
        userId: params.userId,
        registeredAt: bookedAt,
        paidAt: params.paidAt,
        pricePaidCents: params.pricePaidCents,
        paymentId: params.paymentId,
        sourceTrackBookingId: bookingId,
      })),
    );
  }

  return {
    type: 'booked',
    bookingId,
    existingCount,
    grantedCount: reactivateAttendeeIds.length + insertEventIds.length,
  };
}

export async function revokeTrackBookingAccess(
  tx: DbTransaction,
  params: RevokeTrackBookingParams,
): Promise<RevokeTrackBookingResult> {
  const revokedAt = params.revokedAt ?? new Date();

  const [booking] = await tx
    .select({
      id: trackBookings.id,
      bookedAt: trackBookings.bookedAt,
      paidAt: trackBookings.paidAt,
      pricePaidCents: trackBookings.pricePaidCents,
      paymentId: trackBookings.paymentId,
    })
    .from(trackBookings)
    .where(
      activeTrackBookingWhere(
        eq(trackBookings.trackId, params.trackId),
        eq(trackBookings.userId, params.userId),
      ),
    )
    .for('update')
    .limit(1);

  if (!booking) {
    return { type: 'not_found' };
  }

  const trackEventRows = await tx
    .select({ eventId: trackEvents.eventId })
    .from(trackEvents)
    .where(eq(trackEvents.trackId, params.trackId));
  const trackEventIds = trackEventRows.map((row) => row.eventId);

  await tx
    .update(trackBookings)
    .set({
      revokedAt,
      revokedBy: params.actorUserId,
      revokeReason: params.reason,
    })
    .where(eq(trackBookings.id, booking.id));

  const revokeAttendeeValues = {
    status: 'cancelled' as const,
    cancelledAt: revokedAt,
    refundRequestedAt: null,
    adminNote: `Track enrollment revoked: ${params.reason}`,
  };

  const revokedLinkedAttendees = await tx
    .update(eventAttendees)
    .set(revokeAttendeeValues)
    .where(
      and(
        eq(eventAttendees.sourceTrackBookingId, booking.id),
        inArray(eventAttendees.status, ACTIVE_EVENT_ATTENDEE_STATUSES),
      ),
    )
    .returning({ id: eventAttendees.id });

  let revokedLegacyAttendeesCount = 0;

  // The migration backfills sourceTrackBookingId for historical attendees, but keep a
  // conservative fallback so legacy access cannot survive if an environment skipped that step.
  if (trackEventIds.length > 0 && booking.paymentId) {
    const revokedLegacyAttendees = await tx
      .update(eventAttendees)
      .set(revokeAttendeeValues)
      .where(
        and(
          eq(eventAttendees.userId, params.userId),
          inArray(eventAttendees.eventId, trackEventIds),
          isNull(eventAttendees.sourceTrackBookingId),
          eq(eventAttendees.paymentId, booking.paymentId),
          inArray(eventAttendees.status, ACTIVE_EVENT_ATTENDEE_STATUSES),
        ),
      )
      .returning({ id: eventAttendees.id });

    revokedLegacyAttendeesCount += revokedLegacyAttendees.length;
  }

  if (trackEventIds.length > 0 && booking.paymentId === null && booking.paidAt === null) {
    const revokedLegacyFreeAttendees = await tx
      .update(eventAttendees)
      .set(revokeAttendeeValues)
      .where(
        and(
          eq(eventAttendees.userId, params.userId),
          inArray(eventAttendees.eventId, trackEventIds),
          isNull(eventAttendees.sourceTrackBookingId),
          isNull(eventAttendees.paymentId),
          isNull(eventAttendees.paidAt),
          eq(eventAttendees.registeredAt, booking.bookedAt),
          sql`COALESCE(${eventAttendees.pricePaidCents}, 0) = ${booking.pricePaidCents ?? 0}`,
          inArray(eventAttendees.status, ACTIVE_EVENT_ATTENDEE_STATUSES),
        ),
      )
      .returning({ id: eventAttendees.id });

    revokedLegacyAttendeesCount += revokedLegacyFreeAttendees.length;
  }

  return {
    type: 'revoked',
    bookingId: booking.id,
    revokedEventCount: revokedLinkedAttendees.length + revokedLegacyAttendeesCount,
  };
}
