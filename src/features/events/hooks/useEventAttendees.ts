import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { EventAttendeeRecord } from '@/app/api/events';
import { fetchEventAttendees } from '@/app/api/events';

/**
 * Hook to fetch paginated attendees for an event.
 * Now connected to the real backend API.
 */
export const useEventAttendees = (eventId: string | undefined, pageSize = 20) => {
  const [page, setPage] = useState(1);

  const query = useQuery<{ items: EventAttendeeRecord[]; total: number }>({
    queryKey: ['event-attendees', eventId, page, pageSize],
    queryFn: async () => {
      if (!eventId) return { items: [], total: 0 };
      const { items, pagination } = await fetchEventAttendees(eventId, { page, pageSize });
      return {
        items,
        total: pagination.total,
      };
    },
    enabled: Boolean(eventId),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });

  return {
    ...query,
    page,
    setPage,
    pageSize,
  };
};
