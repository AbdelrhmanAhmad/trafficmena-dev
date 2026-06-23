import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchAdminOrders, fetchMyOrders, fetchOrder } from '@/app/api/orders';

const myOrdersKey = (params: OrderListParams) => ['orders', 'mine', params] as const;
const adminOrdersKey = (params: OrderListParams) => ['orders', 'admin', params] as const;

export function useMyOrders(params: OrderListParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: myOrdersKey(params),
    queryFn: () => fetchMyOrders(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

export function useAdminOrders(params: OrderListParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminOrdersKey(params),
    queryFn: () => fetchAdminOrders(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

export function useOrder(orderId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['orders', 'detail', orderId],
    queryFn: () => fetchOrder(orderId!),
    enabled: Boolean(orderId) && (options?.enabled ?? true),
  });
}

export type { AdminOrderRecord, OrderWithItems };
