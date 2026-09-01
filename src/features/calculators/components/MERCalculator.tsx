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

const MERCalculator = () => {
  const { t } = useTranslation('calculators');
  const [totalRevenue, setTotalRevenue] = useState<string>('');
  const [totalMarketingSpend, setTotalMarketingSpend] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const totalRevenueId = useId();
  const totalMarketingSpendId = useId();

  const currentCurrency = CURRENCIES[currency];

  const calculateMER = (): number | null => {
    const revenue = parseFloat(totalRevenue);
    const spend = parseFloat(totalMarketingSpend);
    if (Number.isNaN(revenue) || Number.isNaN(spend) || spend === 0) return null;
    return revenue / spend;
  };

  const calculateMERPercentage = (): number | null => {
    const mer = calculateMER();
    if (mer === null) return null;
    return mer * 100;
  };

  const calculateSpendAsPercentOfRevenue = (): number | null => {
    const revenue = parseFloat(totalRevenue);
    const spend = parseFloat(totalMarketingSpend);
    if (Number.isNaN(revenue) || Number.isNaN(spend) || revenue === 0) return null;
    return (spend / revenue) * 100;
  };

  const mer = calculateMER();
  const merPercentage = calculateMERPercentage();
  const spendPercent = calculateSpendAsPercentOfRevenue();

  const handleShare = () => {
    const text =
      mer !== null
        ? t('calcs.mer.share.result', {
      mer: mer.toFixed(2),
      percent: merPercentage?.toFixed(0),
      revenue: formatCurrency(totalRevenue, currency),
      spend: formatCurrency(totalMarketingSpend, currency),
    })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setTotalRevenue('');
    setTotalMarketingSpend('');
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
        <CalculatorEducationPanel slug="mer" />

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['mer']} className="w-full">
              {/* MER Calculator Section */}
              <AccordionItem value="mer" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    {t('calcs.mer.panelTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-4 lg:space-y-6">
                    {/* Total Revenue Input */}
                    <div className="space-y-2">
                      <Label htmlFor={totalRevenueId} className="text-sm text-neutral-600">
                        {t('calcs.mer.fields.totalRevenue')}
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

                    {/* Total Marketing Spend Input */}
                    <div className="space-y-2">
                      <Label htmlFor={totalMarketingSpendId} className="text-sm text-neutral-600">
                        {t('calcs.mer.fields.totalMarketingSpend')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={totalMarketingSpendId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={totalMarketingSpend}
                          onChange={(e) => setTotalMarketingSpend(e.target.value)}
                          className="pr-16 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-green font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* MER Output - Ratio */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">${t('calcs.mer.results.merRatio')}</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={mer !== null ? `${mer.toFixed(2)}x` : ''}
                          placeholder={t('common.placeholderDash')}
                          className="h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                      </div>
                    </div>

                    {/* MER Output - Percentage */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">{t('calcs.mer.results.merPercent')}</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={merPercentage !== null ? merPercentage.toFixed(0) : ''}
                          placeholder={t('common.placeholderDash')}
                          className="pr-12 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Spend as % of Revenue */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">
                        {t('calcs.mer.results.spendPercent')}
                      </Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={spendPercent !== null ? spendPercent.toFixed(1) : ''}
                          placeholder={t('common.placeholderDash')}
                          className="pr-12 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {mer !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          mer < 2
                            ? 'text-performance-loss'
                            : mer < 3
                              ? 'text-performance-breakeven'
                              : mer < 5
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {mer < 2 &&
                          "Low efficiency. You're spending over 50% of revenue on marketing."}
                        {mer >= 2 && mer < 3 && 'Acceptable efficiency. Room for improvement.'}
                        {mer >= 3 && mer < 5 && 'Good marketing efficiency!'}
                        {mer >= 5 && 'Excellent marketing efficiency!'}
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
            shareDisabled={mer === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default MERCalculator;
