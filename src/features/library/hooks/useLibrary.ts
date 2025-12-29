import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  updateLibraryAsset as apiUpdateLibraryAsset,
  type CreateLibraryAssetPayload,
  createLibraryAsset,
  deleteLibraryAsset,
  type FetchLibraryParams,
  fetchLibraryAssetById,
  fetchLibraryAssets,
  type UpdateLibraryAssetPayload,
} from '@/app/api/library';
import { useToast } from '@/shared/hooks/custom/use-toast';
import type { LibraryAsset, LibraryFilters } from '../types';

export const useLibraryAssets = (page: number, itemsPerPage: number, filters?: LibraryFilters) => {
  const safePageSize = Math.min(itemsPerPage, 50);
  return useQuery({
    queryKey: ['library', 'assets', page, safePageSize, filters],
    queryFn: async () => {
      const params: FetchLibraryParams = {
        page,
        pageSize: safePageSize,
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
  return useQuery<LibraryAsset>({
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
  const pageSize = 50;
  return useQuery({
    queryKey: ['library', 'assets', 'event', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const response = await fetchLibraryAssets({ page: 1, pageSize });
      return response.items.filter((item) => item.event_id === eventId);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!eventId,
  });
};

// Batch fetch assets for multiple events (uses server-side filtering)
export const useAssetsByEventIds = (eventIds: string[]) => {
  // Create stable sorted copy to avoid mutating input array
  const stableKey = [...eventIds].sort().join(',');

  return useQuery({
    queryKey: ['library', 'assets', 'events', stableKey],
    queryFn: async () => {
      if (eventIds.length === 0) return new Map<string, LibraryAsset[]>();

      // Server-side filtering returns only assets matching these event IDs
      const response = await fetchLibraryAssets({
        page: 1,
        pageSize: 50,
        eventIds: eventIds.join(','),
      });

      // Group assets by event ID
      const assetMap = new Map<string, LibraryAsset[]>();
      for (const item of response.items) {
        if (item.event_id) {
          const existing = assetMap.get(item.event_id) || [];
          existing.push(item);
          assetMap.set(item.event_id, existing);
        }
      }
      return assetMap;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: eventIds.length > 0,
  });
};

// Admin hooks
export const useAllLibraryAssets = () => {
  return useQuery({
    queryKey: ['admin', 'library', 'assets'],
    queryFn: async () => {
      const response = await fetchLibraryAssets({ page: 1, pageSize: 50 });
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
      const response = await fetchLibraryAssets({ page: 1, pageSize: 50 });
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
    mutationFn: (payload: CreateLibraryAssetPayload) => createLibraryAsset(payload),
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'assets'] });
      queryClient.invalidateQueries({ queryKey: ['library-assets'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'asset', asset.id] });
      toast({
        title: 'Asset added',
        description: 'The library item is live for members.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Unable to add asset',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      });
      throw error;
    },
  });
};

export const useUpdateLibraryAsset = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLibraryAssetPayload }) =>
      apiUpdateLibraryAsset(id, data),
    onSuccess: (asset) => {
      toast({
        title: 'Asset updated',
        description: 'Your changes are live.',
      });
      queryClient.invalidateQueries({
        queryKey: ['library', 'asset', asset.id],
      });
      queryClient.invalidateQueries({ queryKey: ['library', 'assets'] });
      queryClient.invalidateQueries({ queryKey: ['library-assets'] });
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteLibraryAsset(id),
    onSuccess: (_, id) => {
      toast({
        title: 'Asset deleted',
        description: 'The library item was removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['library', 'assets'] });
      queryClient.invalidateQueries({ queryKey: ['library-assets'] });
      queryClient.removeQueries({ queryKey: ['library', 'asset', id] });
    },
    onError: (error) => {
      toast({
        title: 'Unable to delete asset',
        description:
          error instanceof Error ? error.message : 'Deleting assets failed. Please try again.',
        variant: 'destructive',
      });
      throw error;
    },
  });
};
