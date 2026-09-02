import type { Context } from 'hono';
import { auth } from '../auth.js';

export type AuthSessionResult = {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
  } | null;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

export async function getSessionFromRequest(c: Context): Promise<AuthSessionResult | null> {
  try {
    // Pass headers only — Better Auth 1.6 fails to resolve signed session cookies when
    // `request` is also supplied (Hono's Request + duplicate headers). /auth/session
    // uses asResponse mode and is unaffected; this helper powers all protected API routes.
    const result = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!result || !result.session || !result.user) {
      const reason = !result ? 'no_result' : !result.session ? 'no_session' : 'no_user';
      console.warn('[auth] session validation failed', {
        path: c.req.path,
        reason,
      });
      return null;
    }

    return result as AuthSessionResult;
  } catch (error) {
    console.error('[auth] session retrieval error', {
      path: c.req.path,
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return null;
  }
}
