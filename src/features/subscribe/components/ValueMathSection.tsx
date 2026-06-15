import { Calculator, Sparkles } from 'lucide-react';
import { PRICING, TOTAL_VALUE, VALUE_MATH_ITEMS } from '../content';

type ValueMathProps = {
  currentPrice?: number | null;
};

export function ValueMathSection({ currentPrice }: ValueMathProps) {
  const regularPrice = PRICING.regular;
  const displayPrice = currentPrice ?? 3000;
  const valueRatio = displayPrice > 0 ? (TOTAL_VALUE / displayPrice).toFixed(1) : '3.3';
  const monthlyPrice = displayPrice > 0 ? Math.round(displayPrice / 12) : 250;

  return (
    <section className="relative w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-white p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-8">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <span className="text-sm font-normal text-neutral-500">The Value Equation</span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          The Numbers Don't Lie
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          Here's what you're actually getting with premium membership
        </p>
      </div>

      <div className="relative z-10 mt-10 grid gap-8 lg:grid-cols-2">
        {/* Value breakdown */}
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="h-5 w-5 text-neutral-500" />
            <h3 className="text-lg font-semibold text-neutral-900">What You're Getting</h3>
          </div>

          <div className="space-y-0">
            {VALUE_MATH_ITEMS.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-3 border-b border-neutral-200 last:border-0"
              >
                <span className="text-sm text-neutral-700 pr-4">{item.label}</span>
                <span className="text-sm font-semibold text-neutral-900 whitespace-nowrap">
                  {item.value.toLocaleString()} EGP
                </span>
              </div>
            ))}
          </div>

          {/* Total row */}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-100 to-amber-50 px-4 py-4">
            <span className="text-base font-bold text-neutral-900">TOTAL VALUE</span>
            <span className="text-2xl font-bold text-amber-600">
              {TOTAL_VALUE.toLocaleString()}+ EGP
            </span>
          </div>
        </div>

        {/* Investment card */}
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-neutral-900">Your Investment</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-neutral-600">Regular Price</span>
                <span className="text-xl text-neutral-400 line-through">
                  {regularPrice.toLocaleString()} EGP/year
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-amber-200">
                <span className="text-base font-semibold text-amber-700">
                  Founding Member Price
                </span>
                <span className="text-lg font-bold text-amber-600">
                  {displayPrice.toLocaleString()} EGP/year
                </span>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-white/80 p-4 border border-amber-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Value-to-Price Ratio</span>
                <span className="text-lg font-bold text-[#05ef62]">{valueRatio}x value</span>
              </div>
            </div>
          </div>

          {/* Monthly breakdown */}
          <div className="rounded-xl bg-neutral-900 p-6 text-center">
            <p className="text-sm text-white/70 mb-2">Monthly Breakdown</p>
            <p className="text-3xl font-bold text-white">
              {monthlyPrice.toLocaleString()} EGP
              <span className="text-lg font-normal text-white/60">/month</span>
            </p>
            <p className="mt-2 text-sm text-white/50">That's approximately $8 USD/month</p>
          </div>
        </div>
      </div>
    </section>
  );
}
