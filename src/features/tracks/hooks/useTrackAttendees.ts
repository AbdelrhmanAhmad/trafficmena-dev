import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { TrackAttendee } from '@/app/api/tracks';
import { fetchTrackAttendees } from '@/app/api/tracks';

export const useTrackAttendees = (
  trackId: string | undefined,
  pageSize = 20,
  search: string | undefined = undefined,
) => {
  const [page, setPage] = useState(1);
  const previousScopeRef = useRef({ trackId, pageSize, search });

  useEffect(() => {
    const previousScope = previousScopeRef.current;
    const scopeChanged =
      previousScope.trackId !== trackId ||
      previousScope.pageSize !== pageSize ||
      previousScope.search !== search;

    if (scopeChanged) {
      setPage(1);
      previousScopeRef.current = { trackId, pageSize, search };
    }
  }, [trackId, pageSize, search]);

  const query = useQuery<{ items: TrackAttendee[]; total: number }>({
    queryKey: ['track-attendees', trackId, page, pageSize, search],
    queryFn: async () => {
      if (!trackId) return { items: [], total: 0 };
      const { items, pagination } = await fetchTrackAttendees(trackId, { page, pageSize, search });
      return {
        items,
        total: pagination.total,
      };
    },
    enabled: Boolean(trackId),
    staleTime: 2 * 60 * 1000,
  });

  return {
    ...query,
    page,
    setPage,
    pageSize,
  };
};
