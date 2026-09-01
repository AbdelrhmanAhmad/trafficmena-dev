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

const CTRCalculator = () => {
  const { t } = useTranslation('calculators');
  const [clicks, setClicks] = useState<string>('');
  const [impressions, setImpressions] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const clicksId = useId();
  const impressionsId = useId();

  const calculateCTR = (): number | null => {
    const totalClicks = parseFloat(clicks);
    const totalImpressions = parseFloat(impressions);
    if (Number.isNaN(totalClicks) || Number.isNaN(totalImpressions) || totalImpressions === 0)
      return null;
    return (totalClicks / totalImpressions) * 100;
  };

  const ctr = calculateCTR();

  const handleShare = () => {
    const text =
      ctr !== null
        ? t('calcs.ctr.share.result', {
      ctr: ctr.toFixed(2),
      clicks: parseInt(clicks, 10).toLocaleString(),
      impressions: parseInt(impressions, 10).toLocaleString(),
    })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setClicks('');
    setImpressions('');
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
        <CalculatorEducationPanel slug="ctr" />

        {/* Right Column - Calculator */}
        <div className="space-y-4">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['ctr']} className="w-full">
              {/* CTR Calculator Section */}
              <AccordionItem value="ctr" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    {t('calcs.ctr.panelTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6">
                  <div className="space-y-5">
                    {/* Clicks Input */}
                    <div className="space-y-2">
                      <Label htmlFor={clicksId} className="text-sm text-neutral-600">
                        {t('calcs.ctr.fields.clicks')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={clicksId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={clicks}
                          onChange={(e) => setClicks(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* Impressions Input */}
                    <div className="space-y-2">
                      <Label htmlFor={impressionsId} className="text-sm text-neutral-600">
                        {t('calcs.ctr.fields.impressions')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={impressionsId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={impressions}
                          onChange={(e) => setImpressions(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* CTR Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">{t('calcs.ctr.results.ctr')}</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={ctr !== null ? ctr.toFixed(2) : ''}
                          placeholder={t('common.placeholderDash')}
                          className="pr-10 h-11 lg:h-12 text-base bg-muted/30 font-semibold border-neutral-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {ctr !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          ctr < 0.5
                            ? 'text-performance-loss'
                            : ctr < 1
                              ? 'text-performance-breakeven'
                              : ctr < 3
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {ctr < 0.5 &&
                          t('calcs.ctr.performance.low')}
                        {ctr >= 0.5 && ctr < 1 && t('calcs.ctr.performance.belowAverage')}
                        {ctr >= 1 && ctr < 3 && t('calcs.ctr.performance.good')}
                        {ctr >= 3 && t('calcs.ctr.performance.excellent')}
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
            shareDisabled={ctr === null}
          />

          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default CTRCalculator;
