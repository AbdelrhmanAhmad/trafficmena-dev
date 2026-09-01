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

const AOVCalculator = () => {
  const { t } = useTranslation('calculators');
  const [totalRevenue, setTotalRevenue] = useState<string>('');
  const [numberOfOrders, setNumberOfOrders] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const totalRevenueId = useId();
  const numberOfOrdersId = useId();

  const currentCurrency = CURRENCIES[currency];

  const calculateAOV = (): number | null => {
    const revenue = parseFloat(totalRevenue);
    const orders = parseFloat(numberOfOrders);
    if (Number.isNaN(revenue) || Number.isNaN(orders) || orders === 0) return null;
    return revenue / orders;
  };

  const aov = calculateAOV();

  const handleShare = () => {
    const text =
      aov !== null
        ? t('calcs.aov.share.result', {
      aov: formatCurrency(aov, currency),
      revenue: formatCurrency(parseFloat(totalRevenue) || 0, currency),
      orders: parseInt(numberOfOrders, 10).toLocaleString(),
    })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setTotalRevenue('');
    setNumberOfOrders('');
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
        <CalculatorEducationPanel slug="aov" />

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['aov']} className="w-full">
              {/* AOV Calculator Section */}
              <AccordionItem value="aov" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    {t('calcs.aov.panelTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-4 lg:space-y-6">
                    {/* Total Revenue Input */}
                    <div className="space-y-2">
                      <Label htmlFor={totalRevenueId} className="text-sm text-neutral-600">
                        {t('calcs.aov.fields.totalRevenue')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={totalRevenueId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={totalRevenue}
                          onChange={(e) => setTotalRevenue(e.target.value)}
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

                    {/* Number of Orders Input */}
                    <div className="space-y-2">
                      <Label htmlFor={numberOfOrdersId} className="text-sm text-neutral-600">
                        {t('calcs.aov.fields.numberOfOrders')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={numberOfOrdersId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={numberOfOrders}
                          onChange={(e) => setNumberOfOrders(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* AOV Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">{t('calcs.aov.results.aov')}</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={aov !== null ? aov.toFixed(2) : ''}
                          placeholder={t('common.placeholderDash')}
                          className="pr-16 h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 font-semibold tabular-nums"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {aov !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          aov < 50
                            ? 'text-performance-loss'
                            : aov < 100
                              ? 'text-performance-breakeven'
                              : aov < 200
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {aov < 50 &&
                          t('calcs.aov.performance.low')}
                        {aov >= 50 &&
                          aov < 100 &&
                          t('calcs.aov.performance.moderate')}
                        {aov >= 100 && aov < 200 && t('calcs.aov.performance.strong')}
                        {aov >= 200 && t('calcs.aov.performance.excellent')}
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
            shareDisabled={aov === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default AOVCalculator;
