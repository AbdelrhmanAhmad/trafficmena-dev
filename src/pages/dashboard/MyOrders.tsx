import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { OrderStatusFilter } from '@/app/api/orders';
import { useMyOrders } from '@/app/hooks/useOrders';
import { OrderItemsList } from '@/features/orders/components/OrderItemsList';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { formatSeriesPriceLabel } from '@/features/series/utils/seriesPricing';
import AppLayout from '@/shared/components/layout/AppLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

const PAGE_SIZE = 10;

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function MyOrdersPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatusFilter>('all');
  const { data, isLoading, isError } = useMyOrders({ page, pageSize: PAGE_SIZE, status });

  const orders = data?.items ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ProtectedRoute>
      <AppLayout variant="member">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">{t('orders.title')}</h1>
            <p className="mt-1 text-neutral-600">{t('orders.subtitle')}</p>
          </div>

          <div className="flex justify-end">
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as OrderStatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('common:labels.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('orders.statusAll')}</SelectItem>
                <SelectItem value="paid">{t('orders.statusPaid')}</SelectItem>
                <SelectItem value="pending">{t('orders.statusPending')}</SelectItem>
                <SelectItem value="failed">{t('orders.statusFailed')}</SelectItem>
                <SelectItem value="expired">{t('orders.statusExpired')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">{t('orders.loading')}</p>}
          {isError && <p className="text-sm text-red-600">{t('orders.loadError')}</p>}
          {!isLoading && !isError && orders.length === 0 && (
            <Card className="rounded-2xl">
              <CardContent className="py-12 text-center text-muted-foreground">
                {t('orders.empty')}
              </CardContent>
            </Card>
          )}

          {orders.map((order) => (
            <Card key={order.id} className="rounded-2xl">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="text-lg">
                    {formatSeriesPriceLabel(order.totalCents)}
                  </CardTitle>
                  <p className="mt-1 text-sm text-neutral-500">
                    {formatDate(order.paidAt ?? order.createdAt)}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {t('orders.orderNumber', { id: order.id.slice(0, 8) })}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </CardHeader>
              <CardContent>
                <OrderItemsList items={order.items} />
              </CardContent>
            </Card>
          ))}

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                {t('common:pagination.pageOf', { current: page, total: totalPages })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('common:pagination.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('common:pagination.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export default MyOrdersPage;
