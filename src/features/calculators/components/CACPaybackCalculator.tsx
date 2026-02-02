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

const CACPaybackCalculator = () => {
  const [cac, setCac] = useState<string>('');
  const [monthlyRevenue, setMonthlyRevenue] = useState<string>('');
  const [grossMargin, setGrossMargin] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const cacId = useId();
  const monthlyRevenueId = useId();
  const grossMarginId = useId();

  const currentCurrency = CURRENCIES[currency];

  // CAC Payback = CAC / (Monthly Revenue × Gross Margin %)
  const calculatePaybackPeriod = (): number | null => {
    const cacValue = parseFloat(cac);
    const revenue = parseFloat(monthlyRevenue);
    const margin = parseFloat(grossMargin);
    if (
      Number.isNaN(cacValue) ||
      Number.isNaN(revenue) ||
      Number.isNaN(margin) ||
      revenue === 0 ||
      margin === 0
    )
      return null;
    const monthlyGrossProfit = revenue * (margin / 100);
    if (monthlyGrossProfit === 0) return null;
    return cacValue / monthlyGrossProfit;
  };

  const calculateMonthlyGrossProfit = (): number | null => {
    const revenue = parseFloat(monthlyRevenue);
    const margin = parseFloat(grossMargin);
    if (Number.isNaN(revenue) || Number.isNaN(margin)) return null;
    return revenue * (margin / 100);
  };

  const paybackPeriod = calculatePaybackPeriod();
  const monthlyGrossProfit = calculateMonthlyGrossProfit();

  const handleShare = () => {
    const text =
      paybackPeriod !== null
        ? `My CAC Payback Period: ${paybackPeriod.toFixed(1)} months | CAC: ${formatCurrency(cac, currency)} | Monthly Revenue: ${formatCurrency(monthlyRevenue, currency)} | Gross Margin: ${grossMargin}%`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setCac('');
    setMonthlyRevenue('');
    setGrossMargin('');
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
            <h2 className="text-xl lg:text-2xl font-semibold text-neutral-800 mb-4">
              What is CAC Payback Period?
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              CAC Payback Period measures{' '}
              <strong className="text-neutral-800">
                how many months it takes to recover the cost of acquiring a customer
              </strong>
              . It's a critical cash flow metric that shows how quickly your acquisition investment
              turns profitable.
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              Unlike LTV:CAC ratio which shows total value, payback period focuses on{' '}
              <strong className="text-neutral-800">time to breakeven</strong>. A shorter payback
              means faster reinvestment in growth. According to Bessemer Venture Partners, the
              benchmark is <strong className="text-neutral-800">12 months or less</strong> for
              healthy SaaS companies.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Why is CAC Payback Important?
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Cash Flow Management:</strong> Shows how long
                  capital is tied up before generating profit
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Growth Sustainability:</strong> Shorter
                  payback means faster reinvestment cycles
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Runway Planning:</strong> Critical for
                  startups to understand burn rate implications
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Investor Metric:</strong> VCs closely monitor
                  this alongside LTV:CAC for funding decisions
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Calculate CAC Payback Period
            </h2>
            <p className="text-neutral-600 mb-4">The formula is:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">
                CAC Payback = CAC / (Monthly Revenue × Gross Margin %)
              </code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              For example, if your{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                CAC is {formatCurrency('600', currency)}
              </span>
              , with{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('100', currency)}/month revenue
              </span>{' '}
              and{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                80% gross margin
              </span>
              , your payback is{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('600', currency)} / ({formatCurrency('100', currency)} × 0.80) = 7.5
                months
              </span>
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              CAC Payback Benchmarks
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              Industry benchmarks from Bessemer, OpenView, and SaaS Capital (2024-2025):
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">&lt;6 months:</strong> Excellent. Very
                  efficient acquisition, consider scaling faster
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">6-12 months:</strong> Good. Healthy for most
                  SaaS companies
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">12-18 months:</strong> Acceptable for
                  enterprise. Needs optimization for SMB
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">&gt;18 months:</strong> Warning. High churn
                  risk before payback; reduce CAC or increase ARPU
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Source: Bessemer Venture Partners, OpenView Partners, SaaS Capital benchmarks
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Payback by Business Model
            </h2>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4">
              <ul className="space-y-2 text-neutral-600 text-sm">
                <li className="flex justify-between">
                  <span>SMB SaaS (self-serve)</span>
                  <span className="text-neutral-800 font-medium">&lt;6 months ideal</span>
                </li>
                <li className="flex justify-between">
                  <span>Mid-Market SaaS</span>
                  <span className="text-neutral-800 font-medium">6-12 months</span>
                </li>
                <li className="flex justify-between">
                  <span>Enterprise SaaS</span>
                  <span className="text-neutral-800 font-medium">12-18 months acceptable</span>
                </li>
                <li className="flex justify-between">
                  <span>eCommerce / D2C</span>
                  <span className="text-neutral-800 font-medium">&lt;3 months ideal</span>
                </li>
              </ul>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Enterprise deals can have longer payback due to higher ACVs and lower churn.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Reduce CAC Payback Period
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Reduce CAC:</strong> Improve conversion
                  rates, focus on organic channels, optimize ad spend
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Increase ARPU:</strong> Upsell to higher
                  tiers, add premium features, usage-based pricing
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Improve Margins:</strong> Reduce hosting
                  costs, automate support, optimize infrastructure
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Faster Onboarding:</strong> Get customers to
                  value faster to reduce early churn
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              CAC Payback vs LTV:CAC
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              Both metrics matter but measure different things:
            </p>
            <ul className="space-y-2 text-neutral-600 mt-4">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">CAC Payback:</strong> Time-focused. How
                  quickly you recover investment
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">LTV:CAC:</strong> Value-focused. Total return
                  on acquisition investment
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4">
              A company with great LTV:CAC (5:1) but long payback (24 months) needs significant
              capital to grow. A company with shorter payback can reinvest faster.
            </p>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['payback']} className="w-full">
              <AccordionItem value="payback" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    CAC Payback Period Calculator
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-5">
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

                    {/* Monthly Revenue Input */}
                    <div className="space-y-2">
                      <Label htmlFor={monthlyRevenueId} className="text-sm text-neutral-600">
                        Monthly revenue per customer (ARPU)
                      </Label>
                      <div className="relative">
                        <Input
                          id={monthlyRevenueId}
                          type="number"
                          placeholder="0"
                          value={monthlyRevenue}
                          onChange={(e) => setMonthlyRevenue(e.target.value)}
                          className="pr-16 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
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
                          placeholder="80"
                          value={grossMargin}
                          onChange={(e) => setGrossMargin(e.target.value)}
                          className="pr-10 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600">
                        SaaS typically has 70-85% gross margins
                      </p>
                    </div>

                    {/* Monthly Gross Profit Output */}
                    {monthlyGrossProfit !== null && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">
                          Monthly gross profit per customer
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={formatCurrency(monthlyGrossProfit.toFixed(2), currency)}
                            readOnly
                            className="h-11 lg:h-12 text-base bg-muted/50 font-medium border-neutral-200"
                          />
                        </div>
                      </div>
                    )}

                    {/* Payback Period Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">CAC Payback Period</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={
                            paybackPeriod !== null ? `${paybackPeriod.toFixed(1)} months` : '—'
                          }
                          readOnly
                          className="h-11 lg:h-12 text-base bg-muted/50 font-medium border-neutral-200"
                        />
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {paybackPeriod !== null && (
                      <div className="p-4 rounded-lg bg-accent/30 border border-border">
                        {paybackPeriod < 6 && (
                          <p className="text-performance-excellent font-medium">
                            Under 6 months: Excellent! Very efficient acquisition. Consider scaling
                            faster.
                          </p>
                        )}
                        {paybackPeriod >= 6 && paybackPeriod < 12 && (
                          <p className="text-performance-good font-medium">
                            6-12 months: Good! Healthy payback for most SaaS companies.
                          </p>
                        )}
                        {paybackPeriod >= 12 && paybackPeriod < 18 && (
                          <p className="text-performance-breakeven font-medium">
                            12-18 months: Acceptable for enterprise, but optimize for
                            SMB/mid-market.
                          </p>
                        )}
                        {paybackPeriod >= 18 && (
                          <p className="text-performance-loss font-medium">
                            Over 18 months: Warning! High churn risk before payback. Focus on
                            reducing CAC or increasing ARPU.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Context */}
                    {paybackPeriod !== null && monthlyGrossProfit !== null && (
                      <div className="p-4 rounded-lg bg-muted/30 border border-border">
                        <p className="text-sm text-neutral-600">
                          <strong className="text-neutral-800">What this means:</strong> You need{' '}
                          {paybackPeriod.toFixed(1)} months of{' '}
                          {formatCurrency(monthlyGrossProfit.toFixed(2), currency)}/month gross
                          profit to recover your {formatCurrency(cac, currency)} acquisition cost.
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
            shareDisabled={paybackPeriod === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default CACPaybackCalculator;
