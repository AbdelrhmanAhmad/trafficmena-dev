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

const NRRCalculator = () => {
  const [startingMRR, setStartingMRR] = useState<string>('');
  const [expansionMRR, setExpansionMRR] = useState<string>('');
  const [contractionMRR, setContractionMRR] = useState<string>('');
  const [churnMRR, setChurnMRR] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const startingMRRId = useId();
  const expansionMRRId = useId();
  const contractionMRRId = useId();
  const churnMRRId = useId();

  // NRR = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR × 100
  const calculateNRR = (): number | null => {
    const starting = parseFloat(startingMRR);
    const expansion = parseFloat(expansionMRR) || 0;
    const contraction = parseFloat(contractionMRR) || 0;
    const churn = parseFloat(churnMRR) || 0;
    if (Number.isNaN(starting) || starting === 0) return null;
    return ((starting + expansion - contraction - churn) / starting) * 100;
  };

  // GRR = (Starting MRR - Contraction - Churn) / Starting MRR × 100
  const calculateGRR = (): number | null => {
    const starting = parseFloat(startingMRR);
    const contraction = parseFloat(contractionMRR) || 0;
    const churn = parseFloat(churnMRR) || 0;
    if (Number.isNaN(starting) || starting === 0) return null;
    const grr = ((starting - contraction - churn) / starting) * 100;
    return Math.min(grr, 100); // GRR cannot exceed 100%
  };

  const calculateEndingMRR = (): number | null => {
    const starting = parseFloat(startingMRR);
    const expansion = parseFloat(expansionMRR) || 0;
    const contraction = parseFloat(contractionMRR) || 0;
    const churn = parseFloat(churnMRR) || 0;
    if (Number.isNaN(starting)) return null;
    return starting + expansion - contraction - churn;
  };

  const nrr = calculateNRR();
  const grr = calculateGRR();
  const endingMRR = calculateEndingMRR();

  const handleShare = () => {
    const text =
      nrr !== null
        ? `My NRR: ${nrr.toFixed(1)}% | Starting MRR: ${formatCurrency(startingMRR, currency)}${grr !== null ? ` | GRR: ${grr.toFixed(1)}%` : ''}${endingMRR !== null ? ` | Ending MRR: ${formatCurrency(endingMRR, currency)}` : ''}`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setStartingMRR('');
    setExpansionMRR('');
    setContractionMRR('');
    setChurnMRR('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Column - Educational Content */}
        <div className="space-y-4 lg:space-y-6">
          <section>
            <h2 className="text-xl lg:text-2xl font-semibold text-neutral-800 mb-4">
              What is Net Revenue Retention (NRR)?
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              Net Revenue Retention (NRR), also called Net Dollar Retention (NDR), measures{' '}
              <strong className="text-neutral-800">
                how much recurring revenue you retain and grow from existing customers
              </strong>{' '}
              over a specific period.
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              <strong className="text-neutral-800">The simplest way to think about NRR:</strong> How
              much would your revenue grow or shrink if you acquired zero new customers? According
              to research, SaaS companies with high NRR grow{' '}
              <strong className="text-neutral-800">2.5x faster</strong> than low-NRR counterparts.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Why is NRR Important?
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Predicts Sustainable Growth:</strong>{' '}
                  Companies with NRR above 110% can grow significantly without new acquisition
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Investor Priority:</strong> Often the single
                  most important metric after revenue growth for VCs
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Cost Efficiency:</strong> Expanding existing
                  customers costs 5x less than acquiring new ones
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Product-Market Fit:</strong> NRR above 100%
                  indicates customers see enough value to invest more
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Calculate NRR: The Formula
            </h2>
            <p className="text-neutral-600 mb-4">The standard NRR formula is:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">
                NRR = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR × 100
              </code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              For example, with{' '}
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('100,000', currency)} starting MRR
              </span>
              ,{' '}
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('25,000', currency)} expansion
              </span>
              ,{' '}
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('8,000', currency)} contraction
              </span>
              , and{' '}
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('7,000', currency)} churn
              </span>
              :
            </p>
            <p className="text-neutral-600 leading-relaxed mt-2">
              NRR = ({formatCurrency('100,000', currency)} + {formatCurrency('25,000', currency)} -{' '}
              {formatCurrency('8,000', currency)} - {formatCurrency('7,000', currency)}) /{' '}
              {formatCurrency('100,000', currency)} × 100 ={' '}
              <strong className="text-neutral-800">110%</strong>
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              NRR Benchmarks (2025)
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              Industry benchmarks from SaaS Capital and Fullview:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">Below 100%:</strong> Poor. Revenue shrinking
                  from existing customers
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">100-105%:</strong> Fair. Maintaining revenue
                  with limited expansion
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">106-115%:</strong> Good. Solid expansion
                  offsetting churn
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">116-120%+:</strong> Excellent. Best-in-class
                  expansion engine
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Source: SaaS Capital 2025 Retention Benchmarks, Fullview (2025)
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              NRR by Average Contract Value (ACV)
            </h2>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4">
              <ul className="space-y-2 text-neutral-600 text-sm">
                <li className="flex justify-between">
                  <span>$0-$5K ACV (SMB)</span>
                  <span className="text-neutral-800 font-medium">Median: 95-100%</span>
                </li>
                <li className="flex justify-between">
                  <span>$5K-$25K ACV (Mid-Market)</span>
                  <span className="text-neutral-800 font-medium">Median: 100-106%</span>
                </li>
                <li className="flex justify-between">
                  <span>$25K-$100K ACV</span>
                  <span className="text-neutral-800 font-medium">Median: 102-110%</span>
                </li>
                <li className="flex justify-between">
                  <span>$100K+ ACV (Enterprise)</span>
                  <span className="text-neutral-800 font-medium">Median: 110-115%</span>
                </li>
              </ul>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Higher ACV correlates with higher NRR due to stickier enterprise customers.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">NRR vs GRR</h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              Both metrics matter but measure different things:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">NRR:</strong> Includes expansion. Shows total
                  growth potential from existing customers
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">GRR (Gross Revenue Retention):</strong>{' '}
                  Excludes expansion. Reveals core retention without upsells masking churn
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4">
              <strong className="text-neutral-800">Why track both:</strong> A strong upsell motion
              can mask underlying retention problems. If NRR is 110% but GRR is 70%, you have a
              serious churn problem that expansion is covering up.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Improve NRR
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Reduce Churn:</strong> Improve onboarding,
                  proactive customer success, and cancel flow optimization
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Drive Expansion:</strong> Upsell higher
                  tiers, add seats, cross-sell new products, usage-based pricing
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Reduce Contraction:</strong> Monitor usage
                  drops, intervene before downgrades, demonstrate value continuously
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Target Enterprise:</strong> Higher ACV
                  customers have stickier contracts and more expansion potential
                </span>
              </li>
            </ul>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['nrr']} className="w-full">
              <AccordionItem value="nrr" className="border-none">
                <AccordionTrigger className="px-5 lg:px-6 py-4 hover:no-underline">
                  <span className="text-base lg:text-lg font-semibold text-neutral-800">
                    Net Revenue Retention (NRR) Calculator
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 lg:px-6 pb-5 lg:pb-6">
                  <div className="space-y-5">
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
                            <SelectTrigger className="w-20 h-10 border-0 bg-transparent text-emerald-600 font-medium text-sm focus:ring-0">
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

                    {/* Expansion MRR Input */}
                    <div className="space-y-2">
                      <Label htmlFor={expansionMRRId} className="text-sm text-neutral-600">
                        Expansion MRR (upsells, cross-sells, upgrades)
                      </Label>
                      <div className="relative">
                        <Input
                          id={expansionMRRId}
                          type="number"
                          placeholder="0"
                          value={expansionMRR}
                          onChange={(e) => setExpansionMRR(e.target.value)}
                          className="pr-16 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 font-medium text-sm">
                          +
                        </span>
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
                          -
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
                          -
                        </span>
                      </div>
                    </div>

                    {/* Ending MRR Output */}
                    {endingMRR !== null && startingMRR && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">
                          Ending MRR (from existing customers)
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={formatCurrency(endingMRR, currency)}
                            readOnly
                            className="h-11 lg:h-12 text-base bg-muted/50 font-medium border-neutral-200"
                          />
                        </div>
                      </div>
                    )}

                    {/* NRR Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">
                        Net Revenue Retention (NRR)
                      </Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={nrr !== null ? `${nrr.toFixed(1)}%` : '—'}
                          readOnly
                          className="h-11 lg:h-12 text-base bg-muted/50 font-medium border-neutral-200"
                        />
                      </div>
                    </div>

                    {/* GRR Output */}
                    {grr !== null && startingMRR && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">
                          Gross Revenue Retention (GRR)
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={`${grr.toFixed(1)}%`}
                            readOnly
                            className="h-11 lg:h-12 text-base bg-muted/50 font-medium border-neutral-200"
                          />
                        </div>
                      </div>
                    )}

                    {/* Performance Indicator */}
                    {nrr !== null && (
                      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-100">
                        {nrr < 100 && (
                          <p className="text-performance-loss font-medium">
                            Below 100%: Revenue is shrinking from existing customers. Focus on
                            reducing churn and contraction.
                          </p>
                        )}
                        {nrr >= 100 && nrr < 106 && (
                          <p className="text-performance-breakeven font-medium">
                            100-105%: Fair retention. You're maintaining revenue but have limited
                            expansion. Build your upsell motion.
                          </p>
                        )}
                        {nrr >= 106 && nrr < 116 && (
                          <p className="text-performance-good font-medium">
                            106-115%: Good NRR! Solid expansion is offsetting churn. You're at a
                            healthy benchmark.
                          </p>
                        )}
                        {nrr >= 116 && (
                          <p className="text-performance-excellent font-medium">
                            Above 116%: Excellent! Best-in-class expansion engine driving strong
                            growth from existing customers.
                          </p>
                        )}
                      </div>
                    )}

                    {/* GRR Warning */}
                    {nrr !== null && grr !== null && nrr >= 100 && grr < 85 && (
                      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <p className="text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                          Watch your GRR: {grr.toFixed(1)}% is below 85%. Your expansion is masking
                          significant churn. Address underlying retention issues.
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
            shareDisabled={nrr === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default NRRCalculator;
