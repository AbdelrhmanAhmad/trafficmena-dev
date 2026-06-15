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
import { shareToClipboard } from '../utils/clipboard';
import { showFeedbackToast } from '../utils/feedback';
import { CalculatorActionButtons, CalculatorFeedback } from './shared';

const CTRCalculator = () => {
  const [clicks, setClicks] = useState<string>('');
  const [impressions, setImpressions] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const clicksId = useId();
  const impressionsId = useId();

  const calculateCTR = (): number | null => {
    const totalClicks = parseFloat(clicks);
    const totalImpressions = parseFloat(impressions);
    if (Number.isNaN(totalClicks) || Number.isNaN(totalImpressions) || totalImpressions === 0)
      return null;
    return (totalClicks / totalImpressions) * 100;
  };

  const ctr = calculateCTR();

  const handleShare = () => {
    const text =
      ctr !== null
        ? `My CTR: ${ctr.toFixed(2)}% | Clicks: ${parseInt(clicks, 10).toLocaleString()} | Impressions: ${parseInt(impressions, 10).toLocaleString()}`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setClicks('');
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
              What is CTR?: Click-Through Rate
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              CTR, or <strong className="text-neutral-800">Click-Through Rate</strong>, is a digital
              marketing metric that measures{' '}
              <strong className="text-neutral-800">
                the percentage of people who click on your ad after seeing it
              </strong>
              .
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              CTR is one of the most important metrics for evaluating ad engagement and relevance. A
              higher CTR indicates that your{' '}
              <strong className="text-neutral-800">ad copy, creative, and targeting</strong> are
              resonating with your audience.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Why is CTR Important?
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Measures Engagement:</strong> Shows how
                  compelling your ad is to your target audience
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Affects Quality Score:</strong> Higher CTR
                  improves your Quality Score on Google Ads, lowering CPC
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Indicates Relevance:</strong> Low CTR may
                  signal a mismatch between ad content and audience
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Optimizes Budget:</strong> Better CTR means
                  more efficient use of your ad spend
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Calculate CTR: The Formula
            </h2>
            <p className="text-neutral-600 mb-4">The CTR formula is:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">CTR = (Clicks / Impressions) x 100</code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              For example, if your ad received{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                150 clicks
              </span>{' '}
              from{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                10,000 impressions
              </span>
              , your CTR is{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                (150 / 10,000) x 100 = 1.5%
              </span>
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              This means <strong className="text-neutral-800">1.5% of people</strong> who saw your
              ad clicked on it.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              What is a Good CTR?
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              A "good" CTR varies by platform, industry, and ad type:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">Below 0.5%:</strong> Poor. Needs significant
                  improvement
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">0.5% - 1%:</strong> Below average. Room for
                  optimization
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">1% - 3%:</strong> Average to good for most
                  platforms
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">Above 3%:</strong> Excellent. Highly engaging
                  ads
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Average CTR by Platform (2025)
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              CTR benchmarks vary significantly across advertising platforms:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">Google Ads (Search):</strong> 3-5% average
                  (intent-based)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">Google Ads (Display):</strong> 0.5-1% average
                  (awareness)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">Meta (Facebook/Instagram):</strong> 0.9-1.5%
                  average
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">LinkedIn:</strong> 0.4-0.6% average (B2B)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">TikTok:</strong> 1-3% average (highly
                  engaging)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">Email Marketing:</strong> 2-5% average
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Note: Search ads typically have higher CTRs than display ads because users have active
              intent.
            </p>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['ctr']} className="w-full">
              {/* CTR Calculator Section */}
              <AccordionItem value="ctr" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    Click-Through Rate (CTR)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-5">
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

                    {/* CTR Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">CTR (Click-Through Rate)</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={ctr !== null ? ctr.toFixed(2) : ''}
                          placeholder="—"
                          className="pr-10 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {ctr !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          ctr < 0.5
                            ? 'text-performance-loss'
                            : ctr < 1
                              ? 'text-performance-breakeven'
                              : ctr < 3
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {ctr < 0.5 &&
                          'Low CTR. Consider improving ad copy, creative, or targeting.'}
                        {ctr >= 0.5 && ctr < 1 && 'Below average CTR. Room for optimization.'}
                        {ctr >= 1 && ctr < 3 && 'Good CTR. Your ads are performing well.'}
                        {ctr >= 3 && 'Excellent CTR. Highly engaging ads!'}
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
            shareDisabled={ctr === null}
          />

          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default CTRCalculator;
