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
import { shareToClipboard } from '../utils/clipboard';
import { showFeedbackToast } from '../utils/feedback';
import { CalculatorActionButtons, CalculatorEducationPanel, CalculatorFeedback } from './shared';

const RepeatPurchaseRateCalculator = () => {
  const { t } = useTranslation('calculators');
  const [repeatCustomers, setRepeatCustomers] = useState('');
  const [totalCustomers, setTotalCustomers] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const repeatCustomersId = useId();
  const totalCustomersId = useId();

  const calculateRPR = (): number | null => {
    const repeat = parseFloat(repeatCustomers);
    const total = parseFloat(totalCustomers);
    if (Number.isNaN(repeat) || Number.isNaN(total) || total === 0) return null;
    return (repeat / total) * 100;
  };

  const rpr = calculateRPR();

  const handleShare = () => {
    const text =
      rpr !== null
        ? t('calcs.repeat-purchase.share.result', {
            rate: rpr.toFixed(2),
            repeat: repeatCustomers,
            total: totalCustomers,
            rateLabel: t('calcs.repeat-purchase.results.rate'),
            totalLabel: t('calcs.repeat-purchase.fields.totalCustomers'),
            panelTitle: t('calcs.repeat-purchase.panelTitle'),
          })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setRepeatCustomers('');
    setTotalCustomers('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  const getPerformanceIndicator = () => {
    if (rpr === null) return null;
    if (rpr >= 40) {
      return {
        text: '🚀 Excellent! Top-tier retention, typical of subscription-based businesses.',
        className: 'text-performance-excellent',
      };
    }
    if (rpr >= 25) {
      return {
        text: '✅ Good repeat rate. Above the ecommerce average of 15-30%.',
        className: 'text-performance-good',
      };
    }
    if (rpr >= 15) {
      return {
        text: '📊 Average repeat rate. Room for improvement with retention strategies.',
        className: 'text-performance-breakeven',
      };
    }
    return {
      text: '⚠️ Below average. Focus on customer experience and loyalty programs.',
      className: 'text-performance-loss',
    };
  };

  const performance = getPerformanceIndicator();

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Left Column - Educational Content */}
        <CalculatorEducationPanel slug="repeat-purchase" />

        {/* Right Column - Calculator */}
      <div className="space-y-4 lg:space-y-6">
        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Accordion type="single" collapsible defaultValue="calculator">
            <AccordionItem value="calculator" className="border-none">
              <AccordionTrigger className="text-lg lg:text-xl font-semibold text-neutral-800 hover:no-underline">
                {t('calcs.repeat-purchase.panelTitle')}
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 lg:space-y-6">
                {/* Repeat Customers Input */}
                <div className="space-y-2">
                  <Label htmlFor={repeatCustomersId}>{t('calcs.repeat-purchase.fields.repeatCustomers')}</Label>
                  <Input
                    id={repeatCustomersId}
                    type="number"
                    placeholder={t('calcs.repeat-purchase.placeholders.repeatCustomers')}
                    value={repeatCustomers}
                    onChange={(e) => setRepeatCustomers(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* {t('calcs.repeat-purchase.fields.totalCustomers')} Input */}
                <div className="space-y-2">
                  <Label htmlFor={totalCustomersId}>{t('calcs.repeat-purchase.fields.totalCustomers')}</Label>
                  <Input
                    id={totalCustomersId}
                    type="number"
                    placeholder={t('calcs.repeat-purchase.placeholders.totalCustomers')}
                    value={totalCustomers}
                    onChange={(e) => setTotalCustomers(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* RPR Result */}
                <div className="space-y-2">
                  <Label>{t('calcs.repeat-purchase.results.rate')}</Label>
                  <Input
                    readOnly
                    value={rpr !== null ? `${rpr.toFixed(2)}%` : '—'}
                    className="h-11 lg:h-12 text-base font-semibold bg-neutral-50 border border-neutral-100 rounded-xl"
                  />
                </div>

                {/* Performance Indicator */}
                {performance && (
                  <div
                    className={`p-4 rounded-lg bg-neutral-50 border border-neutral-100 rounded-xl ${performance.className}`}
                  >
                    {performance.text}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Action Buttons */}
        <CalculatorActionButtons
          onShare={handleShare}
          onClear={handleClear}
          shareDisabled={rpr === null}
        />

        {/* Feedback Section */}
        <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
      </div>
    </div>
  );
};

export default RepeatPurchaseRateCalculator;
