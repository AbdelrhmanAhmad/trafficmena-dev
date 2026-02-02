import { API_BASE, fetchJson } from './client';

export type AdminMetricsOverview = {
  asOf: string;
  users: {
    total: number;
    premium: number;
    free: number;
    activeSubscriptions: number;
  };
  subscriptions: {
    revenueCents: number;
  };
  paidSales: {
    events: { count: number; revenueCents: number };
    tracks: { count: number; revenueCents: number };
    total: { count: number; revenueCents: number };
  };
};

export async function fetchAdminMetricsOverview(): Promise<AdminMetricsOverview> {
  const data = await fetchJson<{ data: AdminMetricsOverview }>(
    `${API_BASE}/admin/metrics/overview`,
    {
      method: 'GET',
    },
  );

  return data.data;
}
