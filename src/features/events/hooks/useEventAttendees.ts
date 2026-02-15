import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { EventAttendeeRecord } from '@/app/api/events';
import { fetchEventAttendees } from '@/app/api/events';

/**
 * Hook to fetch paginated attendees for an event.
 * Now connected to the real backend API.
 */
export const useEventAttendees = (
  eventId: string | undefined,
  pageSize = 20,
  search: string | undefined = undefined,
) => {
  const [page, setPage] = useState(1);
  const previousScopeRef = useRef({ eventId, pageSize, search });

  useEffect(() => {
    const previousScope = previousScopeRef.current;
    const scopeChanged =
      previousScope.eventId !== eventId ||
      previousScope.pageSize !== pageSize ||
      previousScope.search !== search;

    if (scopeChanged) {
      setPage(1);
      previousScopeRef.current = { eventId, pageSize, search };
    }
  }, [eventId, pageSize, search]);

  const query = useQuery<{ items: EventAttendeeRecord[]; total: number }>({
    queryKey: ['event-attendees', eventId, page, pageSize, search],
    queryFn: async () => {
      if (!eventId) return { items: [], total: 0 };
      const { items, pagination } = await fetchEventAttendees(eventId, { page, pageSize, search });
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
