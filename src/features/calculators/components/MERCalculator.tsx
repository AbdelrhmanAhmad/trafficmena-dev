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

const MERCalculator = () => {
  const [totalRevenue, setTotalRevenue] = useState<string>('');
  const [totalMarketingSpend, setTotalMarketingSpend] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const totalRevenueId = useId();
  const totalMarketingSpendId = useId();

  const currentCurrency = CURRENCIES[currency];

  const calculateMER = (): number | null => {
    const revenue = parseFloat(totalRevenue);
    const spend = parseFloat(totalMarketingSpend);
    if (Number.isNaN(revenue) || Number.isNaN(spend) || spend === 0) return null;
    return revenue / spend;
  };

  const calculateMERPercentage = (): number | null => {
    const mer = calculateMER();
    if (mer === null) return null;
    return mer * 100;
  };

  const calculateSpendAsPercentOfRevenue = (): number | null => {
    const revenue = parseFloat(totalRevenue);
    const spend = parseFloat(totalMarketingSpend);
    if (Number.isNaN(revenue) || Number.isNaN(spend) || revenue === 0) return null;
    return (spend / revenue) * 100;
  };

  const mer = calculateMER();
  const merPercentage = calculateMERPercentage();
  const spendPercent = calculateSpendAsPercentOfRevenue();

  const handleShare = () => {
    const text =
      mer !== null
        ? `My MER: ${mer.toFixed(2)}x (${merPercentage?.toFixed(0)}%) | Revenue: ${formatCurrency(totalRevenue, currency)} | Marketing Spend: ${formatCurrency(totalMarketingSpend, currency)}`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setTotalRevenue('');
    setTotalMarketingSpend('');
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
              What is MER?: Marketing Efficiency Ratio
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              Marketing Efficiency Ratio (MER), also known as{' '}
              <strong className="text-neutral-800">Blended ROAS</strong> or{' '}
              <strong className="text-neutral-800">Ecosystem ROAS</strong>, measures{' '}
              <strong className="text-neutral-800">
                how many dollars in revenue your business generates for every $1 spent on marketing
              </strong>
              , regardless of which platform or channel drove the conversion.
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              Unlike channel-specific ROAS, MER gives you a{' '}
              <strong className="text-neutral-800">
                holistic, big-picture view of your entire marketing performance
              </strong>{' '}
              across all channels combined.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              MER vs ROAS: What's the Difference?
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">ROAS</strong> is channel-specific and
                  attribution-dependent (e.g., Facebook ROAS, Google ROAS)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">MER</strong> includes ALL revenue regardless
                  of attribution and ALL marketing costs
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  MER accounts for the full marketing ecosystem including team salaries, software,
                  agencies, and creative costs
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Calculate MER: The Formula
            </h2>
            <p className="text-neutral-600 mb-4">The MER formula is:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">MER = Total Revenue / Total Marketing Spend</code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              For example, if your business generated{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('300,000', currency)}
              </span>{' '}
              in revenue and spent{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('100,000', currency)}
              </span>{' '}
              on all marketing efforts, your MER is{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('300,000', currency)} / {formatCurrency('100,000', currency)} = 3.0x
                (or 300%)
              </span>
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              This means you generate{' '}
              <strong className="text-neutral-800">
                $3 in revenue for every $1 spent on marketing
              </strong>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              What's Included in Total Marketing Spend?
            </h2>
            <p className="text-neutral-600 mb-3">
              For accurate MER calculation, include all marketing-related costs:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span>
                Ad spend across all platforms
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span>
                Marketing team salaries
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span>
                Agency fees
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span>
                Creative production costs
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span>
                Software & tool subscriptions
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span>
                Market research
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              What is a Good MER?
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              A "good" MER varies by industry, but as a rule of thumb:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">Below 2x:</strong> Difficult to be profitable
                  (spending 50%+ of revenue)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">2x - 3x:</strong> Acceptable, room for
                  improvement
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">3x - 5x:</strong> Good efficiency (spending
                  20-33% of revenue)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">5x+:</strong> Excellent efficiency
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Industry benchmarks (2025): Apparel 2.8x, Health & Wellness 2.0x, Food & Beverage
              2.1x, Electronics 2.4x, Pets 1.9x
            </p>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['mer']} className="w-full">
              {/* MER Calculator Section */}
              <AccordionItem value="mer" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    Marketing Efficiency Ratio (MER)
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

                    {/* Total Marketing Spend Input */}
                    <div className="space-y-2">
                      <Label htmlFor={totalMarketingSpendId} className="text-sm text-neutral-600">
                        Total marketing spend
                      </Label>
                      <div className="relative">
                        <Input
                          id={totalMarketingSpendId}
                          type="number"
                          placeholder="0"
                          value={totalMarketingSpend}
                          onChange={(e) => setTotalMarketingSpend(e.target.value)}
                          className="pr-16 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-green font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* MER Output - Ratio */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">MER (Ratio)</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={mer !== null ? `${mer.toFixed(2)}x` : ''}
                          placeholder="—"
                          className="h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                      </div>
                    </div>

                    {/* MER Output - Percentage */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">MER (Percentage)</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={merPercentage !== null ? merPercentage.toFixed(0) : ''}
                          placeholder="—"
                          className="pr-12 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Spend as % of Revenue */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">
                        Marketing spend as % of revenue
                      </Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={spendPercent !== null ? spendPercent.toFixed(1) : ''}
                          placeholder="—"
                          className="pr-12 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {mer !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          mer < 2
                            ? 'text-performance-loss'
                            : mer < 3
                              ? 'text-performance-breakeven'
                              : mer < 5
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {mer < 2 &&
                          "Low efficiency. You're spending over 50% of revenue on marketing."}
                        {mer >= 2 && mer < 3 && 'Acceptable efficiency. Room for improvement.'}
                        {mer >= 3 && mer < 5 && 'Good marketing efficiency!'}
                        {mer >= 5 && 'Excellent marketing efficiency!'}
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
            shareDisabled={mer === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default MERCalculator;
