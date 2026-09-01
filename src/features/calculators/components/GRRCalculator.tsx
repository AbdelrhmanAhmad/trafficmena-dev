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

const GRRCalculator = () => {
  const { t } = useTranslation('calculators');
  const [startingMRR, setStartingMRR] = useState<string>('');
  const [contractionMRR, setContractionMRR] = useState<string>('');
  const [churnMRR, setChurnMRR] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const startingMRRId = useId();
  const contractionMRRId = useId();
  const churnMRRId = useId();

  // GRR = (Starting MRR - Contraction - Churn) / Starting MRR × 100
  const calculateGRR = (): number | null => {
    const starting = parseFloat(startingMRR);
    const contraction = parseFloat(contractionMRR) || 0;
    const churn = parseFloat(churnMRR) || 0;
    if (Number.isNaN(starting) || starting === 0) return null;
    const grr = ((starting - contraction - churn) / starting) * 100;
    return Math.min(grr, 100); // GRR cannot exceed 100%
  };

  const calculateRetainedMRR = (): number | null => {
    const starting = parseFloat(startingMRR);
    const contraction = parseFloat(contractionMRR) || 0;
    const churn = parseFloat(churnMRR) || 0;
    if (Number.isNaN(starting)) return null;
    return Math.max(starting - contraction - churn, 0);
  };

  const calculateLostMRR = (): number | null => {
    const contraction = parseFloat(contractionMRR) || 0;
    const churn = parseFloat(churnMRR) || 0;
    return contraction + churn;
  };

  const grr = calculateGRR();
  const retainedMRR = calculateRetainedMRR();
  const lostMRR = calculateLostMRR();

  const handleShare = () => {
    const text =
      grr !== null
        ? t('calcs.grr.share.result', {
      grr: grr.toFixed(1),
      starting: formatCurrency(startingMRR, currency),
      retained: formatCurrency(retainedMRR?.toFixed(0) || '0', currency),
      lost: formatCurrency(lostMRR?.toFixed(0) || '0', currency),
    })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setStartingMRR('');
    setContractionMRR('');
    setChurnMRR('');
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
        <CalculatorEducationPanel slug="grr" />

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['grr']} className="w-full">
              <AccordionItem value="grr" className="border-none">
                <AccordionTrigger className="px-0 py-4 hover:no-underline">
                  <span className="text-lg lg:text-xl font-semibold text-neutral-800">
                    {t('calcs.grr.panelTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="space-y-4 lg:space-y-6">
                    {/* Starting MRR Input */}
                    <div className="space-y-2">
                      <Label htmlFor={startingMRRId} className="text-sm text-neutral-600">
                        {t('calcs.grr.fields.startingMrr')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={startingMRRId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={startingMRR}
                          onChange={(e) => setStartingMRR(e.target.value)}
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

                    {/* Contraction MRR Input */}
                    <div className="space-y-2">
                      <Label htmlFor={contractionMRRId} className="text-sm text-neutral-600">
                        {t('calcs.grr.fields.contractionMrr')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={contractionMRRId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={contractionMRR}
                          onChange={(e) => setContractionMRR(e.target.value)}
                          className="pr-16 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-performance-loss font-medium text-sm">
                          −
                        </span>
                      </div>
                    </div>

                    {/* Churn MRR Input */}
                    <div className="space-y-2">
                      <Label htmlFor={churnMRRId} className="text-sm text-neutral-600">
                        {t('calcs.grr.fields.churnMrr')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={churnMRRId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={churnMRR}
                          onChange={(e) => setChurnMRR(e.target.value)}
                          className="pr-16 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-performance-loss font-medium text-sm">
                          −
                        </span>
                      </div>
                    </div>

                    {/* Lost MRR Output */}
                    {lostMRR !== null && startingMRR && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">
                          {t('calcs.grr.results.totalLost')}
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={formatCurrency(lostMRR, currency)}
                            readOnly
                            className="h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 rounded-xl font-medium text-performance-loss"
                          />
                        </div>
                      </div>
                    )}

                    {/* {t('calcs.grr.results.retainedMrr')} Output */}
                    {retainedMRR !== null && startingMRR && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">{t('calcs.grr.results.retainedMrr')}</Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={formatCurrency(retainedMRR, currency)}
                            readOnly
                            className="h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 rounded-xl font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {/* GRR Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">
                        ${t('calcs.grr.results.grr')}
                      </Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={grr !== null ? `${grr.toFixed(1)}%` : '—'}
                          readOnly
                          className="h-11 lg:h-12 text-base bg-neutral-50 border border-neutral-100 rounded-xl font-medium"
                        />
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    {grr !== null && (
                      <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-xl">
                        {grr < 80 && (
                          <p className="text-performance-loss font-medium">
                            Below 80%: Critical churn problem. This is a table stakes benchmark;
                            address retention immediately.
                          </p>
                        )}
                        {grr >= 80 && grr < 85 && (
                          <p className="text-performance-loss font-medium">
                            80-85%: Below average. Likely customer satisfaction issues. Investigate
                            product quality and support.
                          </p>
                        )}
                        {grr >= 85 && grr < 95 && (
                          <p className="text-performance-good font-medium">
                            85-95%: Good GRR! Healthy retention for most SaaS companies. Keep
                            optimizing onboarding and CS.
                          </p>
                        )}
                        {grr >= 95 && (
                          <p className="text-performance-excellent font-medium">
                            95%+: Excellent! Best-in-class customer stickiness. Your customers love
                            your product.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Additional Context */}
                    {grr !== null && startingMRR && (
                      <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-xl">
                        <p className="text-sm text-neutral-600">
                          <strong className="text-neutral-800">What this means:</strong> You
                          retained {grr.toFixed(1)}% of revenue from existing customers, losing{' '}
                          {(100 - grr).toFixed(1)}% to churn and downgrades.
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
            shareDisabled={grr === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default GRRCalculator;
