import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchLibraryAssetById,
  fetchLibraryAssets,
  updateLibraryAsset as apiUpdateLibraryAsset,
  type FetchLibraryParams,
} from '@/app/api/library';
import { useToast } from '@/shared/hooks/custom/use-toast';
import type { LibraryAsset, LibraryFilters } from '../types';

export const useLibraryAssets = (
  page: number,
  itemsPerPage: number,
  filters?: LibraryFilters,
) => {
  return useQuery({
    queryKey: ['library', 'assets', page, itemsPerPage, filters],
    queryFn: async () => {
      const params: FetchLibraryParams = {
        page,
        pageSize: itemsPerPage,
        search: filters?.search_query,
        type: filters?.file_type,
      };

      const response = await fetchLibraryAssets(params);

      if (filters?.event_id) {
        return {
          items: response.items.filter((item) => item.event_id === filters.event_id),
          total: response.items.filter((item) => item.event_id === filters.event_id).length,
        };
      }

      return {
        items: response.items,
        total: response.pagination.total,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useLibraryAsset = (id: string) => {
  return useQuery({
    queryKey: ['library', 'asset', id],
    queryFn: () => fetchLibraryAssetById(id),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!id,
  });
};

// Removed featured assets hook since the field doesn't exist in database

// Removed search assets hook since complex search doesn't exist

export const useAssetsByEventId = (eventId: string) => {
  return useQuery({
    queryKey: ['library', 'assets', 'event', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const response = await fetchLibraryAssets({ page: 1, pageSize: 200 });
      return response.items.filter((item) => item.event_id === eventId);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!eventId,
  });
};

// Admin hooks
export const useAllLibraryAssets = () => {
  return useQuery({
    queryKey: ['admin', 'library', 'assets'],
    queryFn: async () => {
      const response = await fetchLibraryAssets({ page: 1, pageSize: 500 });
      return response.items;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useLibraryStatistics = () => {
  return useQuery({
    queryKey: ['admin', 'library', 'statistics'],
    queryFn: async () => {
      const response = await fetchLibraryAssets({ page: 1, pageSize: 500 });
      const countsByType = response.items.reduce<Record<string, number>>((acc, item) => {
        const type = item.file_type || 'unknown';
        acc[type] = (acc[type] ?? 0) + 1;
        return acc;
      }, {});

      return {
        totalAssets: response.pagination.total,
        assetsByType: countsByType,
        assetsWithDocuments: response.items.filter((item) => Boolean(item.document_url)).length,
        assetsWithVideos: response.items.filter((item) => Boolean(item.video_url)).length,
        assetsWithEmbeds: response.items.filter((item) => Boolean(item.embed_url)).length,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateLibraryAsset = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      throw new Error('Library creation is temporarily unavailable in the new API.');
    },
    onError: (error) => {
      toast({
        title: 'Not Available',
        description:
          error instanceof Error
            ? error.message
            : 'Creating assets will return once the new API endpoints are ready.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateLibraryAsset = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LibraryAsset> }) =>
      apiUpdateLibraryAsset(id, data),
    onSuccess: (asset, variables) => {
      if (asset?.success) {
        toast({
          title: 'Asset Updated',
          description: 'Library asset has been updated.',
        });
        queryClient.invalidateQueries({
          queryKey: ['library', 'asset', variables.id],
        });
        queryClient.invalidateQueries({ queryKey: ['library', 'assets'] });
      }
    },
    onError: () => {
      toast({
        title: 'Update Error',
        description: 'Failed to update library asset. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteLibraryAsset = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      throw new Error('Deleting assets is temporarily unavailable in the new API.');
    },
    onError: (error) => {
      toast({
        title: 'Not Available',
        description:
          error instanceof Error
            ? error.message
            : 'Deleting assets will return once the new API endpoints are ready.',
        variant: 'destructive',
      });
    },
  });
};
