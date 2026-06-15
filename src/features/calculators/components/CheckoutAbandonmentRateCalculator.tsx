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

const CheckoutAbandonmentRateCalculator = () => {
  const [checkoutsStarted, setCheckoutsStarted] = useState('');
  const [checkoutsCompleted, setCheckoutsCompleted] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const checkoutsStartedId = useId();
  const checkoutsCompletedId = useId();

  const calculateAbandonmentRate = (): number | null => {
    const started = parseFloat(checkoutsStarted);
    const completed = parseFloat(checkoutsCompleted);
    if (Number.isNaN(started) || Number.isNaN(completed) || started === 0) return null;
    const abandoned = started - completed;
    return (abandoned / started) * 100;
  };

  const abandonmentRate = calculateAbandonmentRate();

  const handleShare = () => {
    const text =
      abandonmentRate !== null
        ? `My Checkout Abandonment Rate: ${abandonmentRate.toFixed(2)}%\nCheckouts Started: ${checkoutsStarted}\nCheckouts Completed: ${checkoutsCompleted}\n\nCalculated with Checkout Abandonment Rate Calculator`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setCheckoutsStarted('');
    setCheckoutsCompleted('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  const getPerformanceIndicator = () => {
    if (abandonmentRate === null) return null;
    if (abandonmentRate < 55) {
      return {
        text: 'Excellent! Well below the 55-65% benchmark. Your checkout is highly optimized.',
        className: 'text-performance-excellent',
      };
    }
    if (abandonmentRate < 65) {
      return {
        text: 'Good. Within the optimal 55-65% range for checkout abandonment.',
        className: 'text-performance-good',
      };
    }
    if (abandonmentRate < 75) {
      return {
        text: 'Average. Room for improvement. Review checkout friction points.',
        className: 'text-performance-breakeven',
      };
    }
    return {
      text: 'High abandonment (>75%). Significant bottlenecks need immediate attention.',
      className: 'text-performance-loss',
    };
  };

  const performance = getPerformanceIndicator();

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Left Column - Educational Content */}
      <div className="space-y-4 lg:space-y-6">
        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            What is Checkout Abandonment Rate?
          </h2>
          <p className="text-neutral-600">
            Checkout Abandonment Rate measures the percentage of shoppers who{' '}
            <strong>start the checkout process</strong> but leave before completing their purchase.
            Unlike cart abandonment (which tracks all created carts), checkout abandonment
            specifically focuses on users who demonstrated clear purchase intent by initiating
            checkout. The global average checkout abandonment rate is approximately{' '}
            <strong>75.19%</strong>.
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Checkout vs Cart Abandonment
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-xl">
              <h3 className="font-semibold text-neutral-800 mb-2">Cart Abandonment (~70%)</h3>
              <p className="text-sm text-neutral-600">
                Measures shoppers who add items to cart but never proceed to checkout. Includes
                window shoppers and price comparers.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10">
              <h3 className="font-semibold text-neutral-800 mb-2">Checkout Abandonment (~75%)</h3>
              <p className="text-sm text-neutral-600">
                Measures shoppers who start checkout but don't complete it. These users showed clear
                purchase intent, making this more actionable for optimization.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            How to Calculate Checkout Abandonment Rate
          </h2>
          <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-center mb-4">
            Rate = ((Checkouts Started - Checkouts Completed) / Checkouts Started) × 100
          </div>
          <p className="text-neutral-600 mb-4">
            <strong>Example:</strong> If 100 customers begin checkout but only 30 complete their
            purchase:
          </p>
          <div className="bg-primary/10 p-4 rounded-lg">
            <p className="text-center">
              Rate = ((100 - 30) / 100) × 100 = <span className="font-bold text-primary">70%</span>
            </p>
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            What is a Good Checkout Abandonment Rate?
          </h2>
          <p className="text-neutral-600 mb-4">
            According to AgencyAnalytics, benchmark rates for checkout abandonment are:
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded bg-performance-excellent/10">
              <span>Below 55%</span>
              <span className="text-performance-excellent font-semibold">Excellent</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-performance-good/10">
              <span>55% - 65%</span>
              <span className="text-performance-good font-semibold">Good (Optimal Range)</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-performance-breakeven/10">
              <span>65% - 75%</span>
              <span className="text-performance-breakeven font-semibold">Average</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-performance-loss/10">
              <span>Above 75%</span>
              <span className="text-performance-loss font-semibold">Needs Attention</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Checkout Abandonment by Industry
          </h2>
          <p className="text-neutral-600 mb-4">
            Different industries experience varying checkout abandonment rates:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs lg:text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 font-medium text-neutral-500">Industry</th>
                  <th className="text-right py-2 font-medium text-neutral-500">Abandonment Rate</th>
                </tr>
              </thead>
              <tbody className="text-neutral-600">
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Finance</td>
                  <td className="text-right font-medium text-performance-loss tabular-nums">
                    83.6%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Travel</td>
                  <td className="text-right font-medium text-performance-loss tabular-nums">
                    81.7%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Fashion</td>
                  <td className="text-right font-medium text-performance-breakeven tabular-nums">
                    74.8%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Retail (General)</td>
                  <td className="text-right font-medium text-performance-breakeven tabular-nums">
                    71.2%
                  </td>
                </tr>
                <tr>
                  <td className="py-2">Health & Beauty</td>
                  <td className="text-right font-medium text-performance-good tabular-nums">
                    68.3%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-500 mt-3">
            Sources: OpenSend, Hotjar, VWO (2024 benchmarks)
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Top Reasons for Checkout Abandonment
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 bg-neutral-50 border border-neutral-100 rounded-xl">
              <span className="text-neutral-600">Unexpected costs (shipping, tax, fees)</span>
              <span className="font-semibold text-neutral-800 tabular-nums">48%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-neutral-50 border border-neutral-100 rounded-xl">
              <span className="text-neutral-600">Required account creation</span>
              <span className="font-semibold text-neutral-800 tabular-nums">35%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-neutral-50 border border-neutral-100 rounded-xl">
              <span className="text-neutral-600">Long/complicated checkout process</span>
              <span className="font-semibold text-neutral-800 tabular-nums">21%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-neutral-50 border border-neutral-100 rounded-xl">
              <span className="text-neutral-600">Too complex/confusing checkout</span>
              <span className="font-semibold text-neutral-800 tabular-nums">17%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-neutral-50 border border-neutral-100 rounded-xl">
              <span className="text-neutral-600">Website errors/crashes</span>
              <span className="font-semibold text-neutral-800 tabular-nums">13%</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Checkout Abandonment by Device
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-performance-loss/10">
              <p className="text-xl lg:text-2xl font-semibold text-performance-loss tabular-nums">
                85.6%
              </p>
              <p className="text-sm text-neutral-600">Mobile</p>
            </div>
            <div className="p-4 rounded-lg bg-performance-breakeven/10">
              <p className="text-xl lg:text-2xl font-semibold text-performance-breakeven tabular-nums">
                68.5%
              </p>
              <p className="text-sm text-neutral-600">Tablet</p>
            </div>
            <div className="p-4 rounded-lg bg-performance-good/10">
              <p className="text-xl lg:text-2xl font-semibold text-performance-good tabular-nums">
                69.0%
              </p>
              <p className="text-sm text-neutral-600">Desktop</p>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-3 text-center">
            Mobile checkout abandonment can be 17% higher than desktop (Source: Hotjar)
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            How to Reduce Checkout Abandonment
          </h2>
          <ul className="space-y-3 text-neutral-600">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              <span>
                <strong>Streamline Checkout:</strong> Keep to 12-14 form elements max, or 7-8 actual
                fields. Each extra step increases abandonment.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              <span>
                <strong>Show Costs Early:</strong> Display shipping, taxes, and fees before
                checkout. Surprises cause 48% of abandonments.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              <span>
                <strong>Offer Guest Checkout:</strong> Requiring account creation increases
                abandonment by 35%.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">4.</span>
              <span>
                <strong>Add Progress Indicators:</strong> Show users where they are in the checkout
                process.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">5.</span>
              <span>
                <strong>Optimize for Mobile:</strong> Mobile abandonment is 17% higher. Prioritize
                mobile-first design.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">6.</span>
              <span>
                <strong>Display Trust Signals:</strong> Security badges and payment icons reduce
                trust concerns.
              </span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Right Column - Calculator */}
      <div className="space-y-4 lg:space-y-6">
        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Accordion type="single" collapsible defaultValue="calculator">
            <AccordionItem value="calculator" className="border-none">
              <AccordionTrigger className="text-lg lg:text-xl font-semibold text-neutral-800 hover:no-underline">
                Checkout Abandonment Rate Calculator
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 lg:space-y-6">
                {/* Checkouts Started Input */}
                <div className="space-y-2">
                  <Label htmlFor={checkoutsStartedId} className="text-sm text-neutral-600">
                    Checkouts Started
                  </Label>
                  <Input
                    id={checkoutsStartedId}
                    type="number"
                    placeholder="Enter number of checkouts initiated"
                    value={checkoutsStarted}
                    onChange={(e) => setCheckoutsStarted(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* Checkouts Completed Input */}
                <div className="space-y-2">
                  <Label htmlFor={checkoutsCompletedId} className="text-sm text-neutral-600">
                    Checkouts Completed
                  </Label>
                  <Input
                    id={checkoutsCompletedId}
                    type="number"
                    placeholder="Enter number of completed purchases"
                    value={checkoutsCompleted}
                    onChange={(e) => setCheckoutsCompleted(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* Abandonment Rate Result */}
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-600">Checkout Abandonment Rate</Label>
                  <Input
                    readOnly
                    value={abandonmentRate !== null ? `${abandonmentRate.toFixed(2)}%` : '—'}
                    className="h-11 lg:h-12 text-base font-semibold bg-neutral-50 border border-neutral-100 rounded-xl"
                  />
                </div>

                {/* Performance Indicator */}
                {performance && (
                  <div
                    className={`p-4 bg-neutral-50 border border-neutral-100 rounded-xl ${performance.className}`}
                  >
                    {performance.text}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Action Buttons */}
        <CalculatorActionButtons
          onShare={handleShare}
          onClear={handleClear}
          shareDisabled={abandonmentRate === null}
        />

        {/* Feedback Section */}
        <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
      </div>
    </div>
  );
};

export default CheckoutAbandonmentRateCalculator;
