type TrackPaidOffering = {
  priceInCents?: number | null;
  onlineOnlyPriceCents?: number | null;
  onlineOfflinePriceCents?: number | null;
  offlineOnlyPriceCents?: number | null;
};

export function isPaidTrack(priceInCents: number | null | undefined): boolean {
  return typeof priceInCents === 'number' && priceInCents > 0;
}

export function isPaidTrackOffering(track: TrackPaidOffering): boolean {
  return (
    isPaidTrack(track.priceInCents) ||
    isPaidTrack(track.onlineOnlyPriceCents) ||
    isPaidTrack(track.onlineOfflinePriceCents) ||
    isPaidTrack(track.offlineOnlyPriceCents)
  );
}
