import type { TicketType } from '../ticketTypes';

type TrackPricePreviewGateInput = {
  signedIn: boolean;
  hasItemId: boolean;
  // Whether the track query has resolved. Firing before it does sends a request with no ticketType.
  trackLoaded: boolean;
  // Whether booking is currently possible (window open, not sold out) — the page's canBook check.
  bookingOpen: boolean;
  userHasBooked: boolean;
  usesTicketTypes: boolean;
  selectedTicketType: TicketType | null;
};

export type TrackPricePreviewGate = {
  enabled: boolean;
  ticketType: TicketType | undefined;
};

const OFF: TrackPricePreviewGate = { enabled: false, ticketType: undefined };

// Whether the track price-preview query may fire, and with which ticketType. Gating on `trackLoaded`
// alone kills the 400 storm: while the track is undefined `usesTicketTypes` reads false, so the old
// gate fired without a ticketType and 400d TICKET_TYPE_REQUIRED on ticketed tracks.
export function getTrackPricePreviewGate({
  signedIn,
  hasItemId,
  trackLoaded,
  bookingOpen,
  userHasBooked,
  usesTicketTypes,
  selectedTicketType,
}: TrackPricePreviewGateInput): TrackPricePreviewGate {
  if (!(signedIn && hasItemId && trackLoaded)) return OFF;
  // Outside the booking window the server rejects previews before pricing (BOOKING_NOT_OPEN /
  // BOOKING_PERIOD_CLOSED / BOOKING_NOT_CONFIGURED) — a deterministic 400 a retry can never fix.
  if (!bookingOpen) return OFF;
  // Enrolled users already hold the track — the preview 400s ALREADY_BOOKED and the price is moot.
  if (userHasBooked) return OFF;
  // Ticketed tracks price per variant, so hold until one is chosen.
  if (usesTicketTypes) {
    return selectedTicketType ? { enabled: true, ticketType: selectedTicketType } : OFF;
  }
  // Legacy single-price track: fire without a ticketType.
  return { enabled: true, ticketType: undefined };
}
