export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    const message = isJson
      ? ((await response.json()).error?.message ?? response.statusText)
      : response.statusText;
    throw new ApiError(message, response.status);
  }

  if (!isJson) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const API_BASE = '/api';
