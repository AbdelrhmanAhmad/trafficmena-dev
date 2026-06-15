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
  videoAssetId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
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

export type DigitalProductStoreItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price_in_cents: number | null;
  is_purchased: boolean;
  is_sellable: boolean;
  file_count: number;
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
  videoAsset: {
    id: string;
    title: string;
    embedUrl: string | null;
    videoUrl: string | null;
    thumbnailUrl: string | null;
  } | null;
}> {
  const data = await fetchJson<{
    data: {
      product: DigitalProductAdmin;
      files: DigitalProductFile[];
      videoAsset: {
        id: string;
        title: string;
        embedUrl: string | null;
        videoUrl: string | null;
        thumbnailUrl: string | null;
      } | null;
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
  videoAssetId?: string | null;
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
    videoAssetId: string | null;
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

export async function addDigitalProductFiles(
  productId: string,
  payloads: Array<{
    fileType: DigitalProductFileType;
    displayName: string;
    fileUrl: string;
    sortOrder?: number;
  }>,
): Promise<DigitalProductFile[]> {
  if (payloads.length === 0) return [];
  if (payloads.length === 1) {
    return [await addDigitalProductFile(productId, payloads[0])];
  }

  const data = await fetchJson<{ data: { files: DigitalProductFile[]; count: number } }>(
    `${API_BASE}/digital-products/${productId}/files`,
    {
      method: 'POST',
      body: JSON.stringify({ files: payloads }),
    },
  );
  return data.data.files;
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

export async function fetchDigitalProductStore(
  filter: 'all' | 'mine' = 'all',
): Promise<DigitalProductStoreItem[]> {
  const data = await fetchJson<{ data: { items: DigitalProductStoreItem[] } }>(
    `${API_BASE}/digital-products/store?filter=${filter}`,
  );
  return data?.data?.items ?? [];
}

export async function fetchDigitalProductStoreDetail(id: string): Promise<{
  product: DigitalProductStoreItem;
  files: Array<{
    id: string;
    file_type: DigitalProductFileType;
    display_name: string;
    file_url: string;
  }>;
  video_asset: {
    id: string;
    title: string;
    embed_url: string | null;
    video_url: string | null;
    embed_type: string | null;
    thumbnail_url: string | null;
  } | null;
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
      video_asset: {
        id: string;
        title: string;
        embed_url: string | null;
        video_url: string | null;
        embed_type: string | null;
        thumbnail_url: string | null;
      } | null;
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

