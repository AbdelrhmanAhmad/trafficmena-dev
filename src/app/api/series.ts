import { API_BASE, fetchJson } from './client';
import type { PaginatedResult } from './types';

// API response types (camelCase from server)
export interface ApiSeries {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
  isPremium: boolean;
  priceInCents: number | null;
  salesEnabled: boolean;
  createdAt: string;
  updatedAt?: string;
  assetCount: number;
  isSellable?: boolean;
  hasPurchased?: boolean;
  hasSeriesGrant?: boolean;
}

type ApiSeriesAsset = {
  id: string;
  title: string;
  description: string | null;
  fileType: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  documentUrl: string | null;
  embedUrl: string | null;
  embedType: string | null;
  viewCount: number;
  createdAt: string;
  sortOrder: number;
  eventId: string | null;
  isPublic: boolean;
  isPremium: boolean;
  hasAccess: boolean;
};

type ApiSeriesDetail = ApiSeries & {
  assets: ApiSeriesAsset[];
  hasAccess?: boolean;
  hasPurchased?: boolean;
  hasSeriesGrant?: boolean;
  isSellable?: boolean;
};

export type ApiStoreSeriesDetail = ApiSeriesDetail & {
  isAuthenticated?: boolean;
};

// Frontend types (snake_case for consistency)
export interface SeriesRecord {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_published: boolean;
  is_premium: boolean;
  price_in_cents: number | null;
  sales_enabled: boolean;
  asset_count: number;
  is_sellable?: boolean;
  has_purchased?: boolean;
  has_series_grant?: boolean;
  created_at: Date;
}

export type SeriesAssetRecord = {
  id: string;
  title: string;
  description: string | null;
  file_type: string;
  thumbnail_url: string | null;
  video_url: string | null;
  document_url: string | null;
  embed_url: string | null;
  embed_type: string | null;
  view_count: number;
  created_at: string;
  sort_order: number;
  event_id: string | null;
  is_public: boolean;
  is_premium: boolean;
  has_access: boolean;
};

export type SeriesDetailRecord = SeriesRecord & {
  updated_at: string;
  assets: SeriesAssetRecord[];
  has_access: boolean;
  has_purchased?: boolean;
  has_series_grant?: boolean;
  is_sellable?: boolean;
};

export type StoreSeriesDetailRecord = SeriesDetailRecord & {
  is_authenticated?: boolean;
};

// Mappers
const mapSeries = (api: ApiSeries): SeriesRecord => ({
  id: api.id,
  title: api.title,
  description: api.description,
  image_url: api.imageUrl,
  sort_order: api.sortOrder,
  is_published: api.isPublished,
  is_premium: api.isPremium ?? false,
  price_in_cents: api.priceInCents ?? null,
  sales_enabled: api.salesEnabled ?? false,
  asset_count: api.assetCount ?? 0,
  is_sellable: api.isSellable,
  has_purchased: api.hasPurchased,
  has_series_grant: api.hasSeriesGrant,
  created_at: new Date(api.createdAt),
});

const mapSeriesAsset = (asset: ApiSeriesAsset): SeriesAssetRecord => ({
  id: asset.id,
  title: asset.title,
  description: asset.description,
  file_type: asset.fileType,
  thumbnail_url: asset.thumbnailUrl,
  video_url: asset.videoUrl,
  document_url: asset.documentUrl,
  embed_url: asset.embedUrl,
  embed_type: asset.embedType,
  view_count: asset.viewCount,
  created_at: asset.createdAt,
  sort_order: asset.sortOrder,
  event_id: asset.eventId,
  is_public: asset.isPublic ?? false,
  is_premium: asset.isPremium ?? false,
  has_access: asset.hasAccess ?? true,
});

const mapSeriesDetail = (series: ApiSeriesDetail): SeriesDetailRecord => ({
  ...mapSeries(series),
  updated_at: series.updatedAt ?? series.createdAt,
  assets: (series.assets ?? []).map(mapSeriesAsset),
  has_access: series.hasAccess ?? true,
  has_purchased: series.hasPurchased,
  has_series_grant: series.hasSeriesGrant,
  is_sellable: series.isSellable,
});

