/**
 * Event Redirect Utilities
 * Manages event context during signup flow for non-authenticated users
 */

import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from './localStorage';

export interface PendingEventContext {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  redirectUrl: string;
  requiresPayment: boolean;
  timestamp: number;
}

const PENDING_EVENT_KEY = 'pendingEventRegistration';
const CONTEXT_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Store event context when redirecting to signup
 */
export const storePendingEventContext = (
  eventContext: Omit<PendingEventContext, 'timestamp'>,
): boolean => {
  const contextWithTimestamp: PendingEventContext = {
    ...eventContext,
    timestamp: Date.now(),
  };

  const result = setLocalStorageItem(PENDING_EVENT_KEY, contextWithTimestamp);
  return result.success;
};

/**
 * Retrieve pending event context during signup
 */
export const getPendingEventContext = (): PendingEventContext | null => {
  const result = getLocalStorageItem<PendingEventContext>(PENDING_EVENT_KEY);

  if (!result.success || !result.data) {
    return null;
  }

  const context = result.data;

  // Check if context has expired
  if (Date.now() - context.timestamp > CONTEXT_EXPIRY_MS) {
    clearPendingEventContext();
    return null;
  }

  return context;
};

/**
 * Clear pending event context
 */
export const clearPendingEventContext = (): boolean => {
  const result = removeLocalStorageItem(PENDING_EVENT_KEY);
  return result.success;
};

/**
 * Check if there's a valid pending event context
 */
export const hasPendingEventContext = (): boolean => {
  return getPendingEventContext() !== null;
};

/**
 * Generate event signup URL with context
 */
export const generateEventSignupUrl = (eventId: string): string => {
  return `/signup?source=event&eventId=${eventId}`;
};

/**
 * Generate event redirect URL after signup completion
 */
export const generateEventRedirectUrl = (eventId: string): string => {
  return `/thank-you-event/${eventId}`;
};

/**
 * Parse URL parameters for event context
 */
export const parseEventSignupParams = (
  searchParams: URLSearchParams,
): { isFromEvent: boolean; eventId?: string } => {
  const source = searchParams.get('source');
  const eventId = searchParams.get('eventId');

  return {
    isFromEvent: source === 'event' && !!eventId,
    eventId: eventId || undefined,
  };
};
