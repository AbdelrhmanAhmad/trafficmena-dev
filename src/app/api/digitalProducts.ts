import { API_BASE, fetchJson } from './client';

export type DigitalProductFileType = 'excel' | 'markdown' | 'html' | 'text' | 'powerpoint';

export type DigitalProductAdmin = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceInCents: number | null;
  salesEnabled: boolean;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
  videoCount?: number;
};

export type DigitalProductFile = {
  id: string;
  productId: string;
  fileType: DigitalProductFileType;
  displayName: string;
  fileUrl: string;
  sortOrder: number;
  createdAt: string;
};

export type DigitalProductVideo = {
  id: string;
  productId: string;
  title: string;
  videoUrl: string;
  sortOrder: number;
  createdAt: string;
};

export type DigitalProductStoreItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price_in_cents: number | null;
  is_purchased: boolean;
  is_sellable: boolean;
  file_count: number;
  first_video_url?: string | null;
};

export async function fetchAdminDigitalProducts(): Promise<DigitalProductAdmin[]> {
  const data = await fetchJson<{ data: { items: DigitalProductAdmin[] } }>(
    `${API_BASE}/digital-products`,
  );
  return data.data.items;
}

export async function fetchAdminDigitalProduct(id: string): Promise<{
  product: DigitalProductAdmin;
  files: DigitalProductFile[];
  videos: DigitalProductVideo[];
}> {
  const data = await fetchJson<{
    data: {
      product: DigitalProductAdmin;
      files: DigitalProductFile[];
      videos: DigitalProductVideo[];
    };
  }>(`${API_BASE}/digital-products/${id}`);
  return data.data;
}

export async function createDigitalProduct(payload: {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  priceInCents?: number | null;
  salesEnabled?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
}): Promise<DigitalProductAdmin> {
  const data = await fetchJson<{ data: DigitalProductAdmin }>(`${API_BASE}/digital-products`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.data;
}

export async function updateDigitalProduct(
  id: string,
  payload: Partial<{
    title: string;
    description: string | null;
    imageUrl: string | null;
    priceInCents: number | null;
    salesEnabled: boolean;
    isPublished: boolean;
    sortOrder: number;
  }>,
): Promise<DigitalProductAdmin> {
  const data = await fetchJson<{ data: DigitalProductAdmin }>(
    `${API_BASE}/digital-products/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
  return data.data;
}

export async function deleteDigitalProduct(id: string): Promise<void> {
  await fetchJson(`${API_BASE}/digital-products/${id}`, { method: 'DELETE' });
}

export async function addDigitalProductFile(
  productId: string,
  payload: {
    fileType: DigitalProductFileType;
    displayName: string;
    fileUrl: string;
    sortOrder?: number;
  },
): Promise<DigitalProductFile> {
  const data = await fetchJson<{ data: DigitalProductFile }>(
    `${API_BASE}/digital-products/${productId}/files`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return data.data;
}

export async function updateDigitalProductFile(
  productId: string,
  fileId: string,
  payload: Partial<{
    fileType: DigitalProductFileType;
    displayName: string;
    fileUrl: string;
    sortOrder: number;
  }>,
): Promise<DigitalProductFile> {
  const data = await fetchJson<{ data: DigitalProductFile }>(
    `${API_BASE}/digital-products/${productId}/files/${fileId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
  return data.data;
}

export async function removeDigitalProductFile(productId: string, fileId: string): Promise<void> {
  await fetchJson(`${API_BASE}/digital-products/${productId}/files/${fileId}`, {
    method: 'DELETE',
  });
}

export async function addDigitalProductVideo(
  productId: string,
  payload: {
    title: string;
    videoUrl: string;
    sortOrder?: number;
  },
): Promise<DigitalProductVideo> {
  const data = await fetchJson<{ data: DigitalProductVideo }>(
    `${API_BASE}/digital-products/${productId}/videos`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return data.data;
}

export async function updateDigitalProductVideo(
  productId: string,
  videoId: string,
  payload: Partial<{
    title: string;
    videoUrl: string;
    sortOrder: number;
  }>,
): Promise<DigitalProductVideo> {
  const data = await fetchJson<{ data: DigitalProductVideo }>(
    `${API_BASE}/digital-products/${productId}/videos/${videoId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
  return data.data;
}

export async function removeDigitalProductVideo(productId: string, videoId: string): Promise<void> {
  await fetchJson(`${API_BASE}/digital-products/${productId}/videos/${videoId}`, {
    method: 'DELETE',
  });
}

export async function fetchDigitalProductStore(
  filter: 'all' | 'mine' = 'all',
): Promise<DigitalProductStoreItem[]> {
  const data = await fetchJson<{ data: { items: DigitalProductStoreItem[] } }>(
    `${API_BASE}/digital-products/store?filter=${filter}`,
  );
  return data?.data?.items ?? [];
}

export type PublicDigitalProductItem = DigitalProductStoreItem;

export async function fetchPublicDigitalProducts(params?: {
  page?: number;
  pageSize?: number;
}): Promise<{
  items: PublicDigitalProductItem[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  const data = await fetchJson<{
    data: {
      items: PublicDigitalProductItem[];
      pagination: { page: number; pageSize: number; total: number };
    };
  }>(`${API_BASE}/digital-products/public${query.toString() ? `?${query.toString()}` : ''}`);
  return data.data;
}

export async function fetchPublicDigitalProductDetail(id: string): Promise<{
  product: DigitalProductStoreItem & { video_count?: number };
  files: Array<{
    id: string;
    file_type: DigitalProductFileType;
    display_name: string;
  }>;
  videos: Array<{
    id: string;
    title: string;
  }>;
}> {
  const data = await fetchJson<{
    data: {
      product: DigitalProductStoreItem & { video_count?: number };
      files: Array<{
        id: string;
        file_type: DigitalProductFileType;
        display_name: string;
      }>;
      videos: Array<{
        id: string;
        title: string;
      }>;
    };
  }>(`${API_BASE}/digital-products/public/${id}`);
  return data.data;
}

export async function fetchDigitalProductStoreDetail(id: string): Promise<{
  product: DigitalProductStoreItem;
  files: Array<{
    id: string;
    file_type: DigitalProductFileType;
    display_name: string;
    file_url: string;
  }>;
  videos: Array<{
    id: string;
    title: string;
    video_url: string;
  }>;
}> {
  const data = await fetchJson<{
    data: {
      product: DigitalProductStoreItem;
      files: Array<{
        id: string;
        file_type: DigitalProductFileType;
        display_name: string;
        file_url: string;
      }>;
      videos: Array<{
        id: string;
        title: string;
        video_url: string;
      }>;
    };
  }>(`${API_BASE}/digital-products/store/${id}`);
  return data.data;
}

export const DIGITAL_PRODUCT_FILE_TYPE_LABELS: Record<DigitalProductFileType, string> = {
  excel: 'Excel',
  markdown: 'Markdown',
  html: 'HTML',
  text: 'Text',
  powerpoint: 'PowerPoint',
};

export const DIGITAL_PRODUCT_FILE_EXTENSIONS: Record<DigitalProductFileType, string[]> = {
  excel: ['.xls', '.xlsx', '.csv'],
  markdown: ['.md', '.markdown'],
  html: ['.html', '.htm'],
  text: ['.txt'],
  powerpoint: ['.ppt', '.pptx'],
};
