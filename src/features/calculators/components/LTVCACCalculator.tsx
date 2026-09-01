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

const LTVCACCalculator = () => {
  const { t } = useTranslation('calculators');
  const [ltv, setLtv] = useState<string>('');
  const [cac, setCac] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const ltvId = useId();
  const cacId = useId();

  const currentCurrency = CURRENCIES[currency];

  // {t('calcs.ltv-cac.results.ratio')} = LTV / CAC
  const calculateLTVCACRatio = (): number | null => {
    const ltvValue = parseFloat(ltv);
    const cacValue = parseFloat(cac);
    if (Number.isNaN(ltvValue) || Number.isNaN(cacValue) || cacValue === 0) return null;
    return ltvValue / cacValue;
  };

  const ratio = calculateLTVCACRatio();

  const handleShare = () => {
    const text =
      ratio !== null
        ? t('calcs.ltv-cac.share.result', {
            ratio: ratio.toFixed(1),
            ltv: formatCurrency(ltv, currency),
            cac: formatCurrency(cac, currency),
            ratioLabel: t('calcs.ltv-cac.results.ratio'),
          })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setLtv('');
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
        <CalculatorEducationPanel slug="ltv-cac" />

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['ltv-cac']} className="w-full">
              <AccordionItem value="ltv-cac" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    {t('calcs.ltv-cac.panelTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-4 lg:space-y-6">
                    {/* LTV Input */}
                    <div className="space-y-2">
                      <Label htmlFor={ltvId} className="text-sm text-neutral-600">
                        {t('calcs.ltv-cac.fields.ltv')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={ltvId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={ltv}
                          onChange={(e) => setLtv(e.target.value)}
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

                    {/* CAC Input */}
                    <div className="space-y-2">
                      <Label htmlFor={cacId} className="text-sm text-neutral-600">
                        {t('calcs.ltv-cac.fields.cac')}
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

                    {/* Ratio Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">{t('calcs.ltv-cac.results.ratio')}</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={ratio !== null ? `${ratio.toFixed(1)}:1` : '—'}
                          readOnly
                          className="h-11 lg:h-12 text-base bg-muted/50 font-medium border-neutral-200"
                        />
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {ratio !== null && (
                      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-100">
                        {ratio < 1 && (
                          <p className="text-performance-loss font-medium">
                            Below 1:1: You're losing money on every customer! Urgent action needed.
                          </p>
                        )}
                        {ratio >= 1 && ratio < 2 && (
                          <p className="text-performance-loss font-medium">
                            Between 1:1 and 2:1: Unprofitable after overhead. Focus on reducing CAC
                            or increasing LTV.
                          </p>
                        )}
                        {ratio >= 2 && ratio < 3 && (
                          <p className="text-performance-breakeven font-medium">
                            Between 2:1 and 3:1: Break-even territory. You're close to the 3:1
                            benchmark.
                          </p>
                        )}
                        {ratio >= 3 && ratio < 5 && (
                          <p className="text-performance-good font-medium">
                            Between 3:1 and 5:1: Healthy unit economics! You've hit the gold
                            standard.
                          </p>
                        )}
                        {ratio >= 5 && (
                          <p className="text-performance-excellent font-medium">
                            Above 5:1: Excellent! Consider investing more in growth to capture
                            market share.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Additional Context */}
                    {ratio !== null && (
                      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-100">
                        <p className="text-sm text-neutral-600">
                          <strong className="text-neutral-800">What this means:</strong> For every{' '}
                          {formatCurrency('1', currency)} spent acquiring customers, you generate{' '}
                          {formatCurrency(ratio.toFixed(2), currency)} in lifetime value.
                        </p>
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
            shareDisabled={ratio === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default LTVCACCalculator;
