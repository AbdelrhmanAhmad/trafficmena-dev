import i18n from '@/shared/i18n';
import { toast } from '@/shared/hooks/custom/use-toast';

export function showFeedbackToast(positive: boolean): void {
  toast({
    title: positive
      ? i18n.t('common.feedbackThanksTitle', { ns: 'calculators' })
      : i18n.t('common.feedbackImproveTitle', { ns: 'calculators' }),
    description: positive
      ? i18n.t('common.feedbackThanksDescription', { ns: 'calculators' })
      : i18n.t('common.feedbackImproveDescription', { ns: 'calculators' }),
  });
}
