// All analytics event tracking functions.
// Each function maps to one event in the data model.

import { pushToDataLayer } from './gtm';
import {
  type AnalyticsPaymentItemType,
  detectMeetingPlatform,
  getCustomerTypeForPurchase,
  normalizePhone,
  toAnalyticsItemType,
} from './helpers';

// ── Auth Events ──────────────────────────────────────────────────

export function trackLoginStart(): void {
  pushToDataLayer({
    event: 'login_start',
    method: 'email_otp',
    event_source: 'Web',
  });
}

export function trackLogin(params: {
  status: 'success' | 'failure';
  userId?: string;
  email?: string;
}): void {
  pushToDataLayer({
    event: 'login',
    method: 'email_otp',
    status: params.status,
    user_id: params.userId ?? '',
    event_source: 'Web',
    email: params.email ?? '',
  });
}

export function trackSignUpStep(stepNumber: number, stepName: string): void {
  pushToDataLayer({
    event: 'sign_up_step',
    step_number: stepNumber,
    step_name: stepName,
    event_source: 'Web',
  });
}

export function trackSignUp(params: {
  userId: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}): void {
  pushToDataLayer({
    event: 'sign_up',
    method: 'email_otp',
    user_id: params.userId,
    event_source: 'Web',
    account_creation_date: new Date().toISOString(),
    email: params.email,
    phone: normalizePhone(params.phone),
    first_name: params.firstName ?? '',
    last_name: params.lastName ?? '',
  });
}

// ── Content Discovery Events ─────────────────────────────────────

type ItemData = {
  item_id: string;
  item_name: string;
  item_category: string;
  price: number;
  currency: string;
  item_image_link?: string;
  item_link?: string;
  index?: number;
};

type PaymentEventItem = {
  item_id: string;
  item_name: string;
  item_category: string;
  price: number;
  currency: string;
  quantity?: number;
};

export function trackViewItemList(listId: string, listName: string, items: ItemData[]): void {
  pushToDataLayer({
    event: 'view_item_list',
    item_list_id: listId,
    item_list_name: listName,
    items,
  });
}

export function trackSelectItem(listId: string, listName: string, item: ItemData): void {
  pushToDataLayer({
    event: 'select_item',
    item_list_id: listId,
    item_list_name: listName,
    items: [item],
  });
}

export function trackViewItem(params: {
  currency: string;
  value: number;
  item: ItemData & {
    item_location?: string;
    item_date?: string;
    is_online?: boolean;
    spots_remaining?: number | null;
  };
}): void {
  pushToDataLayer({
    event: 'view_item',
    currency: params.currency,
    value: params.value,
    items: [params.item],
  });
}

// ── Free Conversion Events ───────────────────────────────────────

export function trackEventRegistration(params: {
  itemId: string;
  itemName: string;
  itemCategory: string;
  isOnline: boolean;
}): void {
  pushToDataLayer({
    event: 'event_registration',
    item_id: params.itemId,
    item_name: params.itemName,
    item_category: params.itemCategory,
    registration_type: 'free',
    is_online: params.isOnline,
    event_source: 'Web',
  });
}

export function trackTrackBooking(params: {
  itemId: string;
  itemName: string;
  eventCount: number;
}): void {
  pushToDataLayer({
    event: 'track_booking',
    item_id: params.itemId,
    item_name: params.itemName,
    item_category: 'Track',
    booking_type: 'free',
    event_count: params.eventCount,
    event_source: 'Web',
  });
}

// ── Payment Funnel Events ────────────────────────────────────────

export function buildBeginCheckoutEvent(params: {
  currency: string;
  value: number;
  itemType: 'event' | 'track' | 'subscription' | AnalyticsPaymentItemType;
  item: PaymentEventItem;
}) {
  return {
    event: 'begin_checkout',
    currency: params.currency,
    value: params.value,
    item_type: toAnalyticsItemType(params.itemType),
    items: [params.item],
  };
}

export function trackBeginCheckout(params: {
  currency: string;
  value: number;
  itemType: 'event' | 'track' | 'subscription' | AnalyticsPaymentItemType;
  item: PaymentEventItem;
}): void {
  pushToDataLayer(buildBeginCheckoutEvent(params));
}

export function buildSelectPaymentMethodEvent(params: {
  currency: string;
  value: number;
  paymentType: string;
  itemType: 'event' | 'track' | 'subscription' | AnalyticsPaymentItemType;
  coupon: string;
  item: PaymentEventItem;
}) {
  return {
    event: 'select_payment_method',
    currency: params.currency,
    value: params.value,
    payment_type: params.paymentType,
    item_type: toAnalyticsItemType(params.itemType),
    coupon: params.coupon,
    items: [params.item],
  };
}

export function trackSelectPaymentMethod(params: {
  currency: string;
  value: number;
  paymentType: string;
  itemType: 'event' | 'track' | 'subscription' | AnalyticsPaymentItemType;
  coupon: string;
  item: PaymentEventItem;
}): void {
  pushToDataLayer(buildSelectPaymentMethodEvent(params));
}

export function trackApplyPromoCode(params: {
  promoCode: string;
  status: 'success' | 'invalid' | 'expired' | 'limit_reached';
  discountPercent: number;
  itemType: 'event' | 'track' | 'subscription' | AnalyticsPaymentItemType;
  itemId: string;
}): void {
  pushToDataLayer({
    event: 'apply_promo_code',
    promo_code: params.promoCode,
    status: params.status,
    discount_percent: params.discountPercent,
    item_type: toAnalyticsItemType(params.itemType),
    item_id: params.itemId,
  });
}

