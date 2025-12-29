import { useQuery } from '@tanstack/react-query';
import {
  type FetchLibraryParams,
  fetchLibraryAssetById,
  fetchLibraryAssets,
  type LibraryAssetRecord,
} from '@/app/api/library';
import type { PaginatedResult } from '@/app/api/types';

const libraryListKey = (params: FetchLibraryParams & { page: number; pageSize: number }) => [
  'library-assets',
  params.page,
  params.pageSize,
  params.search ?? null,
  params.type ?? null,
  params.excludeInTracks ?? null,
];

export function useLibraryList(
  page: number,
  pageSize: number,
  params: Omit<FetchLibraryParams, 'page' | 'pageSize'> = {},
) {
  const safePageSize = Math.min(pageSize, 50);
  return useQuery({
    queryKey: libraryListKey({ page, pageSize: safePageSize, ...params }),
    queryFn: async (): Promise<PaginatedResult<LibraryAssetRecord>> => {
      const response = await fetchLibraryAssets({ page, pageSize: safePageSize, ...params });
      return response;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useLibraryItem(id: string | null) {
  return useQuery({
    queryKey: ['library-asset', id],
    queryFn: () => fetchLibraryAssetById(id as string),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
