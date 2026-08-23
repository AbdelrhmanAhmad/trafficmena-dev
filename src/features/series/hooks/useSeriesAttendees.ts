import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { TicketType } from '@/app/api/payments';
import type { SeriesAttendee } from '@/app/api/series';
import { fetchSeriesAttendees } from '@/app/api/series';

export const useSeriesAttendees = (
  seriesId: string | undefined,
  pageSize = 20,
  search: string | undefined = undefined,
  ticketType: TicketType | undefined = undefined,
) => {
  const [page, setPage] = useState(1);
  const previousScopeRef = useRef({ seriesId, pageSize, search, ticketType });

  useEffect(() => {
    const previousScope = previousScopeRef.current;
    const scopeChanged =
      previousScope.seriesId !== seriesId ||
      previousScope.pageSize !== pageSize ||
      previousScope.search !== search ||
      previousScope.ticketType !== ticketType;

    if (scopeChanged) {
      setPage(1);
      previousScopeRef.current = { seriesId, pageSize, search, ticketType };
    }
  }, [seriesId, pageSize, search, ticketType]);

  const query = useQuery<{ items: SeriesAttendee[]; total: number; truncated: boolean }>({
    queryKey: ['series-attendees', seriesId, page, pageSize, search, ticketType],
    queryFn: async () => {
      if (!seriesId) return { items: [], total: 0, truncated: false };
      const { items, pagination, truncated } = await fetchSeriesAttendees(seriesId, {
        page,
        pageSize,
        search,
        ticketType,
      });
      return { items, total: pagination.total, truncated: Boolean(truncated) };
    },
    enabled: Boolean(seriesId),
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
