import { useQuery } from '@tanstack/react-query';
import { type EventRecord, fetchEvents } from '@/app/api/events';

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export const useEventsQuery = (page: number, itemsPerPage: number) => {
  return useQuery({
    queryKey: ['events', page, itemsPerPage],
    queryFn: async (): Promise<PagedResult<EventRecord>> => {
      const { items, pagination } = await fetchEvents({ page, pageSize: itemsPerPage });
      return { items, total: pagination.total };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
