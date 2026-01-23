import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/app/api/client';
import type { PaymentItemType } from '@/app/api/payments';
import { useCreateCheckout, usePaymentMethods, usePricePreview } from '@/app/hooks/usePayments';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { shouldRedirectToGateway } from '@/shared/utils/paymentMethods';
import { PaymentMethodSelector } from './PaymentMethodSelector';

interface PaymentCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: PaymentItemType;
  itemId?: string;
  itemName: string;
  onSuccess?: () => void;
}

export function PaymentCheckoutDialog({
  open,
  onOpenChange,
  itemType,
  itemId,
  itemName,
  onSuccess,
}: PaymentCheckoutDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const { data: pricePreview, isLoading: priceLoading } = usePricePreview(itemType, itemId);
  const createCheckout = useCreateCheckout();
  const { data: methods } = usePaymentMethods();
  const selectedMethod = methods?.find((method) => method.paymentId === selectedMethodId) ?? null;
  const shouldRedirect = shouldRedirectToGateway(selectedMethod);

  const goToPending = (payload: {
    invoiceId?: number;
    paymentMethodId?: number | null;
    paymentId?: string;
  }) => {
    const params = new URLSearchParams();
    if (payload.invoiceId) params.set('invoice_id', String(payload.invoiceId));
    params.set('item_type', itemType);
    if (itemId) params.set('item_id', itemId);
    if (payload.paymentMethodId) {
      params.set('method_id', String(payload.paymentMethodId));
    }
    if (payload.paymentId) {
      params.set('payment_id', payload.paymentId);
    }
    const query = params.toString();
    navigate(`/payment/pending${query ? `?${query}` : ''}`, {
      state: undefined,
    });
  };

  const handleCheckout = async () => {
    if (!selectedMethodId) {
      toast({
        title: 'Select payment method',
        description: 'Please select a payment method to continue.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await createCheckout.mutateAsync({
        itemType,
        itemId,
        paymentMethodId: selectedMethodId,
        forceNewCode: shouldRedirect ? true : undefined,
      });

      if (result.free) {
        toast({
          title: 'Registration complete',
          description: `You've been registered for ${itemName}.`,
        });
        onSuccess?.();
        onOpenChange(false);
        return;
      }

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }

      if (shouldRedirect) {
        toast({
          title: 'Unable to open payment page',
          description: 'Please try again to generate a new payment link.',
          variant: 'destructive',
        });
        return;
      }

      if (
        result.invoiceId ||
        result.fawryCode ||
        result.meezaReference ||
        result.meezaQrCode ||
        result.amanCode ||
        result.masaryCode
      ) {
        goToPending({
          invoiceId: result.invoiceId,
          paymentMethodId: selectedMethodId,
          paymentId: result.paymentId,
        });
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PENDING_PAYMENT') {
        if (shouldRedirect) {
          toast({
            title: 'Payment already pending',
            description: 'Please try again to generate a new payment link.',
            variant: 'destructive',
          });
          return;
        }
        const invoiceId = error.extra?.invoiceId as number | undefined;
        const fawryCode = error.extra?.fawryCode as string | undefined;
        const meezaReference = error.extra?.meezaReference as string | undefined;
        const meezaQrCode = error.extra?.meezaQrCode as string | undefined;
        const amanCode = error.extra?.amanCode as string | undefined;
        const masaryCode = error.extra?.masaryCode as string | undefined;
        if (invoiceId || fawryCode || meezaReference || meezaQrCode || amanCode || masaryCode) {
          goToPending({
            invoiceId,
            paymentMethodId: selectedMethodId,
            paymentId: error.extra?.paymentId as string | undefined,
          });
          return;
        }
      }

      const message = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      toast({
        title: 'Payment failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            {priceLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating price...
              </span>
            ) : pricePreview?.isFree ? (
              `Register for ${itemName} for free.`
            ) : (
              `Pay ${pricePreview?.amountFormatted} for ${itemName}.`
            )}
          </DialogDescription>
        </DialogHeader>

        {pricePreview?.isSubscriber && !pricePreview.isFree && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <span className="font-medium">Subscriber discount applied!</span>
            <p className="text-xs text-amber-700">
              As a subscriber, you're getting the best price.
            </p>
          </div>
        )}

        <div className="py-4">
          <p className="mb-3 text-sm font-medium">Select payment method</p>
          <PaymentMethodSelector
            value={selectedMethodId}
            onChange={setSelectedMethodId}
            disabled={createCheckout.isPending}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createCheckout.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleCheckout} disabled={!selectedMethodId || createCheckout.isPending}>
            {createCheckout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pricePreview?.isFree ? 'Register Now' : `Pay ${pricePreview?.amountFormatted || ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
