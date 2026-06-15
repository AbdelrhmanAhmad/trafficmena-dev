import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/app/api/client';
import { createCommerceOrder } from '@/app/api/orders';
import type { DigitalProductStoreItem } from '@/app/api/digitalProducts';
import {
  digitalProductToCartItem,
  useCommerceCart,
} from '@/features/series/context/SeriesCartContext';
import { formatSeriesPriceLabel } from '@/features/series/utils/seriesPricing';
import { PaymentCheckoutDialog } from '@/shared/components/payment/PaymentCheckoutDialog';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/hooks/custom/use-toast';

type DigitalProductBuyActionsProps = {
  product: DigitalProductStoreItem;
  layout?: 'inline' | 'stack';
};

export function DigitalProductBuyActions({ product, layout = 'inline' }: DigitalProductBuyActionsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const cart = useCommerceCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  if (product.is_purchased || !product.is_sellable) {
    return null;
  }

  const inCart = cart.hasItem('digital_product', product.id);
  const stackClass = layout === 'stack' ? 'flex-col w-full' : 'flex-wrap';

  const startCheckout = async () => {
    if (!user) {
      navigate('/signin', {
        state: { from: { pathname: `/dashboard/digital-products/${product.id}` } },
      });
      return;
    }

    setIsCreatingOrder(true);
    try {
      const { order } = await createCommerceOrder({ digitalProductIds: [product.id] });
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
          onClick={() => cart.addItem(digitalProductToCartItem(product))}
          className={layout === 'stack' ? 'w-full' : undefined}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {inCart ? 'في السلة' : 'أضف للسلة'}
        </Button>
        <Button
          type="button"
          disabled={isCreatingOrder}
          onClick={() => void startCheckout()}
          className={layout === 'stack' ? 'w-full' : undefined}
        >
          {isCreatingOrder ? 'جاري التحضير...' : 'اشترِ الآن'}
        </Button>
      </div>

      {orderId && (
        <PaymentCheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          itemType="order"
          itemId={orderId}
          itemName={product.title}
          itemCategory="Digital Product"
          basePriceCents={product.price_in_cents ?? 0}
          onSuccess={() => {
            cart.removeItem('digital_product', product.id);
            navigate('/dashboard/digital-products?filter=mine');
          }}
        />
      )}
    </>
  );
}

export function DigitalProductPrice({ priceInCents }: { priceInCents: number | null }) {
  if (!priceInCents || priceInCents <= 0) return null;
  return <span className="font-semibold text-neutral-900">{formatSeriesPriceLabel(priceInCents)}</span>;
}
