import { format } from 'date-fns';
import { Check, Crown, Loader2, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/app/api/client';
import { useCreateCheckout, usePricePreview } from '@/app/hooks/usePayments';
import { useCurrentSubscription, useSubscriptionInfo } from '@/app/hooks/useSubscriptions';
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
import { cn } from '@/shared/lib/utils';

const SUBSCRIPTION_BENEFITS = [
  'Free access to all online events',
  'Discounted pricing on offline & hybrid events',
  'Discounted pricing on learning tracks',
  'Early access to new content and workshops',
  'Exclusive member-only resources',
  'Priority support from the TrafficMENA team',
];

// Testimonial data
const TESTIMONIALS = [
  {
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop',
    quote:
      'The best investment in my marketing career. The workshops are practical and actionable.',
    name: 'Ahmed M.',
    role: 'Digital Marketing Manager',
  },
  {
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
    quote: 'Finally, marketing education designed for the MENA region. Highly recommended!',
    name: 'Sara K.',
    role: 'E-commerce Specialist',
  },
  {
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    quote: 'The community alone is worth the subscription. Amazing networking opportunities.',
    name: 'Omar H.',
    role: 'Startup Founder',
  },
  {
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
    quote: 'Learned more in one month than in my entire marketing degree. Game changer!',
    name: 'Layla A.',
    role: 'Content Creator',
  },
];

// Premium tracks data
const PREMIUM_TRACKS = [
  {
    title: 'Performance Marketing Track',
    description: 'Master paid advertising across Meta, Google, and TikTok platforms',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop',
    benefits: [
      'Facebook & Instagram Ads mastery',
      'Google Ads certification prep',
      'Campaign optimization techniques',
      'ROI tracking and analytics',
    ],
  },
  {
    title: 'Content Marketing Track',
    description: 'Create compelling content that converts visitors into customers',
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=450&fit=crop',
    benefits: [
      'Content strategy development',
      'SEO-optimized writing',
      'Video content creation',
      'Social media management',
    ],
  },
];

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
          <CardTitle className="text-2xl">You're a Subscriber!</CardTitle>
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
              {SUBSCRIPTION_BENEFITS.map((benefit) => (
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

// Section 1: Hero Section with Payment
function HeroSection({
  subscriptionInfo,
  pricePreview,
  selectedMethodId,
  setSelectedMethodId,
  onSubscribe,
  isPending,
  isLoaded,
}: {
  subscriptionInfo: { priceEgp?: number; discountPercent?: number } | undefined;
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
            <div
              className={`mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/50 bg-amber-50/70 px-3 py-1 text-xs font-medium text-amber-700 backdrop-blur transition-all duration-300 hover:scale-105 hover:bg-amber-50 hover:shadow-lg ${isLoaded ? 'animate-bounce' : ''}`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white">
                <Crown className="h-3.5 w-3.5" />
              </span>
              Premium Membership
              <span className="mx-1.5 h-1 w-1 rounded-full bg-amber-400" />
              Unlock exclusive benefits
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
              You're one step away from unlocking exclusive access to digital marketing education
              designed for the MENA region.
            </p>

            {/* Benefits List */}
            <ul className={`mt-6 space-y-3 ${isLoaded ? 'animate-fade-in-up' : ''}`}>
              {SUBSCRIPTION_BENEFITS.slice(0, 4).map((benefit) => (
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
                <div className="text-5xl font-bold text-neutral-900">
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

// Section 2: Testimonials Section
function TestimonialsSection({ isLoaded }: { isLoaded: boolean }) {
  return (
    <section
      className={`relative w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-white p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-8 ${isLoaded ? 'animate-fade-in' : ''}`}
    >
      {/* Background patterns */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute left-0 right-0 top-1/4 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />
        <div className="absolute left-0 right-0 top-3/4 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <span className="text-sm font-normal text-neutral-500">Testimonials</span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          What Our Members Say
        </h2>
      </div>

      {/* Desktop: 4 cards, Mobile: 3 cards (4th hidden) */}
      <div className="relative z-10 mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TESTIMONIALS.map((testimonial, index) => (
          <div
            key={testimonial.name}
            className={cn(
              'rounded-2xl border border-neutral-200 bg-white/80 p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
              index === 3 && 'hidden lg:block',
            )}
          >
            <div className="mb-4 aspect-square overflow-hidden rounded-xl bg-neutral-100">
              <img
                src={testimonial.image}
                alt={testimonial.name}
                className="h-full w-full object-cover"
              />
            </div>
            <p className="text-sm italic text-neutral-600">"{testimonial.quote}"</p>
            <div className="mt-3">
              <p className="font-medium text-neutral-900">{testimonial.name}</p>
              <p className="text-xs text-neutral-500">{testimonial.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Section 3: Premium Content Section
function PremiumContentSection({ isLoaded }: { isLoaded: boolean }) {
  return (
    <section
      className={`relative w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-neutral-50 p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-8 ${isLoaded ? 'animate-fade-in' : ''}`}
    >
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <span className="text-sm font-normal text-neutral-500">Premium Content</span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          What's Included in Premium
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          Access exclusive learning tracks and courses designed for MENA marketers
        </p>
      </div>

      <div className="relative z-10 mt-10 space-y-8">
        {PREMIUM_TRACKS.map((track, index) => (
          <div
            key={track.title}
            className={cn(
              'grid items-center gap-6 rounded-2xl border border-neutral-200 bg-white/80 p-6 backdrop-blur transition-all duration-300 hover:shadow-xl lg:grid-cols-2 lg:gap-10',
              index % 2 === 1 && 'lg:[&>*:first-child]:order-2',
            )}
          >
            {/* Text side */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900/80 text-white shadow ring-1 ring-white/10">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-neutral-900">
                    {track.title}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600">{track.description}</p>
                </div>
              </div>
              <ul className="space-y-2 pl-14">
                {track.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 text-sm text-neutral-700">
                    <Check className="h-4 w-4 shrink-0 text-[#05ef62]" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Image side */}
            <div className="aspect-video overflow-hidden rounded-xl bg-neutral-100">
              <img src={track.image} alt={track.title} className="h-full w-full object-cover" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Section 4: CTA Reminder Section
function CTASection({
  subscriptionInfo,
  selectedMethodId,
  onSubscribe,
  isPending,
}: {
  subscriptionInfo: { priceEgp?: number; discountPercent?: number } | undefined;
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
          Ready to Level Up Your Marketing Career?
        </h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-white/70">
          Join hundreds of marketers in the MENA region who are already learning from industry
          experts and growing their skills.
        </p>

        <div className="mt-6 inline-flex flex-wrap justify-center gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white/90 backdrop-blur">
            <Check className="h-3 w-3" />
            Free online events
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white/90 backdrop-blur">
            <Check className="h-3 w-3" />
            {subscriptionInfo?.discountPercent ?? 20}% off content
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white/90 backdrop-blur">
            <Check className="h-3 w-3" />
            Priority support
          </div>
        </div>

        <div className="mt-8">
          <Button
            onClick={onSubscribe}
            disabled={!selectedMethodId || isPending}
            className="group inline-flex transform items-center gap-2 rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-6 py-3.5 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Crown className="h-4 w-4" />
                Subscribe Now - {subscriptionInfo?.priceEgp ?? '---'} EGP/year
              </>
            )}
          </Button>
          {!selectedMethodId && (
            <p className="mt-2 text-xs text-white/50">
              Please select a payment method above to continue
            </p>
          )}
        </div>
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

  const { data: subscriptionInfo } = useSubscriptionInfo();
  const { data: pricePreview } = usePricePreview('subscription');
  const createCheckout = useCreateCheckout();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const goToPending = (payload: {
    invoiceId?: number;
    fawryCode?: string;
    meezaReference?: number;
    amanCode?: string;
    masaryCode?: string;
    paymentMethodId?: number | null;
  }) => {
    const params = new URLSearchParams();
    if (payload.invoiceId) params.set('invoice_id', String(payload.invoiceId));
    if (payload.fawryCode) params.set('fawry_code', payload.fawryCode);
    if (payload.meezaReference) params.set('meeza_reference', String(payload.meezaReference));
    if (payload.amanCode) params.set('aman_code', payload.amanCode);
    if (payload.masaryCode) params.set('masary_code', payload.masaryCode);
    params.set('item_type', 'subscription');
    if (payload.paymentMethodId) {
      params.set('method_id', String(payload.paymentMethodId));
    }
    const query = params.toString();
    navigate(`/payment/pending${query ? `?${query}` : ''}`);
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

    try {
      const result = await createCheckout.mutateAsync({
        itemType: 'subscription',
        paymentMethodId: selectedMethodId,
      });

      if (result.free) {
        navigate('/payment/success');
        return;
      }

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }

      if (
        result.invoiceId ||
        result.fawryCode ||
        result.meezaReference ||
        result.amanCode ||
        result.masaryCode
      ) {
        goToPending({
          invoiceId: result.invoiceId,
          fawryCode: result.fawryCode,
          meezaReference: result.meezaReference,
          amanCode: result.amanCode,
          masaryCode: result.masaryCode,
          paymentMethodId: selectedMethodId,
        });
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PENDING_PAYMENT') {
        const invoiceId = error.extra?.invoiceId as number | undefined;
        const fawryCode = error.extra?.fawryCode as string | undefined;
        const meezaReference = error.extra?.meezaReference as number | undefined;
        const amanCode = error.extra?.amanCode as string | undefined;
        const masaryCode = error.extra?.masaryCode as string | undefined;
        if (invoiceId || fawryCode || meezaReference || amanCode || masaryCode) {
          goToPending({
            invoiceId,
            fawryCode,
            meezaReference,
            amanCode,
            masaryCode,
            paymentMethodId: selectedMethodId,
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
    }
  };

  return (
    <div className="relative isolate overflow-hidden">
      {/* Gradient blobs - same as public page */}
      <div className="pointer-events-none absolute -left-[45vw] top-[-25vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/70 via-[#f4fff9]/40 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -right-[50vw] top-[30vh] -z-10 h-[50vh] w-[80vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[140px]" />

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

        {/* Section 2: Testimonials */}
        <TestimonialsSection isLoaded={isLoaded} />

        {/* Section 3: Premium Content */}
        <PremiumContentSection isLoaded={isLoaded} />

        {/* Section 4: CTA Reminder */}
        <CTASection
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
