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
    const result = await auth.api.getSession({
      request: c.req.raw,
      headers: c.req.raw.headers,
    });

    if (!result || !result.session || !result.user) {
      return null;
    }

    return result as AuthSessionResult;
  } catch (error) {
    return null;
  }
}
