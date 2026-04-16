import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addEventsToTrack,
  bookTrack,
  type CreateTrackPayload,
  createTrack,
  deleteTrack,
  type FetchTracksParams,
  fetchPublicTrackById,
  fetchPublicTracks,
  fetchTrackById,
  fetchTracks,
  removeEventFromTrack,
  reorderTrackEvents,
  type UpdateTrackPayload,
  updateTrack,
} from '@/app/api/tracks';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { trackSuccessfulTrackBooking } from '../trackBookingAnalytics';

export const useTracks = (page = 1, pageSize = 12, filters?: { search?: string }) => {
  const safePageSize = Math.min(pageSize, 50);
  return useQuery({
    queryKey: ['tracks', page, safePageSize, filters],
    queryFn: async () => {
      const params: FetchTracksParams = {
        page,
        pageSize: safePageSize,
        search: filters?.search,
      };
      const response = await fetchTracks(params);
      return {
        items: response.items,
        total: response.pagination.total,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useTrack = (id: string) => {
  return useQuery({
    queryKey: ['tracks', 'detail', id],
    queryFn: () => fetchTrackById(id),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!id,
  });
};

export const useAllTracks = () => {
  return useQuery({
    queryKey: ['tracks', 'all'],
    queryFn: async () => {
      const response = await fetchTracks({ page: 1, pageSize: 50 });
      return response.items;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateTrack = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTrackPayload) => createTrack(payload),
    onSuccess: (track) => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast({
        title: 'Track created',
        description: `"${track.title}" is now available.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Unable to create track',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      });
      throw error;
    },
  });
};

export const useUpdateTrack = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTrackPayload }) => updateTrack(id, data),
    onSuccess: (track) => {
      toast({
        title: 'Track updated',
        description: 'Your changes are live.',
      });
      queryClient.invalidateQueries({ queryKey: ['tracks', 'detail', track.id] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    },
    onError: () => {
      toast({
        title: 'Update failed',
        description: 'Could not update track. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteTrack = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTrack(id),
    onSuccess: (_, id) => {
      toast({
        title: 'Track deleted',
        description: 'The track was removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.removeQueries({ queryKey: ['tracks', 'detail', id] });
    },
    onError: (error) => {
      toast({
        title: 'Unable to delete',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
      throw error;
    },
  });
};

export const useAddEventsToTrack = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ trackId, eventIds }: { trackId: string; eventIds: string[] }) =>
      addEventsToTrack(trackId, eventIds),
    onSuccess: (result, { trackId }) => {
      queryClient.invalidateQueries({ queryKey: ['tracks', 'detail', trackId] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      if (result.addedCount > 0) {
        toast({
          title: 'Events added',
          description: `Added ${result.addedCount} event${result.addedCount > 1 ? 's' : ''} to the track.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Unable to add events',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useRemoveEventFromTrack = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ trackId, eventId }: { trackId: string; eventId: string }) =>
      removeEventFromTrack(trackId, eventId),
    onSuccess: (_, { trackId }) => {
      queryClient.invalidateQueries({ queryKey: ['tracks', 'detail', trackId] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast({
        title: 'Event removed',
        description: 'The event was removed from the track.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Unable to remove event',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useReorderTrackEvents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ trackId, eventIds }: { trackId: string; eventIds: string[] }) =>
      reorderTrackEvents(trackId, eventIds),
    onSuccess: (_, { trackId }) => {
      queryClient.invalidateQueries({ queryKey: ['tracks', 'detail', trackId] });
    },
  });
};

// Public track hooks (no auth required)
export const usePublicTracks = (page = 1, pageSize = 12) => {
  return useQuery({
    queryKey: ['tracks', 'public', page, pageSize],
    queryFn: () => fetchPublicTracks({ page, pageSize }),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const usePublicTrack = (id: string, viewerKey?: string) => {
  const safeViewerKey = viewerKey ?? 'guest';
  return useQuery({
    queryKey: ['tracks', 'public', 'detail', id, safeViewerKey],
    queryFn: () => fetchPublicTrackById(id),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!id,
  });
};

export const useBookTrack = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackId: string) => bookTrack(trackId),
    onSuccess: (result, trackId) => {
      if (result.success && !result.alreadyBooked) {
        trackSuccessfulTrackBooking(queryClient, trackId, result.eventsRegistered ?? 0);
      }

      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['tracks', 'detail', trackId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      if (result.alreadyBooked) {
        toast({
          title: 'Already booked',
          description: 'You have already booked this track.',
        });
      } else {
        toast({
          title: 'Track booked!',
          description: result.message,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Booking failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });
};
