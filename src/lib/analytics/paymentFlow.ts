import type { PaymentItemType, PricePreview, VerifyPaymentResponse } from '../../app/api/payments';
import { centsToUnits, normalizeAnalyticsPaymentMethod } from './helpers';

type PricePreviewSnapshot = Pick<PricePreview, 'amountCents' | 'originalAmountCents'>;

export const SUBSCRIPTION_ANALYTICS_ITEM_NAME = 'TrafficMENA Annual Subscription';

export function getBeginCheckoutValue(pricePreview: PricePreviewSnapshot): number {
  return centsToUnits(pricePreview.originalAmountCents ?? pricePreview.amountCents);
}

export function getBeginCheckoutValueFromAvailablePricing(
  pricePreview?: PricePreviewSnapshot | null,
  fallbackOriginalAmountCents?: number | null,
): number {
  if (pricePreview) {
    return getBeginCheckoutValue(pricePreview);
  }

  return centsToUnits(fallbackOriginalAmountCents);
}

export function getSelectPaymentMethodValue(
  pricePreview: Pick<PricePreview, 'amountCents'>,
): number {
  return centsToUnits(pricePreview.amountCents);
}

export function getSelectPaymentMethodValueFromAvailablePricing(
  pricePreview?: Pick<PricePreview, 'amountCents'> | null,
  fallbackAmountCents?: number | null,
): number {
  if (pricePreview) {
    return getSelectPaymentMethodValue(pricePreview);
  }

  return centsToUnits(fallbackAmountCents);
}

export function shouldTrackStandaloneCheckoutEntry(input: {
  selectedMethodId: number | null;
  alreadyTracked: boolean;
}): boolean {
  return !input.alreadyTracked && input.selectedMethodId !== null;
}

export function getNormalizedPaymentType(paymentMethodName?: string | null): string {
  return normalizeAnalyticsPaymentMethod(paymentMethodName);
}

export function getAnalyticsItemId(itemType: PaymentItemType, itemId?: string | null): string {
  if (itemId?.trim()) {
    return itemId;
  }

  if (itemType === 'subscription') {
    return 'subscription_annual';
  }

  return '';
}

export function getAnalyticsItemName(itemType: PaymentItemType, itemName?: string | null): string {
  const normalizedItemName = itemName?.trim();
  if (normalizedItemName) {
    return normalizedItemName;
  }

  if (itemType === 'subscription') {
    return SUBSCRIPTION_ANALYTICS_ITEM_NAME;
  }

  return '';
}

export function getAnalyticsItemCategory(
  itemType: PaymentItemType,
  itemCategory?: string | null,
): string {
  const normalizedItemCategory = itemCategory?.trim();
  if (normalizedItemCategory) {
    return normalizedItemCategory;
  }

  if (itemType === 'track') {
    return 'Track';
  }

  if (itemType === 'subscription') {
    return 'Subscription';
  }

  return 'Event';
}

export function getPurchaseItemCategory(
  itemType: PaymentItemType,
  itemCategory?: string | null,
): string {
  return getAnalyticsItemCategory(itemType, itemCategory);
}

export function buildCheckoutAnalyticsItem(params: {
  itemType: PaymentItemType;
  itemId?: string | null;
  itemName?: string | null;
  itemCategory?: string | null;
  value: number;
}) {
  return {
    item_id: getAnalyticsItemId(params.itemType, params.itemId),
    item_name: getAnalyticsItemName(params.itemType, params.itemName),
    item_category: getAnalyticsItemCategory(params.itemType, params.itemCategory),
    price: params.value,
    currency: 'EGP' as const,
  };
}

export function getAmountCentsFromUnits(amount?: number | null): number | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return null;
  }

  return Math.round(amount * 100);
}

export function isVerifiedPaymentAnalyticsReady(
  payload?: VerifyPaymentResponse | null,
): payload is VerifyPaymentResponse & {
  amountCents: number;
  itemType: PaymentItemType;
  paymentId: string;
} {
  if (!payload || payload.status !== 'paid' || !payload.paymentId) {
    return false;
  }

  if (typeof payload.amountCents !== 'number') {
    return false;
  }

  if (payload.itemType === 'subscription') {
    return typeof payload.priorPaidPurchases === 'number';
  }

  if (payload.itemType === 'order' || payload.itemType === 'masterclass') {
    if (payload.itemType === 'masterclass' && !payload.itemId?.trim()) {
      return false;
    }
    return typeof payload.priorNonSubscriptionPurchases === 'number';
  }

  if (payload.itemType !== 'event' && payload.itemType !== 'track') {
    return false;
  }

  if (!payload.itemId?.trim() || !payload.itemName?.trim()) {
    return false;
  }

  if (payload.itemType === 'event' && !payload.itemCategory?.trim()) {
    return false;
  }

  return typeof payload.priorNonSubscriptionPurchases === 'number';
}
