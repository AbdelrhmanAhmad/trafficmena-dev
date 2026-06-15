type PaymentItemType = 'event' | 'track' | 'subscription' | 'order' | 'masterclass';

export type VerifiedPaymentAnalyticsInput = {
  amountCents: number;
  itemType: PaymentItemType;
  itemName?: string | null;
  itemCategory?: string | null;
  paymentMethod?: string | null;
  promoCode?: string | null;
  originalAmountCents?: number | null;
  discountAppliedCents?: number | null;
  priorPaidPurchases: number;
  priorNonSubscriptionPurchases: number;
};

export type VerifiedPaymentAnalytics = {
  itemName: string;
  itemCategory: string;
  paymentType: string;
  promoCode: string;
  originalAmountCents: number;
  discountAppliedCents: number;
  priorPaidPurchases: number;
  priorNonSubscriptionPurchases: number;
};

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

export function getDefaultAnalyticsItemName(itemType: PaymentItemType): string {
  if (itemType === 'subscription') {
    return 'TrafficMENA Annual Subscription';
  }
  if (itemType === 'order') {
    return 'Series order';
  }

  return '';
}

export function getDefaultAnalyticsItemCategory(itemType: PaymentItemType): string {
  if (itemType === 'order') {
    return 'Series';
  }
  if (itemType === 'track') {
    return 'Track';
  }
  if (itemType === 'masterclass') {
    return 'Masterclass';
  }

  if (itemType === 'subscription') {
    return 'Subscription';
  }

  return 'Event';
}

export function buildVerifiedPaymentAnalytics(
  input: VerifiedPaymentAnalyticsInput,
): VerifiedPaymentAnalytics {
  return {
    itemName: input.itemName?.trim() || getDefaultAnalyticsItemName(input.itemType),
    itemCategory: input.itemCategory?.trim() || getDefaultAnalyticsItemCategory(input.itemType),
    paymentType: normalizeAnalyticsPaymentMethod(input.paymentMethod),
    promoCode: input.promoCode?.trim() ?? '',
    originalAmountCents: input.originalAmountCents ?? input.amountCents,
    discountAppliedCents: input.discountAppliedCents ?? 0,
    priorPaidPurchases: Math.max(0, input.priorPaidPurchases),
    priorNonSubscriptionPurchases: Math.max(0, input.priorNonSubscriptionPurchases),
  };
}
