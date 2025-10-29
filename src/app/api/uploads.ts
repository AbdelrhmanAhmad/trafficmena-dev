import { API_BASE } from './client';

export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/uploads/image`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
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

  const data = (await response.json()) as { url: string };
  return data;
}
