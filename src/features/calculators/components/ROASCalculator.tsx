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
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Slider } from '@/shared/components/ui/slider';
import { CURRENCIES, type CurrencyCode, formatCurrency } from '../constants/currency';
import { shareToClipboard } from '../utils/clipboard';
import { showFeedbackToast } from '../utils/feedback';
import { CalculatorActionButtons, CalculatorFeedback } from './shared';

const ROASCalculator = () => {
  const [adSpend, setAdSpend] = useState<string>('');
  const [knowsRevenue, setKnowsRevenue] = useState<string>('yes');
  const [adRevenue, setAdRevenue] = useState<string>('');
  const [targetRoas, setTargetRoas] = useState<string>('');
  const [profitMargin, setProfitMargin] = useState<number>(30);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const adSpendId = useId();
  const yesId = useId();
  const noId = useId();
  const adRevenueId = useId();
  const targetRoasId = useId();

  const currentCurrency = CURRENCIES[currency];

  const calculateROAS = (): number | null => {
    if (knowsRevenue === 'yes') {
      const spend = parseFloat(adSpend);
      const revenue = parseFloat(adRevenue);
      if (Number.isNaN(spend) || Number.isNaN(revenue) || spend === 0) return null;
      return (revenue / spend) * 100;
    }
    // When user doesn't know revenue, return the target ROAS they input
    const target = parseFloat(targetRoas);
    if (Number.isNaN(target)) return null;
    return target;
  };

  const calculateRequiredRevenue = (): number | null => {
    const spend = parseFloat(adSpend);
    const target = parseFloat(targetRoas);
    if (Number.isNaN(spend) || Number.isNaN(target) || spend === 0) return null;
    return (target / 100) * spend;
  };

  const calculateROI = (): number | null => {
    const roas = calculateROAS();
    if (roas === null) return null;
    return (roas / 100) * profitMargin - 100;
  };

  const roas = calculateROAS();
  const roi = calculateROI();
  const requiredRevenue = calculateRequiredRevenue();

  const handleShare = () => {
    const text =
      roas !== null
        ? `My ROAS: ${roas.toFixed(1)}% | Ad Spend: ${formatCurrency(adSpend, currency)} | Revenue: ${formatCurrency(adRevenue, currency)}`
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setAdSpend('');
    setAdRevenue('');
    setTargetRoas('');
    setKnowsRevenue('yes');
    setProfitMargin(30);
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  // Example amounts based on currency
  const exampleSpend = '1,000';
  const exampleRevenue = '3,000';
  const exampleLowRevenue = '900';

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Column - Educational Content */}
        <div className="space-y-4 lg:space-y-6">
          <section>
            <h2 className="text-xl lg:text-2xl font-semibold text-neutral-800 mb-4">
              What is ROAS?: ROAS meaning
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              Return on ad spend or ROAS is the{' '}
              <strong className="text-neutral-800">
                amount of revenue a company generates for every dollar spent on an advertising
                source
              </strong>
              .
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              When a business tests a new advertising source for a campaign, it may{' '}
              <strong className="text-neutral-800">
                compare the ROAS at different stages of the campaign with other advertising sources
                to gauge their performance
              </strong>{' '}
              and determine which should get renewed.
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              How to calculate ROAS: ROAS calculation formula
            </h2>
            <p className="text-neutral-600 mb-4">The ROAS formula is:</p>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm">
              <code className="text-neutral-800">
                ROAS = (Revenue from advertising / Cost of advertising) × 100
              </code>
            </div>
            <p className="text-neutral-600 leading-relaxed mt-4">
              That means that if you spent{' '}
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency(exampleSpend, currency)}
              </span>{' '}
              on Facebook ads in one month and your revenue for that month is{' '}
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-mono text-sm">
                {formatCurrency(exampleRevenue, currency)}
              </span>
              , your ROAS is{' '}
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-mono text-sm">
                ({formatCurrency(exampleRevenue, currency)}/{formatCurrency(exampleSpend, currency)}
                ) × 100 = {currentCurrency.symbol}3 × 100 = 300%
              </span>{' '}
              per {currentCurrency.name.toLowerCase()} spent on advertising.
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              But if you made {formatCurrency(exampleLowRevenue, currency)} in revenue in the same
              month, your ROAS is{' '}
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-mono text-sm">
                ({formatCurrency(exampleLowRevenue, currency)}/
                {formatCurrency(exampleSpend, currency)}) × 100 = {currentCurrency.symbol}0.9 × 100
                = 90%
              </span>
              .
            </p>
            <p className="text-neutral-600 leading-relaxed mt-4">
              90% may look acceptable at face value, but don't be fooled by anyone throwing such
              ROAS numbers. Anything less than 100% is a loss when evaluating ROAS.{' '}
              <strong className="text-neutral-800">
                The ROAS calculator will help you make sure you don't interpret your ROAS results
                wrongly or confusing
              </strong>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 mb-4">
              What is a good ROAS?
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              A good ROAS varies by industry, but generally:
            </p>
            <ul className="mt-4 space-y-2 text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-loss"></span>
                <span>
                  <strong className="text-neutral-800">Below 100%:</strong> You're losing money
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-breakeven"></span>
                <span>
                  <strong className="text-neutral-800">100-300%:</strong> Break-even to moderate
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-good"></span>
                <span>
                  <strong className="text-neutral-800">400-800%:</strong> Good performance
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-performance-excellent"></span>
                <span>
                  <strong className="text-neutral-800">800%+:</strong> Excellent performance
                </span>
              </li>
            </ul>
          </section>
        </div>

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['roas', 'roi']} className="w-full">
              {/* ROAS Calculator Section */}
              <AccordionItem value="roas" className="border-b border-neutral-200/60">
                <AccordionTrigger className="px-5 lg:px-6 py-4 hover:no-underline">
                  <span className="text-base lg:text-lg font-semibold text-neutral-800">
                    Return on ad spend (ROAS)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 lg:px-6 pb-5 lg:pb-6">
                  <div className="space-y-5">
                    {/* Ad Spend Input */}
                    <div className="space-y-2">
                      <Label htmlFor={adSpendId} className="text-sm text-neutral-600">
                        Ad spend
                      </Label>
                      <div className="relative">
                        <Input
                          id={adSpendId}
                          type="number"
                          placeholder="0"
                          value={adSpend}
                          onChange={(e) => setAdSpend(e.target.value)}
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

                    {/* Do you know your revenue? */}
                    <div className="space-y-3">
                      <Label className="text-sm text-neutral-600">Do you know your revenue?</Label>
                      <RadioGroup
                        value={knowsRevenue}
                        onValueChange={setKnowsRevenue}
                        className="flex flex-col gap-2"
                      >
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem
                            value="yes"
                            id={yesId}
                            className="border-emerald-500 text-emerald-500"
                          />
                          <Label htmlFor={yesId} className="text-neutral-800 cursor-pointer">
                            Yes
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="no" id={noId} className="border-neutral-600" />
                          <Label htmlFor={noId} className="text-neutral-800 cursor-pointer">
                            No
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Ad Revenue Input - shown when user knows revenue */}
                    {knowsRevenue === 'yes' && (
                      <div className="space-y-2">
                        <Label htmlFor={adRevenueId} className="text-sm text-neutral-600">
                          Ad revenue
                        </Label>
                        <div className="relative">
                          <Input
                            id={adRevenueId}
                            type="number"
                            placeholder="0"
                            value={adRevenue}
                            onChange={(e) => setAdRevenue(e.target.value)}
                            className="pr-16 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 font-medium text-sm">
                            {currentCurrency.code}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Target ROAS Input - shown when user doesn't know revenue */}
                    {knowsRevenue === 'no' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={targetRoasId} className="text-sm text-neutral-600">
                            Target ROAS (enter 100% for breakeven)
                          </Label>
                          <div className="relative">
                            <Input
                              id={targetRoasId}
                              type="number"
                              placeholder="100"
                              value={targetRoas}
                              onChange={(e) => setTargetRoas(e.target.value)}
                              className="pr-12 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 font-medium text-sm">
                              %
                            </span>
                          </div>
                        </div>

                        {/* Required Revenue Output */}
                        <div className="space-y-2">
                          <Label className="text-sm text-neutral-600">Required ad revenue</Label>
                          <div className="relative">
                            <Input
                              readOnly
                              value={requiredRevenue !== null ? requiredRevenue.toFixed(2) : ''}
                              placeholder="—"
                              className="pr-16 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                              {currentCurrency.code}
                            </span>
                          </div>
                          {requiredRevenue !== null && (
                            <p className="text-sm text-neutral-600 mt-2">
                              You need {formatCurrency(requiredRevenue.toFixed(2), currency)} in
                              revenue to achieve {targetRoas}% ROAS
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ROAS Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">ROAS</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={roas !== null ? roas.toFixed(1) : ''}
                          placeholder="—"
                          className="pr-12 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                      {roas !== null && (
                        <p
                          className={`text-sm mt-2 ${
                            roas < 100
                              ? 'text-performance-loss'
                              : roas < 400
                                ? 'text-performance-breakeven'
                                : roas < 800
                                  ? 'text-performance-good'
                                  : 'text-performance-excellent'
                          }`}
                        >
                          {roas < 100 && "You're losing money on this campaign."}
                          {roas >= 100 && roas < 400 && 'Break-even to moderate return.'}
                          {roas >= 400 && roas < 800 && 'Good performance!'}
                          {roas >= 800 && 'Excellent performance!'}
                        </p>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ROI Calculator Section */}
              <AccordionItem value="roi" className="border-none">
                <AccordionTrigger className="px-5 lg:px-6 py-4 hover:no-underline">
                  <span className="text-base lg:text-lg font-semibold text-neutral-800">
                    Return on investment (ROI)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 lg:px-6 pb-5 lg:pb-6">
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-neutral-600">Profit margin</Label>
                        <span className="text-sm font-semibold text-neutral-800">
                          {profitMargin}%
                        </span>
                      </div>
                      <Slider
                        value={[profitMargin]}
                        onValueChange={(value) => setProfitMargin(value[0])}
                        min={1}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">ROI</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={roi !== null ? roi.toFixed(1) : ''}
                          placeholder="—"
                          className="pr-12 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                      {roi !== null && (
                        <p className="text-sm text-neutral-600 mt-2">
                          Based on {profitMargin}% profit margin and {roas?.toFixed(0)}% ROAS
                        </p>
                      )}
                    </div>

                    <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-sm text-neutral-600">
                      <strong className="text-neutral-800">ROAS vs ROI:</strong> ROAS measures
                      revenue per ad dollar, while ROI accounts for profit margins and other costs.
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          {/* Action Buttons */}
          <CalculatorActionButtons
            onShare={handleShare}
            onClear={handleClear}
            shareDisabled={roas === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default ROASCalculator;
