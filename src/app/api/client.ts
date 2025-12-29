export class ApiError extends Error {
  status: number;
  code?: string;
  extra?: Record<string, unknown>;

  constructor(message: string, status: number, code?: string, extra?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
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
    let message = response.statusText;
    let code: string | undefined;
    let extra: Record<string, unknown> | undefined;

    if (isJson) {
      const body = await response.json();
      if (body.error) {
        message = body.error.message ?? message;
        code = body.error.code;
        // Extract any other properties from error logic as extra
        const { message: _m, code: _c, ...rest } = body.error;
        if (Object.keys(rest).length > 0) extra = rest;
      }
    }
    throw new ApiError(message, response.status, code, extra);
  }

  if (!isJson) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const API_BASE = '/api';
