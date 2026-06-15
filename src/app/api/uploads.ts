import { API_BASE, getCsrfHeaders } from './client';

export type UploadScope =
  | 'events'
  | 'library'
  | 'editor'
  | 'general'
  | 'digital-products'
  | 'masterclasses';

export type UploadFileOptions = {
  file: File;
  scope?: UploadScope;
  signal?: AbortSignal;
};

export type UploadFileResult = {
  url: string;
  path: string;
  sizeBytes: number;
  contentType: string;
  scope: UploadScope;
};

export async function uploadFile({
  file,
  scope = 'events',
  signal,
}: UploadFileOptions): Promise<UploadFileResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('scope', scope);

  const endpoint = `${API_BASE}/uploads?scope=${encodeURIComponent(scope)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: getCsrfHeaders(),
    signal,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    let message = response.statusText || 'Upload failed';

    if (contentType?.includes('application/json')) {
      try {
        const payload = await response.json();
        message = payload.error?.message ?? message;
      } catch {
        // ignore parse error
      }
    }

    throw new Error(message);
  }

  const data = (await response.json()) as UploadFileResult;
  return data;
}
