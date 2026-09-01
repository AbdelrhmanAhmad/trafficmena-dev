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

const NCACCalculator = () => {
  const { t } = useTranslation('calculators');
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
    if (ncac === null) {
      shareToClipboard(null);
      return;
    }
    let text = t('calcs.ncac.share.result', {
      ncac: formatCurrency(ncac.toFixed(2), currency),
      spend: formatCurrency(totalSpend, currency),
      customers: parseInt(newCustomers, 10).toLocaleString(),
      profit:
        profitPerCustomer !== null
          ? t('calcs.ncac.share.profitSuffix', {
              profit: formatCurrency(profitPerCustomer.toFixed(2), currency),
            })
          : '',
    });
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
        <CalculatorEducationPanel slug="ncac" />

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['ncac']} className="w-full">
              {/* nCAC Calculator Section */}
              <AccordionItem value="ncac" className="border-none">
                <AccordionTrigger className="px-5 lg:px-6 py-4 hover:no-underline">
                  <span className="text-base lg:text-lg font-semibold text-neutral-800">
                    {t('calcs.ncac.panelTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 lg:px-6 pb-5 lg:pb-6">
                  <div className="space-y-5">
                    {/* Total Spend Input */}
                    <div className="space-y-2">
                      <Label htmlFor={totalSpendId} className="text-sm text-neutral-600">
                        {t('calcs.ncac.fields.adSpend')}
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
                        {t('calcs.ncac.fields.newCustomers')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={newCustomersId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={newCustomers}
                          onChange={(e) => setNewCustomers(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* AOV Input (Optional) */}
                    <div className="space-y-2">
                      <Label htmlFor={aovId} className="text-sm text-neutral-600">
                        {t('calcs.ncac.fields.aovOptional')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={aovId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
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
                        {t('calcs.ncac.results.ncac')}
                      </Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={ncac !== null ? ncac.toFixed(2) : ''}
                          placeholder={t('common.placeholderDash')}
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
                          ${t('calcs.ncac.results.firstPurchaseProfit')}
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
                          t('calcs.ncac.performance.high')}
                        {ncac > 250 &&
                          ncac <= 500 &&
                          t('calcs.ncac.performance.aboveAverage')}
                        {ncac > 100 &&
                          ncac <= 250 &&
                          t('calcs.ncac.performance.reasonable')}
                        {ncac <= 100 && t('calcs.ncac.performance.excellent')}
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
                          ? t('calcs.ncac.performance.negativeProfitOk')
                          : t('calcs.ncac.performance.positiveProfit')}
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