const mapStoreSeriesDetail = (series: ApiStoreSeriesDetail): StoreSeriesDetailRecord => ({
  ...mapSeriesDetail(series),
  is_authenticated: series.isAuthenticated,
});

// Params and payloads
export type FetchSeriesParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type CreateSeriesPayload = {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  isPublished?: boolean;
  isPremium?: boolean;
  priceInCents?: number | null;
  salesEnabled?: boolean;
};

export type UpdateSeriesPayload = Partial<CreateSeriesPayload> & {
  sortOrder?: number;
};

// API functions
export async function fetchSeries(
  params: FetchSeriesParams = {},
): Promise<PaginatedResult<SeriesRecord>> {
  const query = new URLSearchParams();

  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(Math.min(params.pageSize, 50)));
  if (params.search) query.set('search', params.search);

  const data = await fetchJson<{
    items: ApiSeries[];
    pagination: PaginatedResult<ApiSeries>['pagination'];
  }>(`${API_BASE}/series${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
  });

  return {
    items: (data.items ?? []).map(mapSeries),
    pagination: data.pagination,
  };
}

export async function fetchStoreSeries(
  params: FetchSeriesParams = {},
): Promise<PaginatedResult<SeriesRecord>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(Math.min(params.pageSize, 50)));
  if (params.search) query.set('search', params.search);

  const data = await fetchJson<{
    items: ApiSeries[];
    pagination: PaginatedResult<ApiSeries>['pagination'];
  }>(`${API_BASE}/series/store${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
  });

  return {
    items: (data.items ?? []).map(mapSeries),
    pagination: data.pagination,
  };
}

export async function fetchStoreSeriesById(id: string): Promise<StoreSeriesDetailRecord> {
  const data = await fetchJson<ApiStoreSeriesDetail>(`${API_BASE}/series/store/${id}`, {
    method: 'GET',
  });
  return mapStoreSeriesDetail(data);
}

export async function fetchSeriesById(id: string): Promise<SeriesDetailRecord> {
  const data = await fetchJson<ApiSeriesDetail>(`${API_BASE}/series/${id}`, {
    method: 'GET',
  });
  return mapSeriesDetail(data);
}

export async function createSeries(payload: CreateSeriesPayload): Promise<SeriesRecord> {
  const data = await fetchJson<{ series: ApiSeries }>(`${API_BASE}/series`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapSeries(data.series);
}

export async function updateSeries(
  id: string,
  payload: UpdateSeriesPayload,
): Promise<SeriesRecord> {
  const data = await fetchJson<{ series: ApiSeries }>(`${API_BASE}/series/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return mapSeries(data.series);
}

export async function deleteSeries(id: string): Promise<void> {
  await fetchJson<{ success: boolean }>(`${API_BASE}/series/${id}`, {
    method: 'DELETE',
  });
}

// Series Assets API functions
export async function addAssetsToSeries(
  seriesId: string,
  assetIds: string[],
): Promise<{ addedCount: number }> {
  const data = await fetchJson<{ success: boolean; addedCount: number }>(
    `${API_BASE}/series/${seriesId}/assets`,
    {
      method: 'POST',
      body: JSON.stringify({ assetIds }),
    },
  );
  return { addedCount: data.addedCount };
}

export async function removeAssetFromSeries(seriesId: string, assetId: string): Promise<void> {
  await fetchJson<{ success: boolean }>(`${API_BASE}/series/${seriesId}/assets/${assetId}`, {
    method: 'DELETE',
  });
}

export async function reorderSeriesAssets(seriesId: string, assetIds: string[]): Promise<void> {
  await fetchJson<{ success: boolean }>(`${API_BASE}/series/${seriesId}/assets/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ assetIds }),
  });
}
