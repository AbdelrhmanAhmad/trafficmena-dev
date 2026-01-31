import { Share2, Trash2 } from 'lucide-react';
import { memo } from 'react';
import { Button } from '@/shared/components/ui/button';

interface CalculatorActionButtonsProps {
  onShare: () => void;
  onClear: () => void;
  shareDisabled?: boolean;
}

export const CalculatorActionButtons = memo(function CalculatorActionButtons({
  onShare,
  onClear,
  shareDisabled = false,
}: CalculatorActionButtonsProps) {
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
