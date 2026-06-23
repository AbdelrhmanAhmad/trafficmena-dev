import { API_BASE, fetchJson } from './client';
import type { PaginatedResult } from './types';

export type OrderItem = {
  id: string;
  orderId: string;
  itemType: 'series' | 'digital_product';
  seriesId: string | null;
  digitalProductId: string | null;
  unitPriceCents: number;
  lineTotalCents: number;
  fulfillmentStatus: 'pending' | 'fulfilled';
  title?: string | null;
  imageUrl?: string | null;
};

export type Order = {
  id: string;
  userId: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  totalCents: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
};

export type OrderWithItems = Order & {
  items: OrderItem[];
};

export type AdminOrderRecord = OrderWithItems & {
  userEmail: string;
  userName: string;
};

export type OrderStatusFilter = 'all' | Order['status'];

export type OrderListParams = {
  page?: number;
  pageSize?: number;
  status?: OrderStatusFilter;
};

export type AdminOrdersStats = {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  revenueCents: number;
};

export async function createCommerceOrder(args: {
  seriesIds?: string[];
  digitalProductIds?: string[];
}): Promise<{
  order: Order;
  items: OrderItem[];
}> {
  const data = await fetchJson<{
    data: { order: Order; items: OrderItem[] };
  }>(`${API_BASE}/orders`, {
    method: 'POST',
    body: JSON.stringify(args),
  });
  return data.data;
}

/** @deprecated Use createCommerceOrder */
export async function createSeriesOrder(seriesIds: string[]) {
  return createCommerceOrder({ seriesIds });
}

export async function fetchOrder(orderId: string): Promise<{ order: Order; items: OrderItem[] }> {
  const data = await fetchJson<{ data: { order: Order; items: OrderItem[] } }>(
    `${API_BASE}/orders/${orderId}`,
    { method: 'GET' },
  );
  return data.data;
}

export async function fetchMyOrders(
  params: OrderListParams = {},
): Promise<PaginatedResult<OrderWithItems>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.status && params.status !== 'all') query.set('status', params.status);

  const data = await fetchJson<{
    data: {
      items: OrderWithItems[];
      pagination: PaginatedResult<OrderWithItems>['pagination'];
    };
  }>(`${API_BASE}/orders${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
  });

  return {
    items: data.data.items,
    pagination: data.data.pagination,
  };
}

export async function fetchAdminOrders(params: OrderListParams = {}): Promise<{
  stats: AdminOrdersStats;
  items: AdminOrderRecord[];
  pagination: PaginatedResult<AdminOrderRecord>['pagination'];
}> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.status && params.status !== 'all') query.set('status', params.status);

  const data = await fetchJson<{
    data: {
      stats: AdminOrdersStats;
      items: AdminOrderRecord[];
      pagination: PaginatedResult<AdminOrderRecord>['pagination'];
    };
  }>(`${API_BASE}/admin/orders${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
  });

  return data.data;
}
