import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { MasterclassStoreItem } from '@/app/api/masterclasses';
import { formatSeriesPriceLabel } from '@/features/series/utils/seriesPricing';
import { PaymentCheckoutDialog } from '@/shared/components/payment/PaymentCheckoutDialog';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/shared/context/AuthContext';
import { prepareSignInNavigation } from '@/shared/utils/authNavigation';
import { buildReturnPathFromLocation } from '@/shared/utils/authReturnPath';

type MasterclassBuyActionsProps = {
  masterclass: MasterclassStoreItem;
  layout?: 'inline' | 'stack';
};

export function MasterclassBuyActions({ masterclass, layout = 'inline' }: MasterclassBuyActionsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const stackClass = layout === 'stack' ? 'flex-col w-full' : 'flex-wrap';

  if (masterclass.is_enrolled || !masterclass.is_sellable) {
    return null;
  }

  const startCheckout = () => {
    if (!user) {
      const returnPath = buildReturnPathFromLocation(location);
      navigate('/signin', prepareSignInNavigation(returnPath));
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <>
      <div className={`flex gap-2 ${stackClass}`}>
        <Button
          type="button"
          className={layout === 'stack' ? 'w-full' : undefined}
          onClick={startCheckout}
        >
           Buy now , {formatSeriesPriceLabel(masterclass.price_in_cents ?? 0)}
        </Button>
      </div>

      <PaymentCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        itemType="masterclass"
        itemId={masterclass.id}
        itemName={masterclass.title}
        itemCategory="Masterclass"
        basePriceCents={masterclass.price_in_cents ?? 0}
        onSuccess={() => navigate(`/dashboard/masterclasses/${masterclass.id}/learn`)}
      />
    </>
  );
}

export function MasterclassPrice({ priceInCents }: { priceInCents: number | null }) {
  if (!priceInCents || priceInCents <= 0) return null;
  return <span className="font-semibold text-neutral-900">{formatSeriesPriceLabel(priceInCents)}</span>;
}
