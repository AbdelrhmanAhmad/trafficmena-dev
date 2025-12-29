import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bookTrack } from '@/app/api/tracks';

export function useTrackBooking(trackId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => bookTrack(trackId),
    onSuccess: (data) => {
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      // Also invalidate events as their attendee counts change
      queryClient.invalidateQueries({ queryKey: ['events'] });

      if (data.success) {
        if (data.alreadyBooked) {
          toast.info(data.message);
        } else {
          toast.success(data.message);
        }
      }
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
