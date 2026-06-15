import { toast } from '@/shared/hooks/custom/use-toast';

export function showFeedbackToast(positive: boolean): void {
  toast({
    title: positive ? 'Thanks for the feedback!' : "We'll improve!",
    description: positive
      ? "We're glad this calculator helped you."
      : 'Your feedback helps us make better tools.',
  });
}
