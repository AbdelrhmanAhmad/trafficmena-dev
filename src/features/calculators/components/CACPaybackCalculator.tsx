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

const CACPaybackCalculator = () => {
  const { t } = useTranslation('calculators');
  const [cac, setCac] = useState<string>('');
  const [monthlyRevenue, setMonthlyRevenue] = useState<string>('');
  const [grossMargin, setGrossMargin] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const cacId = useId();
  const monthlyRevenueId = useId();
  const grossMarginId = useId();

  const currentCurrency = CURRENCIES[currency];

  // CAC Payback = CAC / (Monthly Revenue × Gross Margin %)
  const calculatePaybackPeriod = (): number | null => {
    const cacValue = parseFloat(cac);
    const revenue = parseFloat(monthlyRevenue);
    const margin = parseFloat(grossMargin);
    if (
      Number.isNaN(cacValue) ||
      Number.isNaN(revenue) ||
      Number.isNaN(margin) ||
      revenue === 0 ||
      margin === 0
    )
      return null;
    const monthlyGrossProfit = revenue * (margin / 100);
    if (monthlyGrossProfit === 0) return null;
    return cacValue / monthlyGrossProfit;
  };

  const calculateMonthlyGrossProfit = (): number | null => {
    const revenue = parseFloat(monthlyRevenue);
    const margin = parseFloat(grossMargin);
    if (Number.isNaN(revenue) || Number.isNaN(margin)) return null;
    return revenue * (margin / 100);
  };

  const paybackPeriod = calculatePaybackPeriod();
  const monthlyGrossProfit = calculateMonthlyGrossProfit();

  const handleShare = () => {
    const text =
      paybackPeriod !== null
        ? t('calcs.cac-payback.share.result', {
            payback: paybackPeriod.toFixed(1),
            cac: formatCurrency(cac, currency),
            revenue: formatCurrency(monthlyRevenue, currency),
            margin: grossMargin,
            paybackLabel: t('calcs.cac-payback.results.paybackPeriod'),
          })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setCac('');
    setMonthlyRevenue('');
    setGrossMargin('');
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
        <CalculatorEducationPanel slug="cac-payback" />

        {/* Right Column - Calculator */}
        <div className="space-y-4">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['payback']} className="w-full">
              <AccordionItem value="payback" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    {t('calcs.cac-payback.panelTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-5">
                    {/* CAC Input */}
                    <div className="space-y-2">
                      <Label htmlFor={cacId} className="text-sm text-neutral-600">
                        {t('calcs.cac-payback.fields.cac')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={cacId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={cac}
                          onChange={(e) => setCac(e.target.value)}
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

                    {/* Monthly Revenue Input */}
                    <div className="space-y-2">
                      <Label htmlFor={monthlyRevenueId} className="text-sm text-neutral-600">
                        {t('calcs.cac-payback.fields.monthlyRevenue')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={monthlyRevenueId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={monthlyRevenue}
                          onChange={(e) => setMonthlyRevenue(e.target.value)}
                          className="pr-16 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          {currentCurrency.code}
                        </span>
                      </div>
                    </div>

                    {/* Gross Margin Input */}
                    <div className="space-y-2">
                      <Label htmlFor={grossMarginId} className="text-sm text-neutral-600">
                        {t('calcs.cac-payback.fields.grossMargin')}
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600">
                        SaaS typically has 70-85% gross margins
                      </p>
                    </div>

                    {/* Monthly Gross Profit Output */}
                    {monthlyGrossProfit !== null && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">
                          {t('calcs.cac-payback.results.monthlyGrossProfit')}
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={formatCurrency(monthlyGrossProfit.toFixed(2), currency)}
                            readOnly
                            className="h-11 lg:h-12 text-base bg-muted/50 font-medium border-neutral-200"
                          />
                        </div>
                      </div>
                    )}

                    {/* Payback Period Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">{t('calcs.cac-payback.results.paybackPeriod')}</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={
                            paybackPeriod !== null ? `${paybackPeriod.toFixed(1)} months` : '—'
                          }
                          readOnly
                          className="h-11 lg:h-12 text-base bg-muted/50 font-medium border-neutral-200"
                        />
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {paybackPeriod !== null && (
                      <div className="p-4 rounded-lg bg-accent/30 border border-border">
                        {paybackPeriod < 6 && (
                          <p className="text-performance-excellent font-medium">
                            Under 6 months: Excellent! Very efficient acquisition. Consider scaling
                            faster.
                          </p>
                        )}
                        {paybackPeriod >= 6 && paybackPeriod < 12 && (
                          <p className="text-performance-good font-medium">
                            6-12 months: Good! Healthy payback for most SaaS companies.
                          </p>
                        )}
                        {paybackPeriod >= 12 && paybackPeriod < 18 && (
                          <p className="text-performance-breakeven font-medium">
                            12-18 months: Acceptable for enterprise, but optimize for
                            SMB/mid-market.
                          </p>
                        )}
                        {paybackPeriod >= 18 && (
                          <p className="text-performance-loss font-medium">
                            Over 18 months: Warning! High churn risk before payback. Focus on
                            reducing CAC or increasing ARPU.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Context */}
                    {paybackPeriod !== null && monthlyGrossProfit !== null && (
                      <div className="p-4 rounded-lg bg-muted/30 border border-border">
                        <p className="text-sm text-neutral-600">
                          <strong className="text-neutral-800">What this means:</strong> You need{' '}
                          {paybackPeriod.toFixed(1)} months of{' '}
                          {formatCurrency(monthlyGrossProfit.toFixed(2), currency)}/month gross
                          profit to recover your {formatCurrency(cac, currency)} acquisition cost.
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
            shareDisabled={paybackPeriod === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default CACPaybackCalculator;
