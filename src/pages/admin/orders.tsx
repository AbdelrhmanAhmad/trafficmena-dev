import { Banknote, ChevronLeft, ChevronRight, Clock, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import type { OrderStatusFilter } from '@/app/api/orders';
import { useAdminOrders } from '@/app/hooks/useOrders';
import { OrderItemsList } from '@/features/orders/components/OrderItemsList';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { formatSeriesPriceLabel } from '@/features/series/utils/seriesPricing';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

const PAGE_SIZE = 20;

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatRevenue(cents: number) {
  return formatSeriesPriceLabel(cents);
}

const AdminOrdersPage = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatusFilter>('all');
  const { data, isLoading, isError } = useAdminOrders({ page, pageSize: PAGE_SIZE, status });

  const stats = data?.stats;
  const orders = data?.items ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Orders</h1>
            <p className="mt-1 text-neutral-600">
              Commerce orders for series and digital products.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-neutral-600">
                  <Banknote className="h-4 w-4 text-[#05ef62]" />
                  Revenue (paid)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {isLoading ? '…' : formatRevenue(stats?.revenueCents ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-neutral-600">
                  <ShoppingBag className="h-4 w-4 text-[#05ef62]" />
                  Paid orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{isLoading ? '…' : (stats?.paidOrders ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-neutral-600">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{isLoading ? '…' : (stats?.pendingOrders ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">All orders</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{isLoading ? '…' : (stats?.totalOrders ?? 0)}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle>Order history</CardTitle>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as OrderStatusFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {isLoading && <p className="text-sm text-muted-foreground">Loading orders…</p>}
              {isError && (
                <p className="text-sm text-red-600">Unable to load orders. Please try again.</p>
              )}
              {!isLoading && !isError && orders.length === 0 && (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              )}
              {!isLoading && !isError && orders.length > 0 && (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-xl border bg-neutral-50/50 p-4">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">
                            {formatSeriesPriceLabel(order.totalCents)}
                          </p>
                          <p className="text-sm text-neutral-700">{order.userName}</p>
                          <p className="text-xs text-neutral-500">{order.userEmail}</p>
                          <p className="mt-1 text-xs text-neutral-400">
                            {formatDate(order.paidAt ?? order.createdAt)} · Order #
                            {order.id.slice(0, 8)}
                          </p>
                        </div>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <OrderItemsList items={order.items} />
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-neutral-500">
                      Page {page} of {totalPages} ({total} orders)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </AdminProtectedRoute>
  );
};

export default AdminOrdersPage;
