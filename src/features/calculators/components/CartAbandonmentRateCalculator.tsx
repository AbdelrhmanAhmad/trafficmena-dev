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

const CartAbandonmentRateCalculator = () => {
  const [cartsCreated, setCartsCreated] = useState('');
  const [cartsCompleted, setCartsCompleted] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const cartsCreatedId = useId();
  const cartsCompletedId = useId();

  const calculateAbandonmentRate = (): number | null => {
    const created = parseFloat(cartsCreated);
    const completed = parseFloat(cartsCompleted);
    if (Number.isNaN(created) || Number.isNaN(completed) || created === 0) return null;
    const abandoned = created - completed;
    return (abandoned / created) * 100;
  };

  const abandonmentRate = calculateAbandonmentRate();

  const handleShare = () => {
    const text =
      abandonmentRate !== null
        ? `My Cart Abandonment Rate: ${abandonmentRate.toFixed(2)}%\nCarts Created: ${cartsCreated}\nCarts Completed: ${cartsCompleted}\n\nCalculated with Cart Abandonment Rate Calculator`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setCartsCreated('');
    setCartsCompleted('');
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
        text: 'Excellent! Well below global average. Your checkout is highly optimized.',
        className: 'text-performance-excellent',
      };
    }
    if (abandonmentRate < 70) {
      return {
        text: 'Good. Below the global average of ~70%. Room for minor improvements.',
        className: 'text-performance-good',
      };
    }
    if (abandonmentRate < 80) {
      return {
        text: 'Average. Matches typical ecommerce rates. Focus on checkout friction.',
        className: 'text-performance-breakeven',
      };
    }
    return {
      text: 'High abandonment. Review pricing transparency and checkout flow.',
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
            What is Cart Abandonment Rate?
          </h2>
          <p className="text-neutral-600">
            Cart Abandonment Rate measures the percentage of online shoppers who add items to their
            shopping cart but leave before completing the purchase. It's a critical ecommerce metric
            that reveals friction in your checkout process, pricing concerns, or trust issues.
            According to Baymard Institute, the average documented online cart abandonment rate is{' '}
            <strong>70.22%</strong> based on 50 different studies.
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Why is Cart Abandonment Rate Important?
          </h2>
          <ul className="space-y-2 text-neutral-600">
            <li>
              <strong>Revenue Impact:</strong> Ecommerce stores lose roughly $18 billion annually
              due to cart abandonment
            </li>
            <li>
              <strong>Checkout Optimization:</strong> Identifies friction points in your purchase
              flow
            </li>
            <li>
              <strong>Customer Experience:</strong> Reveals gaps in trust, pricing, or UX that drive
              customers away
            </li>
            <li>
              <strong>Marketing ROI:</strong> High abandonment wastes acquisition spend. You're
              paying for traffic that doesn't convert
            </li>
            <li>
              <strong>Recovery Opportunities:</strong> Cart recovery emails can recapture ~10% of
              lost revenue
            </li>
          </ul>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            How to Calculate Cart Abandonment Rate
          </h2>
          <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-center mb-4">
            Abandonment Rate = ((Carts Created - Carts Completed) / Carts Created) × 100
          </div>
          <p className="text-neutral-600 mb-4">
            <strong>Example:</strong> If 1,000 shopping carts are created and only 300 complete
            checkout:
          </p>
          <div className="bg-primary/10 p-4 rounded-lg">
            <p className="text-center">
              Rate = ((1,000 - 300) / 1,000) × 100 ={' '}
              <span className="font-bold text-primary">70%</span>
            </p>
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Cart Abandonment Rate by Industry (2024)
          </h2>
          <p className="text-neutral-600 mb-4">
            Abandonment rates vary significantly by product type and price point:
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
                  <td className="py-2">Luxury & Jewelry</td>
                  <td className="text-right font-medium text-performance-loss tabular-nums">
                    82.84%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Beauty & Personal Care</td>
                  <td className="text-right font-medium text-performance-loss tabular-nums">
                    80.92%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Home & Furniture</td>
                  <td className="text-right font-medium text-performance-loss tabular-nums">
                    80.32%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Fashion & Apparel</td>
                  <td className="text-right font-medium text-performance-breakeven tabular-nums">
                    78.53%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Multi-brand Retail</td>
                  <td className="text-right font-medium text-performance-breakeven tabular-nums">
                    76.90%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Food & Beverage</td>
                  <td className="text-right font-medium text-performance-good tabular-nums">
                    63.62%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Consumer Goods</td>
                  <td className="text-right font-medium text-performance-good tabular-nums">
                    57.37%
                  </td>
                </tr>
                <tr>
                  <td className="py-2">Pet Care & Veterinary</td>
                  <td className="text-right font-medium text-performance-excellent tabular-nums">
                    54.78%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-500 mt-3">
            Source: ClickPost, Baymard Institute (2024 benchmarks)
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Top Reasons Customers Abandon Carts
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 rounded bg-neutral-50 border border-neutral-100 rounded-xl">
              <span className="text-neutral-600">Extra costs (shipping, tax, fees)</span>
              <span className="font-semibold text-neutral-800 tabular-nums">48%</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-neutral-50 border border-neutral-100 rounded-xl">
              <span className="text-neutral-600">Required account creation</span>
              <span className="font-semibold text-neutral-800 tabular-nums">26%</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-neutral-50 border border-neutral-100 rounded-xl">
              <span className="text-neutral-600">Don't trust site with card info</span>
              <span className="font-semibold text-neutral-800 tabular-nums">25%</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-neutral-50 border border-neutral-100 rounded-xl">
              <span className="text-neutral-600">Slow delivery</span>
              <span className="font-semibold text-neutral-800 tabular-nums">23%</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-neutral-50 border border-neutral-100 rounded-xl">
              <span className="text-neutral-600">Long/complicated checkout</span>
              <span className="font-semibold text-neutral-800 tabular-nums">22%</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-neutral-50 border border-neutral-100 rounded-xl">
              <span className="text-neutral-600">Couldn't see total cost upfront</span>
              <span className="font-semibold text-neutral-800 tabular-nums">21%</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Abandonment by Device
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-performance-loss/10">
              <p className="text-xl lg:text-2xl font-semibold text-performance-loss tabular-nums">
                75.5%
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
                ~67%
              </p>
              <p className="text-sm text-neutral-600">Desktop</p>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-3 text-center">
            Mobile users abandon more due to smaller screens and complex forms
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            How to Reduce Cart Abandonment
          </h2>
          <ul className="space-y-3 text-neutral-600">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              <span>
                <strong>Show All Costs Upfront:</strong> Display shipping, taxes, and fees on
                product pages, not at checkout
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              <span>
                <strong>Enable Guest Checkout:</strong> 26% abandon because of mandatory account
                creation
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              <span>
                <strong>Add Trust Badges:</strong> Display security seals and payment icons
                prominently
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">4.</span>
              <span>
                <strong>Simplify Checkout:</strong> Keep it under 3 steps; use address auto-fill
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">5.</span>
              <span>
                <strong>Send Recovery Emails:</strong> Abandoned cart emails can recover ~10% of
                lost orders
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">6.</span>
              <span>
                <strong>Offer Multiple Payment Options:</strong> Include digital wallets, BNPL, and
                local methods
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
                Cart Abandonment Rate Calculator
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 lg:space-y-6">
                {/* Carts Created Input */}
                <div className="space-y-2">
                  <Label htmlFor={cartsCreatedId} className="text-sm text-neutral-600">
                    Shopping Carts Created
                  </Label>
                  <Input
                    id={cartsCreatedId}
                    type="number"
                    placeholder="Enter number of carts created"
                    value={cartsCreated}
                    onChange={(e) => setCartsCreated(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* Carts Completed Input */}
                <div className="space-y-2">
                  <Label htmlFor={cartsCompletedId} className="text-sm text-neutral-600">
                    Completed Purchases
                  </Label>
                  <Input
                    id={cartsCompletedId}
                    type="number"
                    placeholder="Enter number of completed purchases"
                    value={cartsCompleted}
                    onChange={(e) => setCartsCompleted(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* Abandonment Rate Result */}
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-600">Cart Abandonment Rate</Label>
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

export default CartAbandonmentRateCalculator;
