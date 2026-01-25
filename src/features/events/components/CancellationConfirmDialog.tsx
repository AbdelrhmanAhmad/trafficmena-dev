import { AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

type CancellationConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPaidEvent: boolean;
  isLoading?: boolean;
};

export function CancellationConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isPaidEvent,
  isLoading = false,
}: CancellationConfirmDialogProps) {
  const title = isPaidEvent ? 'Request Cancellation & Refund?' : 'Cancel Registration?';
  const description = isPaidEvent
    ? 'Your cancellation request will be sent to our team for review. Once approved, your refund will be processed.'
    : 'You will lose your spot in this event. You can re-register later if spots are still available.';
  const confirmLabel = isPaidEvent ? 'Request Cancellation & Refund' : 'Yes, Cancel';
  const confirmVariant = isPaidEvent ? 'default' : 'destructive';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                isPaidEvent ? 'bg-amber-100' : 'bg-red-100'
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${isPaidEvent ? 'text-amber-600' : 'text-red-600'}`}
              />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Keep Registration
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isLoading}
            className={isPaidEvent ? 'bg-amber-500 text-white hover:bg-amber-600' : ''}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
