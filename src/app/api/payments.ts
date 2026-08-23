import { API_BASE, fetchJson } from './client';

// --- Types ---

export type PaymentMethod = {
  paymentId: number;
  name_en: string;
  name_ar: string;
  logo?: string;
  redirect: string;
};

export type PaymentItemType = 'event' | 'track' | 'subscription' | 'order' | 'masterclass';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired';

export type CheckoutRequest = {
  itemType: PaymentItemType;
  itemId?: string;
  paymentMethodId: number;
  forceNewCode?: boolean;
  idempotencyKey?: string;
  promoCode?: string;
};

export type CheckoutResponse = {
  paymentId: string;
  invoiceId?: string;
  redirectUrl?: string;
  fawryCode?: string;
  meezaReference?: string;
  meezaQrCode?: string;
  amanCode?: string;
  masaryCode?: string;
  free?: boolean;
};

export type VerifyPaymentRequest = {
  invoiceId: string;
};

export type VerifyPaymentResponse = {
  status: PaymentStatus;
  paymentId?: string;
  alreadyProcessed?: boolean;
  fawaterkPaid?: boolean;
  recoveredFromExpired?: boolean;
  confirmationSource?: 'verify' | 'webhook' | 'reconcile';
  success?: boolean;
  amountCents?: number;
  itemName?: string;
  itemCategory?: string;
  itemType?: PaymentItemType;
  itemId?: string | null;
  paymentType?: string;
  promoCode?: string;
  originalAmountCents?: number;
  discountAppliedCents?: number;
  priorPaidPurchases?: number;
  priorNonSubscriptionPurchases?: number;
};

export type Payment = {
  id: string;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  itemType: PaymentItemType;
  itemId: string | null;
  fawaterkInvoiceId?: string | null;
  fawryCode?: string | null;
  amanCode?: string | null;
  masaryCode?: string | null;
  meezaReference?: string | null;
  meezaQrCode?: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type PricePreview = {
  itemName: string;
  amountCents: number;
  amountFormatted: string;
  originalAmountCents: number;
  discountAppliedCents: number;
  discountSource: 'subscriber' | 'promo' | null;
  isSubscriber: boolean;
  isFree: boolean;
  promoError: string | null;
};

// --- API Functions ---

export async function fetchPaymentMethods(signal?: AbortSignal): Promise<PaymentMethod[]> {
  const response = await fetchJson<{ data: PaymentMethod[] }>(`${API_BASE}/payments/methods`, {
    method: 'GET',
    signal,
  });
  return response.data;
}

export async function createCheckout(payload: CheckoutRequest): Promise<CheckoutResponse> {
  const response = await fetchJson<{ data: CheckoutResponse }>(`${API_BASE}/payments/checkout`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function verifyPayment(payload: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
  const response = await fetchJson<{ data: VerifyPaymentResponse }>(`${API_BASE}/payments/verify`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function fetchPayment(paymentId: string): Promise<Payment> {
  const response = await fetchJson<{ data: Payment }>(`${API_BASE}/payments/${paymentId}`, {
    method: 'GET',
  });
  return response.data;
}

export async function fetchPricePreview(
  itemType: PaymentItemType,
  itemId?: string,
  promoCode?: string,
  signal?: AbortSignal,
): Promise<PricePreview> {
  const params = new URLSearchParams({ itemType });
  if (itemId) {
    params.set('itemId', itemId);
  }
  if (promoCode) {
    params.set('promoCode', promoCode);
  }
  const response = await fetchJson<{ data: PricePreview }>(
    `${API_BASE}/payments/price-preview?${params.toString()}`,
    {
      method: 'GET',
      signal,
    },
  );
  return response.data;
}
