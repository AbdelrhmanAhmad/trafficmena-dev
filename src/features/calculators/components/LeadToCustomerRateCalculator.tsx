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

const LeadToCustomerRateCalculator = () => {
  const { t } = useTranslation('calculators');
  const [totalLeads, setTotalLeads] = useState('');
  const [customersAcquired, setCustomersAcquired] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const totalLeadsId = useId();
  const customersAcquiredId = useId();

  const calculateConversionRate = (): number | null => {
    const leads = parseFloat(totalLeads);
    const customers = parseFloat(customersAcquired);
    if (Number.isNaN(leads) || Number.isNaN(customers) || leads === 0) return null;
    return (customers / leads) * 100;
  };

  const conversionRate = calculateConversionRate();

  const handleShare = () => {
    const text =
      conversionRate !== null
        ? t('calcs.lead-to-customer.share.result', {
            rate: conversionRate.toFixed(2),
            leads: totalLeads,
            customers: customersAcquired,
            rateLabel: t('calcs.lead-to-customer.results.rate'),
            leadsLabel: t('calcs.lead-to-customer.fields.totalLeads'),
            customersLabel: t('calcs.lead-to-customer.fields.customersAcquired'),
            panelTitle: t('calcs.lead-to-customer.panelTitle'),
          })
        : null;
    shareToClipboard(text);
  };

  const handleClear = () => {
    setTotalLeads('');
    setCustomersAcquired('');
    setFeedbackGiven(null);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive);
    showFeedbackToast(positive);
  };

  const getPerformanceIndicator = () => {
    if (conversionRate === null) return null;
    if (conversionRate >= 5) {
      return {
        text: 'Excellent! Top-tier conversion rate. Your sales funnel is highly optimized.',
        className: 'text-performance-excellent',
      };
    }
    if (conversionRate >= 3) {
      return {
        text: 'Good. Above the 2-5% B2B average. Strong sales process in place.',
        className: 'text-performance-good',
      };
    }
    if (conversionRate >= 1) {
      return {
        text: 'Average. Within typical B2B range (1-3%). Room for optimization.',
        className: 'text-performance-breakeven',
      };
    }
    return {
      text: 'Below average. Review lead quality and sales process bottlenecks.',
      className: 'text-performance-loss',
    };
  };

  const performance = getPerformanceIndicator();

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Left Column - Educational Content */}
        <CalculatorEducationPanel slug="lead-to-customer" />

        {/* Right Column - Calculator */}
      <div className="space-y-4 lg:space-y-6">
        <Card className="p-5 lg:p-6 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Accordion type="single" collapsible defaultValue="calculator">
            <AccordionItem value="calculator" className="border-none">
              <AccordionTrigger className="text-lg lg:text-xl font-semibold text-neutral-800 hover:no-underline">
                {t('calcs.lead-to-customer.panelTitle')}
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 lg:space-y-6">
                {/* {t('calcs.lead-to-customer.fields.totalLeads')} Input */}
                <div className="space-y-2">
                  <Label htmlFor={totalLeadsId} className="text-sm text-neutral-600">
                    {t('calcs.lead-to-customer.fields.totalLeads')}
                  </Label>
                  <Input
                    id={totalLeadsId}
                    type="number"
                    placeholder="Enter total number of leads"
                    value={totalLeads}
                    onChange={(e) => setTotalLeads(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* {t('calcs.lead-to-customer.fields.customersAcquired')} Input */}
                <div className="space-y-2">
                  <Label htmlFor={customersAcquiredId} className="text-sm text-neutral-600">
                    {t('calcs.lead-to-customer.fields.customersAcquired')}
                  </Label>
                  <Input
                    id={customersAcquiredId}
                    type="number"
                    placeholder="Enter number of new customers"
                    value={customersAcquired}
                    onChange={(e) => setCustomersAcquired(e.target.value)}
                    className="h-11 lg:h-12 text-base border-neutral-200 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                </div>

                {/* Conversion Rate Result */}
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-600">{t('calcs.lead-to-customer.results.rate')}</Label>
                  <Input
                    readOnly
                    value={conversionRate !== null ? `${conversionRate.toFixed(2)}%` : '—'}
                    className="h-11 lg:h-12 text-base font-semibold bg-muted border-neutral-200"
                  />
                </div>

                {/* Performance Indicator */}
                {performance && (
                  <div
                    className={`p-4 rounded-lg bg-neutral-50 border border-neutral-100 ${performance.className}`}
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
          shareDisabled={conversionRate === null}
        />

        {/* Feedback Section */}
        <CalculatorFeedback feedbackGiven={feedbackGiven} onFeedback={handleFeedback} />
      </div>
    </div>
  );
};

export default LeadToCustomerRateCalculator;
