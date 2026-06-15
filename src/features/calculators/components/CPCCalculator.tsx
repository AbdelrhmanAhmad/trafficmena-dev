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

const CPCCalculator = () => {
  const [adSpend, setAdSpend] = useState<string>('');
  const [clicks, setClicks] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const adSpendId = useId();
  const clicksId = useId();

  const currentCurrency = CURRENCIES[currency];

  const calculateCPC = (): number | null => {
    const spend = parseFloat(adSpend);
    const totalClicks = parseFloat(clicks);
    if (Number.isNaN(spend) || Number.isNaN(totalClicks) || totalClicks === 0) return null;
    return spend / totalClicks;
  };

  const calculateTotalClicks = (): number | null => {
    const totalClicks = parseFloat(clicks);
    if (Number.isNaN(totalClicks)) return null;
    return totalClicks;
  };

  const cpc = calculateCPC();
  const totalClicks = calculateTotalClicks();

  const handleShare = () => {
    const text =
      cpc !== null
        ? `My CPC: ${formatCurrency(cpc.toFixed(2), currency)} | Ad Spend: ${formatCurrency(adSpend, currency)} | Clicks: ${parseInt(clicks, 10).toLocaleString()}`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setAdSpend('');
    setClicks('');
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
              What is CPC?: Cost Per Click
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              CPC, or <strong className="text-neutral-800">Cost Per Click</strong>, is a digital
              advertising metric that measures{' '}
              <strong className="text-neutral-800">
                how much you pay each time someone clicks on your ad
              </strong>
              .
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              Unlike CPM (Cost Per Mille) which charges per impression, CPC ensures you only pay
              when users take action by clicking. This makes CPC ideal for{' '}
              <strong className="text-neutral-800">performance-based campaigns</strong> focused on
              driving traffic, leads, or conversions.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Why is CPC Important?
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Pay for Performance:</strong> You only pay
                  when users engage with your ad by clicking
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Budget Control:</strong> Set maximum bids to
                  control how much you spend per click
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Measure Efficiency:</strong> Lower CPC means
                  more traffic for your budget
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Optimize Campaigns:</strong> Compare CPC
                  across ads, audiences, and platforms to find what works
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Calculate CPC: The Formula
            </h2>
            <p className="text-neutral-600 mb-4">The CPC formula is:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">CPC = Total Ad Spend / Number of Clicks</code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              For example, if you spent{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('500', currency)}
              </span>{' '}
              on ads and received{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                250 clicks
              </span>
              , your CPC is{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('500', currency)} / 250 = {formatCurrency('2.00', currency)}
              </span>
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              This means you paid{' '}
              <strong className="text-neutral-800">
                {formatCurrency('2.00', currency)} for each click
              </strong>{' '}
              on your ad.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Factors That Affect CPC
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Industry Competition:</strong> Highly
                  competitive industries (legal, insurance, finance) have higher CPCs
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Quality Score:</strong> Higher quality ads
                  with relevant landing pages get lower CPCs
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Targeting:</strong> Broader audiences
                  typically have lower CPCs than niche targeting
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Ad Placement:</strong> Premium placements
                  (top of page, feed) cost more per click
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Average CPC Rates by Platform (2025)
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              CPC varies significantly by platform and industry:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">Google Ads (Search):</strong> $1-$2 average,
                  up to $50+ for competitive keywords
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">Google Ads (Display):</strong> $0.50-$1.00
                  average
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">Meta (Facebook/Instagram):</strong>{' '}
                  $0.50-$2.00 average
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">LinkedIn:</strong> $5-$6 average (B2B
                  premium)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">TikTok:</strong> $0.20-$1.00 average
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Note: Legal, insurance, and finance industries often see CPCs of $10-$50+ due to high
              customer lifetime value.
            </p>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['cpc']} className="w-full">
              {/* CPC Calculator Section */}
              <AccordionItem value="cpc" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    Cost Per Click (CPC)
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

                    {/* Clicks Input */}
                    <div className="space-y-2">
                      <Label htmlFor={clicksId} className="text-sm text-neutral-600">
                        Total clicks
                      </Label>
                      <div className="relative">
                        <Input
                          id={clicksId}
                          type="number"
                          placeholder="0"
                          value={clicks}
                          onChange={(e) => setClicks(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* CPC Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">CPC (Cost Per Click)</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={cpc !== null ? cpc.toFixed(2) : ''}
                          placeholder="—"
                          className="pr-16 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* Total Clicks Display */}
                    {totalClicks !== null && totalClicks > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">Total clicks received</Label>
                        <div className="relative">
                          <Input
                            readOnly
                            value={totalClicks.toLocaleString()}
                            className="h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                          />
                        </div>
                      </div>
                    )}

                    {/* Performance Indicator */}
                    {cpc !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          cpc > 5
                            ? 'text-performance-loss'
                            : cpc > 2
                              ? 'text-performance-breakeven'
                              : cpc > 0.5
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {cpc > 5 &&
                          'High CPC. Consider improving ad quality or adjusting targeting.'}
                        {cpc > 2 && cpc <= 5 && 'Above average CPC. May be a competitive industry.'}
                        {cpc > 0.5 && cpc <= 2 && 'Average CPC range for most platforms.'}
                        {cpc <= 0.5 && 'Excellent CPC. Very cost-efficient clicks!'}
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
            shareDisabled={cpc === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default CPCCalculator;
