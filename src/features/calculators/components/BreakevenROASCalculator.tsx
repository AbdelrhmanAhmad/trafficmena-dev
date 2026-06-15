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

const BreakevenROASCalculator = () => {
  const [grossMargin, setGrossMargin] = useState('');
  const [currentROAS, setCurrentROAS] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const grossMarginId = useId();
  const beROASId = useId();
  const currentROASId = useId();

  // Break-even ROAS = 1 / Gross Margin %
  const calculateBreakevenROAS = (): number | null => {
    const margin = parseFloat(grossMargin);
    if (Number.isNaN(margin) || margin <= 0 || margin > 100) return null;
    return 1 / (margin / 100);
  };

  const calculateProfitMarginPerDollar = (): number | null => {
    const beROAS = calculateBreakevenROAS();
    const current = parseFloat(currentROAS);
    if (beROAS === null || Number.isNaN(current) || current <= 0) return null;
    // Profit per dollar = (Current ROAS - BE ROAS) / Current ROAS * Margin
    const margin = parseFloat(grossMargin) / 100;
    return (current - beROAS) * margin;
  };

  const breakevenROAS = calculateBreakevenROAS();
  const profitPerDollar = calculateProfitMarginPerDollar();
  const currentROASValue = parseFloat(currentROAS);
  const isProfitable =
    breakevenROAS !== null && !Number.isNaN(currentROASValue) && currentROASValue > breakevenROAS;

  const handleShare = () => {
    const results =
      breakevenROAS !== null
        ? `Break-even ROAS Calculator Results:
Gross Margin: ${grossMargin}%
Break-even ROAS: ${breakevenROAS.toFixed(2)}x
${currentROAS ? `Current ROAS: ${currentROAS}x` : ''}
${isProfitable ? 'Status: Profitable' : breakevenROAS && currentROAS ? 'Status: Below break-even' : ''}`
        : null;

    shareToClipboard(results);
  };

  const handleClear = () => {
    setGrossMargin('');
    setCurrentROAS('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Left Column - Educational Content */}
      <div className="space-y-4 lg:space-y-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-neutral-800">What is Break-even ROAS?</h2>
          <p className="text-neutral-600">
            Break-even ROAS (Return on Ad Spend) is the minimum ROAS you need to achieve to cover
            your costs and not lose money on advertising. It's the point where your ad revenue
            exactly equals your total costs (including both ad spend and cost of goods sold).
          </p>
          <p className="text-neutral-600">
            Any ROAS above your break-even point generates profit, while any ROAS below means you're
            losing money on those ad campaigns.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800">
            Why is Break-even ROAS Important?
          </h2>
          <ul className="list-disc list-inside text-neutral-600 space-y-2">
            <li>
              <strong className="text-neutral-800">Sets minimum performance targets:</strong> Gives
              you a clear threshold for campaign profitability
            </li>
            <li>
              <strong className="text-neutral-800">Prevents losses:</strong> Helps identify
              unprofitable campaigns before they drain budget
            </li>
            <li>
              <strong className="text-neutral-800">Guides bid strategies:</strong> Informs target
              ROAS bidding in platforms like Google Ads
            </li>
            <li>
              <strong className="text-neutral-800">Product-level insights:</strong> Different
              products have different margins, thus different break-even points
            </li>
            <li>
              <strong className="text-neutral-800">Strategic decisions:</strong> Helps decide when
              to scale or cut campaigns
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800">
            How to Calculate Break-even ROAS
          </h2>
          <p className="text-neutral-600">The formula is elegantly simple:</p>
          <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4">
            <code className="text-primary-green font-mono">
              Break-even ROAS = 1 / Gross Margin %
            </code>
          </div>
          <p className="text-neutral-600 mt-4">
            <strong className="text-neutral-800">Example:</strong> If your gross margin is 40%:
          </p>
          <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 space-y-2">
            <p className="font-mono text-xs lg:text-sm">Break-even ROAS = 1 / 0.40</p>
            <p className="font-mono text-xs lg:text-sm">Break-even ROAS = 2.5x</p>
          </div>
          <p className="text-neutral-600 mt-2">
            This means you need to generate $2.50 in revenue for every $1 spent on ads just to break
            even. Anything above 2.5x ROAS is profit.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800">
            Break-even ROAS by Gross Margin
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs lg:text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 font-medium text-neutral-500">Gross Margin</th>
                  <th className="text-left py-2 font-medium text-neutral-500">Break-even ROAS</th>
                  <th className="text-left py-2 font-medium text-neutral-500">Common Industries</th>
                </tr>
              </thead>
              <tbody className="text-neutral-600">
                <tr className="border-b border-neutral-100">
                  <td className="py-2 tabular-nums">20%</td>
                  <td className="py-2 text-performance-loss font-medium tabular-nums">5.0x</td>
                  <td className="py-2">Grocery, Low-margin retail</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2 tabular-nums">30%</td>
                  <td className="py-2 text-performance-breakeven font-medium tabular-nums">
                    3.33x
                  </td>
                  <td className="py-2">Consumer electronics</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2 tabular-nums">40%</td>
                  <td className="py-2 text-performance-breakeven font-medium tabular-nums">2.5x</td>
                  <td className="py-2">Fashion, Apparel</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2 tabular-nums">50%</td>
                  <td className="py-2 text-performance-good font-medium tabular-nums">2.0x</td>
                  <td className="py-2">Beauty, Cosmetics</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2 tabular-nums">60%</td>
                  <td className="py-2 text-performance-good font-medium tabular-nums">1.67x</td>
                  <td className="py-2">Jewelry, Luxury goods</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2 tabular-nums">70%</td>
                  <td className="py-2 text-performance-excellent font-medium tabular-nums">
                    1.43x
                  </td>
                  <td className="py-2">Software, Digital products</td>
                </tr>
                <tr>
                  <td className="py-2 tabular-nums">80%</td>
                  <td className="py-2 text-performance-excellent font-medium tabular-nums">
                    1.25x
                  </td>
                  <td className="py-2">SaaS, Subscriptions</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800">
            How to Lower Your Break-even ROAS
          </h2>
          <ul className="list-disc list-inside text-neutral-600 space-y-2">
            <li>
              <strong className="text-neutral-800">Increase gross margins:</strong> Negotiate better
              supplier costs or raise prices strategically
            </li>
            <li>
              <strong className="text-neutral-800">Reduce COGS:</strong> Optimize manufacturing,
              shipping, and fulfillment costs
            </li>
            <li>
              <strong className="text-neutral-800">Focus on high-margin products:</strong>
              Prioritize ad spend on products with better margins
            </li>
            <li>
              <strong className="text-neutral-800">Bundle products:</strong> Create bundles that
              increase average order value and margin
            </li>
            <li>
              <strong className="text-neutral-800">Factor in LTV:</strong> Consider customer
              lifetime value for acquisition campaigns
            </li>
          </ul>
        </div>
      </div>

      {/* Right Column - Calculator */}
      <div className="space-y-4 lg:space-y-6">
        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Accordion type="single" defaultValue="calculator" collapsible>
            <AccordionItem value="calculator" className="border-none">
              <AccordionTrigger className="px-0 py-4 hover:no-underline">
                <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                  Calculate Break-even ROAS
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-6">
                <div className="space-y-4 lg:space-y-6">
                  {/* Gross Margin Input */}
                  <div className="space-y-2">
                    <Label htmlFor={grossMarginId} className="text-sm text-neutral-600">
                      Gross Margin (%)
                    </Label>
                    <div className="relative">
                      <Input
                        id={grossMarginId}
                        type="number"
                        placeholder="e.g., 40"
                        value={grossMargin}
                        onChange={(e) => setGrossMargin(e.target.value)}
                        className="pr-12 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Gross Margin = (Revenue - COGS) / Revenue × 100
                    </p>
                  </div>

                  {/* Break-even ROAS Output */}
                  <div className="space-y-2">
                    <Label htmlFor={beROASId} className="text-sm text-neutral-600">
                      Break-even ROAS
                    </Label>
                    <div className="relative">
                      <Input
                        id={beROASId}
                        type="text"
                        value={breakevenROAS !== null ? `${breakevenROAS.toFixed(2)}x` : ''}
                        readOnly
                        className="h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 font-semibold tabular-nums"
                        placeholder="Enter gross margin above"
                      />
                    </div>
                    {breakevenROAS !== null && (
                      <p className="text-sm text-neutral-600">
                        You need at least {breakevenROAS.toFixed(2)}x ROAS to break even
                      </p>
                    )}
                  </div>

                  {/* Optional: Current ROAS */}
                  <div className="space-y-2">
                    <Label htmlFor={currentROASId} className="text-sm text-neutral-600">
                      Current ROAS (Optional)
                    </Label>
                    <div className="relative">
                      <Input
                        id={currentROASId}
                        type="number"
                        placeholder="e.g., 3.5"
                        value={currentROAS}
                        onChange={(e) => setCurrentROAS(e.target.value)}
                        className="pr-8 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        min="0"
                        step="0.01"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600">
                        x
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Enter your current ROAS to see if you're profitable
                    </p>
                  </div>

                  {/* Profitability Status */}
                  {breakevenROAS !== null && currentROAS && (
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">Profitability Status</Label>
                      <div
                        className={`p-4 rounded-lg border ${
                          isProfitable
                            ? 'bg-primary-green/10 border-primary-green/30'
                            : 'bg-destructive/10 border-destructive/30'
                        }`}
                      >
                        {isProfitable ? (
                          <>
                            <p className="text-performance-excellent font-semibold">Profitable!</p>
                            <p className="text-sm text-neutral-600 mt-1">
                              Your ROAS of {currentROASValue.toFixed(2)}x is{' '}
                              <span className="tabular-nums">
                                {(
                                  ((currentROASValue - breakevenROAS) / breakevenROAS) *
                                  100
                                ).toFixed(1)}
                                %
                              </span>{' '}
                              above break-even
                            </p>
                            {profitPerDollar !== null && (
                              <p className="text-sm text-neutral-600">
                                Estimated profit:{' '}
                                <span className="tabular-nums">${profitPerDollar.toFixed(2)}</span>{' '}
                                per $1 ad spend
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-performance-loss font-semibold">Below Break-even</p>
                            <p className="text-sm text-neutral-600 mt-1">
                              Your ROAS of {currentROASValue.toFixed(2)}x is{' '}
                              <span className="tabular-nums">
                                {(
                                  ((breakevenROAS - currentROASValue) / breakevenROAS) *
                                  100
                                ).toFixed(1)}
                                %
                              </span>{' '}
                              below break-even
                            </p>
                            <p className="text-sm text-neutral-600">
                              You need to increase ROAS by{' '}
                              <span className="tabular-nums">
                                {(breakevenROAS - currentROASValue).toFixed(2)}x
                              </span>{' '}
                              to break even
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Performance Indicator */}
                  {breakevenROAS !== null && (
                    <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-100">
                      {breakevenROAS >= 4 && (
                        <p className="text-performance-loss">
                          High break-even ROAS ({breakevenROAS.toFixed(2)}x). Low margins make
                          profitable advertising challenging. Consider improving margins or focusing
                          on LTV.
                        </p>
                      )}
                      {breakevenROAS >= 2.5 && breakevenROAS < 4 && (
                        <p className="text-performance-breakeven">
                          Moderate break-even ROAS ({breakevenROAS.toFixed(2)}
                          x). Achievable with well-optimized campaigns. Target ROAS of{' '}
                          {(breakevenROAS * 1.5).toFixed(1)}x+ for healthy profits.
                        </p>
                      )}
                      {breakevenROAS >= 1.5 && breakevenROAS < 2.5 && (
                        <p className="text-performance-good">
                          Good break-even ROAS ({breakevenROAS.toFixed(2)}x). Healthy margins give
                          you room for profitable scaling.
                        </p>
                      )}
                      {breakevenROAS < 1.5 && (
                        <p className="text-performance-excellent">
                          Excellent break-even ROAS ({breakevenROAS.toFixed(2)}
                          x). High margins mean almost any positive ROAS is profitable!
                        </p>
                      )}
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
          shareDisabled={breakevenROAS === null}
        />

        {/* Feedback Section */}
        <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
      </div>
    </div>
  );
};

export default BreakevenROASCalculator;
