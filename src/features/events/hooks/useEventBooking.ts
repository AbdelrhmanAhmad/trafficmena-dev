import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelEventRegistration,
  type EventRecord,
  fetchEvents,
  registerForEvent,
} from '@/app/api/events';
import { useToast } from '@/shared/hooks/custom/use-toast';
import type { BookingRequest, BookingResponse, PagedResult } from '../types';

const EVENT_LIST_KEY = ['events'];

export const useEventBooking = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const bookEventMutation = useMutation<BookingResponse, Error, BookingRequest>({
    mutationFn: async ({ event_id }) => {
      return registerForEvent(event_id);
    },
    onSuccess: (response, variables) => {
      if (response.success) {
        toast({
          title: 'Registration Confirmed',
          description: response.message ?? 'You are now registered for the event.',
        });

        queryClient.invalidateQueries({ queryKey: ['event', variables.event_id] });
        queryClient.invalidateQueries({ queryKey: EVENT_LIST_KEY });
      } else {
        toast({
          title: 'Registration Failed',
          description: response.message ?? 'Unable to register for this event right now.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('registerForEvent error', error);
      toast({
        title: 'Registration Failed',
        description: 'We could not complete your registration. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const cancelBookingMutation = useMutation<BookingResponse, Error, { eventId: string }>({
    mutationFn: async ({ eventId }) => cancelEventRegistration(eventId),
    onSuccess: (response, variables) => {
      if (response.success) {
        toast({
          title: 'Registration Cancelled',
          description: response.message ?? 'You have been removed from this event.',
        });

        queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
        queryClient.invalidateQueries({ queryKey: EVENT_LIST_KEY });
      } else {
        toast({
          title: 'Cancellation Failed',
          description: response.message ?? 'We could not cancel your registration.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('cancelEventRegistration error', error);
      toast({
        title: 'Cancellation Failed',
        description: 'We could not cancel your registration. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    bookEvent: bookEventMutation.mutate,
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
