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

const CACCalculator = () => {
  const { t } = useTranslation('calculators');
  const [totalSpend, setTotalSpend] = useState<string>('');
  const [customersAcquired, setCustomersAcquired] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const totalSpendId = useId();
  const customersAcquiredId = useId();

  const currentCurrency = CURRENCIES[currency];

  const calculateCAC = (): number | null => {
    const spend = parseFloat(totalSpend);
    const customers = parseFloat(customersAcquired);
    if (Number.isNaN(spend) || Number.isNaN(customers) || customers === 0) return null;
    return spend / customers;
  };

  const cac = calculateCAC();

  const handleShare = () => {
    const text =
      cac !== null
        ? t('calcs.cac.share.result', {
      cac: formatCurrency(cac.toFixed(2), currency),
      spend: formatCurrency(totalSpend, currency),
      customers: parseInt(customersAcquired, 10).toLocaleString(),
    })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setTotalSpend('');
    setCustomersAcquired('');
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
        <CalculatorEducationPanel slug="cac" />

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['cac']} className="w-full">
              {/* CAC Calculator Section */}
              <AccordionItem value="cac" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    {t('calcs.cac.panelTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-4 lg:space-y-6">
                    {/* Total Spend Input */}
                    <div className="space-y-2">
                      <Label htmlFor={totalSpendId} className="text-sm text-neutral-600">
                        {t('calcs.cac.fields.totalSpend')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={totalSpendId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={totalSpend}
                          onChange={(e) => setTotalSpend(e.target.value)}
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

                    {/* Customers Acquired Input */}
                    <div className="space-y-2">
                      <Label htmlFor={customersAcquiredId} className="text-sm text-neutral-600">
                        {t('calcs.cac.fields.customersAcquired')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={customersAcquiredId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={customersAcquired}
                          onChange={(e) => setCustomersAcquired(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* CAC Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">
                        {t('calcs.cac.results.cac')}
                      </Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={cac !== null ? cac.toFixed(2) : ''}
                          placeholder={t('common.placeholderDash')}
                          className="pr-16 h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 font-semibold tabular-nums"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {cac !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          cac > 1000
                            ? 'text-performance-loss'
                            : cac > 500
                              ? 'text-performance-breakeven'
                              : cac > 100
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {cac > 1000 && t('calcs.cac.performance.high')}
                        {cac > 500 &&
                          cac <= 1000 &&
                          t('calcs.cac.performance.aboveAverage')}
                        {cac > 100 &&
                          cac <= 500 &&
                          t('calcs.cac.performance.reasonable')}
                        {cac <= 100 && t('calcs.cac.performance.excellent')}
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          <CalculatorActionButtons
            onShare={handleShare}
            onClear={handleClear}
            shareDisabled={cac === null}
          />

          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default CACCalculator;
