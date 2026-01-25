import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  cancelEventRegistration,
  type EventRecord,
  fetchEvents,
  registerForEvent,
} from '@/app/api/events';
import type { BookingRequest, BookingResponse, PagedResult } from '../types';

const EVENT_LIST_KEY = ['events'];

export const useEventBooking = () => {
  const queryClient = useQueryClient();

  const bookEventMutation = useMutation<BookingResponse, Error, BookingRequest>({
    mutationFn: async ({ event_id }) => {
      return registerForEvent(event_id);
    },
    onSuccess: (response, variables) => {
      if (response.success) {
        toast.success(response.message ?? 'You are now registered for the event.');

        queryClient.invalidateQueries({ queryKey: ['event', variables.event_id] });
        queryClient.invalidateQueries({ queryKey: EVENT_LIST_KEY });
        queryClient.invalidateQueries({ queryKey: ['tracks'] });
        queryClient.invalidateQueries({ queryKey: ['track'] });
      } else {
        toast.error(response.message ?? 'Unable to register for this event right now.');
      }
    },
    onError: (error) => {
      console.error('registerForEvent error', error);
      toast.error('We could not complete your registration. Please try again.');
    },
  });

  const cancelBookingMutation = useMutation<
    BookingResponse & { status?: 'cancelled' | 'refund_requested' },
    Error,
    { eventId: string }
  >({
    mutationFn: async ({ eventId }) => cancelEventRegistration(eventId),
    onSuccess: (response, variables) => {
      if (response.success) {
        // Show different message based on status
        if (response.status === 'refund_requested') {
          toast.success(
            response.message ??
              'Your refund request has been submitted. Our team will review it shortly.',
          );
        } else {
          toast.success(response.message ?? 'Your registration has been cancelled.');
        }

        queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
        queryClient.invalidateQueries({ queryKey: EVENT_LIST_KEY });
        queryClient.invalidateQueries({ queryKey: ['tracks'] });
        queryClient.invalidateQueries({ queryKey: ['track'] });
      } else {
        toast.error(response.message ?? 'We could not cancel your registration.');
      }
    },
    onError: (error) => {
      console.error('cancelEventRegistration error', error);
      toast.error('We could not cancel your registration. Please try again.');
    },
  });

  return {
    bookEvent: bookEventMutation.mutate,
    bookEventAsync: bookEventMutation.mutateAsync,
    cancelBooking: cancelBookingMutation.mutate,
    isBooking: bookEventMutation.isPending,
    isCancelling: cancelBookingMutation.isPending,
  };
};

export const useUpcomingEventsList = (limit: number = 5) => {
  return useQuery<PagedResult<EventRecord>>({
    queryKey: ['events', 'upcoming', limit],
    queryFn: async () => {
      const { items, pagination } = await fetchEvents({ page: 1, pageSize: limit, upcoming: true });
      return {
        items,
        total: pagination.total,
      };
    },
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
