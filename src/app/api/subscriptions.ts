import { API_BASE, fetchJson, getCsrfHeaders } from './client';

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
  source: 'paid' | 'legacy' | 'gift';
} | null;

export type SubscriptionGrantSource = 'legacy' | 'gift';

export type SubscriptionInfo = {
  priceEgp: number | null;
  discountPercent: number;
  benefits: string[];
};

export async function fetchSubscriptionSettings(): Promise<SubscriptionSettings> {
  const response = await fetchJson<{ data: SubscriptionSettings }>(
    `${API_BASE}/subscriptions/settings`,
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
  }>(`${API_BASE}/subscriptions/current`);
  return response.data.subscription;
}

export async function fetchSubscriptionInfo(): Promise<SubscriptionInfo> {
  const response = await fetchJson<{
    data: {
      priceEgp: number | null;
      discountPercent: number;
      benefits: string[];
    };
  }>(`${API_BASE}/subscriptions/info`);

  return {
    priceEgp: response.data.priceEgp,
    discountPercent: response.data.discountPercent,
    benefits: response.data.benefits,
  };
}

export async function createSubscriptionGrant(payload: {
  userId: string;
  source: SubscriptionGrantSource;
  reason: string;
}): Promise<{
  success: boolean;
  subscription: {
    id: string;
    userId: string;
    status: 'active' | 'expired';
    startsAt: string;
    endsAt: string;
    source: 'paid' | 'legacy' | 'gift';
  };
}> {
  return fetchJson(`${API_BASE}/subscriptions/grants`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function revokeSubscriptionGrant(payload: {
  userId: string;
  reason: string;
}): Promise<{ success: boolean }> {
  return fetchJson(`${API_BASE}/subscriptions/grants/revoke`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type BulkSubscriptionGrantResponse = {
  success: boolean;
  grantedCount: number;
};

export async function createSubscriptionGrantsFromCsv(
  file: File,
): Promise<BulkSubscriptionGrantResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/subscriptions/grants/bulk`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: getCsrfHeaders(),
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  if (!response.ok) {
    if (isJson) {
      const payload = await response.json();
      const error = new Error(payload?.error?.message ?? response.statusText) as Error & {
        extra?: Array<{ line: number; email: string; source: string; reason: string }>;
      };
      error.extra = payload?.error?.errors;
      throw error;
    }
    throw new Error(response.statusText);
  }

  if (!isJson) {
    throw new Error('Unexpected response format from server.');
  }

  return (await response.json()) as BulkSubscriptionGrantResponse;
}
