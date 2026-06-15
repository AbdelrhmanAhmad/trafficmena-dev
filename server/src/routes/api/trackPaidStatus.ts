export function isPaidTrack(priceInCents: number | null | undefined): boolean {
  return typeof priceInCents === 'number' && priceInCents > 0;
}
