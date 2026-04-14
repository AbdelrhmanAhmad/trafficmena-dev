import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createManualTrackEnrollment, revokeTrackEnrollment } from '@/app/api/tracks';

function invalidateTrackAccessQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  trackId: string,
) {
  queryClient.invalidateQueries({ queryKey: ['track-attendees', trackId] });
  queryClient.invalidateQueries({ queryKey: ['tracks', 'detail', trackId] });
  queryClient.invalidateQueries({ queryKey: ['tracks', 'public', 'detail', trackId] });
  queryClient.invalidateQueries({ queryKey: ['tracks'] });
  queryClient.invalidateQueries({ queryKey: ['events'] });
  queryClient.invalidateQueries({ queryKey: ['series'] });
  queryClient.invalidateQueries({ queryKey: ['library'] });
}

export function useCreateManualTrackEnrollment(trackId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      userId: string;
      reason: string;
      reference: string;
      amountPaidCents?: number | null;
    }) => createManualTrackEnrollment(trackId, payload),
    onSettled: () => {
      invalidateTrackAccessQueries(queryClient, trackId);
    },
  });
}

export function useRevokeTrackEnrollment(trackId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      revokeTrackEnrollment(trackId, userId, reason),
    onSettled: () => {
      invalidateTrackAccessQueries(queryClient, trackId);
    },
  });
}
