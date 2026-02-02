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

const MoMGrowthCalculator = () => {
  const [previousValue, setPreviousValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [startValue, setStartValue] = useState('');
  const [endValue, setEndValue] = useState('');
  const [numberOfMonths, setNumberOfMonths] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const previousValueId = useId();
  const currentValueId = useId();
  const startValueId = useId();
  const endValueId = useId();
  const numberOfMonthsId = useId();

  // MoM Growth = (Current - Previous) / Previous × 100
  const calculateMoMGrowth = (): number | null => {
    const prev = parseFloat(previousValue);
    const curr = parseFloat(currentValue);
    if (Number.isNaN(prev) || Number.isNaN(curr) || prev <= 0) return null;
    return ((curr - prev) / prev) * 100;
  };

  // CMGR = (End Value / Start Value)^(1/n) - 1
  const calculateCMGR = (): number | null => {
    const start = parseFloat(startValue);
    const end = parseFloat(endValue);
    const months = parseFloat(numberOfMonths);
    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      Number.isNaN(months) ||
      start <= 0 ||
      months <= 0
    )
      return null;
    return ((end / start) ** (1 / months) - 1) * 100;
  };

  const momGrowth = calculateMoMGrowth();
  const cmgr = calculateCMGR();

  const handleShare = () => {
    const hasResults = momGrowth !== null || cmgr !== null;
    if (!hasResults) return;

    let results = 'Month-Over-Month Growth Calculator Results\n';
    if (momGrowth !== null) {
      results += `Previous Month Value: ${formatCurrency(previousValue, currency)}\n`;
      results += `Current Month Value: ${formatCurrency(currentValue, currency)}\n`;
      results += `MoM Growth: ${momGrowth.toFixed(2)}%\n\n`;
    }
    if (cmgr !== null) {
      results += `Start Value: ${formatCurrency(startValue, currency)}\n`;
      results += `End Value: ${formatCurrency(endValue, currency)}\n`;
      results += `Number of Months: ${numberOfMonths}\n`;
      results += `CMGR: ${cmgr.toFixed(2)}%\n`;
    }
    shareToClipboard(hasResults ? results : null);
  };

  const handleClear = () => {
    setPreviousValue('');
    setCurrentValue('');
    setStartValue('');
    setEndValue('');
    setNumberOfMonths('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 p-5 lg:p-6">
      {/* Left Column - Educational Content */}
      <div className="space-y-4 lg:space-y-6">
        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold mb-3 text-neutral-800">
            What is Month-Over-Month Growth?
          </h2>
          <p className="text-neutral-600 leading-relaxed">
            Month-over-month (MoM) growth measures the percentage change in a specific metric from
            one month to the next. It's a critical indicator used by businesses to understand quick
            changes in market conditions, operational results, and overall performance trajectories.
          </p>
          <p className="text-neutral-600 leading-relaxed mt-3">
            MoM calculations are commonly used across business functions including finance (revenue
            monitoring), marketing (follower growth), sales (customer acquisition), and production
            (volume tracking).
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold mb-3 text-neutral-800">
            Why is MoM Growth Important?
          </h2>
          <ul className="text-neutral-600 space-y-2">
            <li>
              <strong className="text-neutral-800">Identify Short-term Trends:</strong> Detect
              changes that aren't apparent from longer periods, allowing rapid adaptation
            </li>
            <li>
              <strong className="text-neutral-800">Spot Seasonal Patterns:</strong> Understand
              cyclicality for inventory, staffing, and marketing planning
            </li>
            <li>
              <strong className="text-neutral-800">Set Measurable Targets:</strong> Provides
              actionable KPIs to motivate teams and align efforts
            </li>
            <li>
              <strong className="text-neutral-800">Startup Validation:</strong> Evaluate whether
              products are gaining market traction
            </li>
            <li>
              <strong className="text-neutral-800">Distress Monitoring:</strong> Track if business
              is improving or deteriorating for strategic decisions
            </li>
          </ul>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold mb-3 text-neutral-800">
            How to Calculate MoM Growth
          </h2>
          <p className="text-neutral-600 mb-3">The formula to calculate month-over-month growth:</p>
          <code className="block bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm mb-3">
            MoM Growth = (Current Month - Previous Month) / Previous Month × 100
          </code>
          <p className="text-neutral-600 mb-3">Alternatively:</p>
          <code className="block bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm mb-3">
            MoM Growth = (Current Month / Previous Month) - 1
          </code>
          <p className="text-neutral-600">
            <strong>Example:</strong> If you had 200 active users in January and 240 in February:
          </p>
          <code className="block bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm mt-2">
            MoM Growth = (240 - 200) / 200 × 100 = 20%
          </code>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold mb-3 text-neutral-800">
            Compound Monthly Growth Rate (CMGR)
          </h2>
          <p className="text-neutral-600 mb-3">
            CMGR measures the average month-over-month growth over a longer period, accounting for
            compounding effects. It's similar to CAGR but on a monthly basis.
          </p>
          <code className="block bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm mb-3">
            CMGR = (End Value / Start Value)^(1/n) - 1
          </code>
          <p className="text-neutral-600">
            Where <strong>n</strong> is the number of months between measurements.
          </p>
          <p className="text-neutral-600 mt-3">
            <strong>Example:</strong> If users grew from 10,000 in January to 20,000 in December (11
            months):
          </p>
          <code className="block bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm mt-2">
            CMGR = (20,000 / 10,000)^(1/11) - 1 = 6.5%
          </code>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold mb-3 text-neutral-800">
            What is Good MoM Growth?
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200/60">
                  <th className="text-left py-2 text-neutral-800">Business Stage</th>
                  <th className="text-left py-2 text-neutral-800">Good MoM Growth</th>
                  <th className="text-left py-2 text-neutral-800">Status</th>
                </tr>
              </thead>
              <tbody className="text-neutral-600">
                <tr className="border-b border-neutral-200/60">
                  <td className="py-2">Early-stage Startup</td>
                  <td className="py-2">15-20%+</td>
                  <td className="py-2 text-performance-excellent">Excellent</td>
                </tr>
                <tr className="border-b border-neutral-200/60">
                  <td className="py-2">SaaS (Pre-$1M ARR)</td>
                  <td className="py-2">10-20%</td>
                  <td className="py-2 text-performance-good">Good</td>
                </tr>
                <tr className="border-b border-neutral-200/60">
                  <td className="py-2">SaaS (Post-$1M ARR)</td>
                  <td className="py-2">5-15%</td>
                  <td className="py-2 text-performance-good">Healthy</td>
                </tr>
                <tr className="border-b border-neutral-200/60">
                  <td className="py-2">Mature Company</td>
                  <td className="py-2">2-5%</td>
                  <td className="py-2 text-performance-breakeven">Stable</td>
                </tr>
                <tr>
                  <td className="py-2">Any Stage</td>
                  <td className="py-2">&lt; 0%</td>
                  <td className="py-2 text-performance-loss">Declining</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-500 mt-3">
            Source: Wall Street Prep, Corporate Finance Institute, SaaS Insights
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold mb-3 text-neutral-800">
            MoM vs Other Growth Metrics
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200/60">
                  <th className="text-left py-2 text-neutral-800">Metric</th>
                  <th className="text-left py-2 text-neutral-800">Time Frame</th>
                  <th className="text-left py-2 text-neutral-800">Best For</th>
                </tr>
              </thead>
              <tbody className="text-neutral-600">
                <tr className="border-b border-neutral-200/60">
                  <td className="py-2 font-medium text-neutral-800">MoM</td>
                  <td className="py-2">Monthly</td>
                  <td className="py-2">Short-term trends, quick decisions</td>
                </tr>
                <tr className="border-b border-neutral-200/60">
                  <td className="py-2 font-medium text-neutral-800">QoQ</td>
                  <td className="py-2">Quarterly</td>
                  <td className="py-2">Quarterly planning, investor updates</td>
                </tr>
                <tr className="border-b border-neutral-200/60">
                  <td className="py-2 font-medium text-neutral-800">YoY</td>
                  <td className="py-2">Yearly</td>
                  <td className="py-2">Long-term trends, removing seasonality</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-neutral-800">CMGR</td>
                  <td className="py-2">Multi-month avg</td>
                  <td className="py-2">Smoothed growth rate over time</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Right Column - Calculator */}
      <div className="space-y-4 lg:space-y-6">
        <Card className="border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Accordion type="single" collapsible defaultValue="mom-calculator">
            <AccordionItem value="mom-calculator" className="border-none">
              <AccordionTrigger className="px-5 lg:px-6 py-4 hover:no-underline">
                <span className="text-base lg:text-lg font-semibold text-neutral-800">
                  MoM Growth Calculator
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-5 lg:px-6 pb-5 lg:pb-6">
                <div className="space-y-4">
                  {/* Previous Month Value */}
                  <div className="space-y-2">
                    <Label htmlFor={previousValueId}>Previous Month Value</Label>
                    <div className="relative">
                      <Input
                        id={previousValueId}
                        type="number"
                        placeholder="e.g., 100000"
                        value={previousValue}
                        onChange={(e) => setPreviousValue(e.target.value)}
                        className="pr-24 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                      />
                      <div className="absolute right-1 top-1 bottom-1">
                        <Select
                          value={currency}
                          onValueChange={(value: CurrencyCode) => setCurrency(value)}
                        >
                          <SelectTrigger className="h-full w-20 border-0 bg-muted">
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

                  {/* Current Month Value */}
                  <div className="space-y-2">
                    <Label htmlFor={currentValueId}>Current Month Value</Label>
                    <div className="relative">
                      <Input
                        id={currentValueId}
                        type="number"
                        placeholder="e.g., 120000"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        className="pr-24 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                      />
                      <div className="absolute right-1 top-1 bottom-1">
                        <Select
                          value={currency}
                          onValueChange={(value: CurrencyCode) => setCurrency(value)}
                        >
                          <SelectTrigger className="h-full w-20 border-0 bg-muted">
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

                  {/* MoM Growth Result */}
                  <div className="space-y-2">
                    <Label>MoM Growth Rate</Label>
                    <Input
                      readOnly
                      value={momGrowth !== null ? `${momGrowth.toFixed(2)}%` : '—'}
                      className="h-11 lg:h-12 text-base font-semibold bg-muted border-neutral-200"
                    />
                  </div>

                  {/* Performance Indicator */}
                  {momGrowth !== null && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      {momGrowth < 0 && (
                        <p className="text-performance-loss text-sm">
                          Negative growth indicates decline. Analyze root causes immediately.
                        </p>
                      )}
                      {momGrowth >= 0 && momGrowth < 5 && (
                        <p className="text-performance-breakeven text-sm">
                          Slow growth. Consider strategies to accelerate momentum.
                        </p>
                      )}
                      {momGrowth >= 5 && momGrowth < 15 && (
                        <p className="text-performance-good text-sm">
                          Healthy growth rate for established businesses.
                        </p>
                      )}
                      {momGrowth >= 15 && (
                        <p className="text-performance-excellent text-sm">
                          Excellent growth! Typical for high-performing startups.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* CMGR Calculator */}
        <Card className="border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Accordion type="single" collapsible defaultValue="cmgr-calculator">
            <AccordionItem value="cmgr-calculator" className="border-none">
              <AccordionTrigger className="px-5 lg:px-6 py-4 hover:no-underline">
                <span className="text-base lg:text-lg font-semibold text-neutral-800">
                  Compound Monthly Growth Rate (CMGR)
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-5 lg:px-6 pb-5 lg:pb-6">
                <div className="space-y-4">
                  {/* Start Value */}
                  <div className="space-y-2">
                    <Label htmlFor={startValueId}>Start Value (Month 1)</Label>
                    <div className="relative">
                      <Input
                        id={startValueId}
                        type="number"
                        placeholder="e.g., 10000"
                        value={startValue}
                        onChange={(e) => setStartValue(e.target.value)}
                        className="pr-24 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                      />
                      <div className="absolute right-1 top-1 bottom-1">
                        <Select
                          value={currency}
                          onValueChange={(value: CurrencyCode) => setCurrency(value)}
                        >
                          <SelectTrigger className="h-full w-20 border-0 bg-muted">
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

                  {/* End Value */}
                  <div className="space-y-2">
                    <Label htmlFor={endValueId}>End Value (Final Month)</Label>
                    <div className="relative">
                      <Input
                        id={endValueId}
                        type="number"
                        placeholder="e.g., 20000"
                        value={endValue}
                        onChange={(e) => setEndValue(e.target.value)}
                        className="pr-24 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                      />
                      <div className="absolute right-1 top-1 bottom-1">
                        <Select
                          value={currency}
                          onValueChange={(value: CurrencyCode) => setCurrency(value)}
                        >
                          <SelectTrigger className="h-full w-20 border-0 bg-muted">
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

                  {/* Number of Months */}
                  <div className="space-y-2">
                    <Label htmlFor={numberOfMonthsId}>Number of Months Between</Label>
                    <Input
                      id={numberOfMonthsId}
                      type="number"
                      placeholder="e.g., 11"
                      value={numberOfMonths}
                      onChange={(e) => setNumberOfMonths(e.target.value)}
                      className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                    />
                    <p className="text-xs text-neutral-500">
                      Note: Count months between start and end (Jan to Dec = 11 months)
                    </p>
                  </div>

                  {/* CMGR Result */}
                  <div className="space-y-2">
                    <Label>Compound Monthly Growth Rate</Label>
                    <Input
                      readOnly
                      value={cmgr !== null ? `${cmgr.toFixed(2)}%` : '—'}
                      className="h-11 lg:h-12 text-base font-semibold bg-muted border-neutral-200"
                    />
                  </div>

                  {/* CMGR Performance Indicator */}
                  {cmgr !== null && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      {cmgr < 0 && (
                        <p className="text-performance-loss text-sm">
                          Negative CMGR indicates overall decline over the period.
                        </p>
                      )}
                      {cmgr >= 0 && cmgr < 3 && (
                        <p className="text-performance-breakeven text-sm">
                          Low compound growth. Typical for mature, stable businesses.
                        </p>
                      )}
                      {cmgr >= 3 && cmgr < 10 && (
                        <p className="text-performance-good text-sm">
                          Solid compound growth rate for growing businesses.
                        </p>
                      )}
                      {cmgr >= 10 && (
                        <p className="text-performance-excellent text-sm">
                          Exceptional compound growth! Strong momentum.
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
          shareDisabled={momGrowth === null && cmgr === null}
        />

        {/* Feedback Section */}
        <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
      </div>
    </div>
  );
};

export default MoMGrowthCalculator;
