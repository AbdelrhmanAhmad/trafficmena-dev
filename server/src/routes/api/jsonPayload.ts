import type { Context } from 'hono';

type JsonPayloadOk = {
  ok: true;
  data: unknown;
};

type JsonPayloadError = {
  ok: false;
  code: 'INVALID_JSON' | 'INVALID_CONTENT_TYPE';
  message: string;
};

export type JsonPayloadResult = JsonPayloadOk | JsonPayloadError;

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }
  const normalized = contentType.toLowerCase();
  return normalized.includes('application/json') || normalized.includes('+json');
}

export async function parseJsonRequestBody(request: Request): Promise<JsonPayloadResult> {
  if (!isJsonContentType(request.headers.get('content-type'))) {
    return {
      ok: false,
      code: 'INVALID_CONTENT_TYPE',
      message: 'Content-Type must be application/json.',
    };
  }

  try {
    const data = await request.json();
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      code: 'INVALID_JSON',
      message: 'Request body must be valid JSON.',
    };
  }
}

export async function extractJsonPayload(c: Context): Promise<JsonPayloadResult> {
  return parseJsonRequestBody(c.req.raw);
}
