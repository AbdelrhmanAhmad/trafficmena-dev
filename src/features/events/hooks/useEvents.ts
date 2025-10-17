import { useQuery } from '@tanstack/react-query';
import {
  type EventDetailRecord,
  type EventRecord,
  fetchEventById,
  fetchEvents,
} from '@/app/api/events';
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
