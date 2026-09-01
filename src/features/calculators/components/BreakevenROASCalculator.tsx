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

const BreakevenROASCalculator = () => {
  const { t } = useTranslation('calculators');
  const [grossMargin, setGrossMargin] = useState('');
  const [currentROAS, setCurrentROAS] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const grossMarginId = useId();
  const beROASId = useId();
  const currentROASId = useId();

  // {t('calcs.breakeven-roas.results.breakevenRoas')} = 1 / Gross Margin %
  const calculateBreakevenROAS = (): number | null => {
    const margin = parseFloat(grossMargin);
    if (Number.isNaN(margin) || margin <= 0 || margin > 100) return null;
    return 1 / (margin / 100);
  };

  const calculateProfitMarginPerDollar = (): number | null => {
    const beROAS = calculateBreakevenROAS();
    const current = parseFloat(currentROAS);
    if (beROAS === null || Number.isNaN(current) || current <= 0) return null;
    // Profit per dollar = (Current ROAS - BE ROAS) / Current ROAS * Margin
    const margin = parseFloat(grossMargin) / 100;
    return (current - beROAS) * margin;
  };

  const breakevenROAS = calculateBreakevenROAS();
  const profitPerDollar = calculateProfitMarginPerDollar();
  const currentROASValue = parseFloat(currentROAS);
  const isProfitable =
    breakevenROAS !== null && !Number.isNaN(currentROASValue) && currentROASValue > breakevenROAS;

  const handleShare = () => {
    const text =
      breakevenROAS !== null
        ? t('calcs.breakeven-roas.share.result', {
            breakevenRoasLabel: t('calcs.breakeven-roas.results.breakevenRoas'),
            grossMargin,
            breakevenRoas: breakevenROAS.toFixed(2),
            currentRoas: Number.isNaN(currentROASValue) ? '—' : `${currentROASValue.toFixed(2)}x`,
          })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setGrossMargin('');
    setCurrentROAS('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Left Column - Educational Content */}
        <CalculatorEducationPanel slug="breakeven-roas" />

        {/* Right Column - Calculator */}
      <div className="space-y-4 lg:space-y-6">
        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Accordion type="single" defaultValue="calculator" collapsible>
            <AccordionItem value="calculator" className="border-none">
              <AccordionTrigger className="px-0 py-4 hover:no-underline">
                <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                  {t('calcs.breakeven-roas.panelTitle')}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-6">
                <div className="space-y-4 lg:space-y-6">
                  {/* Gross Margin Input */}
                  <div className="space-y-2">
                    <Label htmlFor={grossMarginId} className="text-sm text-neutral-600">
                      {t('calcs.breakeven-roas.fields.grossMargin')}
                    </Label>
                    <div className="relative">
                      <Input
                        id={grossMarginId}
                        type="number"
                        placeholder="e.g., 40"
                        value={grossMargin}
                        onChange={(e) => setGrossMargin(e.target.value)}
                        className="pr-12 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Gross Margin = (Revenue - COGS) / Revenue × 100
                    </p>
                  </div>

                  {/* {t('calcs.breakeven-roas.results.breakevenRoas')} Output */}
                  <div className="space-y-2">
                    <Label htmlFor={beROASId} className="text-sm text-neutral-600">
                      ${t('calcs.breakeven-roas.results.breakevenRoas')}
                    </Label>
                    <div className="relative">
                      <Input
                        id={beROASId}
                        type="text"
                        value={breakevenROAS !== null ? `${breakevenROAS.toFixed(2)}x` : ''}
                        readOnly
                        className="h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 font-semibold tabular-nums"
                        placeholder="Enter gross margin above"
                      />
                    </div>
                    {breakevenROAS !== null && (
                      <p className="text-sm text-neutral-600">
                        You need at least {breakevenROAS.toFixed(2)}x ROAS to break even
                      </p>
                    )}
                  </div>

                  {/* Optional: Current ROAS */}
                  <div className="space-y-2">
                    <Label htmlFor={currentROASId} className="text-sm text-neutral-600">
                      {t('calcs.breakeven-roas.fields.currentRoasOptional')}
                    </Label>
                    <div className="relative">
                      <Input
                        id={currentROASId}
                        type="number"
                        placeholder="e.g., 3.5"
                        value={currentROAS}
                        onChange={(e) => setCurrentROAS(e.target.value)}
                        className="pr-8 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        min="0"
                        step="0.01"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600">
                        x
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {t('calcs.breakeven-roas.hints.currentRoas')}
                    </p>
                  </div>

                  {/* {t('calcs.breakeven-roas.results.profitabilityStatus')} */}
                  {breakevenROAS !== null && currentROAS && (
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">${t('calcs.breakeven-roas.results.profitabilityStatus')}</Label>
                      <div
                        className={`p-4 rounded-lg border ${
                          isProfitable
                            ? 'bg-primary-green/10 border-primary-green/30'
                            : 'bg-destructive/10 border-destructive/30'
                        }`}
                      >
                        {isProfitable ? (
                          <>
                            <p className="text-performance-excellent font-semibold">{t('calcs.breakeven-roas.status.profitable')}</p>
                            <p className="text-sm text-neutral-600 mt-1">
                              Your ROAS of {currentROASValue.toFixed(2)}x is{' '}
                              <span className="tabular-nums">
                                {(
                                  ((currentROASValue - breakevenROAS) / breakevenROAS) *
                                  100
                                ).toFixed(1)}
                                %
                              </span>{' '}
                              above break-even
                            </p>
                            {profitPerDollar !== null && (
                              <p className="text-sm text-neutral-600">
                                Estimated profit:{' '}
                                <span className="tabular-nums">${profitPerDollar.toFixed(2)}</span>{' '}
                                per $1 ad spend
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-performance-loss font-semibold">{t('calcs.breakeven-roas.status.belowBreakeven')}</p>
                            <p className="text-sm text-neutral-600 mt-1">
                              Your ROAS of {currentROASValue.toFixed(2)}x is{' '}
                              <span className="tabular-nums">
                                {(
                                  ((breakevenROAS - currentROASValue) / breakevenROAS) *
                                  100
                                ).toFixed(1)}
                                %
                              </span>{' '}
                              below break-even
                            </p>
                            <p className="text-sm text-neutral-600">
                              You need to increase ROAS by{' '}
                              <span className="tabular-nums">
                                {(breakevenROAS - currentROASValue).toFixed(2)}x
                              </span>{' '}
                              to break even
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Performance Indicator */}
                  {breakevenROAS !== null && (
                    <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-100">
                      {breakevenROAS >= 4 && (
                        <p className="text-performance-loss">
                          High break-even ROAS ({breakevenROAS.toFixed(2)}x). Low margins make
                          profitable advertising challenging. Consider improving margins or focusing
                          on LTV.
                        </p>
                      )}
                      {breakevenROAS >= 2.5 && breakevenROAS < 4 && (
                        <p className="text-performance-breakeven">
                          Moderate break-even ROAS ({breakevenROAS.toFixed(2)}
                          x). Achievable with well-optimized campaigns. Target ROAS of{' '}
                          {(breakevenROAS * 1.5).toFixed(1)}x+ for healthy profits.
                        </p>
                      )}
                      {breakevenROAS >= 1.5 && breakevenROAS < 2.5 && (
                        <p className="text-performance-good">
                          Good break-even ROAS ({breakevenROAS.toFixed(2)}x). Healthy margins give
                          you room for profitable scaling.
                        </p>
                      )}
                      {breakevenROAS < 1.5 && (
                        <p className="text-performance-excellent">
                          Excellent break-even ROAS ({breakevenROAS.toFixed(2)}
                          x). High margins mean almost any positive ROAS is profitable!
                        </p>
                      )}
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
          shareDisabled={breakevenROAS === null}
        />

        {/* Feedback Section */}
        <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
      </div>
    </div>
  );
};

export default BreakevenROASCalculator;
