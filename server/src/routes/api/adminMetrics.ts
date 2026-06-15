import { and, eq, gt, gte, isNull, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { db } from '../../db/client.js';
import { payments, subscriptions, users } from '../../db/schema/index.js';
import { getActiveSubscriptionMetricsFromAggregate, toNumber } from './adminMetricsUtils.js';
import { requireRole } from './utils.js';

type SalesSummary = {
  count: number;
  revenueCents: number;
};

type AdminMetricsOverview = {
  asOf: string;
  users: {
    total: number;
    premium: number;
    free: number;
    activeSubscriptions: number;
  };
  subscriptions: {
    revenueCents: number;
  };
  paidSales: {
    events: SalesSummary;
    tracks: SalesSummary;
    total: SalesSummary;
  };
};

export function registerAdminMetricsRoutes(app: Hono) {
  app.get('/admin/metrics/overview', async (c) => {
    const authResult = await requireRole(c, ['owner', 'admin'], {
      forbiddenMessage: 'Admin privileges required.',
    });
    if ('response' in authResult) {
      return authResult.response;
    }

    try {
      const now = new Date();

      const activeSubscriptionFilter = and(
        eq(subscriptions.status, 'active'),
        isNull(subscriptions.revokedAt),
        gte(subscriptions.endsAt, now),
      );
      const paidEventFilter = and(
        eq(payments.status, 'paid'),
        eq(payments.itemType, 'event'),
        gt(payments.amountCents, 0),
      );
      const paidTrackFilter = and(
        eq(payments.status, 'paid'),
        eq(payments.itemType, 'track'),
        gt(payments.amountCents, 0),
      );

      const [[totalUsersRow], [activeSubscriptionAggregate], [eventSales], [trackSales]] =
        await Promise.all([
          db
            .select({ count: sql<number>`COUNT(*)` })
            .from(users)
            .where(eq(users.isArchived, false)),
          db
            .select({
              premiumUsers: sql<number>`COUNT(DISTINCT ${subscriptions.userId})`,
              revenueCents: sql<number>`COALESCE(SUM(CASE WHEN ${subscriptions.source} = 'paid' THEN ${subscriptions.pricePaidCents} ELSE 0 END), 0)`,
            })
            .from(subscriptions)
            .where(activeSubscriptionFilter),
          db
            .select({
              count: sql<number>`COUNT(*)`,
              revenueCents: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)`,
            })
            .from(payments)
            .where(paidEventFilter),
          db
            .select({
              count: sql<number>`COUNT(*)`,
              revenueCents: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)`,
            })
            .from(payments)
            .where(paidTrackFilter),
        ]);

      const {
        premiumUsers,
        activeSubscriptions,
        revenueCents: subscriptionRevenue,
      } = getActiveSubscriptionMetricsFromAggregate(activeSubscriptionAggregate);
      const totalUsers = toNumber(totalUsersRow?.count);
      const freeUsers = Math.max(totalUsers - premiumUsers, 0);

      const events = {
        count: toNumber(eventSales?.count),
        revenueCents: toNumber(eventSales?.revenueCents),
      };
      const tracks = {
        count: toNumber(trackSales?.count),
        revenueCents: toNumber(trackSales?.revenueCents),
      };
      const total = {
        count: events.count + tracks.count,
        revenueCents: events.revenueCents + tracks.revenueCents,
      };

      const data: AdminMetricsOverview = {
        asOf: now.toISOString(),
        users: {
          total: totalUsers,
          premium: premiumUsers,
          free: freeUsers,
          activeSubscriptions,
        },
        subscriptions: {
          revenueCents: subscriptionRevenue,
        },
        paidSales: {
          events,
          tracks,
          total,
        },
      };

      return c.json({ data });
    } catch (error) {
      console.error('[admin-metrics] overview fetch failed', error);
      return c.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Unable to load admin metrics right now.',
          },
        },
        500,
      );
    }
  });
}
