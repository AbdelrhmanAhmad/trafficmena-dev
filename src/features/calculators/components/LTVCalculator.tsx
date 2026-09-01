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
import { CalculatorActionButtons, CalculatorEducationPanel, CalculatorFeedback } from './shared';

const LTVCalculator = () => {
  const { t } = useTranslation('calculators');
  const [aov, setAov] = useState<string>('');
  const [purchaseFrequency, setPurchaseFrequency] = useState<string>('');
  const [grossMargin, setGrossMargin] = useState<string>('');
  const [cac, setCac] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const aovId = useId();
  const purchaseFrequencyId = useId();
  const grossMarginId = useId();
  const cacId = useId();

  const currentCurrency = CURRENCIES[currency];

  const calculateLTV = (): number | null => {
    const avgOrderValue = parseFloat(aov);
    const frequency = parseFloat(purchaseFrequency);
    const margin = parseFloat(grossMargin);
    if (Number.isNaN(avgOrderValue) || Number.isNaN(frequency) || Number.isNaN(margin)) return null;
    return avgOrderValue * frequency * (margin / 100);
  };

  const calculateLTVtoCACRatio = (): number | null => {
    const ltv = calculateLTV();
    const cacValue = parseFloat(cac);
    if (ltv === null || Number.isNaN(cacValue) || cacValue === 0) return null;
    return ltv / cacValue;
  };

  const ltv = calculateLTV();
  const ltvCacRatio = calculateLTVtoCACRatio();

  const handleShare = () => {
    const text =
      ltv !== null
        ? t('calcs.ltv.share.result', {
            ltv: formatCurrency(ltv.toFixed(2), currency),
            aov: formatCurrency(aov, currency),
            frequency: purchaseFrequency,
            margin: grossMargin,
            ratio:
              ltvCacRatio !== null
                ? ` | ${t('calcs.ltv.results.ltvCacRatio')}: ${ltvCacRatio.toFixed(1)}:1`
                : '',
          })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setAov('');
    setPurchaseFrequency('');
    setGrossMargin('');
    setCac('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Column - Educational Content */}
        <CalculatorEducationPanel slug="ltv" />

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['ltv']} className="w-full">
              {/* LTV Calculator Section */}
              <AccordionItem value="ltv" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    {t('calcs.ltv.panelTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-4 lg:space-y-6">
                    {/* AOV Input */}
                    <div className="space-y-2">
                      <Label htmlFor={aovId} className="text-sm text-neutral-600">
                        {t('calcs.ltv.fields.aov')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={aovId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={aov}
                          onChange={(e) => setAov(e.target.value)}
                          className="pr-24 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2">
                          <Select
                            value={currency}
                            onValueChange={(value: CurrencyCode) => setCurrency(value)}
                          >
                            <SelectTrigger className="w-20 h-10 border-0 bg-transparent text-primary-green font-medium text-sm focus:ring-0">
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

                    {/* Purchase Frequency Input */}
                    <div className="space-y-2">
                      <Label htmlFor={purchaseFrequencyId} className="text-sm text-neutral-600">
                        {t('calcs.ltv.fields.purchaseFrequency')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={purchaseFrequencyId}
                          type="number"
                          step="0.1"
                          placeholder={t('common.placeholderZero')}
                          value={purchaseFrequency}
                          onChange={(e) => setPurchaseFrequency(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* Gross Margin Input */}
                    <div className="space-y-2">
                      <Label htmlFor={grossMarginId} className="text-sm text-neutral-600">
                        {t('calcs.ltv.fields.grossMargin')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={grossMarginId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={grossMargin}
                          onChange={(e) => setGrossMargin(e.target.value)}
                          className="pr-10 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    {/* CAC Input (Optional) */}
                    <div className="space-y-2">
                      <Label htmlFor={cacId} className="text-sm text-neutral-600">
                        {t('calcs.ltv.fields.cacOptional')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={cacId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={cac}
                          onChange={(e) => setCac(e.target.value)}
                          className="pr-16 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* LTV Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">
                        {t('calcs.ltv.results.ltv')}
                      </Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={ltv !== null ? ltv.toFixed(2) : ''}
                          placeholder={t('common.placeholderDash')}
                          className="pr-16 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* {t('calcs.ltv.results.ltvCacRatio')} Output */}
                    {ltvCacRatio !== null && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">${t('calcs.ltv.results.ltvCacRatio')}</Label>
                        <div className="relative">
                          <Input
                            readOnly
                            value={`${ltvCacRatio.toFixed(1)}:1`}
                            className={`h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200 ${
                              ltvCacRatio >= 3
                                ? 'text-performance-good'
                                : ltvCacRatio >= 2
                                  ? 'text-performance-breakeven'
                                  : 'text-performance-loss'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    {/* Performance Indicator */}
                    {ltv !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          ltv < 50
                            ? 'text-performance-loss'
                            : ltv < 150
                              ? 'text-performance-breakeven'
                              : ltv < 500
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {ltv < 50 && 'Low LTV. Focus on increasing AOV, frequency, or margins.'}
                        {ltv >= 50 &&
                          ltv < 150 &&
                          'Moderate LTV. Typical for lower-price products.'}
                        {ltv >= 150 && ltv < 500 && 'Strong LTV. Healthy customer lifetime profit.'}
                        {ltv >= 500 && 'Excellent LTV. High-value customer relationships!'}
                      </p>
                    )}

                    {ltvCacRatio !== null && (
                      <p
                        className={`text-sm ${
                          ltvCacRatio < 2
                            ? 'text-performance-loss'
                            : ltvCacRatio < 3
                              ? 'text-performance-breakeven'
                              : ltvCacRatio < 5
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {ltvCacRatio < 2 &&
                          'Ratio below 2:1: unprofitable acquisition, reduce CAC or boost LTV.'}
                        {ltvCacRatio >= 2 &&
                          ltvCacRatio < 3 &&
                          'Ratio below 3:1: room for optimization.'}
                        {ltvCacRatio >= 3 &&
                          ltvCacRatio < 5 &&
                          'Ideal 3:1+ ratio: profitable and sustainable.'}
                        {ltvCacRatio >= 5 && 'Ratio above 5:1: consider scaling marketing spend!'}
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
            shareDisabled={ltv === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default LTVCalculator;
