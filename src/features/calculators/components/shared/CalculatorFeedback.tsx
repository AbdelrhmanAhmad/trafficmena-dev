import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { memo } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

interface CalculatorFeedbackProps {
  feedbackGiven: boolean | null;
  onFeedback: (positive: boolean) => void;
}

export const CalculatorFeedback = memo(function CalculatorFeedback({
  feedbackGiven,
  onFeedback,
}: CalculatorFeedbackProps) {
  return (
    <Card className="p-4 lg:p-5 border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className="text-sm text-neutral-500">Was this calculator helpful?</span>
        <div className="flex gap-2">
          <Button
            variant={feedbackGiven === true ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFeedback(true)}
            className={
              feedbackGiven === true
                ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                : ''
            }
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button
            variant={feedbackGiven === false ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFeedback(false)}
            className={
              feedbackGiven === false
                ? 'bg-neutral-500 text-white border-neutral-500 hover:bg-neutral-600'
                : ''
            }
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
});
