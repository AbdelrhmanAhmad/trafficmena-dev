import type { Context } from 'hono';
import { MAX_JSON_PAYLOAD_BYTES } from '../../config/requestLimits.js';

type JsonPayloadOk = {
  ok: true;
  data: unknown;
};

type JsonPayloadError = {
  ok: false;
  code: 'INVALID_JSON' | 'INVALID_CONTENT_TYPE' | 'PAYLOAD_TOO_LARGE' | 'BODY_READ_ERROR';
  message: string;
};

export type JsonPayloadResult = JsonPayloadOk | JsonPayloadError;

function isJsonContentType(contentType: string | null | undefined) {
  if (!contentType) return false;
  const normalized = contentType.toLowerCase();
  return normalized.includes('application/json') || normalized.includes('+json');
}

function payloadTooLargeError(): JsonPayloadError {
  return {
    ok: false,
    code: 'PAYLOAD_TOO_LARGE',
    message: `JSON payload exceeds ${(MAX_JSON_PAYLOAD_BYTES / 1_000_000).toFixed(1)} MB.`,
  };
}

export function jsonPayloadErrorStatusCode(code: JsonPayloadError['code']) {
  return code === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
}

async function readRequestTextWithLimit(
  request: Request,
): Promise<{ ok: true; text: string } | JsonPayloadError> {
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > MAX_JSON_PAYLOAD_BYTES) {
      return payloadTooLargeError();
    }
  }

  if (!request.body || typeof request.body.getReader !== 'function') {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_JSON_PAYLOAD_BYTES) {
      return payloadTooLargeError();
    }
    return { ok: true, text };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_JSON_PAYLOAD_BYTES) {
        await reader.cancel();
        return payloadTooLargeError();
      }

      text += decoder.decode(value, { stream: true });
    }

    text += decoder.decode();
    return { ok: true, text };
  } catch {
    return {
      ok: false,
      code: 'BODY_READ_ERROR',
      message: 'Failed to read request body.',
    };
  } finally {
    reader.releaseLock();
  }
}

export async function extractJsonPayload(c: Context): Promise<JsonPayloadResult> {
  if (!isJsonContentType(c.req.header('content-type'))) {
    return {
      ok: false,
      code: 'INVALID_CONTENT_TYPE',
      message: 'Content-Type must be application/json.',
    };
  }

  const textResult = await readRequestTextWithLimit(c.req.raw);
  if (!textResult.ok) {
    return textResult;
  }

  try {
    const data = JSON.parse(textResult.text) as unknown;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      code: 'INVALID_JSON',
      message: 'Request body must be valid JSON.',
    };
  }
}
