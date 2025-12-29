import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useTrackBooking } from '../hooks/useTrackBooking';

interface TrackBookingButtonProps {
  trackId: string;
  isBooked: boolean;
  canBook: boolean; // Based on time window
  spotsRemaining: number | null; // Null means unlimited
  className?: string;
  opensAt?: Date | null;
}

export function TrackBookingButton({
  trackId,
  isBooked,
  canBook,
  spotsRemaining,
  className,
  opensAt,
}: TrackBookingButtonProps) {
  const { bookTrack, isPending } = useTrackBooking(trackId);

  if (isBooked) {
    return (
      <Button
        variant="outline"
        disabled
        className={`cursor-default border-green-500 text-green-600 ${className}`}
      >
        Selected
      </Button>
    );
  }

  // Check capacity
  const isFull = spotsRemaining !== null && spotsRemaining <= 0;

  if (isFull) {
    return (
      <Button variant="ghost" disabled className={className}>
        Track Full
      </Button>
    );
  }

  if (opensAt && new Date() < opensAt) {
    return (
      <Button variant="ghost" disabled className={className}>
        Opens {opensAt.toLocaleDateString()}
      </Button>
    );
  }

  if (!canBook) {
    return (
      <Button variant="ghost" disabled className={className}>
        Closed
      </Button>
    );
  }

  return (
    <Button onClick={() => bookTrack()} disabled={isPending} className={className} size="sm">
      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Select Track
    </Button>
  );
}
