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

const SaaSLTVCalculator = () => {
  const { t } = useTranslation('calculators');
  const [arpu, setArpu] = useState<string>('');
  const [grossMargin, setGrossMargin] = useState<string>('');
  const [monthlyChurnRate, setMonthlyChurnRate] = useState<string>('');
  const [cac, setCac] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const arpuId = useId();
  const grossMarginId = useId();
  const monthlyChurnRateId = useId();
  const cacId = useId();

  const currentCurrency = CURRENCIES[currency];

  // LTV = ARPU × Gross Margin % × (1 / Monthly Churn Rate)
  const calculateLTV = (): number | null => {
    const arpuValue = parseFloat(arpu);
    const margin = parseFloat(grossMargin);
    const churn = parseFloat(monthlyChurnRate);
    if (Number.isNaN(arpuValue) || Number.isNaN(margin) || Number.isNaN(churn) || churn === 0)
      return null;
    return arpuValue * (margin / 100) * (1 / (churn / 100));
  };

  const calculateCustomerLifetimeMonths = (): number | null => {
    const churn = parseFloat(monthlyChurnRate);
    if (Number.isNaN(churn) || churn === 0) return null;
    return 1 / (churn / 100);
  };

  const calculateLTVtoCACRatio = (): number | null => {
    const ltv = calculateLTV();
    const cacValue = parseFloat(cac);
    if (ltv === null || Number.isNaN(cacValue) || cacValue === 0) return null;
    return ltv / cacValue;
  };

  const ltv = calculateLTV();
  const customerLifetimeMonths = calculateCustomerLifetimeMonths();
  const ltvCacRatio = calculateLTVtoCACRatio();

  const handleShare = () => {
    if (ltv === null) {
      shareToClipboard(null);
      return;
    }
    let text = t('calcs.saas-ltv.share.result', {
      ltv: formatCurrency(ltv.toFixed(2), currency),
      arpu: formatCurrency(arpu, currency),
      margin: grossMargin,
      churn: monthlyChurnRate,
    });
    if (customerLifetimeMonths !== null) {
      text += t('calcs.saas-ltv.share.lifetimeSuffix', {
        months: customerLifetimeMonths.toFixed(1),
      });
    }
    if (ltvCacRatio !== null) {
      text += ` | ${t('calcs.saas-ltv.results.ltvCacRatio')}: ${ltvCacRatio.toFixed(1)}:1`;
    }
    shareToClipboard(text);
  };

  const handleClear = () => {
    setArpu('');
    setGrossMargin('');
    setMonthlyChurnRate('');
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
        <CalculatorEducationPanel slug="saas-ltv" />

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['ltv']} className="w-full">
              {/* SaaS LTV Calculator Section */}
              <AccordionItem value="ltv" className="border-none">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <span className="text-lg font-semibold text-neutral-800">
                    {t('calcs.saas-ltv.panelTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-5">
                    {/* ARPU Input */}
                    <div className="space-y-2">
                      <Label htmlFor={arpuId} className="text-sm text-neutral-500">
                        {t('calcs.saas-ltv.fields.arpu')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={arpuId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={arpu}
                          onChange={(e) => setArpu(e.target.value)}
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

                    {/* Gross Margin Input */}
                    <div className="space-y-2">
                      <Label htmlFor={grossMarginId} className="text-sm text-neutral-500">
                        {t('calcs.saas-ltv.fields.grossMargin')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={grossMarginId}
                          type="number"
                          placeholder="80"
                          value={grossMargin}
                          onChange={(e) => setGrossMargin(e.target.value)}
                          className="pr-10 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium text-sm">
                          %
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">
                        SaaS typically has 70-85% gross margins
                      </p>
                    </div>

                    {/* Monthly Churn Rate Input */}
                    <div className="space-y-2">
                      <Label htmlFor={monthlyChurnRateId} className="text-sm text-neutral-500">
                        {t('calcs.saas-ltv.fields.churnRate')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={monthlyChurnRateId}
                          type="number"
                          step="0.1"
                          placeholder="5"
                          value={monthlyChurnRate}
                          onChange={(e) => setMonthlyChurnRate(e.target.value)}
                          className="pr-10 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    {/* CAC Input (Optional) */}
                    <div className="space-y-2">
                      <Label htmlFor={cacId} className="text-sm text-neutral-500">
                        {t('calcs.saas-ltv.fields.cacOptional')}
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* Customer Lifetime Output */}
                    {customerLifetimeMonths !== null && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-500">
                          {t('calcs.saas-ltv.results.avgLifetime')}
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={`${customerLifetimeMonths.toFixed(1)} months`}
                            readOnly
                            className="h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 rounded-xl font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {/* LTV Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-500">
                        {t('calcs.saas-ltv.results.ltv')}
                      </Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={ltv !== null ? formatCurrency(ltv.toFixed(2), currency) : '—'}
                          readOnly
                          className="h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 rounded-xl font-medium"
                        />
                      </div>
                    </div>

                    {/* {t('calcs.saas-ltv.results.ltvCacRatio')} Output */}
                    {ltvCacRatio !== null && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-500">${t('calcs.saas-ltv.results.ltvCacRatio')}</Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={`${ltvCacRatio.toFixed(1)}:1`}
                            readOnly
                            className="h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 rounded-xl font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {/* Performance Indicator */}
                    {ltvCacRatio !== null && (
                      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-100 rounded-xl">
                        {ltvCacRatio < 2 && (
                          <p className="text-performance-loss font-medium">
                            ⚠️ Below 2:1: Customer acquisition is not profitable. Focus on reducing
                            churn or CAC.
                          </p>
                        )}
                        {ltvCacRatio >= 2 && ltvCacRatio < 3 && (
                          <p className="text-performance-breakeven font-medium">
                            📊 Between 2:1 and 3:1: Break-even territory. Optimize retention to
                            reach the 3:1 benchmark.
                          </p>
                        )}
                        {ltvCacRatio >= 3 && ltvCacRatio < 5 && (
                          <p className="text-performance-good font-medium">
                            ✅ Between 3:1 and 5:1: Healthy unit economics! You're at the industry
                            gold standard.
                          </p>
                        )}
                        {ltvCacRatio >= 5 && (
                          <p className="text-performance-excellent font-medium">
                            🚀 Above 5:1: Excellent! Consider investing more in growth and
                            marketing.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Churn Impact Indicator */}
                    {ltv !== null && customerLifetimeMonths !== null && !ltvCacRatio && (
                      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-100 rounded-xl">
                        {parseFloat(monthlyChurnRate) > 5 && (
                          <p className="text-performance-loss font-medium">
                            ⚠️ High churn alert! {monthlyChurnRate}% monthly means losing ~
                            {(parseFloat(monthlyChurnRate) * 12 * 0.75).toFixed(0)}% of customers
                            annually.
                          </p>
                        )}
                        {parseFloat(monthlyChurnRate) > 2 && parseFloat(monthlyChurnRate) <= 5 && (
                          <p className="text-performance-breakeven font-medium">
                            📊 Moderate churn: A 1% reduction could increase your LTV by 20-25%.
                          </p>
                        )}
                        {parseFloat(monthlyChurnRate) > 0 && parseFloat(monthlyChurnRate) <= 2 && (
                          <p className="text-performance-good font-medium">
                            ✅ Strong retention! Your low churn drives high customer lifetime value.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          <CalculatorActionButtons
            onShare={handleShare}
            onClear={handleClear}
            shareDisabled={ltv === null}
          />

          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default SaaSLTVCalculator;
