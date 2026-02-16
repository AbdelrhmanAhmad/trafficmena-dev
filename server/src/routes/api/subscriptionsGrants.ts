import { and, eq, gte, inArray, isNull, lt } from 'drizzle-orm';
import type { Hono } from 'hono';
import { db } from '../../db/client.js';
import { subscriptions, users } from '../../db/schema/index.js';
import { extractJsonPayload } from './jsonPayload.js';
import { activeSubscriptionWhere, ONE_YEAR_MS } from './subscriptionShared.js';
import { handleSubscriptionBulkGrant } from './subscriptionsGrantsBulk.js';
import {
  createSubscriptionGrantSchema,
  revokeSubscriptionGrantSchema,
} from './subscriptionsGrantsCsv.js';
import { consumeRateLimit, requireAdmin } from './utils.js';

const GRANT_MUTATION_RATE_LIMIT = { limit: 30, windowMs: 60_000 };

export function registerSubscriptionGrantRoutes(app: Hono) {
  app.post('/subscriptions/grants', async (c) => {
    const actor = await requireAdmin(c);
    if ('response' in actor) {
      return actor.response;
    }

    const rateLimited = consumeRateLimit(
      c,
      `subscription-grant:create:${actor.userId}`,
      GRANT_MUTATION_RATE_LIMIT,
    );
    if (rateLimited) return rateLimited;

    const bodyResult = await extractJsonPayload(c);
    if (!bodyResult.ok) {
      return c.json({ error: { code: bodyResult.code, message: bodyResult.message } }, 400);
    }

    const parsed = createSubscriptionGrantSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
    }

    const payload = parsed.data;
    const now = new Date();

    // Invariant: at most one currently active subscription per user.
    const grantResult = await db.transaction(async (tx) => {
      await tx
        .update(subscriptions)
        .set({ status: 'expired' })
        .where(
          and(
            eq(subscriptions.userId, payload.userId),
            eq(subscriptions.status, 'active'),
            isNull(subscriptions.revokedAt),
            lt(subscriptions.endsAt, now),
          ),
        );

      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, payload.userId))
        .for('update')
        .limit(1);
      if (!user) {
        return { type: 'user_not_found' as const };
      }

      const [active] = await tx
        .select({
          id: subscriptions.id,
          endsAt: subscriptions.endsAt,
        })
        .from(subscriptions)
        .where(activeSubscriptionWhere(payload.userId, now))
        .for('update')
        .limit(1);

      if (active) {
        return {
          type: 'active_exists' as const,
          endsAt: active.endsAt,
        };
      }

      const [created] = await tx
        .insert(subscriptions)
        .values({
          userId: payload.userId,
          status: 'active',
          startsAt: now,
          endsAt: new Date(now.getTime() + ONE_YEAR_MS),
          source: payload.source,
          pricePaidCents: 0,
          paymentId: null,
          grantedBy: actor.userId,
          grantReason: payload.reason,
        })
        .returning({
          id: subscriptions.id,
          userId: subscriptions.userId,
          status: subscriptions.status,
          startsAt: subscriptions.startsAt,
          endsAt: subscriptions.endsAt,
          source: subscriptions.source,
        });

      return { type: 'created' as const, subscription: created };
    });

    if (grantResult.type === 'user_not_found') {
      return c.json({ error: { code: 'USER_NOT_FOUND', message: 'User not found.' } }, 404);
    }

    if (grantResult.type === 'active_exists') {
      return c.json(
        {
          error: {
            code: 'ACTIVE_SUBSCRIPTION_EXISTS',
            message: `Active subscription exists until ${grantResult.endsAt.toISOString()}.`,
          },
        },
        409,
      );
    }

    return c.json({ success: true, subscription: grantResult.subscription }, 201);
  });

  app.post('/subscriptions/grants/revoke', async (c) => {
    const actor = await requireAdmin(c);
    if ('response' in actor) {
      return actor.response;
    }

    const rateLimited = consumeRateLimit(
      c,
      `subscription-grant:revoke:${actor.userId}`,
      GRANT_MUTATION_RATE_LIMIT,
    );
    if (rateLimited) return rateLimited;

    const bodyResult = await extractJsonPayload(c);
    if (!bodyResult.ok) {
      return c.json({ error: { code: bodyResult.code, message: bodyResult.message } }, 400);
    }

    const parsed = revokeSubscriptionGrantSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
    }

    const now = new Date();
    const [revoked] = await db
      .update(subscriptions)
      .set({
        status: 'expired',
        endsAt: now,
        revokedAt: now,
        revokedBy: actor.userId,
        revokeReason: parsed.data.reason,
      })
      .where(
        and(
          eq(subscriptions.userId, parsed.data.userId),
          eq(subscriptions.status, 'active'),
          isNull(subscriptions.revokedAt),
          gte(subscriptions.endsAt, now),
          inArray(subscriptions.source, ['legacy', 'gift']),
        ),
      )
      .returning({ id: subscriptions.id });

    if (!revoked) {
      return c.json(
        {
          error: {
            code: 'NON_PAID_SUBSCRIPTION_NOT_FOUND',
            message: 'Active legacy/gift subscription not found.',
          },
        },
        404,
      );
    }

    return c.json({ success: true, revokedSubscriptionId: revoked.id });
  });

  app.post('/subscriptions/grants/bulk', async (c) => {
    const actor = await requireAdmin(c);
    if ('response' in actor) return actor.response;

    return handleSubscriptionBulkGrant(c, actor.userId);
  });
}
