import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addAssetsToSeries,
  type CreateSeriesPayload,
  createSeries,
  deleteSeries,
  type FetchSeriesParams,
  fetchSeries,
  fetchSeriesById,
  removeAssetFromSeries,
  reorderSeriesAssets,
  type UpdateSeriesPayload,
  updateSeries,
} from '@/app/api/series';
import { useToast } from '@/shared/hooks/custom/use-toast';

export const useSeries = (page = 1, pageSize = 12, filters?: { search?: string }) => {
  const safePageSize = Math.min(pageSize, 50);
  return useQuery({
    queryKey: ['series', page, safePageSize, filters],
    queryFn: async () => {
      const params: FetchSeriesParams = {
        page,
        pageSize: safePageSize,
        search: filters?.search,
      };
      const response = await fetchSeries(params);
      return {
        items: response.items,
        total: response.pagination.total,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useSeriesDetail = (id: string) => {
  return useQuery({
    queryKey: ['series', 'detail', id],
    queryFn: () => fetchSeriesById(id),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!id,
  });
};

export const useAllSeries = () => {
  return useQuery({
    queryKey: ['series', 'all'],
    queryFn: async () => {
      const response = await fetchSeries({ page: 1, pageSize: 50 });
      return response.items;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateSeries = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSeriesPayload) => createSeries(payload),
    onSuccess: (series) => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      toast({
        title: 'Series created',
        description: `"${series.title}" is now available.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Unable to create series',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      });
      throw error;
    },
  });
};

export const useUpdateSeries = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSeriesPayload }) => updateSeries(id, data),
    onSuccess: (series) => {
      toast({
        title: 'Series updated',
        description: 'Your changes are live.',
      });
      queryClient.invalidateQueries({ queryKey: ['series', 'detail', series.id] });
      queryClient.invalidateQueries({ queryKey: ['series'] });
    },
    onError: () => {
      toast({
        title: 'Update failed',
        description: 'Could not update series. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteSeries = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSeries(id),
    onSuccess: (_, id) => {
      toast({
        title: 'Series deleted',
        description: 'The series was removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['series'] });
      queryClient.removeQueries({ queryKey: ['series', 'detail', id] });
    },
    onError: (error) => {
      toast({
        title: 'Unable to delete',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
      throw error;
    },
  });
};

export const useAddAssetsToSeries = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seriesId, assetIds }: { seriesId: string; assetIds: string[] }) =>
      addAssetsToSeries(seriesId, assetIds),
    onSuccess: (result, { seriesId }) => {
      queryClient.invalidateQueries({ queryKey: ['series', 'detail', seriesId] });
      queryClient.invalidateQueries({ queryKey: ['series'] });
      queryClient.invalidateQueries({ queryKey: ['library'] });
      if (result.addedCount > 0) {
        toast({
          title: 'Assets added',
          description: `Added ${result.addedCount} asset${result.addedCount > 1 ? 's' : ''} to the series.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Unable to add assets',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useRemoveAssetFromSeries = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seriesId, assetId }: { seriesId: string; assetId: string }) =>
      removeAssetFromSeries(seriesId, assetId),
    onSuccess: (_, { seriesId }) => {
      queryClient.invalidateQueries({ queryKey: ['series', 'detail', seriesId] });
      queryClient.invalidateQueries({ queryKey: ['series'] });
      queryClient.invalidateQueries({ queryKey: ['library'] });
      toast({
        title: 'Asset removed',
        description: 'The asset was removed from the series.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Unable to remove asset',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useReorderSeriesAssets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seriesId, assetIds }: { seriesId: string; assetIds: string[] }) =>
      reorderSeriesAssets(seriesId, assetIds),
    onSuccess: (_, { seriesId }) => {
      queryClient.invalidateQueries({ queryKey: ['series', 'detail', seriesId] });
    },
  });
};
