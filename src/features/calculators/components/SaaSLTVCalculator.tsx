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

const SaaSLTVCalculator = () => {
  const [arpu, setArpu] = useState<string>('');
  const [grossMargin, setGrossMargin] = useState<string>('');
  const [monthlyChurnRate, setMonthlyChurnRate] = useState<string>('');
  const [cac, setCac] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const arpuId = useId();
  const grossMarginId = useId();
  const monthlyChurnRateId = useId();
  const cacId = useId();

  const currentCurrency = CURRENCIES[currency];

  // LTV = ARPU × Gross Margin % × (1 / Monthly Churn Rate)
  const calculateLTV = (): number | null => {
    const arpuValue = parseFloat(arpu);
    const margin = parseFloat(grossMargin);
    const churn = parseFloat(monthlyChurnRate);
    if (Number.isNaN(arpuValue) || Number.isNaN(margin) || Number.isNaN(churn) || churn === 0)
      return null;
    return arpuValue * (margin / 100) * (1 / (churn / 100));
  };

  const calculateCustomerLifetimeMonths = (): number | null => {
    const churn = parseFloat(monthlyChurnRate);
    if (Number.isNaN(churn) || churn === 0) return null;
    return 1 / (churn / 100);
  };

  const calculateLTVtoCACRatio = (): number | null => {
    const ltv = calculateLTV();
    const cacValue = parseFloat(cac);
    if (ltv === null || Number.isNaN(cacValue) || cacValue === 0) return null;
    return ltv / cacValue;
  };

  const ltv = calculateLTV();
  const customerLifetimeMonths = calculateCustomerLifetimeMonths();
  const ltvCacRatio = calculateLTVtoCACRatio();

  const handleShare = () => {
    let text =
      ltv !== null
        ? `My SaaS LTV: ${formatCurrency(ltv.toFixed(2), currency)} | ARPU: ${formatCurrency(arpu, currency)}/mo | Gross Margin: ${grossMargin}% | Monthly Churn: ${monthlyChurnRate}%`
        : null;
    if (text && customerLifetimeMonths !== null) {
      text += ` | Avg Customer Lifetime: ${customerLifetimeMonths.toFixed(1)} months`;
    }
    if (text && ltvCacRatio !== null) {
      text += ` | LTV:CAC Ratio: ${ltvCacRatio.toFixed(1)}:1`;
    }
    shareToClipboard(text);
  };

  const handleClear = () => {
    setArpu('');
    setGrossMargin('');
    setMonthlyChurnRate('');
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
              What is SaaS LTV?: Subscription Lifetime Value
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              SaaS LTV (Customer Lifetime Value) measures{' '}
              <strong className="text-neutral-800">
                the total gross profit a subscription customer generates over their entire
                relationship with your business
              </strong>
              .
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              Unlike eCommerce LTV, SaaS LTV uses{' '}
              <strong className="text-neutral-800">monthly churn rate</strong> to estimate customer
              lifespan. According to Churnkey and industry benchmarks, a{' '}
              <strong className="text-neutral-800">3:1 LTV:CAC ratio</strong> is the gold standard
              for sustainable SaaS growth.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Why is SaaS LTV Important?
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Unit Economics:</strong> Determine if
                  acquiring customers is profitable at the individual level
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">CAC Budget:</strong> Know how much you can
                  profitably spend to acquire new subscribers
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Investor Metric:</strong> LTV:CAC ratio is
                  one of the most scrutinized metrics by VCs and growth equity investors
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Retention Focus:</strong> Shows the direct
                  impact of reducing churn on customer value
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Calculate SaaS LTV: The Formula
            </h2>
            <p className="text-neutral-600 mb-4">The churn-based SaaS LTV formula is:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">
                LTV = ARPU × Gross Margin % × (1 / Monthly Churn Rate)
              </code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              For example, if your{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                ARPU is {formatCurrency('100', currency)}/month
              </span>
              , with a{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                80% gross margin
              </span>{' '}
              and{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                5% monthly churn
              </span>
              , your LTV is{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('100', currency)} × 0.80 × 20 = {formatCurrency('1,600', currency)}
              </span>
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              The <strong className="text-neutral-800">customer lifetime</strong> (1 / churn rate)
              in this case is 20 months.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Monthly Churn Rate Benchmarks
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              Based on data from Lenny Rachitsky and Churnkey (2024-2025):
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">
                    B2B Enterprise (&gt;1,000 employees):
                  </strong>{' '}
                  &lt;0.5% monthly / &lt;6% annual is GREAT
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">B2B SMB + Mid-Market:</strong> &lt;1.5%
                  monthly / &lt;17% annual is GREAT
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">B2C SaaS:</strong> &lt;2% monthly / &lt;22%
                  annual is GREAT
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">High churn warning:</strong> &gt;5% monthly
                  means losing ~45% of customers annually
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Source: Lenny's Newsletter, Churnkey (2024-2025)
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              LTV:CAC Ratio Benchmarks
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              The LTV:CAC ratio measures customer acquisition profitability:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">Below 2:1:</strong> Unprofitable. Customer
                  value doesn't cover acquisition cost
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">2:1 to 3:1:</strong> Break-even. Optimize
                  retention or reduce CAC
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">3:1 to 5:1:</strong> Healthy. The industry
                  gold standard for sustainable growth
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">Above 5:1:</strong> Excellent. May indicate
                  room to invest more in growth
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Source: Growth Equity Interview Guide, industry standard benchmarks
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Increase SaaS LTV
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Reduce Churn:</strong> Improve onboarding,
                  customer success, and cancel flow with trial extensions and pause walls
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Increase ARPU:</strong> Upsell premium plans,
                  add-ons, and usage-based pricing tiers
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Target Enterprise:</strong> B2B enterprise
                  clients have 10x+ longer lifetimes and higher ARPU
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Fix Involuntary Churn:</strong> Implement
                  precision retries, dunning emails, and failed payment recovery
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Churn Impact on LTV
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              Small reductions in churn create exponential LTV gains:
            </p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4">
              <ul className="space-y-2 text-neutral-600 text-sm">
                <li className="flex justify-between">
                  <span>5% monthly churn →</span>
                  <span className="text-neutral-800 font-medium tabular-nums">
                    20-month lifetime
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>4% monthly churn →</span>
                  <span className="text-neutral-800 font-medium tabular-nums">
                    25-month lifetime (+25%)
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>3% monthly churn →</span>
                  <span className="text-neutral-800 font-medium tabular-nums">
                    33-month lifetime (+65%)
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>2% monthly churn →</span>
                  <span className="text-neutral-800 font-medium tabular-nums">
                    50-month lifetime (+150%)
                  </span>
                </li>
              </ul>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              A 1% reduction in churn can increase LTV by 25-50% depending on your starting point.
            </p>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['ltv']} className="w-full">
              {/* SaaS LTV Calculator Section */}
              <AccordionItem value="ltv" className="border-none">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <span className="text-lg font-semibold text-neutral-800">
                    SaaS LTV (Subscription Lifetime Value)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-5">
                    {/* ARPU Input */}
                    <div className="space-y-2">
                      <Label htmlFor={arpuId} className="text-sm text-neutral-500">
                        Average revenue per user (ARPU) / month
                      </Label>
                      <div className="relative">
                        <Input
                          id={arpuId}
                          type="number"
                          placeholder="0"
                          value={arpu}
                          onChange={(e) => setArpu(e.target.value)}
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

                    {/* Gross Margin Input */}
                    <div className="space-y-2">
                      <Label htmlFor={grossMarginId} className="text-sm text-neutral-500">
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium text-sm">
                          %
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">
                        SaaS typically has 70-85% gross margins
                      </p>
                    </div>

                    {/* Monthly Churn Rate Input */}
                    <div className="space-y-2">
                      <Label htmlFor={monthlyChurnRateId} className="text-sm text-neutral-500">
                        Monthly churn rate (%)
                      </Label>
                      <div className="relative">
                        <Input
                          id={monthlyChurnRateId}
                          type="number"
                          step="0.1"
                          placeholder="5"
                          value={monthlyChurnRate}
                          onChange={(e) => setMonthlyChurnRate(e.target.value)}
                          className="pr-10 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    {/* CAC Input (Optional) */}
                    <div className="space-y-2">
                      <Label htmlFor={cacId} className="text-sm text-neutral-500">
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* Customer Lifetime Output */}
                    {customerLifetimeMonths !== null && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-500">
                          Average customer lifetime
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={`${customerLifetimeMonths.toFixed(1)} months`}
                            readOnly
                            className="h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 rounded-xl font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {/* LTV Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-500">
                        SaaS LTV (Customer Lifetime Value)
                      </Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={ltv !== null ? formatCurrency(ltv.toFixed(2), currency) : '—'}
                          readOnly
                          className="h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 rounded-xl font-medium"
                        />
                      </div>
                    </div>

                    {/* LTV:CAC Ratio Output */}
                    {ltvCacRatio !== null && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-500">LTV:CAC Ratio</Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={`${ltvCacRatio.toFixed(1)}:1`}
                            readOnly
                            className="h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 rounded-xl font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {/* Performance Indicator */}
                    {ltvCacRatio !== null && (
                      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-100 rounded-xl">
                        {ltvCacRatio < 2 && (
                          <p className="text-performance-loss font-medium">
                            ⚠️ Below 2:1: Customer acquisition is not profitable. Focus on reducing
                            churn or CAC.
                          </p>
                        )}
                        {ltvCacRatio >= 2 && ltvCacRatio < 3 && (
                          <p className="text-performance-breakeven font-medium">
                            📊 Between 2:1 and 3:1: Break-even territory. Optimize retention to
                            reach the 3:1 benchmark.
                          </p>
                        )}
                        {ltvCacRatio >= 3 && ltvCacRatio < 5 && (
                          <p className="text-performance-good font-medium">
                            ✅ Between 3:1 and 5:1: Healthy unit economics! You're at the industry
                            gold standard.
                          </p>
                        )}
                        {ltvCacRatio >= 5 && (
                          <p className="text-performance-excellent font-medium">
                            🚀 Above 5:1: Excellent! Consider investing more in growth and
                            marketing.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Churn Impact Indicator */}
                    {ltv !== null && customerLifetimeMonths !== null && !ltvCacRatio && (
                      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-100 rounded-xl">
                        {parseFloat(monthlyChurnRate) > 5 && (
                          <p className="text-performance-loss font-medium">
                            ⚠️ High churn alert! {monthlyChurnRate}% monthly means losing ~
                            {(parseFloat(monthlyChurnRate) * 12 * 0.75).toFixed(0)}% of customers
                            annually.
                          </p>
                        )}
                        {parseFloat(monthlyChurnRate) > 2 && parseFloat(monthlyChurnRate) <= 5 && (
                          <p className="text-performance-breakeven font-medium">
                            📊 Moderate churn: A 1% reduction could increase your LTV by 20-25%.
                          </p>
                        )}
                        {parseFloat(monthlyChurnRate) > 0 && parseFloat(monthlyChurnRate) <= 2 && (
                          <p className="text-performance-good font-medium">
                            ✅ Strong retention! Your low churn drives high customer lifetime value.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          <CalculatorActionButtons
            onShare={handleShare}
            onClear={handleClear}
            shareDisabled={ltv === null}
          />

          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default SaaSLTVCalculator;
