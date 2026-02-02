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

const GRRCalculator = () => {
  const [startingMRR, setStartingMRR] = useState<string>('');
  const [contractionMRR, setContractionMRR] = useState<string>('');
  const [churnMRR, setChurnMRR] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const startingMRRId = useId();
  const contractionMRRId = useId();
  const churnMRRId = useId();

  // GRR = (Starting MRR - Contraction - Churn) / Starting MRR × 100
  const calculateGRR = (): number | null => {
    const starting = parseFloat(startingMRR);
    const contraction = parseFloat(contractionMRR) || 0;
    const churn = parseFloat(churnMRR) || 0;
    if (Number.isNaN(starting) || starting === 0) return null;
    const grr = ((starting - contraction - churn) / starting) * 100;
    return Math.min(grr, 100); // GRR cannot exceed 100%
  };

  const calculateRetainedMRR = (): number | null => {
    const starting = parseFloat(startingMRR);
    const contraction = parseFloat(contractionMRR) || 0;
    const churn = parseFloat(churnMRR) || 0;
    if (Number.isNaN(starting)) return null;
    return Math.max(starting - contraction - churn, 0);
  };

  const calculateLostMRR = (): number | null => {
    const contraction = parseFloat(contractionMRR) || 0;
    const churn = parseFloat(churnMRR) || 0;
    return contraction + churn;
  };

  const grr = calculateGRR();
  const retainedMRR = calculateRetainedMRR();
  const lostMRR = calculateLostMRR();

  const handleShare = () => {
    const text =
      grr !== null
        ? `My GRR: ${grr.toFixed(1)}% | Starting MRR: ${formatCurrency(startingMRR, currency)} | Retained: ${formatCurrency(retainedMRR?.toFixed(0) || '0', currency)} | Lost: ${formatCurrency(lostMRR?.toFixed(0) || '0', currency)}`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setStartingMRR('');
    setContractionMRR('');
    setChurnMRR('');
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
              What is Gross Revenue Retention (GRR)?
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              Gross Revenue Retention (GRR) measures{' '}
              <strong className="text-neutral-800">
                the percentage of recurring revenue retained from existing customers
              </strong>
              , accounting only for churn and contractions, not expansion.
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              Unlike NRR, GRR cannot exceed 100% and reveals the true impact of churn without
              expansion revenue masking problems. A healthy SaaS business should retain{' '}
              <strong className="text-neutral-800">85-95%</strong> of recurring revenue
              year-over-year, with best-in-class achieving 95-100%.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Why is GRR Important?
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Reveals True Churn Impact:</strong> Unlike
                  NRR, expansion can't hide retention problems in GRR
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Customer Stickiness:</strong> High GRR
                  indicates customers see lasting value and renew contracts
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Investor Focus:</strong> VCs use GRR to spot
                  churn issues in high-growth companies
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Long-term Health:</strong> Predicts
                  sustainable growth through customer loyalty
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Calculate GRR: The Formula
            </h2>
            <p className="text-neutral-600 mb-4">The GRR formula is:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">
                GRR = (Starting MRR - Contraction - Churn) / Starting MRR × 100
              </code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              For example, with{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('100,000', currency)} starting MRR
              </span>
              ,{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('5,000', currency)} contraction
              </span>
              , and{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('5,000', currency)} churn
              </span>
              :
            </p>
            <p className="text-neutral-600 leading-relaxed mt-2">
              GRR = ({formatCurrency('100,000', currency)} - {formatCurrency('5,000', currency)} -{' '}
              {formatCurrency('5,000', currency)}) / {formatCurrency('100,000', currency)} × 100 ={' '}
              <strong className="text-neutral-800">90%</strong>
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              GRR Benchmarks (2025)
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              Industry benchmarks from SaaS Capital and Ordway Labs:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">Below 80%:</strong> Critical. Severe churn
                  problem affecting growth potential
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">80-85%:</strong> Below average. Customer
                  satisfaction issues likely
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">85-95%:</strong> Good. Healthy retention for
                  most SaaS companies
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">95-100%:</strong> Excellent. Best-in-class
                  customer stickiness
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Source: SaaS Capital 2025 Retention Benchmarks, Ordway Labs
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              GRR by Average Contract Value (ACV)
            </h2>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4">
              <ul className="space-y-2 text-neutral-600 text-sm">
                <li className="flex justify-between">
                  <span>&lt;$12K ACV (SMB)</span>
                  <span className="text-neutral-800 font-medium tabular-nums">Median: 90%</span>
                </li>
                <li className="flex justify-between">
                  <span>$12K-$50K ACV</span>
                  <span className="text-neutral-800 font-medium tabular-nums">Median: 92%</span>
                </li>
                <li className="flex justify-between">
                  <span>$50K-$100K ACV</span>
                  <span className="text-neutral-800 font-medium tabular-nums">Median: 92%</span>
                </li>
                <li className="flex justify-between">
                  <span>$100K-$250K ACV</span>
                  <span className="text-neutral-800 font-medium tabular-nums">Median: 95%</span>
                </li>
                <li className="flex justify-between">
                  <span>&gt;$250K ACV (Enterprise)</span>
                  <span className="text-neutral-800 font-medium tabular-nums">Median: 95%</span>
                </li>
              </ul>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Higher ACV correlates with higher GRR due to stickier enterprise deals.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              GRR vs NRR: Key Differences
            </h2>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4">
              <ul className="space-y-3 text-neutral-600 text-sm">
                <li className="flex justify-between items-start">
                  <span className="font-medium text-neutral-800">GRR</span>
                  <span className="text-right">
                    Excludes expansion, max 100%, shows true retention
                  </span>
                </li>
                <li className="flex justify-between items-start">
                  <span className="font-medium text-neutral-800">NRR</span>
                  <span className="text-right">
                    Includes expansion, can exceed 100%, shows growth potential
                  </span>
                </li>
              </ul>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              <strong className="text-neutral-800">Why track both:</strong> If NRR is 110% but GRR
              is 75%, expansion is masking a serious churn problem. Strong companies have high GRR
              AND high NRR.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Improve GRR
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Improve Onboarding:</strong> Get customers to
                  value faster to prevent early churn
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Invest in Customer Success:</strong> 1-2% of
                  revenue in CS drives measurable retention gains
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Monitor Usage Drops:</strong> Proactively
                  intervene before customers downgrade
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Fix Cancel Flow:</strong> Implement pause
                  walls, trial extensions, and win-back offers
                </span>
              </li>
            </ul>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['grr']} className="w-full">
              <AccordionItem value="grr" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    Gross Revenue Retention (GRR) Calculator
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="space-y-4 lg:space-y-6">
                    {/* Starting MRR Input */}
                    <div className="space-y-2">
                      <Label htmlFor={startingMRRId} className="text-sm text-neutral-600">
                        Starting MRR (from existing customers)
                      </Label>
                      <div className="relative">
                        <Input
                          id={startingMRRId}
                          type="number"
                          placeholder="0"
                          value={startingMRR}
                          onChange={(e) => setStartingMRR(e.target.value)}
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

                    {/* Contraction MRR Input */}
                    <div className="space-y-2">
                      <Label htmlFor={contractionMRRId} className="text-sm text-neutral-600">
                        Contraction MRR (downgrades, reduced usage)
                      </Label>
                      <div className="relative">
                        <Input
                          id={contractionMRRId}
                          type="number"
                          placeholder="0"
                          value={contractionMRR}
                          onChange={(e) => setContractionMRR(e.target.value)}
                          className="pr-16 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-performance-loss font-medium text-sm">
                          −
                        </span>
                      </div>
                    </div>

                    {/* Churn MRR Input */}
                    <div className="space-y-2">
                      <Label htmlFor={churnMRRId} className="text-sm text-neutral-600">
                        Churn MRR (cancellations)
                      </Label>
                      <div className="relative">
                        <Input
                          id={churnMRRId}
                          type="number"
                          placeholder="0"
                          value={churnMRR}
                          onChange={(e) => setChurnMRR(e.target.value)}
                          className="pr-16 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-performance-loss font-medium text-sm">
                          −
                        </span>
                      </div>
                    </div>

                    {/* Lost MRR Output */}
                    {lostMRR !== null && startingMRR && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">
                          Total MRR lost (contraction + churn)
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={formatCurrency(lostMRR, currency)}
                            readOnly
                            className="h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 rounded-xl font-medium text-performance-loss"
                          />
                        </div>
                      </div>
                    )}

                    {/* Retained MRR Output */}
                    {retainedMRR !== null && startingMRR && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">Retained MRR</Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={formatCurrency(retainedMRR, currency)}
                            readOnly
                            className="h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 rounded-xl font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {/* GRR Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">
                        Gross Revenue Retention (GRR)
                      </Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={grr !== null ? `${grr.toFixed(1)}%` : '—'}
                          readOnly
                          className="h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 rounded-xl font-medium"
                        />
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {grr !== null && (
                      <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-xl">
                        {grr < 80 && (
                          <p className="text-performance-loss font-medium">
                            Below 80%: Critical churn problem. This is a table stakes benchmark;
                            address retention immediately.
                          </p>
                        )}
                        {grr >= 80 && grr < 85 && (
                          <p className="text-performance-loss font-medium">
                            80-85%: Below average. Likely customer satisfaction issues. Investigate
                            product quality and support.
                          </p>
                        )}
                        {grr >= 85 && grr < 95 && (
                          <p className="text-performance-good font-medium">
                            85-95%: Good GRR! Healthy retention for most SaaS companies. Keep
                            optimizing onboarding and CS.
                          </p>
                        )}
                        {grr >= 95 && (
                          <p className="text-performance-excellent font-medium">
                            95%+: Excellent! Best-in-class customer stickiness. Your customers love
                            your product.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Additional Context */}
                    {grr !== null && startingMRR && (
                      <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-xl">
                        <p className="text-sm text-neutral-600">
                          <strong className="text-neutral-800">What this means:</strong> You
                          retained {grr.toFixed(1)}% of revenue from existing customers, losing{' '}
                          {(100 - grr).toFixed(1)}% to churn and downgrades.
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
            shareDisabled={grr === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default GRRCalculator;