// ── Purchase Events ──────────────────────────────────────────────

type PurchaseData = {
  transactionId: string;
  currency: string;
  value: number;
  itemType: 'event' | 'track' | 'subscription' | AnalyticsPaymentItemType;
  paymentType: string;
  priorNonSubscriptionPurchases: number;
  coupon: string;
  discount: number;
  originalValue: number;
  item: PaymentEventItem;
};

export function buildPurchaseEvents(data: PurchaseData) {
  const customerType = getCustomerTypeForPurchase(data.priorNonSubscriptionPurchases);
  const analyticsItemType = toAnalyticsItemType(data.itemType);
  const purchaseEvent = {
    event: 'purchase',
    transaction_id: data.transactionId,
    currency: data.currency,
    value: data.value,
    item_type: analyticsItemType,
    payment_type: data.paymentType,
    customer_type: customerType,
    coupon: data.coupon,
    discount: data.discount,
    original_value: data.originalValue,
    items: [data.item],
  };

  const events = [purchaseEvent];

  // Fire first_purchase additionally when this is the user's first purchase
  if (data.priorNonSubscriptionPurchases <= 0) {
    events.push({
      event: 'first_purchase',
      transaction_id: data.transactionId,
      currency: data.currency,
      value: data.value,
      item_type: analyticsItemType,
      payment_type: data.paymentType,
      customer_type: 'new',
      coupon: data.coupon,
      discount: data.discount,
      original_value: data.originalValue,
      items: [data.item],
    });
  }

  return events;
}

export function trackPurchase(data: PurchaseData): void {
  for (const event of buildPurchaseEvents(data)) {
    pushToDataLayer(event);
  }
}

export function buildSubscribeEvent(params: {
  transactionId: string;
  currency: string;
  value: number;
  paymentType: string;
  priorPaidPurchases: number;
  coupon: string;
  discount: number;
  originalValue: number;
}) {
  return {
    event: 'subscribe',
    transaction_id: params.transactionId,
    currency: params.currency,
    value: params.value,
    item_type: 'subscription',
    payment_type: params.paymentType,
    customer_type: getCustomerTypeForPurchase(params.priorPaidPurchases),
    subscription_duration: 'annual',
    coupon: params.coupon,
    discount: params.discount,
    original_value: params.originalValue,
    items: [
      {
        item_id: 'subscription_annual',
        item_name: 'TrafficMENA Annual Subscription',
        item_category: 'Subscription',
        price: params.value,
        currency: params.currency,
        quantity: 1,
      },
    ],
  };
}

export function trackSubscribe(params: {
  transactionId: string;
  currency: string;
  value: number;
  paymentType: string;
  priorPaidPurchases: number;
  coupon: string;
  discount: number;
  originalValue: number;
}): void {
  pushToDataLayer(buildSubscribeEvent(params));
}

// ── Dashboard Engagement Events ──────────────────────────────────

export function trackClickMeetingLink(params: {
  itemId: string;
  itemName: string;
  itemCategory: string;
  meetingUrl: string;
}): void {
  pushToDataLayer({
    event: 'click_meeting_link',
    item_id: params.itemId,
    item_name: params.itemName,
    item_category: params.itemCategory,
    meeting_platform: detectMeetingPlatform(params.meetingUrl),
  });
}

export function trackViewContent(params: {
  contentId: string;
  contentName: string;
  contentType: string;
  isPremium: boolean;
  seriesId?: string;
  seriesName?: string;
  eventId?: string;
}): void {
  pushToDataLayer({
    event: 'view_content',
    content_id: params.contentId,
    content_name: params.contentName,
    content_type: params.contentType,
    is_premium: params.isPremium,
    series_id: params.seriesId ?? '',
    series_name: params.seriesName ?? '',
    event_id: params.eventId ?? '',
  });
}

export function trackDownloadContent(params: {
  contentId: string;
  contentName: string;
  contentType: string;
  isPremium: boolean;
}): void {
  pushToDataLayer({
    event: 'download_content',
    content_id: params.contentId,
    content_name: params.contentName,
    content_type: params.contentType,
    is_premium: params.isPremium,
  });
}

export function trackAddToCalendar(params: {
  itemId: string;
  itemName: string;
  calendarType: 'google_calendar' | 'ics_download';
}): void {
  pushToDataLayer({
    event: 'add_to_calendar',
    item_id: params.itemId,
    item_name: params.itemName,
    calendar_type: params.calendarType,
  });
}

export function trackCalculatorUsed(params: {
  calculatorId: string;
  calculatorName: string;
  calculatorCategory: string;
}): void {
  pushToDataLayer({
    event: 'calculator_used',
    calculator_id: params.calculatorId,
    calculator_name: params.calculatorName,
    calculator_category: params.calculatorCategory,
  });
}

// ── Churn & Profile Events ───────────────────────────────────────

export function trackCancelRegistration(params: {
  itemId: string;
  itemName: string;
  itemCategory: string;
  cancellationType: 'instant' | 'refund_request';
  wasPaid: boolean;
}): void {
  pushToDataLayer({
    event: 'cancel_registration',
    item_id: params.itemId,
    item_name: params.itemName,
    item_category: params.itemCategory,
    cancellation_type: params.cancellationType,
    was_paid: params.wasPaid,
  });
}

export function trackProfileUpdated(params: {
  fieldsUpdated: string;
  profileCompletion: number;
}): void {
  pushToDataLayer({
    event: 'profile_updated',
    fields_updated: params.fieldsUpdated,
    profile_completion: params.profileCompletion,
  });
}
