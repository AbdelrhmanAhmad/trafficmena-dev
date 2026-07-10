import { Loader2 } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/custom/use-toast';

interface RemoveTrackEventDialogProps {
  open: boolean;
  eventTitle: string;
  activeBookingsCount: number;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}

export const RemoveTrackEventDialog = ({
  open,
  eventTitle,
  activeBookingsCount,
  isPending,
  onOpenChange,
  onConfirm,
}: RemoveTrackEventDialogProps) => {
  const { toast } = useToast();
  const reasonId = useId();
  const [reason, setReason] = useState('');

  // Start blank on every open so a stale value can never silently satisfy the audit check.
  useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open]);

  const handleConfirm = () => {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      toast({
        title: 'Reason required',
        description: 'Provide at least 3 characters for audit logs.',
        variant: 'destructive',
      });
      return;
    }
    onConfirm(trimmedReason);
  };

  const bookingsLabel = activeBookingsCount === 1 ? 'booking' : 'bookings';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {eventTitle} from the track?</DialogTitle>
          <DialogDescription>
            This track has {activeBookingsCount} active {bookingsLabel}. Their registration for this
            session will be cancelled and its meeting link removed. This cannot be undone by
            re-adding the session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor={reasonId}>Removal reason</Label>
          <Input
            id={reasonId}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why this session is being removed"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Remove session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
