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

const CPCCalculator = () => {
  const { t } = useTranslation('calculators');
  const [adSpend, setAdSpend] = useState<string>('');
  const [clicks, setClicks] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const adSpendId = useId();
  const clicksId = useId();

  const currentCurrency = CURRENCIES[currency];

  const calculateCPC = (): number | null => {
    const spend = parseFloat(adSpend);
    const totalClicks = parseFloat(clicks);
    if (Number.isNaN(spend) || Number.isNaN(totalClicks) || totalClicks === 0) return null;
    return spend / totalClicks;
  };

  const calculateTotalClicks = (): number | null => {
    const totalClicks = parseFloat(clicks);
    if (Number.isNaN(totalClicks)) return null;
    return totalClicks;
  };

  const cpc = calculateCPC();
  const totalClicks = calculateTotalClicks();

  const handleShare = () => {
    const text =
      cpc !== null
        ? t('calcs.cpc.share.result', {
      cpc: formatCurrency(cpc.toFixed(2), currency),
      spend: formatCurrency(adSpend, currency),
      clicks: parseInt(clicks, 10).toLocaleString(),
    })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setAdSpend('');
    setClicks('');
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
        <CalculatorEducationPanel slug="cpc" />

        {/* Right Column - Calculator */}
        <div className="space-y-4">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['cpc']} className="w-full">
              {/* CPC Calculator Section */}
              <AccordionItem value="cpc" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    {t('calcs.cpc.panelTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-5">
                    {/* Ad Spend Input */}
                    <div className="space-y-2">
                      <Label htmlFor={adSpendId} className="text-sm text-neutral-600">
                        {t('calcs.cpc.fields.adSpend')}
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

                    {/* Clicks Input */}
                    <div className="space-y-2">
                      <Label htmlFor={clicksId} className="text-sm text-neutral-600">
                        {t('calcs.cpc.fields.clicks')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={clicksId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={clicks}
                          onChange={(e) => setClicks(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* CPC Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">{t('calcs.cpc.results.cpc')}</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={cpc !== null ? cpc.toFixed(2) : ''}
                          placeholder={t('common.placeholderDash')}
                          className="pr-16 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* Total Clicks Display */}
                    {totalClicks !== null && totalClicks > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">${t('calcs.cpc.results.totalClicksReceived')}</Label>
                        <div className="relative">
                          <Input
                            readOnly
                            value={totalClicks.toLocaleString()}
                            className="h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                          />
                        </div>
                      </div>
                    )}

                    {/* Performance Indicator */}
                    {cpc !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          cpc > 5
                            ? 'text-performance-loss'
                            : cpc > 2
                              ? 'text-performance-breakeven'
                              : cpc > 0.5
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {cpc > 5 &&
                          t('calcs.cpc.performance.high')}
                        {cpc > 2 && cpc <= 5 && t('calcs.cpc.performance.aboveAverage')}
                        {cpc > 0.5 && cpc <= 2 && t('calcs.cpc.performance.average')}
                        {cpc <= 0.5 && t('calcs.cpc.performance.excellent')}
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
            shareDisabled={cpc === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default CPCCalculator;
