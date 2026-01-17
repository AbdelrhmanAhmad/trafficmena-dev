/**
 * Post-Signup Redirect Utility
 * Centralized logic for determining where to redirect after signup completion
 */

import {
  clearPendingEventContext,
  generateEventRedirectUrl,
  getPendingEventContext,
} from './eventRedirectUtils';
import {
  clearPendingSubscriptionContext,
  getPendingSubscriptionContext,
} from './subscriptionRedirectUtils';

/**
 * Get the appropriate redirect URL after signup completion.
 * Checks for pending contexts in priority order:
 * 1. Subscription context → /dashboard/subscribe
 * 2. Event context → /thank-you-event/:id
 * 3. Default → /dashboard
 */
export const getPostSignupRedirectUrl = (): string => {
  // Check subscription context first
  const subscriptionContext = getPendingSubscriptionContext();
  if (subscriptionContext) {
    clearPendingSubscriptionContext();
    return subscriptionContext.returnUrl;
  }

  // Check event context
  const eventContext = getPendingEventContext();
  if (eventContext) {
    clearPendingEventContext();
    return generateEventRedirectUrl(eventContext.eventId);
  }

  // Default redirect
  return '/dashboard';
};
