import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class ApiError extends Error {
  code: string;
  status: number;
  extra?: Record<string, unknown>;

  constructor(code: string, message: string, status = 400, extra?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

export function respondError(c: Context, error: ApiError) {
  const response: Record<string, unknown> = { code: error.code, message: error.message };
  if (error.extra) Object.assign(response, error.extra);
  return c.json({ error: response }, error.status as ContentfulStatusCode);
}

export function handleRoute(
  handler: (c: Context) => Promise<Response>,
  fallbackCode: string,
  fallbackMessage: string,
  logLabel: string,
) {
  return async (c: Context) => {
    try {
      return await handler(c);
    } catch (error) {
      if (error instanceof ApiError) {
        return respondError(c, error);
      }
      console.error(`[api] ${logLabel}`, error);
      return respondError(c, new ApiError(fallbackCode, fallbackMessage, 500));
    }
  };
}
