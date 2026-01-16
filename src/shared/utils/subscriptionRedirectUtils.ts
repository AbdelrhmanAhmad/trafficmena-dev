/**
 * Subscription Redirect Utilities
 * Manages subscription context during signup flow for non-authenticated users
 */

import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from './localStorage';

export interface PendingSubscriptionContext {
  returnUrl: string;
  timestamp: number;
}

const PENDING_SUBSCRIPTION_KEY = 'pendingSubscription';
const CONTEXT_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Store subscription context when redirecting to signup
 */
export const storePendingSubscriptionContext = (returnUrl: string): boolean => {
  const context: PendingSubscriptionContext = {
    returnUrl,
    timestamp: Date.now(),
  };

  const result = setLocalStorageItem(PENDING_SUBSCRIPTION_KEY, context);
  return result.success;
};

/**
 * Retrieve pending subscription context during signup
 */
export const getPendingSubscriptionContext = (): PendingSubscriptionContext | null => {
  const result = getLocalStorageItem<PendingSubscriptionContext>(PENDING_SUBSCRIPTION_KEY);

  if (!result.success || !result.data) {
    return null;
  }

  const context = result.data;

  // Check if context has expired
  if (Date.now() - context.timestamp > CONTEXT_EXPIRY_MS) {
    clearPendingSubscriptionContext();
    return null;
  }

  return context;
};

/**
 * Clear pending subscription context
 */
export const clearPendingSubscriptionContext = (): boolean => {
  const result = removeLocalStorageItem(PENDING_SUBSCRIPTION_KEY);
  return result.success;
};

/**
 * Check if there's a valid pending subscription context
 */
export const hasPendingSubscriptionContext = (): boolean => {
  return getPendingSubscriptionContext() !== null;
};

/**
 * Generate subscription signup URL with context
 */
export const generateSubscriptionSignupUrl = (): string => {
  return '/signup?source=subscription';
};

/**
 * Parse URL parameters for subscription context
 */
export const parseSubscriptionSignupParams = (
  searchParams: URLSearchParams,
): { isFromSubscription: boolean } => {
  const source = searchParams.get('source');

  return {
    isFromSubscription: source === 'subscription',
  };
};
