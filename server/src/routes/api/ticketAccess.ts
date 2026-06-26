// Single source of truth for hybrid-track ticket entitlement. Every access decision (Zoom links,
// locations, recordings, capacity) routes through these pure functions so the matrix is never
// reimplemented inline. See the plan's "Access entitlement matrix" (2026-06-26-003).

export type TicketType = 'online_only' | 'online_offline' | 'offline_only';
export type EventFormat = 'online' | 'offline';

export const TICKET_TYPES: readonly TicketType[] = [
  'online_only',
  'online_offline',
  'offline_only',
];

export type TicketAccess = {
  /** Can join the live session (Zoom for online events, venue for offline events). */
  canAttendLive: boolean;
  /** Can open the recording of this session once a manager uploads it. */
  canAccessRecording: boolean;
};

// Which event formats a ticket registers the buyer into (gets an attendee/reservation row).
const LIVE_INCLUDED: Record<TicketType, EventFormat[]> = {
  online_only: ['online'],
  online_offline: ['online', 'offline'],
  offline_only: ['offline'],
};

/** Formats the buyer is registered for / consumes a seat in (11 online / all 14 / 3 offline). */
export function liveIncludedFormats(ticketType: TicketType): EventFormat[] {
  return LIVE_INCLUDED[ticketType] ?? [];
}

/**
 * The subset of a track's events a ticket registers the buyer into (attendee + reservation rows).
 * A null/undefined ticketType means a legacy booking that includes every session — unchanged.
 */
export function filterLiveIncludedEvents<T extends { eventFormat: EventFormat }>(
  events: T[],
  ticketType: TicketType | null | undefined,
): T[] {
  if (!ticketType) return events;
  const formats = liveIncludedFormats(ticketType);
  return events.filter((event) => formats.includes(event.eventFormat));
}

/**
 * The canonical matrix. Online sessions are live+recording for online-entitled tickets; offline
 * sessions are live for offline-entitled tickets but their recordings are available to ALL three
 * variants (online_only buyers get the offline recordings without being attendees).
 */
export function resolveTicketAccess(
  ticketType: TicketType,
  eventFormat: EventFormat,
): TicketAccess {
  if (eventFormat === 'online') {
    const onlineEntitled = ticketType === 'online_only' || ticketType === 'online_offline';
    return { canAttendLive: onlineEntitled, canAccessRecording: onlineEntitled };
  }
  // offline
  const offlineEntitled = ticketType === 'online_offline' || ticketType === 'offline_only';
  return { canAttendLive: offlineEntitled, canAccessRecording: true };
}

export function canAttendLive(ticketType: TicketType, eventFormat: EventFormat): boolean {
  return resolveTicketAccess(ticketType, eventFormat).canAttendLive;
}

// --- Booking-level access (handles legacy bookings) ----------------------------------------------
//
// A booking with no ticketType is a legacy / non-ticket-typed-track booking that granted everything,
// so it keeps full access. Otherwise the matrix applies. These are what access routes call.

/** Whether an active track booking lets the viewer join an event's live session. */
export function bookingGrantsLiveAttendance(
  ticketType: TicketType | null | undefined,
  eventFormat: EventFormat,
): boolean {
  if (!ticketType) return true;
  return canAttendLive(ticketType, eventFormat);
}

/** Whether an active track booking lets the viewer open a recording (eventFormat null = general). */
export function bookingGrantsRecording(
  ticketType: TicketType | null | undefined,
  eventFormat: EventFormat | null,
): boolean {
  if (!ticketType) return true;
  return canAccessRecording(ticketType, eventFormat);
}

/**
 * Recording access including the null-event convention: a premium recording with no linked event is
 * general track content, so it follows the offline rule (visible to all three ticket types).
 */
export function canAccessRecording(
  ticketType: TicketType,
  eventFormat: EventFormat | null,
): boolean {
  if (eventFormat === null) return true;
  return resolveTicketAccess(ticketType, eventFormat).canAccessRecording;
}

// --- Track ticket pricing / configuration --------------------------------------------------------

export type TrackTicketPrices = {
  onlineOnlyPriceCents: number | null;
  onlineOfflinePriceCents: number | null;
  offlineOnlyPriceCents: number | null;
};

const PRICE_COLUMN: Record<TicketType, keyof TrackTicketPrices> = {
  online_only: 'onlineOnlyPriceCents',
  online_offline: 'onlineOfflinePriceCents',
  offline_only: 'offlineOnlyPriceCents',
};

/** Price for a ticket variant, or null when that variant is not offered. 0 = enabled and free. */
export function getTrackTicketPrice(
  track: TrackTicketPrices,
  ticketType: TicketType,
): number | null {
  return track[PRICE_COLUMN[ticketType]] ?? null;
}

/** A ticket type is enabled when its price column is non-null (price 0 = enabled free). */
export function isTicketEnabled(track: TrackTicketPrices, ticketType: TicketType): boolean {
  return getTrackTicketPrice(track, ticketType) !== null;
}

/** True when the track sells ticket types at all (else it uses the legacy single price). */
export function hasTicketTypes(track: TrackTicketPrices): boolean {
  return TICKET_TYPES.some((ticketType) => isTicketEnabled(track, ticketType));
}

/** The ticket variants a track offers, in canonical order. */
export function enabledTicketTypes(track: TrackTicketPrices): TicketType[] {
  return TICKET_TYPES.filter((ticketType) => isTicketEnabled(track, ticketType));
}

/**
 * Publish-time guard: an enabled ticket can only be sold if the track actually contains the sessions
 * it promises. Returns a human message when coverage is missing, else null. (online_offline needs
 * both formats; online_only needs an online session; offline_only needs an offline session.)
 */
export function ticketEventCoverageError(
  track: TrackTicketPrices,
  coverage: { hasOnlineEvent: boolean; hasOfflineEvent: boolean },
): string | null {
  const enabled = enabledTicketTypes(track);
  const needsOnline = enabled.some((ticketType) =>
    liveIncludedFormats(ticketType).includes('online'),
  );
  const needsOffline = enabled.some((ticketType) =>
    liveIncludedFormats(ticketType).includes('offline'),
  );
  if (needsOnline && !coverage.hasOnlineEvent) {
    return 'An online ticket is enabled but this track has no online session.';
  }
  if (needsOffline && !coverage.hasOfflineEvent) {
    return 'An offline ticket is enabled but this track has no offline session.';
  }
  return null;
}

export type TrackBasePriceResult =
  | { ok: true; basePrice: number }
  | { ok: false; reason: 'ticket_type_required' | 'ticket_type_disabled' };

/**
 * The base price to charge for a track, before subscriber/promo discounts. Ticket-typed tracks
 * require an enabled variant; legacy tracks fall back to the single priceInCents. Pure so the
 * checkout/price-preview money decision is testable without a DB.
 */
export function resolveTrackBasePrice(
  track: TrackTicketPrices & { priceInCents: number | null },
  ticketType: TicketType | null | undefined,
): TrackBasePriceResult {
  if (hasTicketTypes(track)) {
    if (!ticketType) {
      return { ok: false, reason: 'ticket_type_required' };
    }
    if (!isTicketEnabled(track, ticketType)) {
      return { ok: false, reason: 'ticket_type_disabled' };
    }
    return { ok: true, basePrice: getTrackTicketPrice(track, ticketType) ?? 0 };
  }
  return { ok: true, basePrice: track.priceInCents ?? 0 };
}
