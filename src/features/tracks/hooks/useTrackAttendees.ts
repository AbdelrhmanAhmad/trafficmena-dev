import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { TrackAttendee } from '@/app/api/tracks';
import { fetchTrackAttendees } from '@/app/api/tracks';

export const useTrackAttendees = (trackId: string | undefined, pageSize = 20) => {
  const [page, setPage] = useState(1);

  const query = useQuery<{ items: TrackAttendee[]; total: number }>({
    queryKey: ['track-attendees', trackId, page, pageSize],
    queryFn: async () => {
      if (!trackId) return { items: [], total: 0 };
      const { items, pagination } = await fetchTrackAttendees(trackId, { page, pageSize });
      return {
        items,
        total: pagination.total,
      };
    },
    enabled: Boolean(trackId),
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
