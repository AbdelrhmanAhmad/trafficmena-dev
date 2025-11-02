import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';

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
        const { userId } = ctx.body;

        const user = await ctx.context.internalAdapter.findUser(userId, ctx);
        if (!user) {
          throw new APIError('NOT_FOUND', {
            message: 'User not found for provided invitation.',
          });
        }

        const session = await ctx.context.internalAdapter.createSession(userId, ctx);
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
