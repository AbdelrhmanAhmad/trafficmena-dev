import { useId, useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

const SEOROICalculator = () => {
  const [monthlyTraffic, setMonthlyTraffic] = useState('20000');
  const [conversionRate, setConversionRate] = useState('3');
  const [averageOrderValue, setAverageOrderValue] = useState('50');
  const [customerLifetimeValue, setCustomerLifetimeValue] = useState('300');
  const [monthlyGrowthRate, setMonthlyGrowthRate] = useState('10');
  const [seoCost, setSeoCost] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const monthlyTrafficId = useId();
  const conversionRateId = useId();
  const averageOrderValueId = useId();
  const customerLifetimeValueId = useId();
  const monthlyGrowthRateId = useId();
  const seoCostId = useId();

  // Generate 12-month projections
  const projections = useMemo(() => {
    const traffic = parseFloat(monthlyTraffic) || 0;
    const cvr = (parseFloat(conversionRate) || 0) / 100;
    const aov = parseFloat(averageOrderValue) || 0;
    const growth = (parseFloat(monthlyGrowthRate) || 0) / 100;

    const data = [];
    let currentTraffic = traffic;

    for (let month = 1; month <= 12; month++) {
      currentTraffic = traffic * (1 + growth) ** month;
      const newSales = Math.round(currentTraffic * cvr);
      const newRevenue = newSales * aov;

      data.push({
        month,
        traffic: Math.round(currentTraffic),
        newSales,
        newRevenue,
      });
    }

    return data;
  }, [monthlyTraffic, conversionRate, averageOrderValue, monthlyGrowthRate]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalTraffic = projections.reduce((sum, p) => sum + p.traffic, 0);
    const totalSales = projections.reduce((sum, p) => sum + p.newSales, 0);
    const totalRevenue = projections.reduce((sum, p) => sum + p.newRevenue, 0);
    const seoInvestment = parseFloat(seoCost) || 0;
    const roi = seoInvestment > 0 ? ((totalRevenue - seoInvestment) / seoInvestment) * 100 : null;

    return { totalTraffic, totalSales, totalRevenue, roi };
  }, [projections, seoCost]);

  // Calculate LTV-based revenue
  const ltvRevenue = useMemo(() => {
    const ltv = parseFloat(customerLifetimeValue) || 0;
    const totalSales = projections.reduce((sum, p) => sum + p.newSales, 0);
    return totalSales * ltv;
  }, [projections, customerLifetimeValue]);

  const hasProjectedResults =
    totals.totalTraffic > 0 ||
    totals.totalSales > 0 ||
    totals.totalRevenue > 0 ||
    ltvRevenue > 0 ||
    totals.roi !== null;

  const handleShare = () => {
    let results = 'SEO ROI Calculator Results\n\n';
    results += `Monthly Traffic: ${monthlyTraffic}\n`;
    results += `Conversion Rate: ${conversionRate}%\n`;
    results += `Average Order Value: ${formatCurrency(parseFloat(averageOrderValue) || 0, currency)}\n`;
    results += `Customer Lifetime Value: ${formatCurrency(parseFloat(customerLifetimeValue) || 0, currency)}\n`;
    results += `Monthly Growth Rate: ${monthlyGrowthRate}%\n\n`;
    results += `12-Month Projected Revenue: ${formatCurrency(totals.totalRevenue, currency)}\n`;
    results += `12-Month LTV Revenue: ${formatCurrency(ltvRevenue, currency)}\n`;
    if (totals.roi !== null) {
      results += `SEO ROI: ${totals.roi.toFixed(1)}%\n`;
    }
    shareToClipboard(results);
  };

  const handleClear = () => {
    setMonthlyTraffic('');
    setConversionRate('');
    setAverageOrderValue('');
    setCustomerLifetimeValue('');
    setMonthlyGrowthRate('');
    setSeoCost('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 p-6">
      {/* Left Column - Educational Content */}
      <div className="space-y-4 lg:space-y-6">
        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-3">
            What is SEO ROI?
          </h2>
          <p className="text-neutral-600 leading-relaxed">
            SEO ROI (Return on Investment) measures how much revenue SEO activities generate for a
            business compared to their cost. It helps tie your SEO efforts directly to business
            goals and proves the value of organic search.
          </p>
          <p className="text-neutral-600 leading-relaxed mt-3">
            A positive SEO ROI means the revenue generated by your SEO strategy exceeds its cost.
            Unlike paid ads, SEO compounds over time. Traffic gains persist even after the initial
            investment.
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-3">
            How to Calculate SEO ROI
          </h2>
          <p className="text-neutral-600 mb-3">The standard SEO ROI formula:</p>
          <code className="block bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm mb-3">
            SEO ROI = (Revenue from SEO - Cost of SEO) / Cost of SEO × 100
          </code>
          <p className="text-neutral-600 mb-3">For projecting future revenue:</p>
          <code className="block bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm mb-3">
            Monthly Revenue = Traffic × Conversion Rate × Average Order Value
          </code>
          <code className="block bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm">
            Projected Traffic = Current Traffic × (1 + Growth Rate)^Month
          </code>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-3">
            SEO ROI by Industry
          </h2>
          <p className="text-neutral-600 mb-3">
            Based on First Page Sage research (3-year averages):
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs lg:text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 font-medium text-neutral-500">Industry</th>
                  <th className="text-left py-2 font-medium text-neutral-500">Avg ROI</th>
                  <th className="text-left py-2 font-medium text-neutral-500">Break-Even</th>
                </tr>
              </thead>
              <tbody className="text-neutral-600">
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Real Estate</td>
                  <td className="py-2 text-performance-excellent tabular-nums">1,389%</td>
                  <td className="py-2 tabular-nums">10 months</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Medical Device</td>
                  <td className="py-2 text-performance-excellent tabular-nums">1,183%</td>
                  <td className="py-2 tabular-nums">13 months</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Financial Services</td>
                  <td className="py-2 text-performance-excellent tabular-nums">1,031%</td>
                  <td className="py-2 tabular-nums">9 months</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">B2B SaaS</td>
                  <td className="py-2 text-performance-good tabular-nums">702%</td>
                  <td className="py-2 tabular-nums">7 months</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Manufacturing</td>
                  <td className="py-2 text-performance-good tabular-nums">813%</td>
                  <td className="py-2 tabular-nums">9 months</td>
                </tr>
                <tr>
                  <td className="py-2">eCommerce</td>
                  <td className="py-2 text-performance-breakeven tabular-nums">317%</td>
                  <td className="py-2 tabular-nums">9 months</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-500 mt-3">
            Source: First Page Sage SEO ROI Statistics 2025
          </p>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-3">
            SEO ROI by Service Type
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs lg:text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 font-medium text-neutral-500">SEO Service</th>
                  <th className="text-left py-2 font-medium text-neutral-500">Avg ROI</th>
                </tr>
              </thead>
              <tbody className="text-neutral-600">
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Technical SEO</td>
                  <td className="py-2 tabular-nums">117%</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2">Basic Content Marketing</td>
                  <td className="py-2 tabular-nums">16%</td>
                </tr>
                <tr>
                  <td className="py-2">Thought Leadership SEO</td>
                  <td className="py-2 text-performance-good tabular-nums">748%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-3">
            SEO ROI Timeline
          </h2>
          <ul className="text-neutral-600 space-y-2">
            <li>
              <strong className="text-neutral-800">Months 1-6:</strong> Foundation building,
              typically negative or break-even ROI
            </li>
            <li>
              <strong className="text-neutral-800">Months 6-12:</strong> Positive ROI typically
              achieved, traffic compounds
            </li>
            <li>
              <strong className="text-neutral-800">Year 2-3:</strong> Peak ROI as content matures
              and domain authority grows
            </li>
          </ul>
          <p className="text-neutral-600 mt-3 text-sm">
            Unlike paid ads that stop when you stop paying, SEO provides compounding returns over
            time with ongoing optimization.
          </p>
        </Card>
      </div>

      {/* Right Column - Calculator */}
      <div className="space-y-4 lg:space-y-6">
        <Card className="border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Accordion type="single" collapsible defaultValue="current-numbers">
            <AccordionItem value="current-numbers" className="border-none">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <span className="text-lg font-semibold text-neutral-800">Current Numbers</span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  {/* Monthly Traffic */}
                  <div className="space-y-2">
                    <Label htmlFor={monthlyTrafficId}>Monthly Traffic</Label>
                    <Input
                      id={monthlyTrafficId}
                      type="number"
                      placeholder="e.g., 20000"
                      value={monthlyTraffic}
                      onChange={(e) => setMonthlyTraffic(e.target.value)}
                      className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                    />
                  </div>

                  {/* Conversion Rate */}
                  <div className="space-y-2">
                    <Label htmlFor={conversionRateId}>Conversion Rate (%)</Label>
                    <Input
                      id={conversionRateId}
                      type="number"
                      placeholder="e.g., 3"
                      value={conversionRate}
                      onChange={(e) => setConversionRate(e.target.value)}
                      className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                    />
                  </div>

                  {/* Average Order Value */}
                  <div className="space-y-2">
                    <Label htmlFor={averageOrderValueId}>Average Order Value</Label>
                    <div className="relative">
                      <Input
                        id={averageOrderValueId}
                        type="number"
                        placeholder="e.g., 50"
                        value={averageOrderValue}
                        onChange={(e) => setAverageOrderValue(e.target.value)}
                        className="pr-24 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                      />
                      <div className="absolute right-1 top-1 bottom-1">
                        <Select
                          value={currency}
                          onValueChange={(value: CurrencyCode) => setCurrency(value)}
                        >
                          <SelectTrigger className="h-full w-20 border-0 bg-neutral-50">
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

                  {/* Customer Lifetime Value */}
                  <div className="space-y-2">
                    <Label htmlFor={customerLifetimeValueId}>Customer Lifetime Value</Label>
                    <div className="relative">
                      <Input
                        id={customerLifetimeValueId}
                        type="number"
                        placeholder="e.g., 300"
                        value={customerLifetimeValue}
                        onChange={(e) => setCustomerLifetimeValue(e.target.value)}
                        className="pr-24 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                      />
                      <div className="absolute right-1 top-1 bottom-1">
                        <Select
                          value={currency}
                          onValueChange={(value: CurrencyCode) => setCurrency(value)}
                        >
                          <SelectTrigger className="h-full w-20 border-0 bg-neutral-50">
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
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        <Card className="border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Accordion type="single" collapsible defaultValue="growth-potential">
            <AccordionItem value="growth-potential" className="border-none">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <span className="text-lg font-semibold text-neutral-800">Growth Potential</span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  {/* Monthly Growth Rate */}
                  <div className="space-y-2">
                    <Label htmlFor={monthlyGrowthRateId}>Monthly Growth Rate (%)</Label>
                    <Input
                      id={monthlyGrowthRateId}
                      type="number"
                      placeholder="e.g., 10"
                      value={monthlyGrowthRate}
                      onChange={(e) => setMonthlyGrowthRate(e.target.value)}
                      className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                    />
                    <p className="text-xs text-neutral-500">
                      Typical SEO growth: 5-15% MoM for well-optimized sites
                    </p>
                  </div>

                  {/* SEO Investment (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor={seoCostId}>Monthly SEO Investment (Optional)</Label>
                    <div className="relative">
                      <Input
                        id={seoCostId}
                        type="number"
                        placeholder="e.g., 5000"
                        value={seoCost}
                        onChange={(e) => setSeoCost(e.target.value)}
                        className="pr-24 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                      />
                      <div className="absolute right-1 top-1 bottom-1">
                        <Select
                          value={currency}
                          onValueChange={(value: CurrencyCode) => setCurrency(value)}
                        >
                          <SelectTrigger className="h-full w-20 border-0 bg-neutral-50">
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
                    <p className="text-xs text-neutral-500">Enter to calculate ROI projection</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Traffic Growth Chart */}
        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4">
            12-Month Traffic Projection
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projections}>
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip
                  formatter={(value: number) => [value.toLocaleString(), 'Traffic']}
                  labelFormatter={(label) => `Month ${label}`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="traffic"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Projections Table */}
        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4 text-center">
            12-Month Growth Projections
          </h3>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-xs lg:text-sm">
              <thead className="sticky top-0 bg-neutral-50">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">Month</th>
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">Traffic</th>
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">New Sales</th>
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">New Revenue</th>
                </tr>
              </thead>
              <tbody className="text-neutral-600">
                {projections.map((p) => (
                  <tr key={p.month} className="border-b border-neutral-100">
                    <td className="py-2 px-3 tabular-nums">{p.month}</td>
                    <td className="py-2 px-3 tabular-nums">{p.traffic.toLocaleString()}</td>
                    <td className="py-2 px-3 tabular-nums">{p.newSales.toLocaleString()}</td>
                    <td className="py-2 px-3 tabular-nums">
                      {formatCurrency(p.newRevenue, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-neutral-200 space-y-2">
            <div className="flex justify-between">
              <span className="font-medium text-neutral-800">Total 12-Month Revenue:</span>
              <span className="font-semibold text-primary-green tabular-nums">
                {formatCurrency(totals.totalRevenue, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-neutral-800">Total LTV Revenue:</span>
              <span className="font-semibold text-primary-green tabular-nums">
                {formatCurrency(ltvRevenue, currency)}
              </span>
            </div>
            {totals.roi !== null && (
              <div className="flex justify-between">
                <span className="font-medium text-neutral-800">Projected ROI:</span>
                <span
                  className={`font-semibold tabular-nums ${totals.roi >= 100 ? 'text-performance-excellent' : totals.roi >= 0 ? 'text-performance-good' : 'text-performance-loss'}`}
                >
                  {totals.roi.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <CalculatorActionButtons
          onShare={handleShare}
          onClear={handleClear}
          resultReady={hasProjectedResults}
        />

        {/* Feedback Section */}
        <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
      </div>
    </div>
  );
};

export default SEOROICalculator;
