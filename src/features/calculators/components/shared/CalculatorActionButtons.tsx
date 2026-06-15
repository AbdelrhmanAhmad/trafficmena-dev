import { Share2, Trash2 } from 'lucide-react';
import { memo } from 'react';
import { Button } from '@/shared/components/ui/button';
import { useReportCalculatorResultReady } from '../../analytics';
import { resolveCalculatorResultReady } from '../../analytics-shared';

interface CalculatorActionButtonsProps {
  onShare: () => void;
  onClear: () => void;
  shareDisabled?: boolean;
  resultReady?: boolean;
}

export const CalculatorActionButtons = memo(function CalculatorActionButtons(
  props: CalculatorActionButtonsProps,
) {
  const { onShare, onClear, shareDisabled = false, resultReady } = props;
  useReportCalculatorResultReady(
    resolveCalculatorResultReady({
      resultReady,
      shareDisabled,
      hasExplicitShareDisabled: Object.hasOwn(props, 'shareDisabled'),
    }),
  );

  return (
    <div className="flex gap-3">
      <Button
        variant="outline"
        onClick={onShare}
        disabled={shareDisabled}
        className="flex-1 h-10 text-sm border-neutral-200 hover:bg-neutral-50"
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>
      <Button
        variant="outline"
        onClick={onClear}
        className="flex-1 h-10 text-sm border-neutral-200 hover:bg-neutral-50"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Clear
      </Button>
    </div>
  );
});
