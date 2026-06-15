import { API_BASE, fetchJson } from './client';

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
