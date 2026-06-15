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

const LTVCACCalculator = () => {
  const [ltv, setLtv] = useState<string>('');
  const [cac, setCac] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const ltvId = useId();
  const cacId = useId();

  const currentCurrency = CURRENCIES[currency];

  // LTV:CAC Ratio = LTV / CAC
  const calculateLTVCACRatio = (): number | null => {
    const ltvValue = parseFloat(ltv);
    const cacValue = parseFloat(cac);
    if (Number.isNaN(ltvValue) || Number.isNaN(cacValue) || cacValue === 0) return null;
    return ltvValue / cacValue;
  };

  const ratio = calculateLTVCACRatio();

  const handleShare = () => {
    const text =
      ratio !== null
        ? `My LTV:CAC Ratio: ${ratio.toFixed(1)}:1 | LTV: ${formatCurrency(ltv, currency)} | CAC: ${formatCurrency(cac, currency)}`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setLtv('');
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
              What is LTV:CAC Ratio?
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              The LTV:CAC ratio measures{' '}
              <strong className="text-neutral-800">
                how much value a customer generates compared to the cost of acquiring them
              </strong>
              . It's the gold standard metric for evaluating unit economics health.
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              A ratio of <strong className="text-neutral-800">3:1</strong> means each customer
              generates 3x what you spent to acquire them, the widely accepted benchmark for
              sustainable growth. According to industry research, this ratio is one of the most
              scrutinized metrics by VCs and growth investors.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Why is LTV:CAC Ratio Important?
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Profitability Signal:</strong> Shows whether
                  customer acquisition is profitable at the unit level
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Investment Decisions:</strong> Guides how
                  much to invest in marketing and sales
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Scalability Check:</strong> High ratios
                  indicate room to scale; low ratios signal unit economics problems
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Fundraising Metric:</strong> Critical for
                  investor due diligence and company valuation
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Calculate LTV:CAC Ratio
            </h2>
            <p className="text-neutral-600 mb-4">The formula is straightforward:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">LTV:CAC Ratio = LTV / CAC</code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              For example, if your{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                LTV is {formatCurrency('1,500', currency)}
              </span>{' '}
              and your{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                CAC is {formatCurrency('500', currency)}
              </span>
              , your ratio is{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('1,500', currency)} / {formatCurrency('500', currency)} = 3:1
              </span>
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              LTV:CAC Ratio Benchmarks
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              Industry-standard benchmarks for interpreting your ratio:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">Below 1:1:</strong> Losing money on every
                  customer. Urgent action needed
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">1:1 to 2:1:</strong> Unprofitable after
                  overhead. Optimize LTV or reduce CAC
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">2:1 to 3:1:</strong> Break-even territory.
                  Getting close to healthy economics
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">3:1 to 5:1:</strong> Healthy. The gold
                  standard for sustainable growth
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">Above 5:1:</strong> Excellent, but may
                  indicate under-investment in growth
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Source: Industry benchmarks from Bessemer, a]16z, and growth equity standards
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Improve LTV:CAC Ratio
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              There are two levers to improve your ratio:
            </p>

            <h3 className="text-lg font-semibold text-neutral-800 mb-2">Increase LTV:</h3>
            <ul className="space-y-2 text-neutral-600 mb-4">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>Reduce churn through better onboarding and customer success</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>Increase ARPU via upsells, cross-sells, and premium tiers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>Improve gross margins by optimizing costs</span>
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-neutral-800 mb-2">Decrease CAC:</h3>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>Improve conversion rates across the funnel</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>Focus on organic channels (SEO, content, referrals)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>Optimize paid ad targeting and creative</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              When High Ratios May Be a Problem
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              While a high LTV:CAC ratio (above 5:1) sounds great, it can indicate{' '}
              <strong className="text-neutral-800">under-investment in growth</strong>. If your
              ratio is very high, you may be leaving market share on the table by not spending
              enough on customer acquisition.
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              The optimal strategy is often to invest more in marketing and sales until your ratio
              approaches the 3:1 to 5:1 sweet spot, maximizing growth while maintaining healthy unit
              economics.
            </p>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['ltv-cac']} className="w-full">
              <AccordionItem value="ltv-cac" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    LTV:CAC Ratio Calculator
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-4 lg:space-y-6">
                    {/* LTV Input */}
                    <div className="space-y-2">
                      <Label htmlFor={ltvId} className="text-sm text-neutral-600">
                        Customer lifetime value (LTV)
                      </Label>
                      <div className="relative">
                        <Input
                          id={ltvId}
                          type="number"
                          placeholder="0"
                          value={ltv}
                          onChange={(e) => setLtv(e.target.value)}
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

                    {/* CAC Input */}
                    <div className="space-y-2">
                      <Label htmlFor={cacId} className="text-sm text-neutral-600">
                        Customer acquisition cost (CAC)
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

                    {/* Ratio Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">LTV:CAC Ratio</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={ratio !== null ? `${ratio.toFixed(1)}:1` : '—'}
                          readOnly
                          className="h-11 lg:h-12 text-base bg-muted/50 font-medium border-neutral-200"
                        />
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {ratio !== null && (
                      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-100">
                        {ratio < 1 && (
                          <p className="text-performance-loss font-medium">
                            Below 1:1: You're losing money on every customer! Urgent action needed.
                          </p>
                        )}
                        {ratio >= 1 && ratio < 2 && (
                          <p className="text-performance-loss font-medium">
                            Between 1:1 and 2:1: Unprofitable after overhead. Focus on reducing CAC
                            or increasing LTV.
                          </p>
                        )}
                        {ratio >= 2 && ratio < 3 && (
                          <p className="text-performance-breakeven font-medium">
                            Between 2:1 and 3:1: Break-even territory. You're close to the 3:1
                            benchmark.
                          </p>
                        )}
                        {ratio >= 3 && ratio < 5 && (
                          <p className="text-performance-good font-medium">
                            Between 3:1 and 5:1: Healthy unit economics! You've hit the gold
                            standard.
                          </p>
                        )}
                        {ratio >= 5 && (
                          <p className="text-performance-excellent font-medium">
                            Above 5:1: Excellent! Consider investing more in growth to capture
                            market share.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Additional Context */}
                    {ratio !== null && (
                      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-100">
                        <p className="text-sm text-neutral-600">
                          <strong className="text-neutral-800">What this means:</strong> For every{' '}
                          {formatCurrency('1', currency)} spent acquiring customers, you generate{' '}
                          {formatCurrency(ratio.toFixed(2), currency)} in lifetime value.
                        </p>
                      </div>
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
            shareDisabled={ratio === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default LTVCACCalculator;
