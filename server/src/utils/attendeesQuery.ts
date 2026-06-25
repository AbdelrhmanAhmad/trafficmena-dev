import { eq, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { db } from '../db/client.js';
import { payments, profiles, trackBookings, users } from '../db/schema/index.js';

/**
 * Final paid figure for an attendee, read from stored values (never recomputed):
 * the per-row price after discount/promo, then the linked payment total, then 0 so
 * confirmed-free rows surface as "Free" in the UI. Shared by the event and track routes.
 */
export const attendeeAmountCents = (priceColumn: AnyPgColumn) =>
  sql<number>`COALESCE(${priceColumn}, ${payments.amountCents}, 0)`;

const trackBookingSource = sql<'paid' | 'free' | 'manual'>`CASE
  WHEN ${trackBookings.bookingSource} = 'manual' THEN 'manual'
  WHEN ${payments.id} IS NOT NULL AND COALESCE(${payments.amountCents}, 0) > 0 THEN 'paid'
  WHEN ${payments.id} IS NOT NULL THEN 'free'
  ELSE ${trackBookings.bookingSource}::text
END`;

const trackBookingReference = sql<string | null>`CASE
  WHEN ${trackBookings.bookingSource} = 'manual' THEN ${trackBookings.manualReference}
  WHEN ${payments.id} IS NOT NULL AND COALESCE(${payments.amountCents}, 0) > 0 THEN ${payments.fawaterkInvoiceKey}
  ELSE NULL
END`;

/**
 * Track-booking attendee row shape, shared by the track attendees route and the series
 * enrolled list. Field order preserves the original track route output; `amountPaidCents`
 * is additive (KTD-2).
 */
export const trackAttendeeSelection = {
  userId: users.id,
  email: users.email,
  name: users.name,
  firstName: profiles.firstName,
  lastName: profiles.lastName,
  phoneNumber: profiles.phoneNumber,
  bookedAt: trackBookings.bookedAt,
  invoiceId: payments.fawaterkInvoiceId,
  invoiceNumber: payments.fawaterkInvoiceKey,
  source: trackBookingSource,
  reference: trackBookingReference,
  amountPaidCents: attendeeAmountCents(trackBookings.pricePaidCents),
};

/**
 * Track-attendees query with the canonical joins. The caller adds order/limit/offset (track
 * route) or fetches-then-unions (series route). `database` is injected so this module stays
 * free of the db-client import and remains importable in pure unit tests.
 */
export function buildTrackAttendeesQuery(database: typeof db, where: SQL | undefined) {
  return database
    .select(trackAttendeeSelection)
    .from(trackBookings)
    .leftJoin(users, eq(trackBookings.userId, users.id))
    .leftJoin(profiles, eq(users.id, profiles.id))
    .leftJoin(payments, eq(trackBookings.paymentId, payments.id))
    .where(where);
}
