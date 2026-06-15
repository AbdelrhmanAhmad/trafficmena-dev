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

const CACCalculator = () => {
  const [totalSpend, setTotalSpend] = useState<string>('');
  const [customersAcquired, setCustomersAcquired] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const totalSpendId = useId();
  const customersAcquiredId = useId();

  const currentCurrency = CURRENCIES[currency];

  const calculateCAC = (): number | null => {
    const spend = parseFloat(totalSpend);
    const customers = parseFloat(customersAcquired);
    if (Number.isNaN(spend) || Number.isNaN(customers) || customers === 0) return null;
    return spend / customers;
  };

  const cac = calculateCAC();

  const handleShare = () => {
    const text =
      cac !== null
        ? `My CAC: ${formatCurrency(cac.toFixed(2), currency)} | Total Spend: ${formatCurrency(totalSpend, currency)} | Customers Acquired: ${parseInt(customersAcquired, 10).toLocaleString()}`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setTotalSpend('');
    setCustomersAcquired('');
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
              What is CAC?: Customer Acquisition Cost
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              CAC, or <strong className="text-neutral-800">Customer Acquisition Cost</strong>, is a
              business metric that measures{' '}
              <strong className="text-neutral-800">
                the total cost of acquiring a new customer
              </strong>
              , including all marketing and sales expenses.
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              CAC is one of the most critical metrics for evaluating marketing efficiency and
              business sustainability. When combined with{' '}
              <strong className="text-neutral-800">Customer Lifetime Value (LTV)</strong>, it
              reveals whether your customer acquisition strategy is profitable.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Why is CAC Important?
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Measures Marketing ROI:</strong> Shows how
                  efficiently you convert marketing spend into customers
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Informs Budget Decisions:</strong> Helps
                  allocate resources to the most cost-effective channels
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Determines Profitability:</strong> When
                  compared to LTV, reveals if customers are worth acquiring
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Benchmarks Performance:</strong> Compare
                  against industry standards to assess competitiveness
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Calculate CAC: The Formula
            </h2>
            <p className="text-neutral-600 mb-4">The CAC formula is:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">
                CAC = Total Sales & Marketing Spend ÷ Number of New Customers
              </code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              For example, if you spent{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('10,000', currency)}
              </span>{' '}
              on marketing and sales and acquired{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                100 new customers
              </span>
              , your CAC is{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('10,000', currency)} ÷ 100 = {formatCurrency('100', currency)}
              </span>
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              This means it costs you{' '}
              <strong className="text-neutral-800">
                {formatCurrency('100', currency)} to acquire each new customer
              </strong>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              What is a Good CAC?
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              A "good" CAC depends on your industry and Customer Lifetime Value (LTV). The ideal{' '}
              <strong className="text-neutral-800">LTV:CAC ratio is 3:1 or higher</strong>, meaning
              each customer should generate at least 3x what you spent to acquire them.
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">LTV:CAC below 1:1:</strong> Losing money on
                  each customer
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">LTV:CAC 1:1 to 2:1:</strong> Barely breaking
                  even
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">LTV:CAC 3:1:</strong> Healthy, sustainable
                  business
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">LTV:CAC 4:1+:</strong> Excellent efficiency
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Average CAC by Industry (2025)
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              CAC varies dramatically across industries based on competition, sales cycle, and deal
              size:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">eCommerce:</strong> $70-$86 average
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">B2B SaaS:</strong> $239-$702 average
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">B2B Companies:</strong> $536 average
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">Financial Services:</strong> $784 average
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">Legal Services:</strong> $749 average
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">Fintech SaaS:</strong> $1,450 average
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">Education:</strong> $1,143 average
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Source: First Page Sage B2B CAC Benchmarks (2025). Organic channels typically have
              40-60% lower CAC than paid channels.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Lower Your CAC
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Invest in Organic Channels:</strong> SEO and
                  content marketing have 40-60% lower CAC than paid ads
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Optimize Conversion Funnels:</strong> Improve
                  landing pages and reduce friction in the buying process
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Implement Referral Programs:</strong>{' '}
                  Leverage word-of-mouth to acquire customers at lower cost
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Improve Targeting:</strong> Focus on
                  high-intent audiences to increase conversion rates
                </span>
              </li>
            </ul>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['cac']} className="w-full">
              {/* CAC Calculator Section */}
              <AccordionItem value="cac" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    Customer Acquisition Cost (CAC)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-4 lg:space-y-6">
                    {/* Total Spend Input */}
                    <div className="space-y-2">
                      <Label htmlFor={totalSpendId} className="text-sm text-neutral-600">
                        Total sales & marketing spend
                      </Label>
                      <div className="relative">
                        <Input
                          id={totalSpendId}
                          type="number"
                          placeholder="0"
                          value={totalSpend}
                          onChange={(e) => setTotalSpend(e.target.value)}
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

                    {/* Customers Acquired Input */}
                    <div className="space-y-2">
                      <Label htmlFor={customersAcquiredId} className="text-sm text-neutral-600">
                        Number of new customers acquired
                      </Label>
                      <div className="relative">
                        <Input
                          id={customersAcquiredId}
                          type="number"
                          placeholder="0"
                          value={customersAcquired}
                          onChange={(e) => setCustomersAcquired(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* CAC Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">
                        CAC (Customer Acquisition Cost)
                      </Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={cac !== null ? cac.toFixed(2) : ''}
                          placeholder="—"
                          className="pr-16 h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 font-semibold tabular-nums"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {cac !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          cac > 1000
                            ? 'text-performance-loss'
                            : cac > 500
                              ? 'text-performance-breakeven'
                              : cac > 100
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {cac > 1000 && 'High CAC. Ensure your LTV justifies this acquisition cost.'}
                        {cac > 500 &&
                          cac <= 1000 &&
                          'Above average CAC. Typical for B2B and SaaS industries.'}
                        {cac > 100 &&
                          cac <= 500 &&
                          'Reasonable CAC. Competitive for most industries.'}
                        {cac <= 100 && 'Excellent CAC. Very efficient customer acquisition!'}
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          <CalculatorActionButtons
            onShare={handleShare}
            onClear={handleClear}
            shareDisabled={cac === null}
          />

          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default CACCalculator;
