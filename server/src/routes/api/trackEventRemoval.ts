import type { UserRole } from './utils.js';

export const REMOVAL_REASON_MIN_LENGTH = 3;
export const REMOVAL_REASON_MAX_LENGTH = 500;

type TrackEventRemovalInput = {
  role: UserRole;
  activeBookingCount: number;
  reason?: string | null;
};

export type TrackEventRemovalDecision =
  | { allowed: true; override: boolean; reason: string | null }
  | { allowed: false; code: 'TRACK_HAS_BOOKINGS' | 'REASON_REQUIRED'; message: string };

// owner/admin are the only roles allowed to override the booked-track block; requireManager keeps
// the route open to managers, so the override gate must be re-checked here.
function canOverrideBookedTrack(role: UserRole): boolean {
  return role === 'owner' || role === 'admin';
}

function normalizeActiveBookingCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

/**
 * Pure authorization decision for removing a session (event) from a track.
 * Zero active bookings keeps the historical manager-level removal (no reason). A booked track
 * requires an owner/admin plus a trimmed 3-500 char reason; managers stay blocked.
 */
export function evaluateTrackEventRemoval(
  input: TrackEventRemovalInput,
): TrackEventRemovalDecision {
  const activeBookingCount = normalizeActiveBookingCount(input.activeBookingCount);

  if (activeBookingCount === 0) {
    return { allowed: true, override: false, reason: null };
  }

  if (!canOverrideBookedTrack(input.role)) {
    return {
      allowed: false,
      code: 'TRACK_HAS_BOOKINGS',
      message: `Cannot modify events on track with ${activeBookingCount} active bookings.`,
    };
  }

  const trimmedReason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (
    trimmedReason.length < REMOVAL_REASON_MIN_LENGTH ||
    trimmedReason.length > REMOVAL_REASON_MAX_LENGTH
  ) {
    return {
      allowed: false,
      code: 'REASON_REQUIRED',
      message: `Provide a removal reason between ${REMOVAL_REASON_MIN_LENGTH} and ${REMOVAL_REASON_MAX_LENGTH} characters for audit.`,
    };
  }

  return { allowed: true, override: true, reason: trimmedReason };
}
