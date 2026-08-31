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
import { consumeAuthReturnPath, peekAuthReturnPath } from './authReturnPath';

/**
 * Legacy product-specific redirect after signup when no generic return path is stored.
 */
const getLegacyPostSignupRedirectUrl = (): string => {
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

/**
 * Resolve where to send the user after signup/sign-in completes.
 * Generic internal return path (session-scoped) takes precedence over legacy product contexts.
 */
export const getPostSignupRedirectUrl = (): string => {
  const genericReturn = peekAuthReturnPath();
  if (genericReturn) {
    return consumeAuthReturnPath();
  }
  return getLegacyPostSignupRedirectUrl();
};

export const resolvePostAuthRedirectUrl = getPostSignupRedirectUrl;
