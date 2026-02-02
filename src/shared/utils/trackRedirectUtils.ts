/**
 * Track Redirect Utilities
 * Manages track context during signup flow for non-authenticated users
 */

import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from './localStorage';

export interface PendingTrackContext {
  trackId: string;
  trackTitle: string;
  redirectUrl: string;
  requiresPayment: boolean;
  timestamp: number;
}

const PENDING_TRACK_KEY = 'pendingTrackBooking';
const CONTEXT_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Store track context when redirecting to signup
 */
export const storePendingTrackContext = (
  trackContext: Omit<PendingTrackContext, 'timestamp'>,
): boolean => {
  const contextWithTimestamp: PendingTrackContext = {
    ...trackContext,
    timestamp: Date.now(),
  };

  const result = setLocalStorageItem(PENDING_TRACK_KEY, contextWithTimestamp);
  return result.success;
};

/**
 * Retrieve pending track context during signup
 */
export const getPendingTrackContext = (): PendingTrackContext | null => {
  const result = getLocalStorageItem<PendingTrackContext>(PENDING_TRACK_KEY);

  if (!result.success || !result.data) {
    return null;
  }

  const context = result.data;

  // Check if context has expired
  if (Date.now() - context.timestamp > CONTEXT_EXPIRY_MS) {
    clearPendingTrackContext();
    return null;
  }

  return context;
};

/**
 * Clear pending track context
 */
export const clearPendingTrackContext = (): boolean => {
  const result = removeLocalStorageItem(PENDING_TRACK_KEY);
  return result.success;
};

/**
 * Check if there's a valid pending track context
 */
export const hasPendingTrackContext = (): boolean => {
  return getPendingTrackContext() !== null;
};

/**
 * Generate track redirect URL after signup completion
 */
export const generateTrackRedirectUrl = (trackId: string): string => {
  return `/thank-you-track/${trackId}`;
};
