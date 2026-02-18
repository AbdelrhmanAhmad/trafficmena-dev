import { and, eq, gte, isNull } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { platformSettings, subscriptions } from '../../db/schema/index.js';
import { paymentRateLimiter } from '../../services/rateLimiter.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { extractJsonPayload, jsonPayloadErrorStatusCode } from './jsonPayload.js';
import { getRequestIp, requireAdmin, requireManager } from './utils.js';

// Rate limit for public subscription info endpoint: 60 requests per minute per IP
const PUBLIC_INFO_RATE_LIMIT = { limit: 60, windowMs: 60_000 };

const DEFAULT_SUBSCRIBER_DISCOUNT = 20;

const updateSettingsSchema = z.object({
  annualSubscriptionPriceCents: z.number().int().min(0).nullable().optional(),
  subscriberDiscountPercent: z.number().int().min(1).max(99).nullable().optional(),
});

const getEffectiveDiscountPercent = (value: number | null | undefined) =>
  value !== null && value !== undefined && value >= 1 && value <= 99
    ? value
    : DEFAULT_SUBSCRIBER_DISCOUNT;

export function registerSubscriptionRoutes(app: Hono) {
  // GET /subscriptions/current - Get user's active subscription
  app.get('/subscriptions/current', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, session.user.id),
          eq(subscriptions.status, 'active'),
          isNull(subscriptions.revokedAt),
          gte(subscriptions.endsAt, new Date()),
        ),
      );

    if (!subscription) {
      return c.json({
        data: {
          hasSubscription: false,
          subscription: null,
        },
      });
    }

    return c.json({
      data: {
        hasSubscription: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          startsAt: subscription.startsAt,
          endsAt: subscription.endsAt,
          pricePaidCents: subscription.pricePaidCents,
          source: subscription.source,
        },
      },
    });
  });

  // GET /subscriptions/settings - Get subscription settings (manager+)
  app.get('/subscriptions/settings', async (c) => {
    const authResult = await requireManager(c);
    if ('response' in authResult) {
      return authResult.response;
    }

    const [settings] = await db.select().from(platformSettings).limit(1);

    return c.json({
      data: {
        annualSubscriptionPriceCents: settings?.annualSubscriptionPriceCents ?? null,
        subscriberDiscountPercent: getEffectiveDiscountPercent(settings?.subscriberDiscountPercent),
      },
    });
  });

  // PUT /subscriptions/settings - Update subscription settings (admin+)
  app.put('/subscriptions/settings', async (c) => {
    const authResult = await requireAdmin(c);
    if ('response' in authResult) {
      return authResult.response;
    }

    const bodyResult = await extractJsonPayload(c);
    if (!bodyResult.ok) {
      return c.json(
        { error: { code: bodyResult.code, message: bodyResult.message } },
        jsonPayloadErrorStatusCode(bodyResult.code),
      );
    }

    const result = updateSettingsSchema.safeParse(bodyResult.data);
    if (!result.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: result.error.message } }, 400);
    }

    const updates = result.data;

    const [existing] = await db.select().from(platformSettings).limit(1);

    if (existing) {
      await db
        .update(platformSettings)
        .set({
          ...updates,
          updatedAt: new Date(),
          updatedBy: authResult.userId,
        })
        .where(eq(platformSettings.id, existing.id));
    } else {
      await db.insert(platformSettings).values({
        ...updates,
        updatedBy: authResult.userId,
      });
    }

    const [updated] = await db.select().from(platformSettings).limit(1);

    return c.json({
      data: {
        annualSubscriptionPriceCents: updated?.annualSubscriptionPriceCents ?? null,
        subscriberDiscountPercent: getEffectiveDiscountPercent(updated?.subscriberDiscountPercent),
      },
    });
  });

  // GET /subscriptions/info - Public info about subscription benefits
  app.get('/subscriptions/info', async (c) => {
    const clientIp = getRequestIp(c);
    const { allowed, resetAt } = paymentRateLimiter.consume(
      `sub-info:${clientIp}`,
      PUBLIC_INFO_RATE_LIMIT,
    );
    if (!allowed) {
      c.header('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)));
      return c.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        },
        429,
      );
    }

    const [settings] = await db.select().from(platformSettings).limit(1);

    return c.json({
      data: {
        priceEgp: settings?.annualSubscriptionPriceCents
          ? settings.annualSubscriptionPriceCents / 100
          : null,
        discountPercent: getEffectiveDiscountPercent(settings?.subscriberDiscountPercent),
        benefits: [
          'Free access to all online events',
          `${getEffectiveDiscountPercent(settings?.subscriberDiscountPercent)}% discount on offline events`,
          `${getEffectiveDiscountPercent(settings?.subscriberDiscountPercent)}% discount on track bundles`,
          'Full access to the knowledge library',
        ],
      },
    });
  });
}
