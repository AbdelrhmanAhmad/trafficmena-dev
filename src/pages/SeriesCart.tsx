import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '@/app/api/client';
import { createCommerceOrder } from '@/app/api/orders';
import {
  formatCartItemLabel,
  useCommerceCart,
} from '@/features/series/context/SeriesCartContext';
import { formatSeriesPriceLabel } from '@/features/series/utils/seriesPricing';
import { PaymentCheckoutDialog } from '@/shared/components/payment/PaymentCheckoutDialog';
import Layout from '@/shared/components/layout/Layout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/hooks/custom/use-toast';

export default function SeriesCartPage() {
  const cart = useCommerceCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      navigate('/signin', { state: { from: { pathname: '/series/cart' } } });
      return;
    }
    if (cart.items.length === 0) return;

    setIsCreatingOrder(true);
    try {
      const seriesIds = cart.items
        .filter((i) => i.kind === 'series')
        .map((i) => i.itemId)
        .filter((id): id is string => Boolean(id));
      const digitalProductIds = cart.items
        .filter((i) => i.kind === 'digital_product')
        .map((i) => i.itemId)
        .filter((id): id is string => Boolean(id));

      if (seriesIds.length === 0 && digitalProductIds.length === 0) return;

      const { order } = await createCommerceOrder({
        ...(seriesIds.length > 0 ? { seriesIds } : {}),
        ...(digitalProductIds.length > 0 ? { digitalProductIds } : {}),
      });
      setOrderId(order.id);
      setCheckoutOpen(true);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Could not start checkout. Please try again.';
      toast({ title: 'Checkout failed', description: message, variant: 'destructive' });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-3xl font-bold text-neutral-900">Shopping cart</h1>
          <p className="mt-2 text-neutral-600">
            Series and digital products , one checkout for permanent access.
          </p>

          {cart.items.length === 0 ? (
            <Card className="mt-8 rounded-2xl">
              <CardContent className="py-12 text-center text-muted-foreground">
                Your cart is empty.{' '}
                <Link to="/dashboard/digital-products" className="text-indigo-600 hover:underline">
                  Digital products
                </Link>
                {' · '}
                <Link to="/dashboard/library" className="text-indigo-600 hover:underline">
                  Library
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-8 space-y-4">
              {cart.items.map((item) => (
                <Card key={`${item.kind}-${item.itemId}`} className="rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg">{formatCartItemLabel(item)}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => cart.removeItem(item.kind, item.itemId)}
                      aria-label={`Remove ${item.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="text-sm text-neutral-600">
                    {formatSeriesPriceLabel(item.priceInCents)}
                  </CardContent>
                </Card>
              ))}

              <div className="flex items-center justify-between rounded-2xl border bg-white p-6">
                <div>
                  <p className="text-sm text-neutral-500">Total</p>
                  <p className="text-2xl font-bold">{formatSeriesPriceLabel(cart.totalCents)}</p>
                </div>
                <Button disabled={isCreatingOrder} onClick={() => void handleCheckout()}>
                  {isCreatingOrder ? 'Preparing...' : 'Complete purchase'}
                </Button>
              </div>
            </div>
          )}

          {orderId && (
            <PaymentCheckoutDialog
              open={checkoutOpen}
              onOpenChange={setCheckoutOpen}
              itemType="order"
              itemId={orderId}
              itemName={`Order (${cart.itemCount} items)`}
              itemCategory="Order"
              basePriceCents={cart.totalCents}
              onSuccess={() => {
                cart.clearCart();
                navigate('/dashboard/digital-products?filter=mine');
              }}
            />
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
