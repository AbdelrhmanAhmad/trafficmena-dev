import { API_BASE, fetchJson } from './client';

export type SubscriptionSettings = {
  annualSubscriptionPriceCents: number | null;
  subscriberDiscountPercent: number | null;
};

export type UserSubscription = {
  id: string;
  status: 'active' | 'expired';
  startsAt: string;
  endsAt: string;
  pricePaidCents: number;
} | null;

export type SubscriptionInfo = {
  priceEgp: number | null;
  discountPercent: number;
  benefits: string[];
};

export async function fetchSubscriptionSettings(): Promise<SubscriptionSettings> {
  const response = await fetchJson<{ data: SubscriptionSettings }>(
    `${API_BASE}/subscriptions/settings`,
    {
      method: 'GET',
    },
  );
  return response.data;
}

export async function updateSubscriptionSettings(
  payload: Partial<SubscriptionSettings>,
): Promise<SubscriptionSettings> {
  const response = await fetchJson<{ data: SubscriptionSettings }>(
    `${API_BASE}/subscriptions/settings`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function fetchCurrentSubscription(): Promise<UserSubscription> {
  const response = await fetchJson<{
    data: { hasSubscription: boolean; subscription: UserSubscription };
  }>(`${API_BASE}/subscriptions/current`, {
    method: 'GET',
  });
  return response.data.subscription;
}

export async function fetchSubscriptionInfo(): Promise<SubscriptionInfo> {
  const response = await fetchJson<{
    data: {
      priceEgp: number | null;
      discountPercent: number;
      benefits: string[];
    };
  }>(`${API_BASE}/subscriptions/info`, {
    method: 'GET',
  });

  return {
    priceEgp: response.data.priceEgp,
    discountPercent: response.data.discountPercent,
    benefits: response.data.benefits,
  };
}
