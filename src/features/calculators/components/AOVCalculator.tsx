import { useId, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { CURRENCIES, type CurrencyCode, formatCurrency } from '../constants/currency';
import { shareToClipboard } from '../utils/clipboard';
import { showFeedbackToast } from '../utils/feedback';
import { CalculatorActionButtons, CalculatorFeedback } from './shared';

const AOVCalculator = () => {
  const [totalRevenue, setTotalRevenue] = useState<string>('');
  const [numberOfOrders, setNumberOfOrders] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const totalRevenueId = useId();
  const numberOfOrdersId = useId();

  const currentCurrency = CURRENCIES[currency];

  const calculateAOV = (): number | null => {
    const revenue = parseFloat(totalRevenue);
    const orders = parseFloat(numberOfOrders);
    if (Number.isNaN(revenue) || Number.isNaN(orders) || orders === 0) return null;
    return revenue / orders;
  };

  const aov = calculateAOV();

  const handleShare = () => {
    const text =
      aov !== null
        ? `My AOV: ${formatCurrency(aov, currency)} | Total Revenue: ${formatCurrency(parseFloat(totalRevenue) || 0, currency)} | Orders: ${parseInt(numberOfOrders, 10).toLocaleString()}`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setTotalRevenue('');
    setNumberOfOrders('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Column - Educational Content */}
        <div className="space-y-4 lg:space-y-6">
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-800 mb-4">
              What is AOV?: Average Order Value
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              AOV, or <strong className="text-neutral-800">Average Order Value</strong>, is a key
              eCommerce metric that measures{' '}
              <strong className="text-neutral-800">the average amount spent per transaction</strong>{' '}
              on your website or store.
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              Instead of chasing new customers, many businesses focus on increasing AOV to maximize
              revenue from existing traffic. According to Shopify, the{' '}
              <strong className="text-neutral-800">global AOV is approximately $145</strong> across
              all industries.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Why is AOV Important?
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">
                    Increases Revenue Without More Traffic:
                  </strong>{' '}
                  Higher AOV means more revenue per customer without additional acquisition costs
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Improves Profit Margins:</strong> Shipping a
                  $100 order costs the same as shipping a $140 order; the second is more profitable
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Offsets Rising Ad Costs:</strong> With CPCs
                  rising 15%+ on Meta and Google, higher AOV helps maintain ROAS
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Reveals Customer Behavior:</strong> Low AOV
                  may indicate pricing issues or missed upselling opportunities
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Calculate AOV: The Formula
            </h2>
            <p className="text-neutral-600 mb-4">The AOV formula is:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">AOV = Total Revenue ÷ Number of Orders</code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              For example, if your store generated{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency(2000, currency)} in revenue
              </span>{' '}
              from{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                100 orders
              </span>
              , your AOV is{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency(2000, currency)} ÷ 100 = {formatCurrency(20, currency)}
              </span>
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              This means on average, each customer spends{' '}
              <strong className="text-neutral-800">{formatCurrency(20, currency)} per order</strong>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Average AOV by Industry (2025)
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              AOV varies significantly by industry due to product price points and purchase
              behavior:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">Luxury & Jewelry:</strong> $300+ per order
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">B2B eCommerce:</strong> $400-$600+
                  (bulk/recurring)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">Electronics:</strong> $200-$350
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">Furniture & Home Decor:</strong> $150-$250
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">Apparel & Accessories:</strong> $40-$170
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">Beauty & Personal Care:</strong> $15-$90
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">Food & Beverage:</strong> $25-$50
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Source: Dynamic Yield, Shopify, Digital Web Solutions (2025). Global average AOV is
              ~$145 across all industries.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              7 Ways to Increase AOV
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Free Shipping Thresholds:</strong> Set 30%
                  above your current AOV (e.g., "$50 for free shipping")
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Product Bundles:</strong> Offer "complete the
                  look" or "starter kit" packages at a discount
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Upsells & Cross-sells:</strong> Recommend
                  complementary products during checkout
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Loyalty Programs:</strong> Reward higher
                  spending with points or exclusive perks
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">AI Recommendations:</strong> Personalized
                  suggestions can increase AOV by 30%+
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Tiered Discounts:</strong> "Spend $100, get
                  10% off" encourages larger carts
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Post-Purchase Upsells:</strong> Offer add-ons
                  immediately after checkout
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Pro Tip: Look Beyond the Mean
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              Marketing experts recommend analyzing not just the{' '}
              <strong className="text-neutral-800">mean</strong> (average), but also the{' '}
              <strong className="text-neutral-800">mode</strong> (most common order value). A few
              high-value orders can skew your average, hiding that most customers spend much less.
              Focus on improving the modal order value for sustainable gains.
            </p>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['aov']} className="w-full">
              {/* AOV Calculator Section */}
              <AccordionItem value="aov" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    Average Order Value (AOV)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-4 lg:space-y-6">
                    {/* Total Revenue Input */}
                    <div className="space-y-2">
                      <Label htmlFor={totalRevenueId} className="text-sm text-neutral-600">
                        Total revenue
                      </Label>
                      <div className="relative">
                        <Input
                          id={totalRevenueId}
                          type="number"
                          placeholder="0"
                          value={totalRevenue}
                          onChange={(e) => setTotalRevenue(e.target.value)}
                          className="pr-24 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2">
                          <Select
                            value={currency}
                            onValueChange={(value: CurrencyCode) => setCurrency(value)}
                          >
                            <SelectTrigger className="w-20 h-10 border-0 bg-transparent text-primary-green font-medium text-sm focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(CURRENCIES).map(([code, curr]) => (
                                <SelectItem key={code} value={code}>
                                  {curr.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Number of Orders Input */}
                    <div className="space-y-2">
                      <Label htmlFor={numberOfOrdersId} className="text-sm text-neutral-600">
                        Number of orders
                      </Label>
                      <div className="relative">
                        <Input
                          id={numberOfOrdersId}
                          type="number"
                          placeholder="0"
                          value={numberOfOrders}
                          onChange={(e) => setNumberOfOrders(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* AOV Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">AOV (Average Order Value)</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={aov !== null ? aov.toFixed(2) : ''}
                          placeholder="—"
                          className="pr-16 h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 font-semibold tabular-nums"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {aov !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          aov < 50
                            ? 'text-performance-loss'
                            : aov < 100
                              ? 'text-performance-breakeven'
                              : aov < 200
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {aov < 50 &&
                          'Low AOV. Consider bundles, upsells, or free shipping thresholds.'}
                        {aov >= 50 &&
                          aov < 100 &&
                          'Moderate AOV. Typical for apparel, beauty, or food industries.'}
                        {aov >= 100 && aov < 200 && 'Strong AOV. Above global average of $145.'}
                        {aov >= 200 && 'Excellent AOV. High-value products or effective upselling!'}
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          {/* Action Buttons */}
          <CalculatorActionButtons
            onShare={handleShare}
            onClear={handleClear}
            shareDisabled={aov === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default AOVCalculator;
