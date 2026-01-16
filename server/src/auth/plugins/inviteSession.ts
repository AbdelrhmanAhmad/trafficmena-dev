import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';
import { env } from '../../config/env.js';

export const inviteSessionPlugin = (): BetterAuthPlugin => ({
  id: 'invite-session',
  endpoints: {
    createInviteSession: createAuthEndpoint(
      '/internal/invite-session',
      {
        method: 'POST',
        body: z.object({
          userId: z.string().uuid(),
        }),
        requireHeaders: true,
      },
      async (ctx) => {
        if (!env.INVITE_SESSION_SECRET) {
          throw new APIError('SERVICE_UNAVAILABLE', {
            message: 'Invite session provisioning is disabled.',
          });
        }

        const providedSecret =
          ctx.request?.headers?.get('x-invite-session-secret') ??
          ctx.headers?.get?.('x-invite-session-secret');

        if (providedSecret !== env.INVITE_SESSION_SECRET) {
          throw new APIError('UNAUTHORIZED', {
            message: 'Invalid invite session credentials.',
          });
        }

        const { userId } = ctx.body;

        const user = await (ctx.context.internalAdapter as any).findUser(userId, ctx);
        if (!user) {
          throw new APIError('NOT_FOUND', {
            message: 'User not found for provided invitation.',
          });
        }

        const session = await ctx.context.internalAdapter.createSession(userId, false);
        if (!session) {
          throw new APIError('INTERNAL_SERVER_ERROR', {
            message: 'Unable to create session.',
          });
        }

        await setSessionCookie(
          ctx,
          {
            session,
            user,
          },
          false,
        );

        return ctx.json({
          session: {
            token: session.token,
            userId: session.userId,
            expiresAt: session.expiresAt,
          },
          user: {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            name: user.name,
          },
        });
      },
    ),
  },
});
