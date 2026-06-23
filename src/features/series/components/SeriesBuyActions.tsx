import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSeriesOrder } from '@/app/api/orders';
import { ApiError } from '@/app/api/client';
import { seriesToCartItem, useCommerceCart } from '@/features/series/context/SeriesCartContext';
import type { Series } from '@/features/series';
import { canShowSeriesPurchaseActions } from '@/features/series/utils/seriesPricing';
import { PaymentCheckoutDialog } from '@/shared/components/payment/PaymentCheckoutDialog';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/hooks/custom/use-toast';

type SeriesBuyActionsProps = {
  series: Pick<
    Series,
    'id' | 'title' | 'price_in_cents' | 'image_url' | 'sales_enabled' | 'asset_count' | 'has_purchased' | 'has_series_grant'
  >;
  layout?: 'inline' | 'stack';
  signInReturnPath?: string;
  onSuccessPath?: string;
  onRequireAuth?: () => void;
};

export function SeriesBuyActions({
  series,
  layout = 'inline',
  signInReturnPath,
  onSuccessPath = '/dashboard/library?purchased=1',
  onRequireAuth,
}: SeriesBuyActionsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const cart = useCommerceCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  if (!canShowSeriesPurchaseActions(series)) {
    return null;
  }

  const inCart = cart.hasItem('series', series.id);
  const stackClass = layout === 'stack' ? 'flex-col w-full' : 'flex-wrap';

  const guardAuth = () => {
    if (user) return false;
    if (onRequireAuth) {
      onRequireAuth();
      return true;
    }
    navigate('/signin', {
      state: { from: { pathname: signInReturnPath ?? `/recordings/${series.id}` } },
    });
    return true;
  };

  const startCheckout = async () => {
    if (guardAuth()) return;

    setIsCreatingOrder(true);
    try {
      const { order } = await createSeriesOrder([series.id]);
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
    <>
      <div className={`flex gap-2 ${stackClass}`}>
        <Button
          type="button"
          variant="outline"
          disabled={inCart}
          onClick={() => {
            if (guardAuth()) return;
            cart.addItem(seriesToCartItem(series));
          }}
          className={layout === 'stack' ? 'w-full' : undefined}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {inCart ? 'In cart' : 'Add to cart'}
        </Button>
        <Button
          type="button"
          disabled={isCreatingOrder}
          onClick={() => void startCheckout()}
          className={layout === 'stack' ? 'w-full' : undefined}
        >
          {isCreatingOrder ? 'Preparing...' : 'Buy now'}
        </Button>
      </div>

      {orderId && (
        <PaymentCheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          itemType="order"
          itemId={orderId}
          itemName={series.title}
          itemCategory="Series"
          basePriceCents={series.price_in_cents}
          onSuccess={() => {
            cart.removeItem('series', series.id);
            navigate(onSuccessPath);
          }}
        />
      )}
    </>
  );
}
