import { CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { trackPurchase, trackSubscribe } from '@/lib/analytics/events';
import { centsToUnits } from '@/lib/analytics/helpers';
import {
  getPurchaseItemCategory,
  isVerifiedPaymentAnalyticsReady,
} from '@/lib/analytics/paymentFlow';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { useAuth } from '@/shared/context/AuthContext';
import { usePaymentVerification } from './usePaymentVerification';
import { clearCommerceCartStorage } from '@/features/series/context/SeriesCartContext';

export default function PaymentSuccessPage() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { verifyPayment, resolvedInvoiceId, hasInvoiceContext } = usePaymentVerification(
    user,
    authLoading,
  );
  const analyticsRetryCountRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!resolvedInvoiceId) {
      return;
    }

    const verifyData = verifyPayment.data;
    if (
      !verifyData ||
      verifyData.status !== 'paid' ||
      isVerifiedPaymentAnalyticsReady(verifyData)
    ) {
      return;
    }

    if (analyticsRetryCountRef.current >= 2) {
      return;
    }

    analyticsRetryCountRef.current += 1;
    const retryTimer = window.setTimeout(() => {
      verifyPayment.mutate({ invoiceId: resolvedInvoiceId });
    }, 500);

    return () => window.clearTimeout(retryTimer);
  }, [resolvedInvoiceId, verifyPayment, verifyPayment.data]);

  const navigationHandledRef = useRef(false);

  // Invalidate caches and redirect as soon as payment is confirmed paid.
  useEffect(() => {
    const verifyData = verifyPayment.data;
    if (!verifyData || verifyData.status !== 'paid' || navigationHandledRef.current) return;

    if (verifyData.itemType === 'masterclass') {
      queryClient.invalidateQueries({ queryKey: ['masterclasses'] });
    }

    navigationHandledRef.current = true;

    if (verifyData.itemType === 'order') {
      clearCommerceCartStorage();
    }

    if (verifyData.itemType === 'event' && verifyData.itemId) {
      navigate(`/thank-you-event/${verifyData.itemId}?paid=1`, { replace: true });
    } else if (verifyData.itemType === 'track' && verifyData.itemId) {
      navigate(`/thank-you-track/${verifyData.itemId}?paid=1`, { replace: true });
    } else if (verifyData.itemType === 'masterclass' && verifyData.itemId) {
      navigate(`/dashboard/masterclasses/${verifyData.itemId}/learn`, { replace: true });
    } else if (verifyData.itemType === 'subscription') {
      navigate('/dashboard?subscribed=1', { replace: true });
    } else if (verifyData.itemType === 'order') {
      navigate('/dashboard/library?purchased=1', { replace: true });
    }
  }, [verifyPayment.data, navigate, queryClient]);

  // Fire purchase analytics once enrichment payload is ready.
  useEffect(() => {
    const verifyData = verifyPayment.data;
    if (!isVerifiedPaymentAnalyticsReady(verifyData)) return;

    const storageKey = `tracked_purchase_${verifyData.paymentId}`;
    if (!sessionStorage.getItem(storageKey)) {
      sessionStorage.setItem(storageKey, '1');

      const value = centsToUnits(verifyData.amountCents);
      const originalValue = centsToUnits(verifyData.originalAmountCents ?? verifyData.amountCents);
      const discount = centsToUnits(verifyData.discountAppliedCents);
      const itemType = verifyData.itemType ?? 'event';

      if (itemType === 'subscription') {
        trackSubscribe({
          transactionId: verifyData.paymentId,
          currency: 'EGP',
          value,
          paymentType: verifyData.paymentType ?? '',
          priorPaidPurchases: verifyData.priorPaidPurchases ?? 0,
          coupon: verifyData.promoCode ?? '',
          discount,
          originalValue,
        });
      } else {
        trackPurchase({
          transactionId: verifyData.paymentId,
          currency: 'EGP',
          value,
          itemType,
          paymentType: verifyData.paymentType ?? '',
          priorNonSubscriptionPurchases: verifyData.priorNonSubscriptionPurchases ?? 0,
          coupon: verifyData.promoCode ?? '',
          discount,
          originalValue,
          item: {
            item_id: verifyData.itemId ?? '',
            item_name: verifyData.itemName ?? '',
            item_category: getPurchaseItemCategory(itemType, verifyData.itemCategory),
            price: value,
            currency: 'EGP',
            quantity: 1,
          },
        });
      }
    }
  }, [verifyPayment.data]);

  const isVerifying = verifyPayment.isPending || authLoading;
  const hasInvoice = hasInvoiceContext;
  const canVerify = Boolean(user && resolvedInvoiceId);
  const isSuccess = verifyPayment.data?.status === 'paid';
  const isError = canVerify
    ? verifyPayment.isError || (verifyPayment.data && verifyPayment.data.status !== 'paid')
    : false;

  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
          <CardHeader className="text-center">
            {isVerifying && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">Verifying Payment...</CardTitle>
                <CardDescription>Please wait while we confirm your payment.</CardDescription>
              </>
            )}

            {isSuccess && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
                <CardDescription>
                  {verifyPayment.data?.itemName
                    ? `Your purchase of "${verifyPayment.data.itemName}" is complete.`
                    : 'Your payment has been processed successfully.'}
                </CardDescription>
              </>
            )}

            {isError && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <CheckCircle2 className="h-10 w-10 text-amber-600" />
                </div>
                <CardTitle className="text-2xl text-amber-700">Payment Processing</CardTitle>
                <CardDescription>
                  Your payment may still be processing. Please check your dashboard for the latest
                  status.
                </CardDescription>
              </>
            )}

            {hasInvoice && !canVerify && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <CheckCircle2 className="h-10 w-10 text-amber-600" />
                </div>
                <CardTitle className="text-2xl text-amber-700">Payment Received</CardTitle>
                <CardDescription>Sign in to verify your payment status.</CardDescription>
              </>
            )}

            {!hasInvoice && !isVerifying && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-700">Thank You!</CardTitle>
                <CardDescription>Your transaction has been received.</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard/meetups">View My Events</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
