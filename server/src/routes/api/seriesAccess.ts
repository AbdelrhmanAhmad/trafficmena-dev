import { bookingGrantsRecording, type EventFormat, type TicketType } from './ticketAccess.js';

type SeriesAccessContext = {
  isStaff: boolean;
  isSubscriber: boolean;
  hasTrackBooking: boolean;
  hasSeriesGrant: boolean;
  seriesIsPremium: boolean;
};

type SeriesAssetAccessInput = SeriesAccessContext & {
  // The viewer's active track booking ticket type (null = legacy / non-ticket-typed booking).
  bookingTicketType: TicketType | null;
  assetIsPremium: boolean;
  assetIsPublic: boolean;
  assetEventId: string | null;
  // Delivery mode of the asset's linked event (null = no linked event -> general track content).
  assetEventFormat: EventFormat | null;
  userEventIds: Set<string>;
};

export function resolveSeriesAccess(context: SeriesAccessContext): boolean {
  return (
    context.isStaff ||
    context.isSubscriber ||
    context.hasTrackBooking ||
    context.hasSeriesGrant ||
    !context.seriesIsPremium
  );
}

export function resolveSeriesAssetAccess(input: SeriesAssetAccessInput): boolean {
  if (input.isStaff || input.isSubscriber || input.hasSeriesGrant) {
    return true;
  }

  // A track booking grants this specific recording only when the ticket matrix allows it. This
  // replaces the old "any booking unlocks every premium asset" short-circuit and is what lets an
  // online_only buyer open offline recordings while an offline_only buyer cannot open online ones.
  if (
    input.hasTrackBooking &&
    bookingGrantsRecording(input.bookingTicketType, input.assetEventFormat)
  ) {
    return true;
  }

  if (input.seriesIsPremium || input.assetIsPremium) {
    return false;
  }

  return input.assetIsPublic || !input.assetEventId || input.userEventIds.has(input.assetEventId);
}
