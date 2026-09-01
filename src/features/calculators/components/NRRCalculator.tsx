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

const NRRCalculator = () => {
  const { t } = useTranslation('calculators');
  const [startingMRR, setStartingMRR] = useState<string>('');
  const [expansionMRR, setExpansionMRR] = useState<string>('');
  const [contractionMRR, setContractionMRR] = useState<string>('');
  const [churnMRR, setChurnMRR] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const startingMRRId = useId();
  const expansionMRRId = useId();
  const contractionMRRId = useId();
  const churnMRRId = useId();

  // NRR = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR × 100
  const calculateNRR = (): number | null => {
    const starting = parseFloat(startingMRR);
    const expansion = parseFloat(expansionMRR) || 0;
    const contraction = parseFloat(contractionMRR) || 0;
    const churn = parseFloat(churnMRR) || 0;
    if (Number.isNaN(starting) || starting === 0) return null;
    return ((starting + expansion - contraction - churn) / starting) * 100;
  };

  // GRR = (Starting MRR - Contraction - Churn) / Starting MRR × 100
  const calculateGRR = (): number | null => {
    const starting = parseFloat(startingMRR);
    const contraction = parseFloat(contractionMRR) || 0;
    const churn = parseFloat(churnMRR) || 0;
    if (Number.isNaN(starting) || starting === 0) return null;
    const grr = ((starting - contraction - churn) / starting) * 100;
    return Math.min(grr, 100); // GRR cannot exceed 100%
  };

  const calculateEndingMRR = (): number | null => {
    const starting = parseFloat(startingMRR);
    const expansion = parseFloat(expansionMRR) || 0;
    const contraction = parseFloat(contractionMRR) || 0;
    const churn = parseFloat(churnMRR) || 0;
    if (Number.isNaN(starting)) return null;
    return starting + expansion - contraction - churn;
  };

  const nrr = calculateNRR();
  const grr = calculateGRR();
  const endingMRR = calculateEndingMRR();

  const handleShare = () => {
    const text =
      nrr !== null
        ? t('calcs.nrr.share.result', {
      nrr: nrr.toFixed(1),
      starting: formatCurrency(startingMRR, currency),
      ending: formatCurrency(endingMRR, currency),
    })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setStartingMRR('');
    setExpansionMRR('');
    setContractionMRR('');
    setChurnMRR('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Column - Educational Content */}
        <CalculatorEducationPanel slug="nrr" />

        {/* Right Column - Calculator */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Accordion type="multiple" defaultValue={['nrr']} className="w-full">
              <AccordionItem value="nrr" className="border-none">
                <AccordionTrigger className="px-5 lg:px-6 py-4 hover:no-underline">
                  <span className="text-base lg:text-lg font-semibold text-neutral-800">
                    {t('calcs.nrr.panelTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 lg:px-6 pb-5 lg:pb-6">
                  <div className="space-y-5">
                    {/* Starting MRR Input */}
                    <div className="space-y-2">
                      <Label htmlFor={startingMRRId} className="text-sm text-neutral-600">
                        {t('calcs.nrr.fields.startingMrr')}
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
                            <SelectTrigger className="w-20 h-10 border-0 bg-transparent text-emerald-600 font-medium text-sm focus:ring-0">
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

                    {/* Expansion MRR Input */}
                    <div className="space-y-2">
                      <Label htmlFor={expansionMRRId} className="text-sm text-neutral-600">
                        {t('calcs.nrr.fields.expansionMrr')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={expansionMRRId}
                          type="number"
                          placeholder={t('common.placeholderZero')}
                          value={expansionMRR}
                          onChange={(e) => setExpansionMRR(e.target.value)}
                          className="pr-16 h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 font-medium text-sm">
                          +
                        </span>
                      </div>
                    </div>

                    {/* Contraction MRR Input */}
                    <div className="space-y-2">
                      <Label htmlFor={contractionMRRId} className="text-sm text-neutral-600">
                        {t('calcs.nrr.fields.contractionMrr')}
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
                          -
                        </span>
                      </div>
                    </div>

                    {/* Churn MRR Input */}
                    <div className="space-y-2">
                      <Label htmlFor={churnMRRId} className="text-sm text-neutral-600">
                        {t('calcs.nrr.fields.churnMrr')}
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
                          -
                        </span>
                      </div>
                    </div>

                    {/* Ending MRR Output */}
                    {endingMRR !== null && startingMRR && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">
                          {t('calcs.nrr.results.endingMrr')}
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={formatCurrency(endingMRR, currency)}
                            readOnly
                            className="h-11 lg:h-12 text-base bg-muted/50 font-medium border-neutral-200"
                          />
                        </div>
                      </div>
                    )}

                    {/* NRR Output */}
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-600">
                        ${t('calcs.nrr.results.nrr')}
                      </Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={nrr !== null ? `${nrr.toFixed(1)}%` : '—'}
                          readOnly
                          className="h-11 lg:h-12 text-base bg-muted/50 font-medium border-neutral-200"
                        />
                      </div>
                    </div>

                    {/* GRR Output */}
                    {grr !== null && startingMRR && (
                      <div className="space-y-2">
                        <Label className="text-sm text-neutral-600">
                          ${t('calcs.nrr.results.grr')}
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={`${grr.toFixed(1)}%`}
                            readOnly
                            className="h-11 lg:h-12 text-base bg-muted/50 font-medium border-neutral-200"
                          />
                        </div>
                      </div>
                    )}

                    {/* Performance Indicator */}
                    {nrr !== null && (
                      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-100">
                        {nrr < 100 && (
                          <p className="text-performance-loss font-medium">
                            Below 100%: Revenue is shrinking from existing customers. Focus on
                            reducing churn and contraction.
                          </p>
                        )}
                        {nrr >= 100 && nrr < 106 && (
                          <p className="text-performance-breakeven font-medium">
                            100-105%: Fair retention. You're maintaining revenue but have limited
                            expansion. Build your upsell motion.
                          </p>
                        )}
                        {nrr >= 106 && nrr < 116 && (
                          <p className="text-performance-good font-medium">
                            106-115%: Good NRR! Solid expansion is offsetting churn. You're at a
                            healthy benchmark.
                          </p>
                        )}
                        {nrr >= 116 && (
                          <p className="text-performance-excellent font-medium">
                            Above 116%: Excellent! Best-in-class expansion engine driving strong
                            growth from existing customers.
                          </p>
                        )}
                      </div>
                    )}

                    {/* GRR Warning */}
                    {nrr !== null && grr !== null && nrr >= 100 && grr < 85 && (
                      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <p className="text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                          Watch your GRR: {grr.toFixed(1)}% is below 85%. Your expansion is masking
                          significant churn. Address underlying retention issues.
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
            shareDisabled={nrr === null}
          />

          {/* Feedback Section */}
          <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
        </div>
      </div>
    </div>
  );
};

export default NRRCalculator;
