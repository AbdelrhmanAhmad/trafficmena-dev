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

const CVRCalculator = () => {
  const [conversions, setConversions] = useState<string>('');
  const [visitors, setVisitors] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const conversionsId = useId();
  const visitorsId = useId();

  const calculateCVR = (): number | null => {
    const totalConversions = parseFloat(conversions);
    const totalVisitors = parseFloat(visitors);
    if (Number.isNaN(totalConversions) || Number.isNaN(totalVisitors) || totalVisitors === 0)
      return null;
    return (totalConversions / totalVisitors) * 100;
  };

  const cvr = calculateCVR();

  const handleShare = () => {
    const text =
      cvr !== null
        ? `My CVR: ${cvr.toFixed(2)}% | Conversions: ${parseInt(conversions, 10).toLocaleString()} | Visitors: ${parseInt(visitors, 10).toLocaleString()}`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setConversions('');
    setVisitors('');
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
              What is CVR?: Conversion Rate
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              CVR, or <strong className="text-neutral-800">Conversion Rate</strong>, is a marketing
              metric that measures{' '}
              <strong className="text-neutral-800">
                the percentage of visitors who complete a desired action
              </strong>{' '}
              on your website, landing page, or app.
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              A "conversion" can be any valuable action: making a purchase, signing up for a
              newsletter, downloading a resource, filling out a form, or starting a free trial. CVR
              is one of the most critical metrics for evaluating{' '}
              <strong className="text-neutral-800">funnel efficiency</strong> and user experience.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Why is CVR Important?
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Measures Funnel Effectiveness:</strong> Shows
                  how well your site converts traffic into customers or leads
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Reduces Acquisition Costs:</strong> Higher
                  CVR means more customers from the same traffic, lowering CAC
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Identifies UX Issues:</strong> Low CVR often
                  signals friction in the user journey
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Enables A/B Testing:</strong> Track
                  conversion lift from experiments and optimizations
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Calculate CVR: The Formula
            </h2>
            <p className="text-neutral-600 mb-4">The CVR formula is:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">CVR = (Conversions ÷ Total Visitors) × 100</code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              For example, if your landing page received{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                5,000 visitors
              </span>{' '}
              and{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                150 conversions
              </span>
              , your CVR is{' '}
              <span className="bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded font-mono text-sm">
                (150 ÷ 5,000) × 100 = 3%
              </span>
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              This means <strong className="text-neutral-800">3% of visitors</strong> completed the
              desired action.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              What is a Good CVR?
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              A "good" CVR varies significantly by industry, traffic source, and conversion type:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">Below 1%:</strong> Poor. Significant
                  optimization needed
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">1% - 2%:</strong> Below average. Room for
                  improvement
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">2% - 5%:</strong> Average to good for most
                  industries
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">Above 5%:</strong> Excellent. Top-performing
                  pages
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Average CVR by Industry (2025)
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              Conversion rate benchmarks vary across industries and conversion types:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">eCommerce:</strong> 2-3% average purchase
                  rate
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">SaaS Free Trial:</strong> 3-8%
                  visitor-to-trial
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">Lead Generation:</strong> 5-15% form
                  completion
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">B2B Services:</strong> 2-5% average
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">Finance/Insurance:</strong> 1-3% average
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">Email Opt-in:</strong> 5-15% average
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Note: Paid traffic typically has higher CVR than organic due to intent. Mobile CVR is
              often 50% lower than desktop.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Improve CVR
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Optimize Page Speed:</strong> Every 1-second
                  delay reduces conversions by ~7%
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Simplify Forms:</strong> Reduce fields to
                  only what's essential
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Add Social Proof:</strong> Reviews,
                  testimonials, and trust badges increase confidence
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Clear CTAs:</strong> Use action-oriented,
                  contrasting buttons
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-green mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Mobile Optimization:</strong> Ensure seamless
                  experience on all devices
                </span>
              </li>
            </ul>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['cvr']} className="w-full">
              {/* CVR Calculator Section */}
              <AccordionItem value="cvr" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    Conversion Rate (CVR)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="space-y-4 lg:space-y-6">
                    {/* Conversions Input */}
                    <div className="space-y-2">
                      <Label htmlFor={conversionsId} className="text-sm text-neutral-600">
                        Total conversions
                      </Label>
                      <div className="relative">
                        <Input
                          id={conversionsId}
                          type="number"
                          placeholder="0"
                          value={conversions}
                          onChange={(e) => setConversions(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* Visitors Input */}
                    <div className="space-y-2">
                      <Label htmlFor={visitorsId} className="text-sm text-neutral-600">
                        Total visitors
                      </Label>
                      <div className="relative">
                        <Input
                          id={visitorsId}
                          type="number"
                          placeholder="0"
                          value={visitors}
                          onChange={(e) => setVisitors(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* CVR Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">CVR (Conversion Rate)</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={cvr !== null ? cvr.toFixed(2) : ''}
                          placeholder="—"
                          className="pr-10 h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 rounded-xl font-semibold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {cvr !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          cvr < 1
                            ? 'text-performance-loss'
                            : cvr < 2
                              ? 'text-performance-breakeven'
                              : cvr < 5
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {cvr < 1 && 'Low CVR. Significant optimization needed on your funnel.'}
                        {cvr >= 1 && cvr < 2 && 'Below average CVR. Room for improvement.'}
                        {cvr >= 2 && cvr < 5 && 'Good CVR. Performing well for most industries.'}
                        {cvr >= 5 && 'Excellent CVR. Top-performing conversion rate!'}
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
            shareDisabled={cvr === null}
          />

          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default CVRCalculator;
