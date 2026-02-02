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

const RepeatPurchaseRateCalculator = () => {
  const [repeatCustomers, setRepeatCustomers] = useState('');
  const [totalCustomers, setTotalCustomers] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const repeatCustomersId = useId();
  const totalCustomersId = useId();

  const calculateRPR = (): number | null => {
    const repeat = parseFloat(repeatCustomers);
    const total = parseFloat(totalCustomers);
    if (Number.isNaN(repeat) || Number.isNaN(total) || total === 0) return null;
    return (repeat / total) * 100;
  };

  const rpr = calculateRPR();

  const handleShare = () => {
    shareToClipboard(
      rpr !== null
        ? `My Repeat Purchase Rate: ${rpr.toFixed(2)}%\nRepeat Customers: ${repeatCustomers}\nTotal Customers: ${totalCustomers}\n\nCalculated with Repeat Purchase Rate Calculator`
        : null,
    );
  };

  const handleClear = () => {
    setRepeatCustomers('');
    setTotalCustomers('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  const getPerformanceIndicator = () => {
    if (rpr === null) return null;
    if (rpr >= 40) {
      return {
        text: '🚀 Excellent! Top-tier retention, typical of subscription-based businesses.',
        className: 'text-performance-excellent',
      };
    }
    if (rpr >= 25) {
      return {
        text: '✅ Good repeat rate. Above the ecommerce average of 15-30%.',
        className: 'text-performance-good',
      };
    }
    if (rpr >= 15) {
      return {
        text: '📊 Average repeat rate. Room for improvement with retention strategies.',
        className: 'text-performance-breakeven',
      };
    }
    return {
      text: '⚠️ Below average. Focus on customer experience and loyalty programs.',
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
            What is Repeat Purchase Rate?
          </h2>
          <p className="text-neutral-600">
            Repeat Purchase Rate (RPR), also known as Repeat Customer Rate, measures the percentage
            of customers who have made more than one purchase from your business. It's a direct
            indicator of customer loyalty, product satisfaction, and the overall health of your
            brand. A higher rate signals that your products and customer experience are meeting
            expectations.
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Why is Repeat Purchase Rate Important?
          </h2>
          <ul className="space-y-2 text-neutral-600">
            <li>
              <strong>Cost Efficiency:</strong> Acquiring new customers costs 5-7x more than
              retaining existing ones
            </li>
            <li>
              <strong>Higher Profitability:</strong> Repeat customers spend more per order and have
              higher lifetime value
            </li>
            <li>
              <strong>Brand Health:</strong> A high RPR indicates strong customer satisfaction and
              brand loyalty
            </li>
            <li>
              <strong>Sustainable Growth:</strong> Some brands barely break even on first sales.
              Profit comes from repeat purchases
            </li>
            <li>
              <strong>Predictable Revenue:</strong> Repeat customers create more stable, predictable
              revenue streams
            </li>
          </ul>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            How to Calculate Repeat Purchase Rate
          </h2>
          <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-center mb-4">
            RPR = (Repeat Customers / Total Customers) × 100
          </div>
          <p className="text-neutral-600 mb-4">
            <strong>Example:</strong> If you have 2,500 total customers and 625 have purchased more
            than once:
          </p>
          <div className="bg-primary/10 p-4 rounded-lg">
            <p className="text-center">
              RPR = (625 / 2,500) × 100 = <span className="font-bold text-primary">25%</span>
            </p>
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            What is a Good Repeat Purchase Rate?
          </h2>
          <p className="text-neutral-600 mb-4">
            The average repeat customer rate in ecommerce ranges from <strong>15-30%</strong>, but
            varies widely by industry:
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded bg-performance-excellent/10">
              <span>Above 40%</span>
              <span className="text-performance-excellent font-semibold">Excellent</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-performance-good/10">
              <span>25% - 40%</span>
              <span className="text-performance-good font-semibold">Good</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-performance-breakeven/10">
              <span>15% - 25%</span>
              <span className="text-performance-breakeven font-semibold">Average</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-performance-loss/10">
              <span>Below 15%</span>
              <span className="text-performance-loss font-semibold">Below Average</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Average RPR by Industry (2024-2025)
          </h2>
          <p className="text-neutral-600 mb-4">
            Benchmarks vary significantly based on product type and purchase frequency:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs lg:text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 font-medium text-neutral-500">Industry</th>
                  <th className="text-right py-2 font-medium text-neutral-500">Avg. RPR</th>
                </tr>
              </thead>
              <tbody className="text-neutral-600">
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Grocery & Food Delivery</td>
                  <td className="text-right font-medium text-performance-excellent tabular-nums">
                    40%+
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Pet Supplies</td>
                  <td className="text-right font-medium text-performance-excellent tabular-nums">
                    30%+
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Health & Supplements</td>
                  <td className="text-right font-medium text-performance-good tabular-nums">
                    ~29%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Beauty & Cosmetics</td>
                  <td className="text-right font-medium text-performance-good tabular-nums">
                    ~26%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Fashion & Apparel</td>
                  <td className="text-right font-medium text-performance-good tabular-nums">
                    ~25%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Electronics & Tech</td>
                  <td className="text-right font-medium text-performance-breakeven tabular-nums">
                    ~18%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Home & Furniture</td>
                  <td className="text-right font-medium text-performance-loss tabular-nums">
                    ~15%
                  </td>
                </tr>
                <tr>
                  <td className="py-2">Luxury Goods</td>
                  <td className="text-right font-medium text-performance-loss tabular-nums">
                    ~10%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-500 mt-3">
            Sources: MobiLoud, Bluecore, Shopify, Metrilo (2024-2025 benchmarks)
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Why Industry Rates Vary
          </h2>
          <div className="space-y-4 text-neutral-600">
            <div>
              <h3 className="font-semibold text-neutral-800 mb-1">Consumables = Higher RPR</h3>
              <p className="text-sm">
                Products like groceries, supplements, and pet food require regular repurchasing,
                naturally boosting repeat rates.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-800 mb-1">High-Ticket = Lower RPR</h3>
              <p className="text-sm">
                Furniture, electronics, and luxury items are infrequent purchases. Customers may not
                return for months or years.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-800 mb-1">Subscription Models Excel</h3>
              <p className="text-sm">
                Chewy reports 78% of sales from Autoship subscriptions. Subscriptions dramatically
                increase repeat purchase behavior.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            How to Improve Your Repeat Purchase Rate
          </h2>
          <ul className="space-y-3 text-neutral-600">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              <span>
                <strong>Launch a Loyalty Program:</strong> Reward repeat purchases with points,
                discounts, or exclusive perks
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              <span>
                <strong>Offer Subscriptions:</strong> Auto-replenishment for consumables ensures
                regular repeat purchases
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              <span>
                <strong>Personalize Communications:</strong> Targeted emails based on purchase
                history drive 2nd and 3rd orders
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">4.</span>
              <span>
                <strong>Excellent Customer Service:</strong> Quick resolutions turn one-time buyers
                into loyal customers
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">5.</span>
              <span>
                <strong>Post-Purchase Engagement:</strong> Follow up after delivery with tips,
                related products, and review requests
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
                Repeat Purchase Rate Calculator
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 lg:space-y-6">
                {/* Repeat Customers Input */}
                <div className="space-y-2">
                  <Label htmlFor={repeatCustomersId}>Customers Who Bought More Than Once</Label>
                  <Input
                    id={repeatCustomersId}
                    type="number"
                    placeholder="Enter number of repeat customers"
                    value={repeatCustomers}
                    onChange={(e) => setRepeatCustomers(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* Total Customers Input */}
                <div className="space-y-2">
                  <Label htmlFor={totalCustomersId}>Total Customers</Label>
                  <Input
                    id={totalCustomersId}
                    type="number"
                    placeholder="Enter total number of customers"
                    value={totalCustomers}
                    onChange={(e) => setTotalCustomers(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* RPR Result */}
                <div className="space-y-2">
                  <Label>Repeat Purchase Rate</Label>
                  <Input
                    readOnly
                    value={rpr !== null ? `${rpr.toFixed(2)}%` : '—'}
                    className="h-11 lg:h-12 text-base font-semibold bg-neutral-50 border border-neutral-100 rounded-xl"
                  />
                </div>

                {/* Performance Indicator */}
                {performance && (
                  <div
                    className={`p-4 rounded-lg bg-neutral-50 border border-neutral-100 rounded-xl ${performance.className}`}
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
          shareDisabled={rpr === null}
        />

        {/* Feedback Section */}
        <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
      </div>
    </div>
  );
};

export default RepeatPurchaseRateCalculator;
