type EventPricePreviewGateInput = {
  signedIn: boolean;
  hasItemId: boolean;
  // Whether the event query has resolved. Firing before it does misreads a track event as standalone.
  eventLoaded: boolean;
  attending: boolean;
  isTrackEvent: boolean;
  hasSingleBookingStart: boolean;
};

// Whether the event price-preview query may fire. Gating on `eventLoaded` fixes the race: while the
// event is undefined `isTrackEvent` reads false, so the old gate fired and 400d
// INDIVIDUAL_BOOKING_DISABLED once the event resolved as a track event.
export function getEventPricePreviewGate({
  signedIn,
  hasItemId,
  eventLoaded,
  attending,
  isTrackEvent,
  hasSingleBookingStart,
}: EventPricePreviewGateInput): boolean {
  if (!(signedIn && hasItemId && eventLoaded)) return false;
  // Already-registered users don't need a price; the preview 400s ALREADY_REGISTERED.
  if (attending) return false;
  // Track-bound events only allow individual booking once single-booking opens.
  if (isTrackEvent && !hasSingleBookingStart) return false;
  return true;
}
