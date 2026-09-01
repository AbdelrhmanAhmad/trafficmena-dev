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

const CheckoutAbandonmentRateCalculator = () => {
  const { t } = useTranslation('calculators');
  const [checkoutsStarted, setCheckoutsStarted] = useState('');
  const [checkoutsCompleted, setCheckoutsCompleted] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const checkoutsStartedId = useId();
  const checkoutsCompletedId = useId();

  const calculateAbandonmentRate = (): number | null => {
    const started = parseFloat(checkoutsStarted);
    const completed = parseFloat(checkoutsCompleted);
    if (Number.isNaN(started) || Number.isNaN(completed) || started === 0) return null;
    const abandoned = started - completed;
    return (abandoned / started) * 100;
  };

  const abandonmentRate = calculateAbandonmentRate();

  const handleShare = () => {
    const text =
      abandonmentRate !== null
        ? t('calcs.checkout-abandonment.share.result', {
            rate: abandonmentRate.toFixed(2),
            started: checkoutsStarted,
            completed: checkoutsCompleted,
            rateLabel: t('calcs.checkout-abandonment.results.rate'),
            startedLabel: t('calcs.checkout-abandonment.fields.checkoutsStarted'),
            completedLabel: t('calcs.checkout-abandonment.fields.checkoutsCompleted'),
            panelTitle: t('calcs.checkout-abandonment.panelTitle'),
          })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setCheckoutsStarted('');
    setCheckoutsCompleted('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  const getPerformanceIndicator = () => {
    if (abandonmentRate === null) return null;
    if (abandonmentRate < 55) {
      return {
        text: 'Excellent! Well below the 55-65% benchmark. Your checkout is highly optimized.',
        className: 'text-performance-excellent',
      };
    }
    if (abandonmentRate < 65) {
      return {
        text: 'Good. Within the optimal 55-65% range for checkout abandonment.',
        className: 'text-performance-good',
      };
    }
    if (abandonmentRate < 75) {
      return {
        text: 'Average. Room for improvement. Review checkout friction points.',
        className: 'text-performance-breakeven',
      };
    }
    return {
      text: 'High abandonment (>75%). Significant bottlenecks need immediate attention.',
      className: 'text-performance-loss',
    };
  };

  const performance = getPerformanceIndicator();

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Left Column - Educational Content */}
        <CalculatorEducationPanel slug="checkout-abandonment" />

        {/* Right Column - Calculator */}
      <div className="space-y-4 lg:space-y-6">
        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Accordion type="single" collapsible defaultValue="calculator">
            <AccordionItem value="calculator" className="border-none">
              <AccordionTrigger className="text-lg lg:text-xl font-semibold text-neutral-800 hover:no-underline">
                {t('calcs.checkout-abandonment.panelTitle')}
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 lg:space-y-6">
                {/* {t('calcs.checkout-abandonment.fields.checkoutsStarted')} Input */}
                <div className="space-y-2">
                  <Label htmlFor={checkoutsStartedId} className="text-sm text-neutral-600">
                    {t('calcs.checkout-abandonment.fields.checkoutsStarted')}
                  </Label>
                  <Input
                    id={checkoutsStartedId}
                    type="number"
                    placeholder={t('calcs.checkout-abandonment.placeholders.checkoutsStarted')}
                    value={checkoutsStarted}
                    onChange={(e) => setCheckoutsStarted(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* {t('calcs.checkout-abandonment.fields.checkoutsCompleted')} Input */}
                <div className="space-y-2">
                  <Label htmlFor={checkoutsCompletedId} className="text-sm text-neutral-600">
                    {t('calcs.checkout-abandonment.fields.checkoutsCompleted')}
                  </Label>
                  <Input
                    id={checkoutsCompletedId}
                    type="number"
                    placeholder={t('calcs.checkout-abandonment.placeholders.checkoutsCompleted')}
                    value={checkoutsCompleted}
                    onChange={(e) => setCheckoutsCompleted(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* Abandonment Rate Result */}
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-600">{t('calcs.checkout-abandonment.results.rate')}</Label>
                  <Input
                    readOnly
                    value={abandonmentRate !== null ? `${abandonmentRate.toFixed(2)}%` : '—'}
                    className="h-11 lg:h-12 text-base font-semibold bg-neutral-50 border border-neutral-100 rounded-xl"
                  />
                </div>

                {/* Performance Indicator */}
                {performance && (
                  <div
                    className={`p-4 bg-neutral-50 border border-neutral-100 rounded-xl ${performance.className}`}
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
          shareDisabled={abandonmentRate === null}
        />

        {/* Feedback Section */}
        <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
      </div>
    </div>
  );
};

export default CheckoutAbandonmentRateCalculator;
