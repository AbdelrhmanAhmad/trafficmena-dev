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

const LTVCalculator = () => {
  const [aov, setAov] = useState<string>('');
  const [purchaseFrequency, setPurchaseFrequency] = useState<string>('');
  const [grossMargin, setGrossMargin] = useState<string>('');
  const [cac, setCac] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const aovId = useId();
  const purchaseFrequencyId = useId();
  const grossMarginId = useId();
  const cacId = useId();

  const currentCurrency = CURRENCIES[currency];

  const calculateLTV = (): number | null => {
    const avgOrderValue = parseFloat(aov);
    const frequency = parseFloat(purchaseFrequency);
    const margin = parseFloat(grossMargin);
    if (Number.isNaN(avgOrderValue) || Number.isNaN(frequency) || Number.isNaN(margin)) return null;
    return avgOrderValue * frequency * (margin / 100);
  };

  const calculateLTVtoCACRatio = (): number | null => {
    const ltv = calculateLTV();
    const cacValue = parseFloat(cac);
    if (ltv === null || Number.isNaN(cacValue) || cacValue === 0) return null;
    return ltv / cacValue;
  };

  const ltv = calculateLTV();
  const ltvCacRatio = calculateLTVtoCACRatio();

  const handleShare = () => {
    const text =
      ltv !== null
        ? `My Ecommerce LTV: ${formatCurrency(ltv.toFixed(2), currency)} | AOV: ${formatCurrency(aov, currency)} | Purchases/Customer: ${purchaseFrequency} | Gross Margin: ${grossMargin}%${ltvCacRatio !== null ? ` | LTV:CAC Ratio: ${ltvCacRatio.toFixed(1)}:1` : ''}`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setAov('');
    setPurchaseFrequency('');
    setGrossMargin('');
    setCac('');
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
              What is Ecommerce LTV?: Customer Lifetime Value
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              LTV (or CLV), <strong className="text-neutral-800">Customer Lifetime Value</strong>,
              measures{' '}
              <strong className="text-neutral-800">
                the total profit a customer generates over their entire relationship with your
                business
              </strong>
              .
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              Unlike revenue-focused metrics, this simplified eCommerce LTV formula factors in{' '}
              <strong className="text-neutral-800">gross margin</strong> to show actual profit
              contribution. According to Shopify, a good{' '}
              <strong className="text-neutral-800">LTV:CAC ratio is 3:1</strong>, meaning each
              customer should generate 3x what you spent to acquire them.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Why is LTV Important?
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Sets Acquisition Budgets:</strong> Knowing
                  LTV tells you how much you can profitably spend to acquire customers
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Identifies Valuable Segments:</strong> Find
                  which customer groups generate the most long-term profit
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Drives Retention Focus:</strong> Retained
                  customers buy more often and spend more than new ones
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Informs Pricing Strategy:</strong> Understand
                  perceived value to optimize product pricing
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Calculate Ecommerce LTV: The Formula
            </h2>
            <p className="text-neutral-600 mb-4">The simplified eCommerce LTV formula is:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">
                LTV = AOV × Purchases per Customer × Gross Margin %
              </code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              For example, if your{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                AOV is {formatCurrency('50', currency)}
              </span>
              , customers make{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                6 purchases
              </span>{' '}
              over their lifetime, with a{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                40% gross margin
              </span>
              , your LTV is{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('50', currency)} × 6 × 0.40 = {formatCurrency('120', currency)}
              </span>
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              Each customer generates{' '}
              <strong className="text-neutral-800">
                {formatCurrency('120', currency)} in gross profit
              </strong>{' '}
              over their lifetime.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              LTV:CAC Ratio Benchmarks
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              The LTV:CAC ratio shows if your customer acquisition is profitable:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">Below 2:1:</strong> Unprofitable. Spending
                  too much to acquire customers
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">2:1 to 3:1:</strong> Break-even territory.
                  Optimize LTV or reduce CAC
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">3:1 to 4:1:</strong> Ideal balance.
                  Profitable and sustainable growth
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">Above 5:1:</strong> Opportunity to scale.
                  Consider investing more in marketing
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Source: TrueProfit, Shopify (2025). A ratio above 5:1 may indicate under-investment in
              growth.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Increase LTV
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Increase AOV:</strong> Use bundles, upsells,
                  and free shipping thresholds
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Boost Purchase Frequency:</strong> Email
                  marketing, subscriptions, and loyalty programs
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Improve Retention:</strong> Better
                  onboarding, customer service, and personalization
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Optimize Margins:</strong> Reduce COGS,
                  negotiate supplier deals, or adjust pricing
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              RFM Analysis for Segmentation
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              Shopify recommends using <strong className="text-neutral-800">RFM analysis</strong>{' '}
              (Recency, Frequency, Monetary) to segment customers by value. This helps identify your
              most valuable segments:
            </p>
            <ul className="space-y-2 text-neutral-600 mt-4">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Recency:</strong> When did they last
                  purchase?
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Frequency:</strong> How often do they buy?
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Monetary:</strong> How much have they spent?
                </span>
              </li>
            </ul>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['ltv']} className="w-full">
              {/* LTV Calculator Section */}
              <AccordionItem value="ltv" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    Ecommerce LTV (Customer Lifetime Value)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-4 lg:space-y-6">
                    {/* AOV Input */}
                    <div className="space-y-2">
                      <Label htmlFor={aovId} className="text-sm text-neutral-600">
                        Average order value (AOV)
                      </Label>
                      <div className="relative">
                        <Input
                          id={aovId}
                          type="number"
                          placeholder="0"
                          value={aov}
                          onChange={(e) => setAov(e.target.value)}
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

                    {/* Purchase Frequency Input */}
                    <div className="space-y-2">
                      <Label htmlFor={purchaseFrequencyId} className="text-sm text-neutral-600">
                        Purchases per customer (lifetime)
                      </Label>
                      <div className="relative">
                        <Input
                          id={purchaseFrequencyId}
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={purchaseFrequency}
                          onChange={(e) => setPurchaseFrequency(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* Gross Margin Input */}
                    <div className="space-y-2">
                      <Label htmlFor={grossMarginId} className="text-sm text-neutral-600">
                        Gross margin (%)
                      </Label>
                      <div className="relative">
                        <Input
                          id={grossMarginId}
                          type="number"
                          placeholder="0"
                          value={grossMargin}
                          onChange={(e) => setGrossMargin(e.target.value)}
                          className="pr-10 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    {/* CAC Input (Optional) */}
                    <div className="space-y-2">
                      <Label htmlFor={cacId} className="text-sm text-neutral-600">
                        Customer acquisition cost (optional, for ratio)
                      </Label>
                      <div className="relative">
                        <Input
                          id={cacId}
                          type="number"
                          placeholder="0"
                          value={cac}
                          onChange={(e) => setCac(e.target.value)}
                          className="pr-16 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* LTV Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">
                        LTV (Customer Lifetime Value)
                      </Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={ltv !== null ? ltv.toFixed(2) : ''}
                          placeholder="—"
                          className="pr-16 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* LTV:CAC Ratio Output */}
                    {ltvCacRatio !== null && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">LTV:CAC Ratio</Label>
                        <div className="relative">
                          <Input
                            readOnly
                            value={`${ltvCacRatio.toFixed(1)}:1`}
                            className={`h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200 ${
                              ltvCacRatio >= 3
                                ? 'text-performance-good'
                                : ltvCacRatio >= 2
                                  ? 'text-performance-breakeven'
                                  : 'text-performance-loss'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    {/* Performance Indicator */}
                    {ltv !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          ltv < 50
                            ? 'text-performance-loss'
                            : ltv < 150
                              ? 'text-performance-breakeven'
                              : ltv < 500
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {ltv < 50 && 'Low LTV. Focus on increasing AOV, frequency, or margins.'}
                        {ltv >= 50 &&
                          ltv < 150 &&
                          'Moderate LTV. Typical for lower-price products.'}
                        {ltv >= 150 && ltv < 500 && 'Strong LTV. Healthy customer lifetime profit.'}
                        {ltv >= 500 && 'Excellent LTV. High-value customer relationships!'}
                      </p>
                    )}

                    {ltvCacRatio !== null && (
                      <p
                        className={`text-sm ${
                          ltvCacRatio < 2
                            ? 'text-performance-loss'
                            : ltvCacRatio < 3
                              ? 'text-performance-breakeven'
                              : ltvCacRatio < 5
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {ltvCacRatio < 2 &&
                          'Ratio below 2:1: unprofitable acquisition, reduce CAC or boost LTV.'}
                        {ltvCacRatio >= 2 &&
                          ltvCacRatio < 3 &&
                          'Ratio below 3:1: room for optimization.'}
                        {ltvCacRatio >= 3 &&
                          ltvCacRatio < 5 &&
                          'Ideal 3:1+ ratio: profitable and sustainable.'}
                        {ltvCacRatio >= 5 && 'Ratio above 5:1: consider scaling marketing spend!'}
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
            shareDisabled={ltv === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default LTVCalculator;
