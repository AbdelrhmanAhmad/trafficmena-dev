import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSeriesGrantsFromCsv,
  type FetchSeriesGrantsParams,
  fetchSeriesGrants,
  grantSeriesAccess,
  revokeSeriesAccess,
} from '@/app/api/seriesGrants';

const grantsQueryKey = (seriesId: string, params: FetchSeriesGrantsParams) =>
  ['series-grants', seriesId, params] as const;

export function useSeriesGrants(seriesId: string, params: FetchSeriesGrantsParams = {}) {
  return useQuery({
    queryKey: grantsQueryKey(seriesId, params),
    queryFn: ({ signal }) => fetchSeriesGrants(seriesId, params, signal),
    enabled: Boolean(seriesId),
    staleTime: 30 * 1000,
  });
}

export function useGrantSeriesAccess(seriesId: string) {
  const queryClient = useQueryClient();
  const grantedUserIdsKey = ['series-granted-user-ids', seriesId] as const;

  return useMutation({
    mutationFn: (payload: { userIds: string[]; reason: string }) =>
      grantSeriesAccess(seriesId, payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['series-grants', seriesId] });
      queryClient.invalidateQueries({ queryKey: grantedUserIdsKey });
      queryClient.invalidateQueries({ queryKey: ['series-detail', seriesId] });
    },
  });
}

export function useRevokeSeriesAccess(seriesId: string) {
  const queryClient = useQueryClient();
  const grantedUserIdsKey = ['series-granted-user-ids', seriesId] as const;

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      revokeSeriesAccess(seriesId, userId, reason),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['series-grants', seriesId] });
      queryClient.invalidateQueries({ queryKey: grantedUserIdsKey });
      queryClient.invalidateQueries({ queryKey: ['series-detail', seriesId] });
    },
  });
}

export function useBulkSeriesGrants(seriesId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => createSeriesGrantsFromCsv(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series-grants', seriesId] });
      queryClient.invalidateQueries({ queryKey: ['series-granted-user-ids', seriesId] });
      queryClient.invalidateQueries({ queryKey: ['series-detail', seriesId] });
    },
  });
}
