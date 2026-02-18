import { and, eq, gte, inArray, isNull, lt } from 'drizzle-orm';
import type { Hono } from 'hono';
import type { z } from 'zod';
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

type CreateSubscriptionGrantPayload = z.infer<typeof createSubscriptionGrantSchema>;
type RevokeSubscriptionGrantPayload = z.infer<typeof revokeSubscriptionGrantSchema>;

type CreateGrantResult =
  | { type: 'user_not_found' }
  | { type: 'active_exists'; endsAt: Date }
  | {
      type: 'created';
      subscription: {
        id: string;
        userId: string;
        status: 'active' | 'expired';
        startsAt: Date;
        endsAt: Date;
        source: 'paid' | 'legacy' | 'gift';
      };
    };

type RevokeGrantResult =
  | { type: 'not_found' }
  | {
      type: 'revoked';
      id: string;
    };

async function createSubscriptionGrantRecord(params: {
  actorUserId: string;
  payload: CreateSubscriptionGrantPayload;
  now: Date;
}): Promise<CreateGrantResult> {
  // Invariant: at most one currently active subscription per user.
  return db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({ status: 'expired' })
      .where(
        and(
          eq(subscriptions.userId, params.payload.userId),
          eq(subscriptions.status, 'active'),
          isNull(subscriptions.revokedAt),
          lt(subscriptions.endsAt, params.now),
        ),
      );

    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, params.payload.userId))
      .for('update')
      .limit(1);
    if (!user) {
      return { type: 'user_not_found' };
    }

    const [active] = await tx
      .select({
        id: subscriptions.id,
        endsAt: subscriptions.endsAt,
      })
      .from(subscriptions)
      .where(activeSubscriptionWhere(params.payload.userId, params.now))
      .for('update')
      .limit(1);

    if (active) {
      return {
        type: 'active_exists',
        endsAt: active.endsAt,
      };
    }

    const [created] = await tx
      .insert(subscriptions)
      .values({
        userId: params.payload.userId,
        status: 'active',
        startsAt: params.now,
        endsAt: new Date(params.now.getTime() + ONE_YEAR_MS),
        source: params.payload.source,
        pricePaidCents: 0,
        paymentId: null,
        grantedBy: params.actorUserId,
        grantReason: params.payload.reason,
      })
      .returning({
        id: subscriptions.id,
        userId: subscriptions.userId,
        status: subscriptions.status,
        startsAt: subscriptions.startsAt,
        endsAt: subscriptions.endsAt,
        source: subscriptions.source,
      });

    return { type: 'created', subscription: created };
  });
}

async function revokeSubscriptionGrantRecord(params: {
  actorUserId: string;
  payload: RevokeSubscriptionGrantPayload;
  now: Date;
}): Promise<RevokeGrantResult> {
  return db.transaction(async (tx) => {
    const [revoked] = await tx
      .update(subscriptions)
      .set({
        status: 'expired',
        endsAt: params.now,
        revokedAt: params.now,
        revokedBy: params.actorUserId,
        revokeReason: params.payload.reason,
      })
      .where(
        and(
          eq(subscriptions.userId, params.payload.userId),
          eq(subscriptions.status, 'active'),
          isNull(subscriptions.revokedAt),
          gte(subscriptions.endsAt, params.now),
          inArray(subscriptions.source, ['legacy', 'gift']),
        ),
      )
      .returning({ id: subscriptions.id });

    if (!revoked) {
      return { type: 'not_found' };
    }

    return { type: 'revoked', id: revoked.id };
  });
}

type RegisterSubscriptionGrantRoutesDeps = {
  requireAdmin: typeof requireAdmin;
  consumeRateLimit: typeof consumeRateLimit;
  extractJsonPayload: typeof extractJsonPayload;
  handleSubscriptionBulkGrant: typeof handleSubscriptionBulkGrant;
  createSubscriptionGrantRecord: typeof createSubscriptionGrantRecord;
  revokeSubscriptionGrantRecord: typeof revokeSubscriptionGrantRecord;
  now: () => Date;
};

const defaultDeps: RegisterSubscriptionGrantRoutesDeps = {
  requireAdmin,
  consumeRateLimit,
  extractJsonPayload,
  handleSubscriptionBulkGrant,
  createSubscriptionGrantRecord,
  revokeSubscriptionGrantRecord,
  now: () => new Date(),
};

export function registerSubscriptionGrantRoutes(
  app: Hono,
  deps: Partial<RegisterSubscriptionGrantRoutesDeps> = {},
) {
  const resolvedDeps = { ...defaultDeps, ...deps };

  app.post('/subscriptions/grants', async (c) => {
    const actor = await resolvedDeps.requireAdmin(c);
    if ('response' in actor) {
      return actor.response;
    }

    const rateLimited = resolvedDeps.consumeRateLimit(
      c,
      `subscription-grant:create:${actor.userId}`,
      GRANT_MUTATION_RATE_LIMIT,
    );
    if (rateLimited) return rateLimited;

    const bodyResult = await resolvedDeps.extractJsonPayload(c);
    if (!bodyResult.ok) {
      return c.json({ error: { code: bodyResult.code, message: bodyResult.message } }, 400);
    }

    const parsed = createSubscriptionGrantSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
    }

    const grantResult = await resolvedDeps.createSubscriptionGrantRecord({
      actorUserId: actor.userId,
      payload: parsed.data,
      now: resolvedDeps.now(),
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
    const actor = await resolvedDeps.requireAdmin(c);
    if ('response' in actor) {
      return actor.response;
    }

    const rateLimited = resolvedDeps.consumeRateLimit(
      c,
      `subscription-grant:revoke:${actor.userId}`,
      GRANT_MUTATION_RATE_LIMIT,
    );
    if (rateLimited) return rateLimited;

    const bodyResult = await resolvedDeps.extractJsonPayload(c);
    if (!bodyResult.ok) {
      return c.json({ error: { code: bodyResult.code, message: bodyResult.message } }, 400);
    }

    const parsed = revokeSubscriptionGrantSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
    }

    const revokeResult = await resolvedDeps.revokeSubscriptionGrantRecord({
      actorUserId: actor.userId,
      payload: parsed.data,
      now: resolvedDeps.now(),
    });

    if (revokeResult.type === 'not_found') {
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

    return c.json({ success: true, revokedSubscriptionId: revokeResult.id });
  });

  app.post('/subscriptions/grants/bulk', async (c) => {
    const actor = await resolvedDeps.requireAdmin(c);
    if ('response' in actor) return actor.response;

    return resolvedDeps.handleSubscriptionBulkGrant(c, actor.userId);
  });
}
