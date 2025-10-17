import { API_BASE, fetchJson } from './client';
import type { PaginatedResult } from './types';

type ApiLibraryAsset = {
  id: string;
  title: string;
  description: string | null;
  fileType: 'Document' | 'Video' | 'Presentation' | string;
  fileUrl: string | null;
  videoUrl: string | null;
  documentUrl: string | null;
  embedUrl: string | null;
  embedType: string | null;
  eventId: string | null;
  viewCount: number | null;
  downloadCount: number | null;
  createdAt: string;
};

export type LibraryAssetRecord = {
  id: string;
  title: string;
  description: string | null;
  file_type: ApiLibraryAsset['fileType'];
  file_url: string | null;
  video_url: string | null;
  document_url: string | null;
  embed_url: string | null;
  embed_type: string | null;
  event_id: string | null;
  view_count: number;
  download_count: number;
  created_at: string;
};

const mapAsset = (asset: ApiLibraryAsset): LibraryAssetRecord => ({
  id: asset.id,
  title: asset.title,
  description: asset.description,
  file_type: asset.fileType,
  file_url: asset.fileUrl,
  video_url: asset.videoUrl,
  document_url: asset.documentUrl,
  embed_url: asset.embedUrl,
  embed_type: asset.embedType,
  event_id: asset.eventId,
  view_count: Number(asset.viewCount ?? 0),
  download_count: Number(asset.downloadCount ?? 0),
  created_at: asset.createdAt,
});

export type FetchLibraryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: ApiLibraryAsset['fileType'];
};

export async function fetchLibraryAssets(
  params: FetchLibraryParams = {},
): Promise<PaginatedResult<LibraryAssetRecord>> {
  const query = new URLSearchParams();

  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.search) query.set('search', params.search);
  if (params.type) query.set('type', params.type);

  const data = await fetchJson<{
    items: ApiLibraryAsset[];
    pagination: PaginatedResult<ApiLibraryAsset>['pagination'];
  }>(`${API_BASE}/library${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
  });

  return {
    items: (data.items ?? []).map(mapAsset),
    pagination: data.pagination,
  };
}

export async function fetchLibraryAssetById(id: string): Promise<LibraryAssetRecord> {
  const data = await fetchJson<ApiLibraryAsset>(`${API_BASE}/library/${id}`, {
    method: 'GET',
  });
  return mapAsset(data);
}

export async function updateLibraryAsset(
  id: string,
  payload: Partial<{ title: string; description: string }>,
): Promise<{ success: boolean; message?: string }> {
  return fetchJson<{ success: boolean; message?: string }>(`${API_BASE}/library/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
