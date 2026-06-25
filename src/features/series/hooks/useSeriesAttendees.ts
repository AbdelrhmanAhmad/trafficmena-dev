import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { SeriesAttendee } from '@/app/api/series';
import { fetchSeriesAttendees } from '@/app/api/series';

export const useSeriesAttendees = (
  seriesId: string | undefined,
  pageSize = 20,
  search: string | undefined = undefined,
) => {
  const [page, setPage] = useState(1);
  const previousScopeRef = useRef({ seriesId, pageSize, search });

  useEffect(() => {
    const previousScope = previousScopeRef.current;
    const scopeChanged =
      previousScope.seriesId !== seriesId ||
      previousScope.pageSize !== pageSize ||
      previousScope.search !== search;

    if (scopeChanged) {
      setPage(1);
      previousScopeRef.current = { seriesId, pageSize, search };
    }
  }, [seriesId, pageSize, search]);

  const query = useQuery<{ items: SeriesAttendee[]; total: number }>({
    queryKey: ['series-attendees', seriesId, page, pageSize, search],
    queryFn: async () => {
      if (!seriesId) return { items: [], total: 0 };
      const { items, pagination } = await fetchSeriesAttendees(seriesId, {
        page,
        pageSize,
        search,
      });
      return { items, total: pagination.total };
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
