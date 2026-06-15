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
import {
  clearPendingTrackContext,
  generateTrackRedirectUrl,
  getPendingTrackContext,
} from './trackRedirectUtils';

/**
 * Get the appropriate redirect URL after signup completion.
 * Checks for pending contexts in priority order:
 * 1. Subscription context → /dashboard/subscribe
 * 2. Event context → /thank-you-event/:id (free) or back to event checkout (paid)
 * 3. Track context → /thank-you-track/:id (free) or back to track checkout (paid)
 * 4. Default → /dashboard
 */
export const getPostSignupRedirectUrl = (): string => {
  const appendCheckoutParam = (url: string): string => {
    const [path, query = ''] = url.split('?');
    const params = new URLSearchParams(query);
    params.set('checkout', '1');
    const nextQuery = params.toString();
    return nextQuery ? `${path}?${nextQuery}` : path;
  };

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
    if (typeof eventContext.requiresPayment !== 'boolean') {
      return eventContext.redirectUrl;
    }
    if (eventContext.requiresPayment) {
      return appendCheckoutParam(eventContext.redirectUrl);
    }
    return generateEventRedirectUrl(eventContext.eventId);
  }

  // Check track context
  const trackContext = getPendingTrackContext();
  if (trackContext) {
    clearPendingTrackContext();
    if (typeof trackContext.requiresPayment !== 'boolean') {
      return trackContext.redirectUrl;
    }
    if (trackContext.requiresPayment) {
      return appendCheckoutParam(trackContext.redirectUrl);
    }
    return generateTrackRedirectUrl(trackContext.trackId);
  }

  // Default redirect
  return '/dashboard';
};
