import { format } from 'date-fns';
import { Check, Crown, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/app/api/client';
import { fetchPayment } from '@/app/api/payments';
import { useCreateCheckout, usePaymentMethods, usePricePreview } from '@/app/hooks/usePayments';
import { useCurrentSubscription, useSubscriptionInfo } from '@/app/hooks/useSubscriptions';
import {
  ComparisonTable,
  DifferentiationSection,
  FAQSection,
  ROISection,
  TrackDetailsSection,
  ValueMathSection,
  VideoReviewsSection,
} from '@/features/subscribe/components';
import { FINAL_CTA_COPY, HERO_BENEFITS, PRICING } from '@/features/subscribe/content';
import { trackBeginCheckout, trackSelectPaymentMethod } from '@/lib/analytics/events';
import { rememberCheckoutReturn } from '@/shared/utils/paymentReturnContext';
import {
  buildCheckoutAnalyticsItem,
  getAmountCentsFromUnits,
  getAnalyticsItemId,
  getBeginCheckoutValueFromAvailablePricing,
  getNormalizedPaymentType,
  getSelectPaymentMethodValueFromAvailablePricing,
  shouldTrackStandaloneCheckoutEntry,
} from '@/lib/analytics/paymentFlow';
import AppLayout from '@/shared/components/layout/AppLayout';
import { PaymentMethodSelector } from '@/shared/components/payment';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { shouldRedirectToGateway } from '@/shared/utils/paymentMethods';

function createCheckoutIdempotencyKey(scope: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${scope}:${crypto.randomUUID()}`;
  }
  return `${scope}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

// Already subscribed view
function AlreadySubscribedView({ subscription }: { subscription: { endsAt: string } }) {
  const navigate = useNavigate();
  const expiresAt = new Date(subscription.endsAt);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">You're a Premium Member!</CardTitle>
          <CardDescription>
            Your subscription is active until{' '}
            <span className="font-medium text-foreground">{format(expiresAt, 'MMMM d, yyyy')}</span>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl bg-muted/50 p-4">
            <h3 className="font-medium">Your Benefits</h3>
            <ul className="mt-3 space-y-2">
              {HERO_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hero Section with Payment
function HeroSection({
  subscriptionInfo,
  pricePreview,
  selectedMethodId,
  setSelectedMethodId,
  onSubscribe,
  isPending,
  isLoaded,
}: {
  subscriptionInfo: { priceEgp?: number | null; discountPercent?: number } | undefined;
  pricePreview: { amountFormatted?: string } | undefined;
  selectedMethodId: number | null;
  setSelectedMethodId: (id: number | null) => void;
  onSubscribe: () => void;
  isPending: boolean;
  isLoaded: boolean;
}) {
  return (
    <section
      className={`relative mx-auto w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-neutral-50 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur ${isLoaded ? 'animate-fade-in' : ''}`}
    >
      <div className="relative grid grid-cols-1 gap-8 p-6 sm:p-10 lg:grid-cols-12 lg:gap-10">
        {/* Left column - Text Content */}
        <div
          className={`order-2 flex flex-col justify-center lg:order-1 lg:col-span-6 ${isLoaded ? 'animate-slide-in-left' : ''}`}
        >
          <div className="max-w-xl">
            {/* Premium Badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/50 bg-amber-50/70 px-3 py-1 text-xs font-medium text-amber-700 backdrop-blur transition-all duration-300 hover:scale-105 hover:bg-amber-50 hover:shadow-lg">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white">
                <Crown className="h-3.5 w-3.5" />
              </span>
              Premium Membership
              <span className="mx-1.5 h-1 w-1 rounded-full bg-amber-400" />
              Become the Expert Others Turn To
            </div>

            {/* Headline */}
            <h1
              className={`text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl ${isLoaded ? 'animate-fade-in-up' : ''}`}
            >
              Complete Your Subscription
            </h1>

            <p
              className={`mt-5 max-w-lg text-base leading-relaxed text-neutral-700 ${isLoaded ? 'animate-fade-in-up' : ''}`}
            >
              You're one step away from advanced knowledge and exclusive resources: expert-led
              tracks, done-for-you playbooks, and a community of 1,250+ MENA marketers.
            </p>

            {/* Benefits List */}
            <ul className={`mt-6 space-y-3 ${isLoaded ? 'animate-fade-in-up' : ''}`}>
              {HERO_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62] to-[#29cf9f]">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm text-neutral-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right column - Payment Card */}
        <div
          className={`order-1 flex items-center justify-center lg:order-2 lg:col-span-6 ${isLoaded ? 'animate-slide-in-right' : ''}`}
        >
          <div className="w-full max-w-sm">
            <div className="rounded-[28px] border-2 border-amber-200 bg-white p-8 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
              <div className="mb-6 text-center">
                <Badge className="mb-4 bg-amber-100 text-amber-800 hover:bg-amber-100">
                  Annual Subscription
                </Badge>
                <div className="text-4xl font-medium text-neutral-400 line-through">
                  {PRICING.regular.toLocaleString()} EGP
                </div>
                <div className="text-3xl font-bold text-neutral-900">
                  {pricePreview?.amountFormatted ?? `${subscriptionInfo?.priceEgp ?? '---'} EGP`}
                </div>
                <p className="mt-1 text-neutral-500">per year</p>
              </div>

              {/* Payment Method Selector */}
              <div className="mb-6">
                <p className="mb-3 text-sm font-medium text-neutral-700">Select payment method</p>
                <PaymentMethodSelector
                  value={selectedMethodId}
                  onChange={setSelectedMethodId}
                  disabled={isPending}
                />
              </div>

              <Button
                onClick={onSubscribe}
                disabled={!selectedMethodId || isPending}
                className="group w-full transform rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-6 py-3.5 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Subscribe Now
                  </>
                )}
              </Button>

              <p className="mt-4 text-center text-xs text-neutral-500">
                365 days of premium access
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Final CTA Section with Payment
function FinalCTASection({
  subscriptionInfo,
  selectedMethodId,
  onSubscribe,
  isPending,
}: {
  subscriptionInfo: { priceEgp?: number | null; discountPercent?: number } | undefined;
  selectedMethodId: number | null;
  onSubscribe: () => void;
  isPending: boolean;
}) {
  return (
    <section className="relative w-full overflow-hidden rounded-[28px]">
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#0b3a3f]" />
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-blue-900/10 to-transparent" />

      <div className="relative px-6 py-12 text-center sm:px-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg">
          <Crown className="h-8 w-8 text-white" />
        </div>

        <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {FINAL_CTA_COPY.headline}
        </h3>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/80 leading-relaxed">
          {FINAL_CTA_COPY.lead}
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-white/60">{FINAL_CTA_COPY.description}</p>
        <p className="mt-4 text-lg font-semibold text-[#05ef62]">{FINAL_CTA_COPY.emphasis}</p>

        <div className="mt-8">
          <Button
            onClick={onSubscribe}
            disabled={!selectedMethodId || isPending}
            className="group inline-flex max-w-full transform items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-8 py-4 text-base font-semibold text-[#101010] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0 whitespace-normal text-center"
          >
            {isPending ? (
              <>
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Crown className="h-5 w-5 shrink-0" />
                <span>Subscribe Now: {subscriptionInfo?.priceEgp ?? '---'} EGP/year</span>
              </>
            )}
          </Button>
          {!selectedMethodId && (
            <p className="mt-3 text-sm text-white/50">
              Please select a payment method above to continue
            </p>
          )}
        </div>

        <p className="mt-6 text-sm text-white/50">
          Questions?{' '}
          <a
            href="https://wa.me/201505437979"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 underline hover:text-white"
          >
            Contact us on WhatsApp
          </a>
        </p>
      </div>
    </section>
  );
}

// Subscribe Payment View (Full Content)
function SubscribePaymentView() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const checkoutRequestLockRef = useRef(false);
  const beginCheckoutFiredRef = useRef(false);

  const { data: subscriptionInfo } = useSubscriptionInfo();
  const { data: pricePreview } = usePricePreview('subscription', undefined, undefined);
  const createCheckout = useCreateCheckout();
  const { data: methods } = usePaymentMethods();
  const selectedMethod = methods?.find((method) => method.paymentId === selectedMethodId) ?? null;
  const shouldRedirect = shouldRedirectToGateway(selectedMethod);
  const analyticsItemId = getAnalyticsItemId('subscription');
  const subscriptionBasePriceCents = getAmountCentsFromUnits(subscriptionInfo?.priceEgp);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (
      !shouldTrackStandaloneCheckoutEntry({
        selectedMethodId,
        alreadyTracked: beginCheckoutFiredRef.current,
      })
    ) {
      return;
    }

    const value = getBeginCheckoutValueFromAvailablePricing(
      pricePreview,
      subscriptionBasePriceCents,
    );
    if (value <= 0) {
      return;
    }

    beginCheckoutFiredRef.current = true;
    trackBeginCheckout({
      currency: 'EGP',
      value,
      itemType: 'subscription',
      item: buildCheckoutAnalyticsItem({
        itemType: 'subscription',
        value,
      }),
    });
  }, [pricePreview, selectedMethodId, subscriptionBasePriceCents]);

  const goToPending = (payload: {
    invoiceId?: string;
    paymentMethodId?: number | null;
    paymentId?: string;
  }) => {
    const params = new URLSearchParams();
    if (payload.invoiceId) params.set('invoice_id', String(payload.invoiceId));
    params.set('item_type', 'subscription');
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

  const handleSubscribe = async () => {
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
        subscriptionBasePriceCents,
      );
      if (checkoutValue > 0) {
        trackSelectPaymentMethod({
          currency: 'EGP',
          value: checkoutValue,
          paymentType: getNormalizedPaymentType(selectedMethod?.name_en),
          itemType: 'subscription',
          coupon: '',
          item: buildCheckoutAnalyticsItem({
            itemType: 'subscription',
            value: checkoutValue,
          }),
        });
      }

      const result = await createCheckout.mutateAsync({
        itemType: 'subscription',
        paymentMethodId: selectedMethodId,
        idempotencyKey: createCheckoutIdempotencyKey(
          `subscription:${analyticsItemId}:${selectedMethodId}`,
        ),
      });

      if (result.free) {
        navigate('/payment/success');
        return;
      }

      if (result.redirectUrl) {
        rememberCheckoutReturn({
          paymentId: result.paymentId,
          invoiceId: result.invoiceId,
          itemType: 'subscription',
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

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to process subscription. Please try again.';
      toast({
        title: 'Subscription failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      checkoutRequestLockRef.current = false;
    }
  };

  return (
    <div className="relative isolate overflow-hidden">
      {/* Gradient blobs */}
      <div className="pointer-events-none absolute -left-[45vw] top-[-25vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/70 via-[#f4fff9]/40 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -right-[50vw] top-[30vh] -z-10 h-[50vh] w-[80vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[90px]" />

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 pb-20 pt-8 sm:px-6 lg:px-0">
        {/* Section 1: Hero with Payment */}
        <HeroSection
          subscriptionInfo={subscriptionInfo}
          pricePreview={pricePreview}
          selectedMethodId={selectedMethodId}
          setSelectedMethodId={setSelectedMethodId}
          onSubscribe={handleSubscribe}
          isPending={createCheckout.isPending}
          isLoaded={isLoaded}
        />

        {/* Section 2: Social Proof */}
        <VideoReviewsSection isLoaded={isLoaded} />

        {/* Section 3: What Premium Includes (Track Details) */}
        <TrackDetailsSection />

        {/* Section 3: FREE vs PREMIUM Comparison */}
        <ComparisonTable />

        {/* Section 4: Value Math */}
        <ValueMathSection currentPrice={subscriptionInfo?.priceEgp} />

        {/* Section 5: ROI Argument */}
        <ROISection />

        {/* Section 7: Why TrafficMENA Premium (Differentiation) */}
        <DifferentiationSection />

        {/* Section 8: FAQ */}
        <FAQSection />

        {/* Section 9: Final CTA with Payment */}
        <FinalCTASection
          subscriptionInfo={subscriptionInfo}
          selectedMethodId={selectedMethodId}
          onSubscribe={handleSubscribe}
          isPending={createCheckout.isPending}
        />
      </div>
    </div>
  );
}

// Main component
export default function DashboardSubscribePage() {
  const { data: currentSubscription, isLoading } = useCurrentSubscription();
  const hasActiveSubscription = currentSubscription?.status === 'active';

  if (isLoading) {
    return (
      <AppLayout variant="member">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // Already subscribed → show status
  if (hasActiveSubscription && currentSubscription) {
    return (
      <AppLayout variant="member">
        <AlreadySubscribedView subscription={currentSubscription} />
      </AppLayout>
    );
  }

  // Not subscribed → show full content with payment flow
  return (
    <AppLayout variant="member">
      <SubscribePaymentView />
    </AppLayout>
  );
}
