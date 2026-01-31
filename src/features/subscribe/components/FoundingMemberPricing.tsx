import { Check, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { FOUNDING_MEMBER_COPY, PRICING } from '../content';

type FoundingMemberPricingProps = {
  priceEgp?: number | null;
  onSubscribe: () => void;
  isPending?: boolean;
};

export function FoundingMemberPricing({
  priceEgp,
  onSubscribe,
  isPending = false,
}: FoundingMemberPricingProps) {
  const regularPrice = PRICING.regular;
  const displayPrice = priceEgp ?? 3000;
  const savings = Math.round(((regularPrice - displayPrice) / regularPrice) * 100);

  return (
    <section className="relative w-full overflow-hidden rounded-[28px]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-amber-50/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-100/50 via-transparent to-transparent" />

      <div className="relative px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-800">
            <Crown className="h-4 w-4" />
            {FOUNDING_MEMBER_COPY.badge}
            <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
              {savings}% OFF
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            {FOUNDING_MEMBER_COPY.headline}
          </h2>

          {/* Pricing */}
          <div className="mt-8 flex flex-col items-center">
            <div className="text-4xl font-medium text-neutral-400 line-through sm:text-5xl">
              {regularPrice.toLocaleString()} EGP/year
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-amber-600 sm:text-4xl">
                {priceEgp !== null && priceEgp !== undefined ? priceEgp.toLocaleString() : '---'}
              </span>
              <span className="text-lg text-neutral-600">EGP/year</span>
            </div>
            <div className="mt-2 text-sm text-neutral-500">
              {displayPrice > 0 ? Math.round(displayPrice / 12).toLocaleString() : '---'} EGP/month
            </div>
          </div>

          {/* CTA Button */}
          <div className="mt-8">
            <Button
              onClick={onSubscribe}
              disabled={isPending}
              className="group w-full max-w-md transform rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-8 py-4 text-base font-semibold text-[#101010] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-5 w-5" />
                  Become a Founding Member
                </>
              )}
            </Button>
          </div>

          {/* Features */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {FOUNDING_MEMBER_COPY.features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm text-neutral-700 shadow-sm border border-neutral-100"
              >
                <Check className="h-4 w-4 text-[#05ef62]" />
                {feature}
              </div>
            ))}
          </div>

          {/* Description */}
          <p className="mt-8 mx-auto max-w-xl text-sm text-neutral-600 leading-relaxed">
            {FOUNDING_MEMBER_COPY.description}
          </p>
        </div>
      </div>
    </section>
  );
}
