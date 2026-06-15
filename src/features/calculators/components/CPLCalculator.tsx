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

const CPLCalculator = () => {
  const [totalSpend, setTotalSpend] = useState('');
  const [leadsGenerated, setLeadsGenerated] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const totalSpendId = useId();
  const leadsGeneratedId = useId();

  const calculateCPL = (): number | null => {
    const spend = parseFloat(totalSpend);
    const leads = parseFloat(leadsGenerated);
    if (Number.isNaN(spend) || Number.isNaN(leads) || leads === 0) return null;
    return spend / leads;
  };

  const cpl = calculateCPL();

  const handleShare = () => {
    const text =
      cpl !== null
        ? `My Cost Per Lead (CPL): ${formatCurrency(cpl, currency)}\nTotal Spend: ${formatCurrency(totalSpend, currency)}\nLeads Generated: ${leadsGenerated}\n\nCalculated with CPL Calculator`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setTotalSpend('');
    setLeadsGenerated('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  const getPerformanceIndicator = () => {
    if (cpl === null) return null;
    if (cpl < 100) {
      return {
        text: '🚀 Excellent CPL! Well below industry average.',
        className: 'text-performance-excellent',
      };
    }
    if (cpl < 300) {
      return {
        text: '✅ Good CPL. Competitive for most industries.',
        className: 'text-performance-good',
      };
    }
    if (cpl < 600) {
      return {
        text: '📊 Above average CPL. Typical for B2B/SaaS sectors.',
        className: 'text-performance-breakeven',
      };
    }
    return {
      text: '⚠️ High CPL. Ensure lead quality justifies the cost.',
      className: 'text-performance-loss',
    };
  };

  const performance = getPerformanceIndicator();

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Left Column - Educational Content */}
      <div className="space-y-4 lg:space-y-6">
        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold mb-3 text-neutral-800">
            What is CPL (Cost Per Lead)?
          </h2>
          <p className="text-sm lg:text-base text-neutral-600 leading-relaxed">
            Cost Per Lead (CPL) measures how much money you spend on marketing or advertising to
            acquire a single lead. A lead is a potential customer who has shown interest in your
            product or service by providing contact information or taking a qualifying action. CPL
            is distinct from CAC (Customer Acquisition Cost), which measures the cost to acquire an
            actual paying customer.
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold mb-3 text-neutral-800">
            Why is CPL Important?
          </h2>
          <ul className="space-y-2 text-sm lg:text-base text-neutral-600">
            <li>
              <strong>Budget Allocation:</strong> Helps determine which channels deliver the most
              cost-effective leads
            </li>
            <li>
              <strong>Campaign Comparison:</strong> Enables direct comparison of different marketing
              campaigns
            </li>
            <li>
              <strong>Forecasting:</strong> Predicts lead volume based on available marketing budget
            </li>
            <li>
              <strong>Marketing Efficiency:</strong> Measures how efficiently your marketing spend
              converts to pipeline
            </li>
            <li>
              <strong>ROI Calculation:</strong> Essential input for calculating overall marketing
              ROI when combined with conversion rates
            </li>
          </ul>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold mb-3 text-neutral-800">
            How to Calculate CPL
          </h2>
          <div className="bg-neutral-50 border border-neutral-100 p-3 lg:p-4 rounded-xl font-mono text-sm text-center mb-4 text-neutral-700">
            CPL = Total Marketing Spend / Number of Leads Generated
          </div>
          <p className="text-sm lg:text-base text-neutral-600 mb-3">
            <strong className="text-neutral-700">Example:</strong> If you spend{' '}
            {formatCurrency('5,000', currency)} on a Google Ads campaign and generate 50 leads:
          </p>
          <div className="bg-emerald-50/50 border border-emerald-100 p-3 lg:p-4 rounded-xl">
            <p className="text-sm lg:text-base text-center text-neutral-700">
              CPL = {formatCurrency('5,000', currency)} / 50 ={' '}
              <span className="font-semibold text-emerald-600">
                {formatCurrency(100, currency)}
              </span>{' '}
              per lead
            </p>
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold mb-3 text-neutral-800">
            Average CPL by Industry (2024-2025)
          </h2>
          <p className="text-sm lg:text-base text-neutral-600 mb-4">
            According to First Page Sage research, average CPL varies significantly by industry and
            channel:
          </p>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-xs lg:text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2.5 pr-2 font-medium text-neutral-500">Industry</th>
                  <th className="text-right py-2.5 px-2 font-medium text-neutral-500">Paid CPL</th>
                  <th className="text-right py-2.5 px-2 font-medium text-neutral-500">
                    Organic CPL
                  </th>
                  <th className="text-right py-2.5 pl-2 font-medium text-neutral-500">Blended</th>
                </tr>
              </thead>
              <tbody className="text-neutral-600">
                <tr className="border-b border-neutral-100">
                  <td className="py-2.5 pr-2">eCommerce</td>
                  <td className="text-right px-2 tabular-nums">$98</td>
                  <td className="text-right px-2 tabular-nums">$83</td>
                  <td className="text-right pl-2 font-medium text-neutral-800 tabular-nums">$91</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2.5 pr-2">B2B SaaS</td>
                  <td className="text-right px-2 tabular-nums">$310</td>
                  <td className="text-right px-2 tabular-nums">$164</td>
                  <td className="text-right pl-2 font-medium text-neutral-800 tabular-nums">
                    $237
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2.5 pr-2">Healthcare</td>
                  <td className="text-right px-2 tabular-nums">$401</td>
                  <td className="text-right px-2 tabular-nums">$320</td>
                  <td className="text-right pl-2 font-medium text-neutral-800 tabular-nums">
                    $361
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2.5 pr-2">Financial Services</td>
                  <td className="text-right px-2 tabular-nums">$761</td>
                  <td className="text-right px-2 tabular-nums">$555</td>
                  <td className="text-right pl-2 font-medium text-neutral-800 tabular-nums">
                    $653
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2.5 pr-2">Legal Services</td>
                  <td className="text-right px-2 tabular-nums">$784</td>
                  <td className="text-right px-2 tabular-nums">$516</td>
                  <td className="text-right pl-2 font-medium text-neutral-800 tabular-nums">
                    $649
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-2">Higher Education</td>
                  <td className="text-right px-2 tabular-nums">$1,143</td>
                  <td className="text-right px-2 tabular-nums">$705</td>
                  <td className="text-right pl-2 font-medium text-neutral-800 tabular-nums">
                    $982
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] lg:text-xs text-neutral-400 mt-3">
            Source: First Page Sage, 2024-2025 benchmarks
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold mb-3 text-neutral-800">
            Organic vs Paid CPL
          </h2>
          <p className="text-sm lg:text-base text-neutral-600 mb-4">
            Organic marketing channels (SEO, content marketing, social media) typically deliver
            30-50% lower CPL than paid channels, though they require longer timeframes to generate
            results.
          </p>
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <div className="bg-emerald-50/50 border border-emerald-100 p-3 lg:p-4 rounded-xl">
              <h3 className="font-medium text-emerald-700 text-sm lg:text-base mb-2">
                Organic Channels
              </h3>
              <ul className="text-xs lg:text-sm text-neutral-600 space-y-1">
                <li>• SEO & Content</li>
                <li>• Email Marketing</li>
                <li>• Social Media (organic)</li>
                <li>• Referrals</li>
              </ul>
            </div>
            <div className="bg-amber-50/50 border border-amber-100 p-3 lg:p-4 rounded-xl">
              <h3 className="font-medium text-amber-700 text-sm lg:text-base mb-2">
                Paid Channels
              </h3>
              <ul className="text-xs lg:text-sm text-neutral-600 space-y-1">
                <li>• Google Ads</li>
                <li>• Meta Ads</li>
                <li>• LinkedIn Ads</li>
                <li>• Display Advertising</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold mb-3 text-neutral-800">
            How to Lower Your CPL
          </h2>
          <ul className="space-y-2.5 text-sm lg:text-base text-neutral-600">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-semibold text-xs mt-0.5">1.</span>
              <span>
                <strong className="text-neutral-700">Invest in SEO:</strong> Organic leads cost
                30-50% less than paid leads on average
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-semibold text-xs mt-0.5">2.</span>
              <span>
                <strong className="text-neutral-700">Improve Landing Pages:</strong> Higher
                conversion rates mean more leads from the same spend
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-semibold text-xs mt-0.5">3.</span>
              <span>
                <strong className="text-neutral-700">Refine Audience Targeting:</strong> Better
                targeting reduces wasted ad spend
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-semibold text-xs mt-0.5">4.</span>
              <span>
                <strong className="text-neutral-700">A/B Test Creatives:</strong> Continuously
                optimize ad copy and visuals
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-semibold text-xs mt-0.5">5.</span>
              <span>
                <strong className="text-neutral-700">Use Lead Magnets:</strong> Offer valuable
                content to increase conversion rates
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
              <AccordionTrigger className="text-lg lg:text-xl font-semibold hover:no-underline text-neutral-800">
                CPL Calculator
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-5">
                {/* Total Marketing Spend Input */}
                <div className="space-y-2">
                  <Label htmlFor={totalSpendId} className="text-sm text-neutral-600">
                    Total Marketing/Ad Spend
                  </Label>
                  <div className="relative">
                    <Input
                      id={totalSpendId}
                      type="number"
                      placeholder="Enter total spend"
                      value={totalSpend}
                      onChange={(e) => setTotalSpend(e.target.value)}
                      className="pr-24 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                    />
                    <div className="absolute right-1 top-1 bottom-1">
                      <Select
                        value={currency}
                        onValueChange={(value: CurrencyCode) => setCurrency(value)}
                      >
                        <SelectTrigger className="h-full w-20 border-0 bg-neutral-50 text-neutral-600 text-sm">
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

                {/* Leads Generated Input */}
                <div className="space-y-2">
                  <Label htmlFor={leadsGeneratedId} className="text-sm text-neutral-600">
                    Leads Generated
                  </Label>
                  <Input
                    id={leadsGeneratedId}
                    type="number"
                    placeholder="Enter number of leads"
                    value={leadsGenerated}
                    onChange={(e) => setLeadsGenerated(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* CPL Result */}
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-600">Cost Per Lead (CPL)</Label>
                  <Input
                    readOnly
                    value={cpl !== null ? formatCurrency(cpl, currency) : '—'}
                    className="h-11 lg:h-12 text-base font-semibold bg-neutral-50 border-neutral-200 text-neutral-800"
                  />
                </div>

                {/* Performance Indicator */}
                {performance && (
                  <div
                    className={`p-3 lg:p-4 rounded-xl bg-neutral-50 border border-neutral-100 text-sm ${performance.className}`}
                  >
                    {performance.text}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        <CalculatorActionButtons
          onShare={handleShare}
          onClear={handleClear}
          shareDisabled={cpl === null}
        />

        <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
      </div>
    </div>
  );
};

export default CPLCalculator;
