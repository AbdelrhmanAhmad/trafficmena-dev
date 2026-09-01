import { useTranslation } from 'react-i18next';
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
import { CalculatorActionButtons, CalculatorEducationPanel, CalculatorFeedback } from './shared';

const ROASCalculator = () => {
  const { t } = useTranslation('calculators');
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
        ? t('calcs.roas.share.result', {
      roas: roas.toFixed(1),
      spend: formatCurrency(adSpend, currency),
      revenue: formatCurrency(adRevenue, currency),
    })
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
        <CalculatorEducationPanel slug="roas" />

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['roas', 'roi']} className="w-full">
              <AccordionItem value="roas" className="border-b border-neutral-200/60">
                <AccordionTrigger className="px-5 lg:px-6 py-4 hover:no-underline">
                  <span className="text-base lg:text-lg font-semibold text-neutral-800">
                    {t('calcs.roas.panelTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 lg:px-6 pb-5 lg:pb-6">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor={adSpendId} className="text-sm text-neutral-600">
                        {t('calcs.roas.fields.adSpend')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={adSpendId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
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

                    <div className="space-y-3">
                      <Label className="text-sm text-neutral-600">{t('calcs.roas.fields.knowsRevenue')}</Label>
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
                            {t('common.yes')}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="no" id={noId} className="border-neutral-600" />
                          <Label htmlFor={noId} className="text-neutral-800 cursor-pointer">
                            {t('common.no')}
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {knowsRevenue === 'yes' && (
                      <div className="space-y-2">
                        <Label htmlFor={adRevenueId} className="text-sm text-neutral-600">
                          {t('calcs.roas.fields.adRevenue')}
                        </Label>
                        <div className="relative">
                          <Input
                            id={adRevenueId}
                            type="number"
                            placeholder={t('common.placeholderZero')}
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

                    {knowsRevenue === 'no' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={targetRoasId} className="text-sm text-neutral-600">
                            {t('calcs.roas.fields.targetRoas')}
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

                        <div className="space-y-2">
                          <Label className="text-sm text-neutral-600">{t('calcs.roas.results.requiredRevenue')}</Label>
                          <div className="relative">
                            <Input
                              readOnly
                              value={requiredRevenue !== null ? requiredRevenue.toFixed(2) : ''}
                              placeholder={t('common.placeholderDash')}
                              className="pr-16 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                              {currentCurrency.code}
                            </span>
                          </div>
                          {requiredRevenue !== null && (
                            <p className="text-sm text-neutral-600 mt-2">
                              {t('calcs.roas.hints.requiredRevenue', {
                                amount: formatCurrency(requiredRevenue.toFixed(2), currency),
                                target: targetRoas,
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">{t('calcs.roas.results.roas')}</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={roas !== null ? roas.toFixed(1) : ''}
                          placeholder={t('common.placeholderDash')}
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
                          {roas < 100 && t('calcs.roas.performance.losing')}
                          {roas >= 100 && roas < 400 && t('calcs.roas.performance.breakeven')}
                          {roas >= 400 && roas < 800 && t('calcs.roas.performance.good')}
                          {roas >= 800 && t('calcs.roas.performance.excellent')}
                        </p>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="roi" className="border-none">
                <AccordionTrigger className="px-5 lg:px-6 py-4 hover:no-underline">
                  <span className="text-base lg:text-lg font-semibold text-neutral-800">
                    {t('calcs.roas.panelTitleRoi')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 lg:px-6 pb-5 lg:pb-6">
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-neutral-600">{t('calcs.roas.fields.profitMargin')}</Label>
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
                      <Label className="text-sm text-neutral-600">{t('calcs.roas.results.roi')}</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={roi !== null ? roi.toFixed(1) : ''}
                          placeholder={t('common.placeholderDash')}
                          className="pr-12 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                      {roi !== null && (
                        <p className="text-sm text-neutral-600 mt-2">
                          {t('calcs.roas.hints.roiBasis', {
                            margin: profitMargin,
                            roas: roas?.toFixed(0),
                          })}
                        </p>
                      )}
                    </div>

                    <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-sm text-neutral-600">
                      {t('calcs.roas.hints.roasVsRoi')}
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
