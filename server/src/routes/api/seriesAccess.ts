type SeriesAccessContext = {
  isStaff: boolean;
  isSubscriber: boolean;
  hasTrackBooking: boolean;
  hasSeriesGrant: boolean;
  seriesIsPremium: boolean;
};

type SeriesAssetAccessInput = SeriesAccessContext & {
  assetIsPremium: boolean;
  assetIsPublic: boolean;
  assetEventId: string | null;
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
  if (input.isStaff || input.isSubscriber || input.hasTrackBooking || input.hasSeriesGrant) {
    return true;
  }

  if (input.seriesIsPremium || input.assetIsPremium) {
    return false;
  }

  return input.assetIsPublic || !input.assetEventId || input.userEventIds.has(input.assetEventId);
}
