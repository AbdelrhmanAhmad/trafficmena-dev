// Read-time union of a series' enrolled users (KTD-1): the linked track's bookers
// (paid/free/manual) merged with the series' manual grants, deduped by user. Pure logic —
// the route fetches both sources from the DB and delegates the merge/search/sort/paginate
// here so it stays unit-testable without a database.

// Upper bound on rows pulled from each source before the in-memory merge. A linked track's
// maxTrackBookings can be null (uncapped), so without this a popular track would load its full
// booking history on every page. Both source queries fetch the most-recent N (bookedAt desc),
// so the cap keeps the newest rows; the route flags `truncated` when either source hits it.
export const MAX_MERGE_ROWS = 2000;

// True when either fetched source reached the cap, meaning the merged total may be incomplete.
export function isMergeTruncated(bookingCount: number, grantCount: number): boolean {
  return bookingCount >= MAX_MERGE_ROWS || grantCount >= MAX_MERGE_ROWS;
}

export type SeriesTicketType = 'online_only' | 'online_offline' | 'offline_only';

export type SeriesAttendeeRow = {
  userId: string;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  bookedAt: Date | string;
  invoiceId: number | string | null;
  transactionId: number | null;
  invoiceNumber: string | null;
  source: 'paid' | 'free' | 'manual';
  reference: string | null;
  amountPaidCents: number | null;
  // The track booking's ticket variant; null for manual grants (shown as "Manual grant").
  ticketType: SeriesTicketType | null;
  // Discriminator for the UI: present only for manual-grant rows (revoke is allowed there).
  grantId: string | null;
};

// Track-booking rows arrive already in the attendee shape (from buildTrackAttendeesQuery),
// where the left-joined userId is nullable at the type level.
export type SeriesBookingAttendeeInput = Omit<SeriesAttendeeRow, 'grantId' | 'userId'> & {
  userId: string | null;
};

// Manual-grant rows arrive in their native shape and are mapped into the attendee shape.
export type SeriesGrantAttendeeInput = {
  grantId: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  grantedAt: Date | string;
  grantReason: string | null;
};

function grantToRow(grant: SeriesGrantAttendeeInput): SeriesAttendeeRow {
  return {
    userId: grant.userId as string,
    email: grant.email,
    name: grant.name,
    firstName: grant.firstName,
    lastName: grant.lastName,
    phoneNumber: grant.phoneNumber,
    bookedAt: grant.grantedAt,
    invoiceId: null,
    transactionId: null,
    invoiceNumber: null,
    source: 'manual',
    reference: grant.grantReason,
    amountPaidCents: null,
    ticketType: null,
    grantId: grant.grantId,
  };
}

function matchesSearch(row: SeriesAttendeeRow, search: string): boolean {
  const haystack = [
    row.name,
    row.firstName,
    row.lastName,
    row.email,
    row.phoneNumber,
    row.invoiceNumber,
    row.invoiceId == null ? null : String(row.invoiceId),
    row.transactionId == null ? null : String(row.transactionId),
    row.reference,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(search);
}

function bookedAtMs(value: Date | string): number {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function mergeSeriesAttendees(
  bookingRows: SeriesBookingAttendeeInput[],
  grantRows: SeriesGrantAttendeeInput[],
  options: { search?: string; page: number; pageSize: number; ticketType?: SeriesTicketType },
): { items: SeriesAttendeeRow[]; total: number } {
  const byUserId = new Map<string, SeriesAttendeeRow>();

  // A specific ticket-type filter applies to booking rows only and excludes manual grants (which
  // have no ticket type). Applied here, per-source, BEFORE pagination so counts stay correct.
  const filteredBookings = options.ticketType
    ? bookingRows.filter((booking) => booking.ticketType === options.ticketType)
    : bookingRows;
  const includeGrants = !options.ticketType;

  // Booking rows first so a user who both bought the track and holds a grant keeps the
  // booking row (richer: invoice + amount), and shows no revoke affordance.
  for (const booking of filteredBookings) {
    if (!booking.userId) continue;
    byUserId.set(booking.userId, { ...booking, userId: booking.userId, grantId: null });
  }
  if (includeGrants) {
    for (const grant of grantRows) {
      if (!grant.userId || byUserId.has(grant.userId)) continue;
      byUserId.set(grant.userId, grantToRow(grant));
    }
  }

  let merged = [...byUserId.values()];

  const normalizedSearch = options.search?.trim().toLowerCase();
  if (normalizedSearch) {
    merged = merged.filter((row) => matchesSearch(row, normalizedSearch));
  }

  merged.sort((a, b) => bookedAtMs(b.bookedAt) - bookedAtMs(a.bookedAt));

  const total = merged.length;
  const offset = (options.page - 1) * options.pageSize;
  const items = merged.slice(offset, offset + options.pageSize);
  return { items, total };
}
