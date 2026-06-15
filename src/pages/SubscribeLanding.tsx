import { Check, Crown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSubscriptionInfo } from '@/app/hooks/useSubscriptions';
import {
  ComparisonTable,
  DifferentiationSection,
  FAQSection,
  FoundingMemberPricing,
  ROISection,
  TrackDetailsSection,
  ValueMathSection,
  VideoReviewsSection,
} from '@/features/subscribe/components';
import { FINAL_CTA_COPY, HERO_BENEFITS, PRICING } from '@/features/subscribe/content';
import Layout from '@/shared/components/layout/Layout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/shared/context/AuthContext';
import {
  generateSubscriptionSignupUrl,
  storePendingSubscriptionContext,
} from '@/shared/utils/subscriptionRedirectUtils';

// Section 1: Hero Section
function HeroSection({
  subscriptionInfo,
  onSubscribe,
  isLoaded,
}: {
  subscriptionInfo: { priceEgp?: number | null; discountPercent?: number } | undefined;
  onSubscribe: () => void;
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
              Become the Marketer Everyone Wants to Hire
            </div>

            {/* Headline */}
            <h1
              className={`text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl ${isLoaded ? 'animate-fade-in-up' : ''}`}
            >
              Your Fast Track to Becoming the Expert Others Turn To
            </h1>

            <p
              className={`mt-5 max-w-lg text-base leading-relaxed text-neutral-700 ${isLoaded ? 'animate-fade-in-up' : ''}`}
            >
              Premium gives you advanced knowledge and exclusive resources: expert-led tracks,
              done-for-you playbooks, and a community of 1,250+ MENA marketers who push you forward.
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

        {/* Right column - Pricing Card */}
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
                  {subscriptionInfo?.priceEgp ?? '---'}{' '}
                  <span className="text-lg font-medium text-neutral-500">EGP</span>
                </div>
                <p className="mt-1 text-neutral-500">per year</p>
              </div>

              <ul className="mb-6 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-500" />
                  Content + Performance Tracks
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-500" />
                  Exclusive playbooks & templates
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-500" />
                  24 expert sessions per year
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-500" />
                  All future tracks included
                </li>
              </ul>

              <Button
                onClick={onSubscribe}
                className="group w-full transform rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-6 py-3.5 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-xl active:scale-95"
              >
                <Crown className="mr-2 h-4 w-4" />
                Become a Member
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

// Final CTA Section
function FinalCTASection({
  subscriptionInfo,
  onSubscribe,
}: {
  subscriptionInfo: { priceEgp?: number | null; discountPercent?: number } | undefined;
  onSubscribe: () => void;
}) {
  return (
    <section className="relative w-full overflow-hidden rounded-[28px] content-visibility-auto">
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
            className="group inline-flex max-w-full transform items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-8 py-4 text-base font-semibold text-[#101010] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:brightness-95 whitespace-normal text-center"
          >
            <Crown className="h-5 w-5 shrink-0" />
            <span>Become a Founding Member: {subscriptionInfo?.priceEgp ?? '---'} EGP/year</span>
          </Button>
        </div>

        <p className="mt-6 text-sm text-white/50">
          {FINAL_CTA_COPY.secondaryText}{' '}
          <Link
            to={FINAL_CTA_COPY.secondaryLinkHref}
            className="text-white/70 underline hover:text-white"
          >
            {FINAL_CTA_COPY.secondaryLink}
          </Link>{' '}
          {FINAL_CTA_COPY.secondaryLinkSuffix}
        </p>
      </div>
    </section>
  );
}

// Main component
export default function SubscribeLanding() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: subscriptionInfo } = useSubscriptionInfo();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard/subscribe');
    }
  }, [loading, user, navigate]);

  const handleSubscribeClick = () => {
    if (user) {
      navigate('/dashboard/subscribe');
      return;
    }
    storePendingSubscriptionContext('/dashboard/subscribe');
    navigate(generateSubscriptionSignupUrl());
  };

  if (user) {
    return null;
  }

  return (
    <Layout>
      <div className="relative isolate overflow-hidden">
        {/* Gradient blobs - same as Index.tsx */}
        <div className="pointer-events-none absolute -left-[45vw] top-[-25vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/70 via-[#f4fff9]/40 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -right-[50vw] top-[30vh] -z-10 h-[50vh] w-[80vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[90px]" />

        <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 pb-20 pt-12 sm:px-6 lg:px-0">
          {/* Section 1: Hero */}
          <HeroSection
            subscriptionInfo={subscriptionInfo}
            onSubscribe={handleSubscribeClick}
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

          {/* Section 8: Founding Member Pricing */}
          <FoundingMemberPricing
            priceEgp={subscriptionInfo?.priceEgp}
            onSubscribe={handleSubscribeClick}
          />

          {/* Section 9: FAQ */}
          <FAQSection />

          {/* Section 10: Final CTA */}
          <FinalCTASection subscriptionInfo={subscriptionInfo} onSubscribe={handleSubscribeClick} />
        </div>
      </div>
    </Layout>
  );
}
