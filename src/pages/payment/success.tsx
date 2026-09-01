import { CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useVerifyPayment } from '@/app/hooks/usePayments';
import { clearCommerceCartStorage } from '@/features/series/context/SeriesCartContext';
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

export default function PaymentSuccessPage() {
  const { t } = useTranslation('payments');
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const verifyPayment = useVerifyPayment();
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const analyticsRetryCountRef = useRef(0);
  const navigationHandledRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (paymentId && user && !verificationAttempted) {
      setVerificationAttempted(true);
      verifyPayment.mutate({ paymentId });
    }
  }, [paymentId, user, verificationAttempted, verifyPayment]);

  useEffect(() => {
    if (!paymentId) {
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
      verifyPayment.mutate({ paymentId });
    }, 500);

    return () => window.clearTimeout(retryTimer);
  }, [paymentId, verifyPayment, verifyPayment.data]);

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
          eventId: verifyData.paymentId,
          currency: 'EGP',
          value,
          itemType,
          paymentType: verifyData.paymentType ?? '',
          priorNonSubscriptionPurchases: verifyData.priorNonSubscriptionPurchases ?? 0,
          coupon: verifyData.promoCode ?? '',
          discount,
          originalValue,
          ticketType: verifyData.ticketType ?? null,
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

    if (navigationHandledRef.current) {
      return;
    }

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
    } else if (verifyData.itemType === 'order' && verifyData.itemId) {
      navigate(`/thank-you-order/${verifyData.itemId}?paid=1`, { replace: true });
    } else if (verifyData.itemType === 'order') {
      navigate('/dashboard/library?purchased=1', { replace: true });
    }
  }, [verifyPayment.data, navigate, queryClient]);

  const isVerifying = verifyPayment.isPending;
  const hasPaymentId = Boolean(paymentId);
  const canVerify = Boolean(user && paymentId);
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
                <CardTitle className="text-2xl">{t('verifyingTitle')}</CardTitle>
                <CardDescription>{t('verifyingDesc')}</CardDescription>
              </>
            )}

            {isSuccess && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-700">{t('successTitle')}</CardTitle>
                <CardDescription>
                  {verifyPayment.data?.itemName
                    ? t('successWithItem', { itemName: verifyPayment.data.itemName })
                    : t('successGeneric')}
                </CardDescription>
              </>
            )}

            {isError && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <CheckCircle2 className="h-10 w-10 text-amber-600" />
                </div>
                <CardTitle className="text-2xl text-amber-700">{t('processingTitle')}</CardTitle>
                <CardDescription>{t('processingDesc')}</CardDescription>
              </>
            )}

            {hasPaymentId && !canVerify && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <CheckCircle2 className="h-10 w-10 text-amber-600" />
                </div>
                <CardTitle className="text-2xl text-amber-700">{t('receivedTitle')}</CardTitle>
                <CardDescription>{t('receivedDesc')}</CardDescription>
              </>
            )}

            {!hasPaymentId && !isVerifying && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <CheckCircle2 className="h-10 w-10 text-amber-600" />
                </div>
                <CardTitle className="text-2xl text-amber-700">{t('confirmingTitle')}</CardTitle>
                <CardDescription>{t('confirmingDesc')}</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link to="/dashboard">{t('goToDashboard')}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard/meetups">{t('viewMyEvents')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
