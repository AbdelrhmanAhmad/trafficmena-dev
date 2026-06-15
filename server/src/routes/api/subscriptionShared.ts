import { and, eq, gte, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { subscriptions } from '../../db/schema/index.js';

export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function activeSubscriptionWhere(userId: string, now: Date = new Date()) {
  return and(
    eq(subscriptions.userId, userId),
    eq(subscriptions.status, 'active'),
    isNull(subscriptions.revokedAt),
    gte(subscriptions.endsAt, now),
  );
}

export async function hasActiveSubscription(userId: string, now: Date = new Date()) {
  const [subscription] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(activeSubscriptionWhere(userId, now))
    .limit(1);

  return subscription !== undefined;
}
