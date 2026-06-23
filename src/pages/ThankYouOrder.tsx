import {
  ArrowRight,
  BadgeCheck,
  CheckCircle,
  FileStack,
  FolderOpen,
  LayoutDashboard,
  ShoppingBag,
} from 'lucide-react';
import type React from 'react';
import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { OrderItem } from '@/app/api/orders';
import { useOrder } from '@/app/hooks/useOrders';
import {
  getOrderItemDashboardPath,
  getOrderItemTypeLabel,
} from '@/features/orders/utils/orderItemNavigation';
import { formatSeriesPriceLabel } from '@/features/series/utils/seriesPricing';
import DataLoader from '@/shared/components/DataLoader';
import Layout from '@/shared/components/layout/Layout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useAuth } from '@/shared/context/AuthContext';

function OrderItemCard({ item }: { item: OrderItem }) {
  const href = getOrderItemDashboardPath(item);
  const imageUrl = item.imageUrl?.trim() || '/placeholder.svg';
  const typeLabel = getOrderItemTypeLabel(item.itemType);
  const TypeIcon = item.itemType === 'series' ? FolderOpen : FileStack;

  return (
    <Link
      to={href}
      className="group block overflow-hidden rounded-2xl border border-[#05ef62]/25 bg-white shadow-sm transition hover:border-[#29cf9f]/50 hover:shadow-md"
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-40 w-full shrink-0 overflow-hidden bg-neutral-100 sm:h-auto sm:w-44">
          <img
            src={imageUrl}
            alt={item.title ?? typeLabel}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent sm:bg-gradient-to-r" />
          <div className="absolute bottom-3 left-3 sm:bottom-auto sm:left-3 sm:top-3">
            <Badge className="bg-[#05ef62] text-[#101010] hover:bg-[#05ef62]/90">
              <TypeIcon className="mr-1 h-3 w-3" />
              {typeLabel}
            </Badge>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Open in dashboard
            </p>
            <h3 className="mt-1 text-lg font-semibold text-neutral-900 group-hover:text-[#059640]">
              {item.title ?? 'Purchased item'}
            </h3>
            <p className="mt-1 text-sm font-medium text-neutral-700">
              {formatSeriesPriceLabel(item.lineTotalCents)}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#05ef62]/15 text-[#059640] transition group-hover:bg-[#05ef62]/25">
            <ArrowRight className="h-5 w-5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function ThankYouOrderContent() {
  const { orderId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const isPaidFlow = searchParams.get('paid') === '1';
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useOrder(orderId, { enabled: Boolean(orderId) });

  useEffect(() => {
    if (!data?.order || data.order.status !== 'paid') return;
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    void queryClient.invalidateQueries({ queryKey: ['series'] });
    void queryClient.invalidateQueries({ queryKey: ['digital-products'] });
    void queryClient.invalidateQueries({ queryKey: ['library'] });
  }, [data?.order, queryClient]);

  const order = data?.order;
  const items = data?.items ?? [];
  const hasSeries = items.some((item) => item.itemType === 'series');
  const hasDigitalProducts = items.some((item) => item.itemType === 'digital_product');

  return (
    <Layout>
      <DataLoader
        loading={isLoading}
        error={error ? 'Failed to load your order' : !order ? 'Order not found' : null}
        loadingText="Loading your order..."
        onRetry={() => window.location.reload()}
      >
        {order && (
          <div className="relative isolate min-h-screen overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
            <div className="pointer-events-none absolute -left-[45vw] top-[-25vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/60 via-[#f4fff9]/40 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute -right-[48vw] top-[35vh] -z-10 h-[55vh] w-[80vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[90px]" />

            <div className="mx-auto max-w-3xl">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62]/20 to-[#29cf9f]/20 ring-4 ring-[#05ef62]/30">
                  <CheckCircle className="h-10 w-10 text-[#05ef62]" />
                </div>
                <h1 className="mb-4 text-4xl font-bold text-gray-900">Thank you for your order!</h1>
                <p className="mb-2 text-xl text-gray-600">
                  {user?.user_metadata?.first_name
                    ? `Thanks, ${user.user_metadata.first_name}!`
                    : 'Your purchase is complete.'}
                </p>
                <p className="text-lg text-gray-600">
                  {items.length === 1
                    ? 'Your item is ready in your dashboard.'
                    : `${items.length} items are ready in your dashboard.`}
                </p>

                {isPaidFlow && (
                  <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                    <BadgeCheck className="h-4 w-4" />
                    Payment successful · Order confirmed
                  </div>
                )}
              </div>

              <Card className="mb-8 overflow-hidden border-[#05ef62]/30 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[#05ef62]/10 to-[#29cf9f]/10">
                  <div className="mb-2 flex items-center gap-2 text-[#059640]">
                    <ShoppingBag className="h-5 w-5" />
                    <span className="font-medium">Order summary</span>
                  </div>
                  <CardTitle className="text-2xl text-gray-900">
                    {formatSeriesPriceLabel(order.totalCents)}
                  </CardTitle>
                  <p className="text-sm text-neutral-600">
                    {items.length} {items.length === 1 ? 'item' : 'items'} ·{' '}
                    {order.status === 'paid' ? 'Paid' : order.status}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {items.length === 0 ? (
                    <p className="text-sm text-neutral-500">No items found for this order.</p>
                  ) : (
                    items.map((item) => <OrderItemCard key={item.id} item={item} />)
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                {hasSeries && (
                  <Button asChild className="rounded-full">
                    <Link to="/dashboard/library">
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Go to Library
                    </Link>
                  </Button>
                )}
                {hasDigitalProducts && (
                  <Button asChild className="rounded-full" variant={hasSeries ? 'outline' : 'default'}>
                    <Link to="/dashboard/digital-products">
                      <FileStack className="mr-2 h-4 w-4" />
                      My digital products
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </DataLoader>
    </Layout>
  );
}

const ThankYouOrder: React.FC = () => <ThankYouOrderContent />;

export default ThankYouOrder;
