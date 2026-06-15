import { and, isNull, type SQLWrapper } from 'drizzle-orm';
import { trackBookings } from '../db/schema/index.js';

type TrackBookingRow = {
  id: string;
  revokedAt?: Date | null;
};

type MaybeCondition = SQLWrapper | undefined;

function definedConditions(conditions: MaybeCondition[]) {
  return conditions.filter((condition): condition is SQLWrapper => Boolean(condition));
}

export function activeTrackBookingWhere(...conditions: MaybeCondition[]) {
  return and(...definedConditions(conditions), isNull(trackBookings.revokedAt));
}

export function historicalTrackBookingWhere(...conditions: MaybeCondition[]) {
  const filtered = definedConditions(conditions);
  return filtered.length > 0 ? and(...filtered) : undefined;
}

export function isTrackBookingActive(booking: TrackBookingRow | null | undefined): boolean {
  return Boolean(booking && (booking.revokedAt === undefined || booking.revokedAt === null));
}

export function hasTrackBookingRow(bookingRows: TrackBookingRow[] | null | undefined): boolean {
  return Array.isArray(bookingRows) && bookingRows.some((row) => isTrackBookingActive(row));
}
