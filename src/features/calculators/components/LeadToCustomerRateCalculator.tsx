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

const LeadToCustomerRateCalculator = () => {
  const [totalLeads, setTotalLeads] = useState('');
  const [customersAcquired, setCustomersAcquired] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const totalLeadsId = useId();
  const customersAcquiredId = useId();

  const calculateConversionRate = (): number | null => {
    const leads = parseFloat(totalLeads);
    const customers = parseFloat(customersAcquired);
    if (Number.isNaN(leads) || Number.isNaN(customers) || leads === 0) return null;
    return (customers / leads) * 100;
  };

  const conversionRate = calculateConversionRate();

  const handleShare = () => {
    const text =
      conversionRate !== null
        ? `My Lead-to-Customer Rate: ${conversionRate.toFixed(2)}%\nTotal Leads: ${totalLeads}\nCustomers Acquired: ${customersAcquired}\n\nCalculated with Lead-to-Customer Rate Calculator`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setTotalLeads('');
    setCustomersAcquired('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  const getPerformanceIndicator = () => {
    if (conversionRate === null) return null;
    if (conversionRate >= 5) {
      return {
        text: 'Excellent! Top-tier conversion rate. Your sales funnel is highly optimized.',
        className: 'text-performance-excellent',
      };
    }
    if (conversionRate >= 3) {
      return {
        text: 'Good. Above the 2-5% B2B average. Strong sales process in place.',
        className: 'text-performance-good',
      };
    }
    if (conversionRate >= 1) {
      return {
        text: 'Average. Within typical B2B range (1-3%). Room for optimization.',
        className: 'text-performance-breakeven',
      };
    }
    return {
      text: 'Below average. Review lead quality and sales process bottlenecks.',
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
            What is Lead-to-Customer Rate?
          </h2>
          <p className="text-neutral-600">
            Lead-to-Customer Rate (also called Lead Conversion Rate) measures the percentage of
            leads that convert into paying customers. It's one of the most critical B2B metrics,
            showing how effectively your sales funnel turns prospects into revenue. According to
            2025 benchmark data, the
            <strong> average lead-to-customer conversion rate is 2-5%</strong> across B2B
            industries.
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Why is Lead-to-Customer Rate Important?
          </h2>
          <ul className="space-y-2 text-neutral-600">
            <li>
              <strong>Sales Efficiency:</strong> Measures how well your sales team converts leads
              into revenue
            </li>
            <li>
              <strong>Marketing ROI:</strong> Shows if your lead generation efforts attract
              qualified buyers
            </li>
            <li>
              <strong>CAC Impact:</strong> A 1-point lift (e.g., 2% → 3%) can cut Customer
              Acquisition Cost by 15-25%
            </li>
            <li>
              <strong>Funnel Health:</strong> Identifies bottlenecks between marketing and sales
              handoffs
            </li>
            <li>
              <strong>Revenue Forecasting:</strong> Essential for predicting pipeline and setting
              growth targets
            </li>
          </ul>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            How to Calculate Lead-to-Customer Rate
          </h2>
          <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-center mb-4">
            Rate = (Customers Acquired / Total Leads) × 100
          </div>
          <p className="text-neutral-600 mb-4">
            <strong>Example:</strong> If you generate 500 leads and 15 become paying customers:
          </p>
          <div className="bg-primary/10 p-4 rounded-lg">
            <p className="text-center">
              Rate = (15 / 500) × 100 = <span className="font-bold text-primary">3%</span>
            </p>
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Lead-to-Customer Rate by Industry (2025)
          </h2>
          <p className="text-neutral-600 mb-4">
            Conversion rates vary significantly by industry vertical:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs lg:text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 font-medium text-neutral-500">Industry</th>
                  <th className="text-right py-2 font-medium text-neutral-500">Avg. Rate</th>
                </tr>
              </thead>
              <tbody className="text-neutral-600">
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Legal Services</td>
                  <td className="text-right font-medium text-performance-excellent tabular-nums">
                    7.4%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Professional Services</td>
                  <td className="text-right font-medium text-performance-excellent tabular-nums">
                    4-6%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Healthcare</td>
                  <td className="text-right font-medium text-performance-good tabular-nums">
                    3-4%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Manufacturing</td>
                  <td className="text-right font-medium text-performance-good tabular-nums">
                    3-5%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Financial Services</td>
                  <td className="text-right font-medium text-performance-breakeven tabular-nums">
                    1.9%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">B2B E-commerce</td>
                  <td className="text-right font-medium text-performance-breakeven tabular-nums">
                    1.8%
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">IT / Managed Services</td>
                  <td className="text-right font-medium text-performance-breakeven tabular-nums">
                    1.5%
                  </td>
                </tr>
                <tr>
                  <td className="py-2">SaaS / Software</td>
                  <td className="text-right font-medium text-performance-loss tabular-nums">
                    1.1-3%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-500 mt-3">
            Sources: First Page Sage, Ruler Analytics (2025 benchmarks)
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Conversion Rate by Marketing Channel
          </h2>
          <p className="text-neutral-600 mb-4">
            Different channels produce leads with varying conversion potential:
          </p>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 rounded bg-performance-excellent/10">
              <span className="text-neutral-600">Referral Traffic</span>
              <span className="font-semibold text-performance-excellent tabular-nums">2.9%</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-performance-good/10">
              <span className="text-neutral-600">Organic Search (SEO)</span>
              <span className="font-semibold text-performance-good tabular-nums">2.6-2.7%</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-performance-good/10">
              <span className="text-neutral-600">Email Marketing</span>
              <span className="font-semibold text-performance-good tabular-nums">2.4%</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-performance-breakeven/10">
              <span className="text-neutral-600">Paid Search (PPC)</span>
              <span className="font-semibold text-performance-breakeven tabular-nums">
                1.5-3.2%
              </span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-performance-loss/10">
              <span className="text-neutral-600">Social Media</span>
              <span className="font-semibold text-performance-loss tabular-nums">~1%</span>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-3">
            Source: First Page Sage, Ruler Analytics (2025)
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            Funnel Stage Benchmarks
          </h2>
          <p className="text-neutral-600 mb-4">
            B2B funnels lose over 90% of leads before opportunity stage. Stage-by-stage breakdown:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs lg:text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 font-medium text-neutral-500">Stage</th>
                  <th className="text-right py-2 font-medium text-neutral-500">Avg. Rate</th>
                  <th className="text-right py-2 font-medium text-neutral-500">Top Performers</th>
                </tr>
              </thead>
              <tbody className="text-neutral-600">
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Visitor → Lead</td>
                  <td className="text-right tabular-nums">~2%</td>
                  <td className="text-right text-performance-good tabular-nums">4-5%</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Lead → MQL</td>
                  <td className="text-right tabular-nums">31%</td>
                  <td className="text-right text-performance-good tabular-nums">40-50%</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">MQL → SQL</td>
                  <td className="text-right tabular-nums">13%</td>
                  <td className="text-right text-performance-good tabular-nums">20-25%</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">SQL → Opportunity</td>
                  <td className="text-right tabular-nums">50%</td>
                  <td className="text-right text-performance-good tabular-nums">55-62%</td>
                </tr>
                <tr>
                  <td className="py-2">Opportunity → Customer</td>
                  <td className="text-right tabular-nums">25%</td>
                  <td className="text-right text-performance-good tabular-nums">30-40%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-500 mt-3">
            Note: MQL→SQL is typically the biggest bottleneck
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
            How to Improve Lead-to-Customer Rate
          </h2>
          <ul className="space-y-3 text-neutral-600">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              <span>
                <strong>Speed to Lead:</strong> Responding within 5 minutes is 21x more likely to
                qualify a lead than waiting 30 minutes
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              <span>
                <strong>Improve Lead Scoring:</strong> Tighten MQL definitions and align with sales.
                The MQL→SQL gap causes most losses
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              <span>
                <strong>Focus on SEO:</strong> SEO leads have 51% MQL→SQL conversion vs 26% for PPC
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">4.</span>
              <span>
                <strong>Optimize Landing Pages:</strong> CRO sprints can lift visitor→lead by 1-2
                percentage points
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">5.</span>
              <span>
                <strong>Use AI Scoring:</strong> Predictive models identify high-intent leads 20-30%
                faster
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">6.</span>
              <span>
                <strong>Sales-Marketing Alignment:</strong> Regular feedback loops on lead quality
                improve conversion throughout funnel
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
                Lead-to-Customer Rate Calculator
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 lg:space-y-6">
                {/* Total Leads Input */}
                <div className="space-y-2">
                  <Label htmlFor={totalLeadsId} className="text-sm text-neutral-600">
                    Total Leads
                  </Label>
                  <Input
                    id={totalLeadsId}
                    type="number"
                    placeholder="Enter total number of leads"
                    value={totalLeads}
                    onChange={(e) => setTotalLeads(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* Customers Acquired Input */}
                <div className="space-y-2">
                  <Label htmlFor={customersAcquiredId} className="text-sm text-neutral-600">
                    Customers Acquired
                  </Label>
                  <Input
                    id={customersAcquiredId}
                    type="number"
                    placeholder="Enter number of new customers"
                    value={customersAcquired}
                    onChange={(e) => setCustomersAcquired(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* Conversion Rate Result */}
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-600">Lead-to-Customer Rate</Label>
                  <Input
                    readOnly
                    value={conversionRate !== null ? `${conversionRate.toFixed(2)}%` : '—'}
                    className="h-11 lg:h-12 text-base font-semibold bg-muted border-neutral-200"
                  />
                </div>

                {/* Performance Indicator */}
                {performance && (
                  <div
                    className={`p-4 rounded-lg bg-neutral-50 border border-neutral-100 ${performance.className}`}
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
          shareDisabled={conversionRate === null}
        />

        {/* Feedback Section */}
        <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
      </div>
    </div>
  );
};

export default LeadToCustomerRateCalculator;
