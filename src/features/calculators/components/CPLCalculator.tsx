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

const CPLCalculator = () => {
  const { t } = useTranslation('calculators');
  const [totalSpend, setTotalSpend] = useState('');
  const [leadsGenerated, setLeadsGenerated] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const totalSpendId = useId();
  const leadsGeneratedId = useId();

  const calculateCPL = (): number | null => {
    const spend = parseFloat(totalSpend);
    const leads = parseFloat(leadsGenerated);
    if (Number.isNaN(spend) || Number.isNaN(leads) || leads === 0) return null;
    return spend / leads;
  };

  const cpl = calculateCPL();

  const handleShare = () => {
    const text =
      cpl !== null
        ? t('calcs.cpl.share.result', {
            cpl: formatCurrency(cpl, currency),
            spend: formatCurrency(totalSpend, currency),
            leads: leadsGenerated,
            cplLabel: t('calcs.cpl.results.cpl'),
            leadsLabel: t('calcs.cpl.fields.leadsGenerated'),
            panelTitle: t('calcs.cpl.panelTitle'),
          })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setTotalSpend('');
    setLeadsGenerated('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  const getPerformanceIndicator = () => {
    if (cpl === null) return null;
    if (cpl < 100) {
      return {
        text: t('calcs.cpl.performance.excellent'),
        className: 'text-performance-excellent',
      };
    }
    if (cpl < 300) {
      return {
        text: t('calcs.cpl.performance.good'),
        className: 'text-performance-good',
      };
    }
    if (cpl < 600) {
      return {
        text: t('calcs.cpl.performance.aboveAverage'),
        className: 'text-performance-breakeven',
      };
    }
    return {
      text: t('calcs.cpl.performance.high'),
      className: 'text-performance-loss',
    };
  };

  const performance = getPerformanceIndicator();

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Left Column - Educational Content */}
        <CalculatorEducationPanel slug="cpl" />

        {/* Right Column - Calculator */}
      <div className="space-y-4 lg:space-y-6">
        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Accordion type="single" collapsible defaultValue="calculator">
            <AccordionItem value="calculator" className="border-none">
              <AccordionTrigger className="text-lg lg:text-xl font-semibold hover:no-underline text-neutral-800">
                {t('calcs.cpl.panelTitle')}
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-5">
                {/* Total Marketing Spend Input */}
                <div className="space-y-2">
                  <Label htmlFor={totalSpendId} className="text-sm text-neutral-600">
                    {t('calcs.cpl.fields.totalSpend')}
                  </Label>
                  <div className="relative">
                    <Input
                      id={totalSpendId}
                      type="number"
                      placeholder={t('calcs.cpl.placeholders.totalSpend')}
                      value={totalSpend}
                      onChange={(e) => setTotalSpend(e.target.value)}
                      className="pr-24 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                    />
                    <div className="absolute right-1 top-1 bottom-1">
                      <Select
                        value={currency}
                        onValueChange={(value: CurrencyCode) => setCurrency(value)}
                      >
                        <SelectTrigger className="h-full w-20 border-0 bg-neutral-50 text-neutral-600 text-sm">
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

                {/* {t('calcs.cpl.fields.leadsGenerated')} Input */}
                <div className="space-y-2">
                  <Label htmlFor={leadsGeneratedId} className="text-sm text-neutral-600">
                    {t('calcs.cpl.fields.leadsGenerated')}
                  </Label>
                  <Input
                    id={leadsGeneratedId}
                    type="number"
                    placeholder={t('calcs.cpl.placeholders.leadsGenerated')}
                    value={leadsGenerated}
                    onChange={(e) => setLeadsGenerated(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* CPL Result */}
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-600">{t('calcs.cpl.results.cpl')}</Label>
                  <Input
                    readOnly
                    value={cpl !== null ? formatCurrency(cpl, currency) : '—'}
                    className="h-11 lg:h-12 text-base font-semibold bg-neutral-50 border-neutral-200 text-neutral-800"
                  />
                </div>

                {/* Performance Indicator */}
                {performance && (
                  <div
                    className={`p-3 lg:p-4 rounded-xl bg-neutral-50 border border-neutral-100 text-sm ${performance.className}`}
                  >
                    {performance.text}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        <CalculatorActionButtons
          onShare={handleShare}
          onClear={handleClear}
          shareDisabled={cpl === null}
        />

        <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
      </div>
    </div>
  );
};

export default CPLCalculator;
