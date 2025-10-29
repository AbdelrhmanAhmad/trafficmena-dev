import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateEventPayload } from '@/app/api/events';
import {
  createEvent,
  deleteEvent,
  type EventDetailRecord,
  type EventRecord,
  fetchEventById,
  fetchEvents,
  type UpdateEventPayload,
  updateEvent,
} from '@/app/api/events';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useErrorHandler } from '@/shared/utils/errorHandling';
import type { EventFilters, PagedResult } from '../types';

type FetchEventsParams = {
  page: number;
  itemsPerPage: number;
  filters?: EventFilters;
};

const buildEventQueryParams = ({ page, itemsPerPage, filters }: FetchEventsParams) => {
  const params: {
    page: number;
    pageSize: number;
    search?: string;
    type?: EventFilters['event_type'];
    upcoming?: boolean;
  } = {
    page,
    pageSize: itemsPerPage,
  };

  if (filters?.search_query) {
    params.search = filters.search_query;
  }

  if (filters?.event_type) {
    params.type = filters.event_type;
  }

  if (typeof filters?.upcoming_only === 'boolean') {
    params.upcoming = filters.upcoming_only;
  }

  return params;
};

export const useEvents = (page: number, itemsPerPage: number, filters?: EventFilters) => {
  return useQuery<PagedResult<EventRecord>>({
    queryKey: ['events', page, itemsPerPage, filters],
    queryFn: async () => {
      const { items, pagination } = await fetchEvents(
        buildEventQueryParams({ page, itemsPerPage, filters }),
      );

      return {
        items,
        total: pagination.total,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useEvent = (id: string | undefined) => {
  return useQuery<EventDetailRecord>({
    queryKey: ['event', id],
    queryFn: () => fetchEventById(id ?? ''),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: (payload: CreateEventPayload) => createEvent(payload),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', event.id] });
      toast({
        title: 'Event saved',
        description: 'Your event is now available to members.',
      });
    },
    onError: (error) => {
      const appError = handleError(error);
      toast({
        title: 'Unable to save event',
        description: appError.message,
        variant: 'destructive',
      });
      throw error;
    },
  });
};

export const useUpdateEvent = (id: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: (payload: UpdateEventPayload) => updateEvent(id, payload),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      toast({
        title: 'Event updated',
        description: 'Your changes are live.',
      });
      return event;
    },
    onError: (error) => {
      const appError = handleError(error);
      toast({
        title: 'Unable to update event',
        description: appError.message,
        variant: 'destructive',
      });
      throw error;
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.removeQueries({ queryKey: ['event', id] });
      toast({
        title: 'Event deleted',
        description: 'The event has been removed.',
      });
    },
    onError: (error) => {
      const appError = handleError(error);
      toast({
        title: 'Unable to delete event',
        description: appError.message,
        variant: 'destructive',
      });
      throw error;
    },
  });
};
