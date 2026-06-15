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

const NCACCalculator = () => {
  const [totalSpend, setTotalSpend] = useState<string>('');
  const [newCustomers, setNewCustomers] = useState<string>('');
  const [aov, setAov] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const totalSpendId = useId();
  const newCustomersId = useId();
  const aovId = useId();

  const currentCurrency = CURRENCIES[currency];

  const calculateNCAC = (): number | null => {
    const spend = parseFloat(totalSpend);
    const customers = parseFloat(newCustomers);
    if (Number.isNaN(spend) || Number.isNaN(customers) || customers === 0) return null;
    return spend / customers;
  };

  const calculateProfitPerCustomer = (): number | null => {
    const ncac = calculateNCAC();
    const avgOrderValue = parseFloat(aov);
    if (ncac === null || Number.isNaN(avgOrderValue)) return null;
    return avgOrderValue - ncac;
  };

  const ncac = calculateNCAC();
  const profitPerCustomer = calculateProfitPerCustomer();

  const handleShare = () => {
    const text =
      ncac !== null
        ? `My nCAC: ${formatCurrency(ncac.toFixed(2), currency)} | Total Spend: ${formatCurrency(totalSpend, currency)} | New Customers: ${parseInt(newCustomers, 10).toLocaleString()}${profitPerCustomer !== null ? ` | First-Purchase Profit: ${formatCurrency(profitPerCustomer.toFixed(2), currency)}` : ''}`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setTotalSpend('');
    setNewCustomers('');
    setAov('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Column - Educational Content */}
        <div className="space-y-4 lg:space-y-6">
          <section>
            <h2 className="text-xl lg:text-2xl font-semibold text-neutral-800 mb-4">
              What is nCAC?: New Customer Acquisition Cost
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              nCAC, or <strong className="text-neutral-800">New Customer Acquisition Cost</strong>,
              measures{' '}
              <strong className="text-neutral-800">
                the specific cost to acquire first-time customers only
              </strong>
              , excluding repeat buyers from the calculation.
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              Unlike traditional CAC which blends costs of acquiring both new and returning
              customers, nCAC isolates the true cost of{' '}
              <strong className="text-neutral-800">expanding your customer base</strong>. This
              distinction is critical for understanding real growth versus revenue from existing
              customers.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              nCAC vs CAC: The Key Difference
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              Standard CAC includes all customers, both new and returning. This can significantly
              understate your true acquisition costs:
            </p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Ad Spend:</span>
                <span className="font-mono text-neutral-800">
                  {formatCurrency('10,000', currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Total Conversions:</span>
                <span className="font-mono text-neutral-800">100</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Blended CAC:</span>
                <span className="font-mono text-neutral-800">
                  {formatCurrency('100', currency)}
                </span>
              </div>
              <div className="border-t border-neutral-100 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">New Customers Only:</span>
                  <span className="font-mono text-neutral-800">40</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-emerald-600 font-medium">True nCAC:</span>
                  <span className="font-mono text-emerald-600 font-bold">
                    {formatCurrency('250', currency)}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              In this example, 60% of conversions were repeat buyers. The true cost to acquire
              someone new is 2.5x higher than the blended CAC suggests.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Why is nCAC Important?
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Measures True Growth:</strong> Shows the real
                  cost of expanding your customer base, not just generating repeat sales
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Better Budget Allocation:</strong> Ensures
                  marketing spend drives new business rather than re-acquiring existing customers
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Accurate Benchmarking:</strong> Provides
                  apples-to-apples comparison across campaigns and competitors
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Investor Confidence:</strong> Demonstrates
                  scalability and market expansion potential to stakeholders
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Calculate nCAC: The Formula
            </h2>
            <p className="text-neutral-600 mb-4">The nCAC formula is:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">
                nCAC = Total Ad Spend / Number of NEW Customers Only
              </code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              The key difference from CAC is the denominator: you must{' '}
              <strong className="text-neutral-800">segment your customer data</strong> to include
              only first-time buyers, excluding repeat purchasers entirely.
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              For example, if you spent{' '}
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('10,000', currency)}
              </span>{' '}
              on ads and acquired{' '}
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-mono text-sm">
                40 new customers
              </span>{' '}
              (out of 100 total conversions), your nCAC is{' '}
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency('10,000', currency)} / 40 = {formatCurrency('250', currency)}
              </span>
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              Optimizing nCAC to LTV
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-4">
              The true power of nCAC comes when paired with Customer Lifetime Value (LTV). CMOs
              should optimize the <strong className="text-neutral-800">nCAC-to-LTV ratio</strong>{' '}
              for sustainable, profitable growth:
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">LTV:nCAC below 2:1:</strong> Unprofitable.
                  Re-evaluate acquisition strategy
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">LTV:nCAC 2:1 to 3:1:</strong> Break-even
                  territory. Optimize funnels
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">LTV:nCAC 3:1 to 4:1:</strong> Healthy,
                  scalable growth
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">LTV:nCAC 4:1+:</strong> Excellent. Consider
                  scaling spend
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to Lower Your nCAC
            </h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Sharpen Targeting:</strong> Focus on
                  audiences less likely to have purchased before using exclusion lists
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Diversify Channels:</strong> Reduce
                  over-reliance on single platforms vulnerable to algorithm shifts
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Boost Conversion Rates:</strong> A/B test
                  landing pages, creatives, and checkout to increase efficiency
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span>
                  <strong className="text-neutral-800">Use Multi-Touch Attribution:</strong> Move
                  beyond last-click to understand true drivers of new customers
                </span>
              </li>
            </ul>
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">
              Source: Power Digital Marketing, Wicked Reports (2025)
            </p>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['ncac']} className="w-full">
              {/* nCAC Calculator Section */}
              <AccordionItem value="ncac" className="border-none">
                <AccordionTrigger className="px-5 lg:px-6 py-4 hover:no-underline">
                  <span className="text-base lg:text-lg font-semibold text-neutral-800">
                    New Customer Acquisition Cost (nCAC)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 lg:px-6 pb-5 lg:pb-6">
                  <div className="space-y-5">
                    {/* Total Spend Input */}
                    <div className="space-y-2">
                      <Label htmlFor={totalSpendId} className="text-sm text-neutral-600">
                        Total ad spend
                      </Label>
                      <div className="relative">
                        <Input
                          id={totalSpendId}
                          type="number"
                          placeholder="0"
                          value={totalSpend}
                          onChange={(e) => setTotalSpend(e.target.value)}
                          className="pr-24 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2">
                          <Select
                            value={currency}
                            onValueChange={(value: CurrencyCode) => setCurrency(value)}
                          >
                            <SelectTrigger className="w-20 h-10 border-0 bg-transparent text-emerald-600 font-medium text-sm focus:ring-0">
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

                    {/* New Customers Input */}
                    <div className="space-y-2">
                      <Label htmlFor={newCustomersId} className="text-sm text-neutral-600">
                        Number of NEW customers only (first-time buyers)
                      </Label>
                      <div className="relative">
                        <Input
                          id={newCustomersId}
                          type="number"
                          placeholder="0"
                          value={newCustomers}
                          onChange={(e) => setNewCustomers(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* AOV Input (Optional) */}
                    <div className="space-y-2">
                      <Label htmlFor={aovId} className="text-sm text-neutral-600">
                        Average order value (optional)
                      </Label>
                      <div className="relative">
                        <Input
                          id={aovId}
                          type="number"
                          placeholder="0"
                          value={aov}
                          onChange={(e) => setAov(e.target.value)}
                          className="pr-16 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* nCAC Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">
                        nCAC (New Customer Acquisition Cost)
                      </Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={ncac !== null ? ncac.toFixed(2) : ''}
                          placeholder="—"
                          className="pr-16 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* First-Purchase Profit Output */}
                    {profitPerCustomer !== null && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">
                          First-purchase profit per customer
                        </Label>
                        <div className="relative">
                          <Input
                            readOnly
                            value={profitPerCustomer.toFixed(2)}
                            className={`pr-16 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200 ${
                              profitPerCustomer >= 0
                                ? 'text-performance-good'
                                : 'text-performance-loss'
                            }`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                            {currentCurrency.code}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Performance Indicator */}
                    {ncac !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          ncac > 500
                            ? 'text-performance-loss'
                            : ncac > 250
                              ? 'text-performance-breakeven'
                              : ncac > 100
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {ncac > 500 &&
                          'High nCAC. Ensure LTV justifies this cost or optimize targeting.'}
                        {ncac > 250 &&
                          ncac <= 500 &&
                          'Above average nCAC. Typical for B2B, SaaS, or competitive niches.'}
                        {ncac > 100 &&
                          ncac <= 250 &&
                          'Reasonable nCAC. Compare against your AOV and LTV.'}
                        {ncac <= 100 && 'Excellent nCAC. Efficient new customer acquisition!'}
                      </p>
                    )}

                    {profitPerCustomer !== null && (
                      <p
                        className={`text-sm ${
                          profitPerCustomer < 0
                            ? 'text-performance-breakeven'
                            : 'text-performance-good'
                        }`}
                      >
                        {profitPerCustomer < 0
                          ? 'Negative first-purchase profit is acceptable if customer LTV exceeds nCAC over time.'
                          : 'Profitable on first purchase. Strong acquisition efficiency!'}
                      </p>
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
            shareDisabled={ncac === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default NCACCalculator;
