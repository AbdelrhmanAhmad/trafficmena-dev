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

const CVRCalculator = () => {
  const { t } = useTranslation('calculators');
  const [conversions, setConversions] = useState<string>('');
  const [visitors, setVisitors] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const conversionsId = useId();
  const visitorsId = useId();

  const calculateCVR = (): number | null => {
    const totalConversions = parseFloat(conversions);
    const totalVisitors = parseFloat(visitors);
    if (Number.isNaN(totalConversions) || Number.isNaN(totalVisitors) || totalVisitors === 0)
      return null;
    return (totalConversions / totalVisitors) * 100;
  };

  const cvr = calculateCVR();

  const handleShare = () => {
    const text =
      cvr !== null
        ? t('calcs.cvr.share.result', {
      cvr: cvr.toFixed(2),
      conversions: parseInt(conversions, 10).toLocaleString(),
      visitors: parseInt(visitors, 10).toLocaleString(),
    })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setConversions('');
    setVisitors('');
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
        <CalculatorEducationPanel slug="cvr" />

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['cvr']} className="w-full">
              {/* CVR Calculator Section */}
              <AccordionItem value="cvr" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    {t('calcs.cvr.panelTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="space-y-4 lg:space-y-6">
                    {/* Conversions Input */}
                    <div className="space-y-2">
                      <Label htmlFor={conversionsId} className="text-sm text-neutral-600">
                        {t('calcs.cvr.fields.conversions')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={conversionsId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={conversions}
                          onChange={(e) => setConversions(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* Visitors Input */}
                    <div className="space-y-2">
                      <Label htmlFor={visitorsId} className="text-sm text-neutral-600">
                        {t('calcs.cvr.fields.visitors')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={visitorsId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={visitors}
                          onChange={(e) => setVisitors(e.target.value)}
                          className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                      </div>
                    </div>

                    {/* CVR Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">{t('calcs.cvr.results.cvr')}</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={cvr !== null ? cvr.toFixed(2) : ''}
                          placeholder={t('common.placeholderDash')}
                          className="pr-10 h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 rounded-xl font-semibold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {cvr !== null && (
                      <p
                        className={`text-sm mt-2 ${
                          cvr < 1
                            ? 'text-performance-loss'
                            : cvr < 2
                              ? 'text-performance-breakeven'
                              : cvr < 5
                                ? 'text-performance-good'
                                : 'text-performance-excellent'
                        }`}
                      >
                        {cvr < 1 && t('calcs.cvr.performance.low')}
                        {cvr >= 1 && cvr < 2 && t('calcs.cvr.performance.belowAverage')}
                        {cvr >= 2 && cvr < 5 && t('calcs.cvr.performance.good')}
                        {cvr >= 5 && t('calcs.cvr.performance.excellent')}
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
            shareDisabled={cvr === null}
          />

          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default CVRCalculator;
