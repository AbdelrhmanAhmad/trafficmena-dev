import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/app/api/client';
import { fetchPayment, type PaymentItemType } from '@/app/api/payments';
import { useCreateCheckout, usePaymentMethods, usePricePreview } from '@/app/hooks/usePayments';
import { trackBeginCheckout, trackSelectPaymentMethod } from '@/lib/analytics/events';
import { centsToUnits } from '@/lib/analytics/helpers';
import {
  buildCheckoutAnalyticsItem,
  getAnalyticsItemId,
  getBeginCheckoutValue,
  getNormalizedPaymentType,
  getSelectPaymentMethodValueFromAvailablePricing,
} from '@/lib/analytics/paymentFlow';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { rememberCheckoutReturn } from '@/shared/utils/paymentReturnContext';
import { shouldRedirectToGateway } from '@/shared/utils/paymentMethods';
import { PaymentMethodSelector } from './PaymentMethodSelector';

interface PaymentCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: PaymentItemType;
  itemId?: string;
  itemName: string;
  itemCategory?: string;
  basePriceCents?: number | null;
  appliedPromoCode?: string;
  onSuccess?: () => void;
}

function createCheckoutIdempotencyKey(scope: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${scope}:${crypto.randomUUID()}`;
  }
  return `${scope}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

export function PaymentCheckoutDialog({
  open,
  onOpenChange,
  itemType,
  itemId,
  itemName,
  itemCategory,
  basePriceCents,
  appliedPromoCode,
  onSuccess,
}: PaymentCheckoutDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [checkoutStuck, setCheckoutStuck] = useState(false);
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const checkoutRequestLockRef = useRef(false);
  const createCheckout = useCreateCheckout();

  const beginCheckoutFiredRef = useRef(false);

  // Reset selection and tracking ref when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedMethodId(null);
      beginCheckoutFiredRef.current = false;
    }
  }, [open]);

  // Allow dismissing dialog if checkout hangs for 20s (slow MENA connections)
  useEffect(() => {
    if (createCheckout.isPending) {
      setCheckoutStuck(false);
      stuckTimerRef.current = setTimeout(() => setCheckoutStuck(true), 20_000);
    } else {
      setCheckoutStuck(false);
    }
    return () => clearTimeout(stuckTimerRef.current);
  }, [createCheckout.isPending]);

  const shouldFetchPricing = open && !!user;
  const { data: pricePreview, isLoading: priceLoading } = usePricePreview(
    shouldFetchPricing ? itemType : undefined,
    itemId,
    appliedPromoCode,
  );
  const { data: methods } = usePaymentMethods({ enabled: shouldFetchPricing });
  const selectedMethod = methods?.find((method) => method.paymentId === selectedMethodId) ?? null;
  const shouldRedirect = shouldRedirectToGateway(selectedMethod);
  const hasPromoApplied =
    Boolean(appliedPromoCode) && pricePreview?.discountSource === 'promo' && !pricePreview.isFree;
  const canSubmitCheckout = Boolean(selectedMethodId) && !createCheckout.isPending;
  const analyticsItemId = getAnalyticsItemId(itemType, itemId);
  const fallbackAmountFormatted =
    basePriceCents && basePriceCents > 0 ? `${centsToUnits(basePriceCents).toFixed(2)} EGP` : '';
  const checkoutAmountLabel = pricePreview?.amountFormatted ?? fallbackAmountFormatted;
  let checkoutDescription: string | null = null;
  if (!priceLoading) {
    checkoutDescription = pricePreview?.isFree
      ? `Register for ${itemName} for free.`
      : `Pay ${checkoutAmountLabel || 'the latest price'} for ${itemName}.`;
  }

  let checkoutButtonLabel = 'Continue to Payment';
  if (pricePreview?.isFree) {
    checkoutButtonLabel = 'Register Now';
  } else if (checkoutAmountLabel) {
    checkoutButtonLabel = `Pay ${checkoutAmountLabel}`;
  }

  // Fire begin_checkout once per dialog open, after pricePreview loads so the
  // value reflects any subscriber/promo discounts (not the fallback base price).
  useEffect(() => {
    if (!open || beginCheckoutFiredRef.current || !pricePreview) return;
    const value = getBeginCheckoutValue(pricePreview);
    if (value <= 0) return;

    beginCheckoutFiredRef.current = true;
    trackBeginCheckout({
      currency: 'EGP',
      value,
      itemType,
      item: buildCheckoutAnalyticsItem({
        itemType,
        itemId,
        itemName,
        itemCategory,
        value,
      }),
    });
  }, [open, pricePreview, itemType, itemId, itemName, itemCategory]);

  const goToPending = (payload: {
    invoiceId?: string;
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

    if (checkoutRequestLockRef.current) {
      return;
    }
    checkoutRequestLockRef.current = true;

    try {
      const checkoutValue = getSelectPaymentMethodValueFromAvailablePricing(
        pricePreview,
        basePriceCents,
      );
      if (checkoutValue > 0) {
        trackSelectPaymentMethod({
          currency: 'EGP',
          value: checkoutValue,
          paymentType: getNormalizedPaymentType(selectedMethod?.name_en),
          itemType,
          coupon: appliedPromoCode ?? '',
          item: buildCheckoutAnalyticsItem({
            itemType,
            itemId,
            itemName,
            itemCategory,
            value: checkoutValue,
          }),
        });
      }

      const result = await createCheckout.mutateAsync({
        itemType,
        itemId,
        paymentMethodId: selectedMethodId,
        idempotencyKey: createCheckoutIdempotencyKey(
          `${itemType}:${analyticsItemId}:${selectedMethodId}`,
        ),
        promoCode: appliedPromoCode,
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
        rememberCheckoutReturn({
          paymentId: result.paymentId,
          invoiceId: result.invoiceId,
          itemType,
        });
        window.location.href = result.redirectUrl;
        return;
      }

      if (shouldRedirect) {
        goToPending({
          invoiceId: result.invoiceId,
          paymentMethodId: selectedMethodId,
          paymentId: result.paymentId,
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
        const invoiceId = error.extra?.invoiceId as string | undefined;
        const fawryCode = error.extra?.fawryCode as string | undefined;
        const meezaReference = error.extra?.meezaReference as string | undefined;
        const meezaQrCode = error.extra?.meezaQrCode as string | undefined;
        const amanCode = error.extra?.amanCode as string | undefined;
        const masaryCode = error.extra?.masaryCode as string | undefined;
        const pendingPaymentId = error.extra?.paymentId as string | undefined;
        let resolvedInvoiceId = invoiceId;

        if (!resolvedInvoiceId && pendingPaymentId) {
          try {
            const pendingPayment = await fetchPayment(pendingPaymentId);
            resolvedInvoiceId = pendingPayment.fawaterkInvoiceId ?? undefined;
          } catch {
            // Fallback to payment_id-only pending flow; pending page will keep polling for invoice_id.
          }
        }

        if (
          resolvedInvoiceId ||
          pendingPaymentId ||
          fawryCode ||
          meezaReference ||
          meezaQrCode ||
          amanCode ||
          masaryCode
        ) {
          goToPending({
            invoiceId: resolvedInvoiceId,
            paymentMethodId: selectedMethodId,
            paymentId: pendingPaymentId,
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
    } finally {
      checkoutRequestLockRef.current = false;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val && createCheckout.isPending && !checkoutStuck) return;
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            {priceLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating price...
              </span>
            ) : (
              checkoutDescription
            )}
          </DialogDescription>
        </DialogHeader>

        {pricePreview?.discountSource === 'subscriber' && !pricePreview.isFree && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <span className="font-medium">Subscriber discount applied!</span>
            <p className="text-xs text-amber-700">
              As a subscriber, you're getting the best price.
            </p>
          </div>
        )}

        {hasPromoApplied && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <span className="font-medium">Promo {appliedPromoCode} applied</span>
            <p className="text-xs text-emerald-700">Your discount is locked in for checkout.</p>
          </div>
        )}

        <div className="py-4">
          <p className="mb-3 text-sm font-medium">Select payment method</p>
          <PaymentMethodSelector
            value={selectedMethodId}
            onChange={setSelectedMethodId}
            disabled={createCheckout.isPending}
            enabled={shouldFetchPricing}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (!createCheckout.isPending || checkoutStuck) onOpenChange(false);
            }}
            disabled={createCheckout.isPending && !checkoutStuck}
          >
            Cancel
          </Button>
          <Button onClick={handleCheckout} disabled={!canSubmitCheckout}>
            {createCheckout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {checkoutButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
