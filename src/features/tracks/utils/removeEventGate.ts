export type RemoveEventFlow = 'simple-confirm' | 'override-dialog' | 'blocked';

/**
 * Decides which remove-session UX to show. Zero active bookings keeps today's plain confirm for
 * every role; a booked track routes admins/owners to the consequence dialog and blocks managers.
 */
export function resolveRemoveEventFlow(input: {
  canDeleteContent: boolean;
  activeBookingsCount?: number | null;
}): RemoveEventFlow {
  const activeBookingsCount = Number.isFinite(input.activeBookingsCount)
    ? Math.max(0, Math.trunc(input.activeBookingsCount as number))
    : 0;

  if (activeBookingsCount <= 0) {
    return 'simple-confirm';
  }

  return input.canDeleteContent ? 'override-dialog' : 'blocked';
}
