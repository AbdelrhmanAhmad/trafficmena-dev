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

const CartAbandonmentRateCalculator = () => {
  const { t } = useTranslation('calculators');
  const [cartsCreated, setCartsCreated] = useState('');
  const [cartsCompleted, setCartsCompleted] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const cartsCreatedId = useId();
  const cartsCompletedId = useId();

  const calculateAbandonmentRate = (): number | null => {
    const created = parseFloat(cartsCreated);
    const completed = parseFloat(cartsCompleted);
    if (Number.isNaN(created) || Number.isNaN(completed) || created === 0) return null;
    const abandoned = created - completed;
    return (abandoned / created) * 100;
  };

  const abandonmentRate = calculateAbandonmentRate();

  const handleShare = () => {
    const text =
      abandonmentRate !== null
        ? t('calcs.cart-abandonment.share.result', {
            rate: abandonmentRate.toFixed(2),
            created: cartsCreated,
            completed: cartsCompleted,
            rateLabel: t('calcs.cart-abandonment.results.rate'),
            panelTitle: t('calcs.cart-abandonment.panelTitle'),
          })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setCartsCreated('');
    setCartsCompleted('');
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
        text: 'Excellent! Well below global average. Your checkout is highly optimized.',
        className: 'text-performance-excellent',
      };
    }
    if (abandonmentRate < 70) {
      return {
        text: 'Good. Below the global average of ~70%. Room for minor improvements.',
        className: 'text-performance-good',
      };
    }
    if (abandonmentRate < 80) {
      return {
        text: 'Average. Matches typical ecommerce rates. Focus on checkout friction.',
        className: 'text-performance-breakeven',
      };
    }
    return {
      text: 'High abandonment. Review pricing transparency and checkout flow.',
      className: 'text-performance-loss',
    };
  };

  const performance = getPerformanceIndicator();

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Left Column - Educational Content */}
        <CalculatorEducationPanel slug="cart-abandonment" />

        {/* Right Column - Calculator */}
      <div className="space-y-4 lg:space-y-6">
        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Accordion type="single" collapsible defaultValue="calculator">
            <AccordionItem value="calculator" className="border-none">
              <AccordionTrigger className="text-lg lg:text-xl font-semibold text-neutral-800 hover:no-underline">
                {t('calcs.cart-abandonment.panelTitle')}
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 lg:space-y-6">
                {/* Carts Created Input */}
                <div className="space-y-2">
                  <Label htmlFor={cartsCreatedId} className="text-sm text-neutral-600">
                    {t('calcs.cart-abandonment.fields.cartsCreated')}
                  </Label>
                  <Input
                    id={cartsCreatedId}
                    type="number"
                    placeholder={t('calcs.cart-abandonment.placeholders.cartsCreated')}
                    value={cartsCreated}
                    onChange={(e) => setCartsCreated(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* Carts Completed Input */}
                <div className="space-y-2">
                  <Label htmlFor={cartsCompletedId} className="text-sm text-neutral-600">
                    {t('calcs.cart-abandonment.fields.cartsCompleted')}
                  </Label>
                  <Input
                    id={cartsCompletedId}
                    type="number"
                    placeholder={t('calcs.cart-abandonment.placeholders.cartsCompleted')}
                    value={cartsCompleted}
                    onChange={(e) => setCartsCompleted(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* Abandonment Rate Result */}
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-600">{t('calcs.cart-abandonment.results.rate')}</Label>
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

export default CartAbandonmentRateCalculator;
