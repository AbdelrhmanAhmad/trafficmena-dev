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

export async function extractJsonPayload(c: Context): Promise<JsonPayloadResult> {
  const contentType = c.req.header('content-type');
  if (
    !contentType ||
    (!contentType.toLowerCase().includes('application/json') &&
      !contentType.toLowerCase().includes('+json'))
  ) {
    return {
      ok: false,
      code: 'INVALID_CONTENT_TYPE',
      message: 'Content-Type must be application/json.',
    };
  }

  try {
    const data = await c.req.json();
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      code: 'INVALID_JSON',
      message: 'Request body must be valid JSON.',
    };
  }
}
