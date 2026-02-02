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

const CPMCalculator = () => {
  const [adSpend, setAdSpend] = useState<string>('');
  const [impressions, setImpressions] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const adSpendId = useId();
  const impressionsId = useId();

  const currentCurrency = CURRENCIES[currency];

  const calculateCPM = (): number | null => {
    const spend = parseFloat(adSpend);
    const imps = parseFloat(impressions);
    if (Number.isNaN(spend) || Number.isNaN(imps) || imps === 0) return null;
    return (spend / imps) * 1000;
  };

  const calculateCostPerImpression = (): number | null => {
    const spend = parseFloat(adSpend);
    const imps = parseFloat(impressions);
    if (Number.isNaN(spend) || Number.isNaN(imps) || imps === 0) return null;
    return spend / imps;
  };

  const cpm = calculateCPM();
  const costPerImpression = calculateCostPerImpression();

  const handleShare = () => {
    const text =
      cpm !== null
        ? `My CPM: ${formatCurrency(cpm.toFixed(2), currency)} | Ad Spend: ${formatCurrency(adSpend, currency)} | Impressions: ${parseInt(impressions, 10).toLocaleString()}`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setAdSpend('');
    setImpressions('');
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
              What is CPM?: Cost Per Mille
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              CPM, or <strong className="text-neutral-800">Cost Per Mille</strong> (mille is Latin
              for "thousand"), is a pricing model in digital advertising where advertisers{' '}
              <strong className="text-neutral-800">
                pay a fixed price for every 1,000 impressions of their ad
              </strong>
              .
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              An impression is counted when an ad loads on a page or app and is viewed by the user.
              CPM is the most common pricing model in{' '}
              <strong className="text-neutral-800">programmatic advertising</strong> and is
              particularly useful when the goal is{' '}
              <strong className="text-neutral-800">building brand awareness</strong> rather than
              driving direct conversions.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Why is CPM Important?
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Brand Awareness:</strong> CPM prioritizes
                  exposure over clicks, making it ideal for getting your brand noticed
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Clear Pricing:</strong> Fixed cost for a set
                  number of impressions makes budgeting predictable
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Easy Comparison:</strong> Compare channels
                  and media sources based on cost efficiency
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Scalability:</strong> Easy to scale up or
                  down based on budget
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Calculate CPM: The Formula
            </h2>
            <p className="text-neutral-600 mb-4">The CPM formula is:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">CPM = (Total Ad Spend / Impressions) x 1,000</code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              For example, if you paid{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('1,500', currency)}
              </span>{' '}
              to serve your ad and received{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                750,000 impressions
              </span>
              , your CPM is{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                ({formatCurrency('1,500', currency)} / 750,000) x 1,000 ={' '}
                {formatCurrency('2.00', currency)}
              </span>
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              This means you paid{' '}
              <strong className="text-neutral-800">
                {formatCurrency('2.00', currency)} for every 1,000 ad impressions
              </strong>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              CPM vs CPC vs CPA
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">CPM (Cost Per Mille):</strong> Pay for
                  impressions. Best for brand awareness campaigns
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">CPC (Cost Per Click):</strong> Pay only when
                  users click. Best for driving traffic and engagement
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">CPA (Cost Per Action):</strong> Pay only when
                  users take a specific action (purchase, signup). Best for conversions
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Average CPM Rates by Platform (2025)
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              CPM rates vary significantly by platform, audience, and seasonality:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">Meta (Facebook):</strong> ~$6.59 CPM
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">Instagram:</strong> ~$9.46 CPM (premium
                  visual placements)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">TikTok:</strong> ~$6-8 CPM
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">YouTube:</strong> ~$3-6 CPM
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">Snapchat:</strong> ~$12.84 CPM (Q4 peak)
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Note: CPM rates spike significantly in Q4 due to holiday advertising competition.
            </p>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['cpm']} className="w-full">
              {/* CPM Calculator Section */}
              <AccordionItem value="cpm" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    Cost Per Mille (CPM)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-5">
                    {/* Ad Spend Input */}
                    <div className="space-y-2">
                      <Label htmlFor={adSpendId} className="text-sm text-neutral-600">
                        Total ad spend
                      </Label>
                      <div className="relative">
                        <Input
                          id={adSpendId}
                          type="number"
                          placeholder="0"
                          value={adSpend}
                          onChange={(e) => setAdSpend(e.target.value)}
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

                    {/* Impressions Input */}
                    <div className="space-y-2">
                      <Label htmlFor={impressionsId} className="text-sm text-neutral-600">
                        Total impressions
                      </Label>
                      <div className="relative">
                        <Input
                          id={impressionsId}
                          type="number"
                          placeholder="0"
                          value={impressions}
                          onChange={(e) => setImpressions(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* CPM Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">
                        CPM (Cost Per 1,000 Impressions)
                      </Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={cpm !== null ? cpm.toFixed(2) : ''}
                          placeholder="—"
                          className="pr-16 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* Cost Per Impression Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">Cost per single impression</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={costPerImpression !== null ? costPerImpression.toFixed(6) : ''}
                          placeholder="—"
                          className="pr-16 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {cpm !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          cpm > 15
                            ? 'text-performance-loss'
                            : cpm > 10
                              ? 'text-performance-breakeven'
                              : cpm > 5
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {cpm > 15 && 'High CPM. Consider optimizing targeting or creative.'}
                        {cpm > 10 && cpm <= 15 && 'Above average CPM. May be premium inventory.'}
                        {cpm > 5 && cpm <= 10 && 'Average CPM range for most platforms.'}
                        {cpm <= 5 && 'Excellent CPM. Very cost-efficient impressions!'}
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
            shareDisabled={cpm === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default CPMCalculator;
