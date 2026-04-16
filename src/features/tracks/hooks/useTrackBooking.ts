import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bookTrack } from '@/app/api/tracks';
import { currentUserQueryKey } from '@/app/queryKeys';
import { trackSuccessfulTrackBooking } from '../trackBookingAnalytics';

export function useTrackBooking(trackId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => bookTrack(trackId),
    onSuccess: (data) => {
      if (data.success) {
        if (data.alreadyBooked) {
          toast.info(data.message);
        } else {
          toast.success(data.message);
          trackSuccessfulTrackBooking(queryClient, trackId, data.eventsRegistered ?? 0);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['tracks', 'detail', trackId] });
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to book track.');
    },
  });

  return {
    bookTrack: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}
