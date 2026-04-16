// Analytics helper functions — page type detection, customer type derivation, etc.

export type AnalyticsPaymentItemType = 'event_ticket' | 'track_booking' | 'subscription';

export type GlobalVariablesPayload = {
  event: 'global_variables';
  user_id: string;
  login_status: 'logged_in' | 'guest';
  user_role: string;
  subscription_status: string;
  customer_type: string;
  event_source: 'Web';
  page_type: string;
  page_path: string;
  currency: 'EGP';
  total_registrations: number;
  total_purchases: number;
  total_revenue: number;
  account_creation_date: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
};

type BuildGlobalVariablesPayloadInput = {
  pathname: string;
  authLoading: boolean;
  user: { id: string; email: string } | null;
  profile:
    | {
        role?: string | null;
        phone_number?: string | null;
        first_name?: string | null;
        last_name?: string | null;
      }
    | null
    | undefined;
  totalPaidPurchases: number;
  totalRegistrations: number;
  totalRevenue: number;
  accountCreationDate: string;
  subscriptionStatus: string | null | undefined;
  currentUserReady: boolean;
  subscriptionReady: boolean;
};

type GlobalVariablesContextReadyInput = Pick<
  BuildGlobalVariablesPayloadInput,
  'authLoading' | 'currentUserReady' | 'subscriptionReady' | 'user'
>;

const PAGE_TYPE_MAP: Array<[RegExp, string]> = [
  [/^\/$/, 'homepage'],
  [/^\/about$/, 'about'],
  [/^\/meetups$/, 'event_list'],
  [/^\/meetups\/[^/]+$/, 'event_detail'],
  [/^\/tracks\/[^/]+$/, 'track_detail'],
  [/^\/subscribe$/, 'subscribe_landing'],
  [/^\/dashboard\/subscribe$/, 'subscribe_landing'],
  [/^\/signin$/, 'signin'],
  [/^\/signup/, 'signup'],
  [/^\/dashboard$/, 'dashboard'],
  [/^\/dashboard\/meetups$/, 'dashboard_events'],
  [/^\/dashboard\/library$/, 'dashboard_library'],
  [/^\/dashboard\/library\/tracks\/[^/]+$/, 'dashboard_track_detail'],
  [/^\/dashboard\/library\/series\/[^/]+$/, 'dashboard_series_detail'],
  [/^\/dashboard\/library\/[^/]+$/, 'dashboard_library_detail'],
  [/^\/dashboard\/calculators$/, 'dashboard_calculators'],
  [/^\/dashboard\/calculators\/[^/]+$/, 'calculator_detail'],
  [/^\/dashboard\/profile$/, 'dashboard_profile'],
  [/^\/profile\/edit$/, 'dashboard_profile'],
  [/^\/payment\/success$/, 'payment_success'],
  [/^\/payment\/failed$/, 'payment_failed'],
  [/^\/payment\/pending$/, 'payment_pending'],
  [/^\/thank-you-event\/[^/]+$/, 'thank_you_event'],
  [/^\/thank-you-track\/[^/]+$/, 'thank_you_track'],
  [/^\/privacy$/, 'privacy'],
  [/^\/terms$/, 'terms'],
];

export function getPageType(pathname: string): string {
  for (const [pattern, pageType] of PAGE_TYPE_MAP) {
    if (pattern.test(pathname)) return pageType;
  }
  return 'other';
}

// For global_variables: describes the user's overall state
// "free" = member, never purchased | "new" = 1 purchase | "returning" = 2+
export function getCustomerType(totalPaidPurchases: number): string {
  if (totalPaidPurchases <= 0) return 'free';
  if (totalPaidPurchases === 1) return 'new';
  return 'returning';
}

// For purchase events: the user IS a customer, never "free"
// "new" = first purchase (0 prior) | "returning" = has purchased before (1+ prior)
export function getCustomerTypeForPurchase(priorPurchases: number): string {
  return priorPurchases <= 0 ? 'new' : 'returning';
}

export function toAnalyticsItemType(
  itemType: 'event' | 'track' | 'subscription' | AnalyticsPaymentItemType,
): AnalyticsPaymentItemType {
  if (itemType === 'event' || itemType === 'event_ticket') {
    return 'event_ticket';
  }

  if (itemType === 'track' || itemType === 'track_booking') {
    return 'track_booking';
  }

  return 'subscription';
}

export function centsToUnits(cents: number | null | undefined): number {
  if (cents === null || cents === undefined) return 0;
  return cents / 100;
}

export function normalizeAnalyticsPaymentMethod(paymentMethod?: string | null): string {
  if (!paymentMethod) {
    return '';
  }

  return paymentMethod
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const PLATFORM_PATTERNS: Array<[RegExp, string]> = [
  [/zoom\.(us|com)/, 'zoom'],
  [/meet\.google\.com/, 'google_meet'],
  [/teams\.microsoft\.com/, 'teams'],
  [/webex\.com/, 'webex'],
  [/gotomeeting\.com/, 'gotomeeting'],
];

export function detectMeetingPlatform(url: string): string {
  for (const [pattern, platform] of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return platform;
  }
  return 'other';
}

// Normalize phone number: strip + prefix, keep digits only
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

export function isGlobalVariablesContextReady(input: GlobalVariablesContextReadyInput): boolean {
  if (input.authLoading) {
    return false;
  }

  if (!input.user) {
    return true;
  }

  return input.currentUserReady && input.subscriptionReady;
}

export function buildGlobalVariablesPayload(
  input: BuildGlobalVariablesPayloadInput,
): GlobalVariablesPayload | null {
  if (!isGlobalVariablesContextReady(input)) {
    return null;
  }

  const isLoggedIn = Boolean(input.user);

  return {
    event: 'global_variables',
    user_id: input.user?.id ?? '',
    login_status: isLoggedIn ? 'logged_in' : 'guest',
    user_role: input.profile?.role ?? '',
    subscription_status: input.subscriptionStatus ?? 'none',
    customer_type: getCustomerType(input.totalPaidPurchases),
    event_source: 'Web',
    page_type: getPageType(input.pathname),
    page_path: input.pathname,
    currency: 'EGP',
    total_registrations: input.totalRegistrations,
    total_purchases: input.totalPaidPurchases,
    total_revenue: input.totalRevenue,
    account_creation_date: input.accountCreationDate,
    email: input.user?.email ?? '',
    phone: normalizePhone(input.profile?.phone_number),
    first_name: input.profile?.first_name ?? '',
    last_name: input.profile?.last_name ?? '',
  };
}

export function getGlobalVariablesTrackingKey(pathname: string, locationKey?: string): string {
  return JSON.stringify([locationKey ?? pathname, pathname]);
}
