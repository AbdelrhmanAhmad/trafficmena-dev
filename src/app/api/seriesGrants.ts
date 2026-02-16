import { API_BASE, fetchJson, getCsrfHeaders } from './client';

export type SeriesGrantRecord = {
  id: string;
  userId: string;
  email: string;
  name: string;
  grantedBy: string | null;
  grantReason: string;
  grantedAt: string;
};

export type SeriesGrantListResponse = {
  items: SeriesGrantRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export type FetchSeriesGrantsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export async function fetchSeriesGrants(
  seriesId: string,
  params: FetchSeriesGrantsParams = {},
  signal?: AbortSignal,
): Promise<SeriesGrantListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  const normalizedSearch = params.search?.trim();
  if (normalizedSearch) query.set('search', normalizedSearch);

  return fetchJson<SeriesGrantListResponse>(
    `${API_BASE}/series/${seriesId}/grants${query.toString() ? `?${query.toString()}` : ''}`,
    { signal },
  );
}

export async function fetchAllSeriesGrantUserIds(
  seriesId: string,
  pageSize = 200,
  signal?: AbortSignal,
): Promise<string[]> {
  const safePageSize = Math.max(1, Math.min(pageSize, 200));
  const collected = new Set<string>();

  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }

  let page = 1;
  let total: number | null = null;
  while (true) {
    if (signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    const response = await fetchSeriesGrants(seriesId, { page, pageSize: safePageSize }, signal);
    for (const item of response.items) {
      collected.add(item.userId);
    }

    const reportedTotal = response.pagination.total;
    if (Number.isFinite(reportedTotal)) {
      total = reportedTotal;
    }

    if (response.items.length < safePageSize) {
      break;
    }

    if (total !== null && collected.size >= total) {
      break;
    }

    if (total === null && response.items.length === 0) {
      break;
    }

    page += 1;
  }

  return Array.from(collected);
}

export async function grantSeriesAccess(
  seriesId: string,
  payload: { userIds: string[]; reason: string },
): Promise<{ success: boolean; grantedCount: number; alreadyGrantedCount: number }> {
  return fetchJson<{ success: boolean; grantedCount: number; alreadyGrantedCount: number }>(
    `${API_BASE}/series/${seriesId}/grants`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export async function revokeSeriesAccess(
  seriesId: string,
  userId: string,
  reason: string,
): Promise<{ success: boolean }> {
  return fetchJson<{ success: boolean }>(`${API_BASE}/series/${seriesId}/grants/${userId}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export type BulkSeriesGrantResponse = {
  success: boolean;
  totalRows: number;
  processedRows: number;
  grantedCount: number;
  alreadyGrantedCount: number;
};

export async function createSeriesGrantsFromCsv(file: File): Promise<BulkSeriesGrantResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/series/grants/bulk`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: getCsrfHeaders(),
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  if (!response.ok) {
    if (isJson) {
      const payload = await response.json();
      const error = new Error(payload?.error?.message ?? response.statusText) as Error & {
        extra?: Array<{ line: number; email: string; seriesId?: string; reason: string }>;
      };
      error.extra = payload?.error?.errors;
      throw error;
    }
    throw new Error(response.statusText);
  }

  if (!isJson) {
    throw new Error('Unexpected response format from server.');
  }

  return (await response.json()) as BulkSeriesGrantResponse;
}
