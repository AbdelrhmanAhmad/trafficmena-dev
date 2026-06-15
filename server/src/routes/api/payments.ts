import { and, desc, eq, gt, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import type { Context, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { db } from '../../db/client.js';
import {
  digitalProducts,
  eventAttendees,
  eventReservations,
  events,
  orderItems,
  orders,
  payments,
  platformSettings,
  series,
  profiles,
  subscriptions,
  trackBookings,
  trackEvents,
  trackReservations,
  tracks,
  users,
} from '../../db/schema/index.js';
import {
  getInvoiceData,
  getPaymentMethods,
  invoiceInitPay,
  verifyFawaterkWebhook,
} from '../../services/fawaterk.js';
import { validatePromoCode } from '../../services/promoCodes.js';
import {
  assertMasterclassSellable,
  getEnrolledMasterclassIds,
  grantMasterclassEnrollment,
} from '../../services/masterclassSales.js';
import { paymentRateLimiter } from '../../services/rateLimiter.js';
import { activeTrackBookingWhere } from '../../utils/booking.js';
import { ApiError } from '../../utils/errors.js';
import { isInvoicePaid } from '../../utils/invoiceStatus.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { loadVerifiedPaymentAnalytics } from './paymentAnalytics.js';
import { ONE_YEAR_MS } from './subscriptionShared.js';
import { fulfillSeriesOrder } from './orders.js';
import { executeTrackBookingWrite } from './trackBookingShared.js';
import { isKnownDatabaseConflict } from './utils.js';

// --- Rate Limit Rules ---
const CHECKOUT_RATE_LIMIT = { limit: 5, windowMs: 60_000 }; // 5 checkouts per minute
const VERIFY_RATE_LIMIT = { limit: 30, windowMs: 60_000 }; // 30 verifications per minute
const METHODS_RATE_LIMIT = { limit: 60, windowMs: 60_000 }; // 60 method fetches per minute
const WEBHOOK_RATE_LIMIT = { limit: 100, windowMs: 60_000 }; // 100 webhooks per minute per IP
const RESERVATION_TTL_MS = 72 * 60 * 60 * 1000;
const CHECKOUT_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

// --- Schemas ---

const checkoutSchema = z.object({
  itemType: z.enum(['event', 'track', 'subscription', 'order', 'masterclass']),
  itemId: z.string().uuid().optional(),
  paymentMethodId: z.number().int().positive(),
  forceNewCode: z.boolean().optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
  promoCode: z.string().optional(),
});

const invoiceIdSchema = z
  .union([z.number(), z.string()])
  .transform((value) => String(value).trim())
  .refine((value) => value.length > 0 && value !== 'NaN', 'Invalid invoice id');

const verifySchema = z.object({
  invoiceId: invoiceIdSchema,
});

const webhookSchema = z.object({
  invoice_id: invoiceIdSchema,
  invoice_key: z.string().min(1).max(255),
  payment_method: z.string().min(1).max(100),
  hashKey: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid HMAC signature format'),
});

// --- Types ---

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type PriceResult = {
  amountCents: number;
  itemName: string;
  originalAmountCents: number;
  discountAppliedCents: number;
  discountSource: 'subscriber' | 'promo' | null;
  promoCodeId: string | null;
  isSubscriber: boolean;
  isFree: boolean;
};

type CheckoutSuccessPayload = {
  paymentId: string;
  free?: boolean;
  invoiceId?: string;
  redirectUrl?: string;
  fawryCode?: string;
  meezaReference?: string;
  meezaQrCode?: string;
  amanCode?: string;
  masaryCode?: string;
};

type ConfirmationSource = 'verify' | 'webhook' | 'reconcile';

type ConfirmGatewayInvoiceResult = {
  status: 'pending' | 'paid' | 'failed' | 'expired';
  paymentId: string;
  itemType: 'event' | 'track' | 'subscription' | 'order' | 'masterclass';
  itemId: string | null;
  amountCents?: number;
  itemName?: string;
  paymentType?: string;
  promoCode?: string;
  originalAmountCents?: number;
  discountAppliedCents?: number;
  priorPaidPurchases?: number;
  priorNonSubscriptionPurchases?: number;
  fawaterkPaid: boolean;
  alreadyProcessed?: boolean;
  recoveredFromExpired?: boolean;
  confirmationSource: ConfirmationSource;
};

type CheckoutInFlightReservation = {
  createdAt: number;
  waitForCompletion: Promise<void>;
  release: () => void;
};

const checkoutIdempotencyCache = new Map<
  string,
  { createdAt: number; response: CheckoutSuccessPayload }
>();
const checkoutIdempotencyInFlight = new Map<string, CheckoutInFlightReservation>();

// --- Helpers ---

function buildCheckoutIdempotencyCacheKey(params: {
  userId: string;
  itemType: 'event' | 'track' | 'subscription' | 'order' | 'masterclass';
  itemId?: string;
  paymentMethodId: number;
  idempotencyKey: string;
}): string {
  const { userId, itemType, itemId, paymentMethodId, idempotencyKey } = params;
  const normalizedItemId = itemId ?? 'none';
  return [userId, itemType, normalizedItemId, String(paymentMethodId), idempotencyKey].join(':');
}

function readCheckoutIdempotencyResponse(cacheKey: string): CheckoutSuccessPayload | null {
  const cached = checkoutIdempotencyCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  const isExpired = Date.now() - cached.createdAt > CHECKOUT_IDEMPOTENCY_TTL_MS;
  if (isExpired) {
    checkoutIdempotencyCache.delete(cacheKey);
    return null;
  }

  return cached.response;
}

function writeCheckoutIdempotencyResponse(
  cacheKey: string,
  response: CheckoutSuccessPayload,
): void {
  checkoutIdempotencyCache.set(cacheKey, { createdAt: Date.now(), response });

  // Opportunistic cleanup keeps map bounded without a dedicated timer.
  for (const [key, cached] of checkoutIdempotencyCache.entries()) {
    if (Date.now() - cached.createdAt > CHECKOUT_IDEMPOTENCY_TTL_MS) {
      checkoutIdempotencyCache.delete(key);
    }
  }
}

function readCheckoutIdempotencyInFlight(cacheKey: string): CheckoutInFlightReservation | null {
  const inFlight = checkoutIdempotencyInFlight.get(cacheKey);
  if (!inFlight) {
    return null;
  }

  const isExpired = Date.now() - inFlight.createdAt > CHECKOUT_IDEMPOTENCY_TTL_MS;
  if (isExpired) {
    checkoutIdempotencyInFlight.delete(cacheKey);
    return null;
  }

  return inFlight;
}

function createCheckoutInFlightReservation(): CheckoutInFlightReservation {
  let release = () => {};
  const waitForCompletion = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    createdAt: Date.now(),
    waitForCompletion,
    release,
  };
}

function isPostgresUniqueViolation(error: unknown): boolean {
  return isKnownDatabaseConflict(error) === 'unique';
}

async function calculatePrice(
  userId: string,
  itemType: 'event' | 'track' | 'subscription' | 'order' | 'masterclass',
  itemId: string | null,
  promoCode?: string,
  tx?: DbTransaction,
): Promise<PriceResult> {
  const dbClient = tx ?? db;
  const normalizedPromoCode = promoCode?.trim() || undefined;

  // Parallel fetch: subscription status + platform settings (independent queries)
  const [subscriptionResult, settingsResult] = await Promise.all([
    dbClient
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active'),
          isNull(subscriptions.revokedAt),
          gte(subscriptions.endsAt, new Date()),
        ),
      ),
    dbClient.select().from(platformSettings).limit(1),
  ]);
  const [subscription] = subscriptionResult;
  const [settings] = settingsResult;
  const isSubscriber = !!subscription;
  const rawDiscount = settings?.subscriberDiscountPercent;
  const discountPercent =
    rawDiscount !== null && rawDiscount !== undefined && rawDiscount >= 1 && rawDiscount <= 99
      ? rawDiscount
      : 20;

  if (itemType === 'subscription') {
    if (isSubscriber) {
      throw new ApiError(
        'ALREADY_SUBSCRIBED',
        `Active subscription exists until ${subscription.endsAt.toLocaleDateString()}`,
        400,
      );
    }
    if (!settings?.annualSubscriptionPriceCents) {
      throw new ApiError('NOT_CONFIGURED', 'Subscription price not set', 400);
    }
    const amountCents = settings.annualSubscriptionPriceCents;
    return {
      amountCents,
      itemName: 'Annual Subscription',
      originalAmountCents: amountCents,
      discountAppliedCents: 0,
      discountSource: null,
      promoCodeId: null,
      isSubscriber,
      isFree: amountCents === 0,
    };
  }

  if (itemType === 'event' && itemId) {
    // Parallel fetch: event details + track event info + existing registration (all use itemId/userId)
    const [eventResult, trackEventResult, existingRegResult] = await Promise.all([
      dbClient.select().from(events).where(eq(events.id, itemId)),
      dbClient
        .select({
          allowIndividualBooking: tracks.allowIndividualBooking,
          singleBookingStart: tracks.singleBookingStart,
          singleBookingEnd: tracks.singleBookingEnd,
        })
        .from(trackEvents)
        .innerJoin(tracks, eq(tracks.id, trackEvents.trackId))
        .where(eq(trackEvents.eventId, itemId)),
      dbClient
        .select()
        .from(eventAttendees)
        .where(and(eq(eventAttendees.eventId, itemId), eq(eventAttendees.userId, userId))),
    ]);

    const [event] = eventResult;
    const [trackEvent] = trackEventResult;
    const [existingReg] = existingRegResult;

    if (!event) throw new ApiError('NOT_FOUND', 'Event not found', 404);

    if (trackEvent) {
      if (!trackEvent.allowIndividualBooking) {
        throw new ApiError(
          'INDIVIDUAL_BOOKING_DISABLED',
          'Individual event booking is not available for this track.',
          400,
        );
      }

      if (!trackEvent.singleBookingStart || !trackEvent.singleBookingEnd) {
        throw new ApiError(
          'BOOKING_NOT_OPEN',
          'Single event booking is not enabled for this track.',
          400,
        );
      }

      const now = new Date();
      if (now < trackEvent.singleBookingStart) {
        throw new ApiError('BOOKING_NOT_OPEN', 'Single booking period has not started.', 400);
      }
      if (now > trackEvent.singleBookingEnd) {
        throw new ApiError('BOOKING_PERIOD_CLOSED', 'Single booking period has ended.', 400);
      }
    }

    if (existingReg && existingReg.status !== 'cancelled') {
      throw new ApiError('ALREADY_REGISTERED', 'Already registered for this event', 400);
    }

    // Capacity check - sequential since it depends on event.maxAttendees
    if (event.maxAttendees) {
      const [countResult] = await dbClient
        .select({ count: sql<number>`count(*)::int` })
        .from(eventAttendees)
        .where(
          and(
            eq(eventAttendees.eventId, itemId),
            inArray(eventAttendees.status, ['active', 'refund_requested']),
          ),
        );

      if (Number(countResult.count) >= event.maxAttendees) {
        throw new ApiError('EVENT_FULL', 'Event capacity reached.', 409);
      }
    }

    const basePrice = event.priceInCents ?? 0;
    let amountCents = basePrice;
    let discountAppliedCents = 0;
    let discountSource: PriceResult['discountSource'] = null;
    let promoCodeId: string | null = null;

    // Online event = FREE for subscribers (derive from existing fields)
    const isOnline = event.meetingLink && !event.location;
    if (isSubscriber && isOnline) {
      amountCents = 0;
      discountAppliedCents = basePrice > 0 ? basePrice : 0;
      discountSource = basePrice > 0 ? 'subscriber' : null;
      return {
        amountCents,
        itemName: event.title,
        originalAmountCents: basePrice,
        discountAppliedCents,
        discountSource,
        promoCodeId,
        isSubscriber,
        isFree: amountCents === 0,
      };
    }

    // Apply global discount for subscribers on offline/hybrid events (promo excluded)
    if (isSubscriber && basePrice > 0) {
      const discounted = Math.round(basePrice * (1 - discountPercent / 100));
      amountCents = discounted;
      discountAppliedCents = basePrice - discounted;
      discountSource = 'subscriber';
      return {
        amountCents,
        itemName: event.title,
        originalAmountCents: basePrice,
        discountAppliedCents,
        discountSource,
        promoCodeId,
        isSubscriber,
        isFree: amountCents === 0,
      };
    }

    if (normalizedPromoCode && basePrice > 0) {
      const promo = await validatePromoCode(normalizedPromoCode, 'event', itemId, tx);
      const promoDiscountCents = Math.floor((basePrice * promo.discountPercent) / 100);
      amountCents = basePrice - promoDiscountCents;
      discountAppliedCents = promoDiscountCents;
      discountSource = 'promo';
      promoCodeId = promo.id;
    }

    return {
      amountCents,
      itemName: event.title,
      originalAmountCents: basePrice,
      discountAppliedCents,
      discountSource,
      promoCodeId,
      isSubscriber,
      isFree: amountCents === 0,
    };
  }

  if (itemType === 'track' && itemId) {
    // Parallel fetch: track details + existing booking (both use itemId/userId)
    const [trackResult, existingBookingResult] = await Promise.all([
      dbClient.select().from(tracks).where(eq(tracks.id, itemId)),
      dbClient
        .select()
        .from(trackBookings)
        .where(
          activeTrackBookingWhere(
            eq(trackBookings.trackId, itemId),
            eq(trackBookings.userId, userId),
          ),
        ),
    ]);

    const [track] = trackResult;
    const [existingBooking] = existingBookingResult;

    if (!track) throw new ApiError('NOT_FOUND', 'Track not found', 404);
    if (!track.isPublished) {
      throw new ApiError('TRACK_NOT_FOUND', 'Track not found', 404);
    }
    if (track.trackBookingStart === null || track.trackBookingEnd === null) {
      throw new ApiError('BOOKING_NOT_CONFIGURED', 'Track booking not configured.', 400);
    }

    const now = new Date();
    if (now < new Date(track.trackBookingStart)) {
      throw new ApiError('BOOKING_NOT_OPEN', 'Track booking not yet open.', 400);
    }
    if (now > new Date(track.trackBookingEnd)) {
      throw new ApiError('BOOKING_PERIOD_CLOSED', 'Track booking period closed.', 400);
    }

    if (existingBooking) {
      throw new ApiError('ALREADY_BOOKED', 'Already booked this track', 400);
    }

    const basePrice = track.priceInCents ?? 0;
    let amountCents = basePrice;
    let discountAppliedCents = 0;
    let discountSource: PriceResult['discountSource'] = null;
    let promoCodeId: string | null = null;

    // Apply global discount for subscribers (promo excluded)
    if (isSubscriber && basePrice > 0) {
      const discounted = Math.round(basePrice * (1 - discountPercent / 100));
      amountCents = discounted;
      discountAppliedCents = basePrice - discounted;
      discountSource = 'subscriber';
      return {
        amountCents,
        itemName: track.title,
        originalAmountCents: basePrice,
        discountAppliedCents,
        discountSource,
        promoCodeId,
        isSubscriber,
        isFree: amountCents === 0,
      };
    }

    if (normalizedPromoCode && basePrice > 0) {
      const promo = await validatePromoCode(normalizedPromoCode, 'track', itemId, tx);
      const promoDiscountCents = Math.floor((basePrice * promo.discountPercent) / 100);
      amountCents = basePrice - promoDiscountCents;
      discountAppliedCents = promoDiscountCents;
      discountSource = 'promo';
      promoCodeId = promo.id;
    }

    return {
      amountCents,
      itemName: track.title,
      originalAmountCents: basePrice,
      discountAppliedCents,
      discountSource,
      promoCodeId,
      isSubscriber,
      isFree: amountCents === 0,
    };
  }

  if (itemType === 'order' && itemId) {
    const [order] = await dbClient
      .select()
      .from(orders)
      .where(and(eq(orders.id, itemId), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    if (order.status !== 'pending') {
      throw new ApiError('ORDER_NOT_PAYABLE', 'This order is no longer payable.', 409);
    }

    const seriesLines = await dbClient
      .select({ title: series.title })
      .from(orderItems)
      .innerJoin(series, eq(series.id, orderItems.seriesId))
      .where(and(eq(orderItems.orderId, order.id), eq(orderItems.itemType, 'series')));

    const productLines = await dbClient
      .select({ title: digitalProducts.title })
      .from(orderItems)
      .innerJoin(digitalProducts, eq(digitalProducts.id, orderItems.digitalProductId))
      .where(and(eq(orderItems.orderId, order.id), eq(orderItems.itemType, 'digital_product')));

    const lineTitles = [...seriesLines, ...productLines].map((row) => row.title);

    const itemName =
      lineTitles.length === 1
        ? lineTitles[0]
        : `Order bundle (${lineTitles.length} items)`;

    return {
      amountCents: order.totalCents,
      itemName,
      originalAmountCents: order.totalCents,
      discountAppliedCents: 0,
      discountSource: null,
      promoCodeId: null,
      isSubscriber,
      isFree: order.totalCents === 0,
    };
  }

  if (itemType === 'masterclass' && itemId) {
    const sellable = await assertMasterclassSellable(itemId);
    const enrolledIds = await getEnrolledMasterclassIds(userId, [itemId]);
    if (enrolledIds.has(itemId)) {
      throw new ApiError('ALREADY_ENROLLED', 'Already enrolled in this masterclass', 400);
    }

    const basePrice = sellable.priceInCents ?? 0;
    return {
      amountCents: basePrice,
      itemName: sellable.title,
      originalAmountCents: basePrice,
      discountAppliedCents: 0,
      discountSource: null,
      promoCodeId: null,
      isSubscriber,
      isFree: basePrice === 0,
    };
  }

  throw new ApiError('INVALID_ITEM', 'Invalid item type', 400);
}

type ProcessSuccessfulPaymentOptions = {
  allowExpiredRecovery?: boolean;
};

type ProcessSuccessfulPaymentResult = {
  status: 'pending' | 'paid' | 'failed' | 'expired';
  alreadyProcessed?: boolean;
};

async function processSuccessfulPayment(
  paymentId: string,
  options: ProcessSuccessfulPaymentOptions = {},
): Promise<ProcessSuccessfulPaymentResult> {
  const { allowExpiredRecovery = false } = options;
  let shouldMarkFailedOnError = false;

  // CRITICAL: Fulfillment happens before status is marked paid so failures persist.
  try {
    return await db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .for('update')
        .limit(1);

      if (!payment) {
        throw new Error('Payment not found or invalid state');
      }

      if (payment.status === 'paid') {
        return { alreadyProcessed: true, status: 'paid' };
      }

      const canRecoverExpired = allowExpiredRecovery && payment.status === 'expired';
      if (payment.status !== 'pending' && !canRecoverExpired) {
        return { status: payment.status };
      }
      shouldMarkFailedOnError = payment.status === 'pending';
      let alreadyProcessed = false;

      const paidAt = new Date();

      if (payment.itemType === 'event' && payment.itemId) {
        const [event] = await tx
          .select()
          .from(events)
          .where(eq(events.id, payment.itemId))
          .for('update');
        if (!event) {
          throw new ApiError('EVENT_NOT_FOUND', 'Event not found.', 404);
        }
        const [eventReservation] = await tx
          .select({
            expiresAt: eventReservations.expiresAt,
          })
          .from(eventReservations)
          .where(
            and(
              eq(eventReservations.paymentId, payment.id),
              eq(eventReservations.eventId, payment.itemId),
            ),
          )
          .limit(1);

        if (eventReservation && eventReservation.expiresAt <= paidAt) {
          throw new ApiError(
            'RESERVATION_EXPIRED',
            'This reservation has expired. Please request a new code.',
            409,
          );
        }

        const [trackEvent] = await tx
          .select({
            allowIndividualBooking: tracks.allowIndividualBooking,
            singleBookingStart: tracks.singleBookingStart,
            singleBookingEnd: tracks.singleBookingEnd,
          })
          .from(trackEvents)
          .innerJoin(tracks, eq(tracks.id, trackEvents.trackId))
          .where(eq(trackEvents.eventId, payment.itemId));

        if (trackEvent) {
          if (!trackEvent.allowIndividualBooking) {
            throw new ApiError(
              'INDIVIDUAL_BOOKING_DISABLED',
              'Individual event booking is not available for this track.',
              400,
            );
          }

          if (!trackEvent.singleBookingStart || !trackEvent.singleBookingEnd) {
            throw new ApiError(
              'BOOKING_NOT_OPEN',
              'Single event booking is not enabled for this track.',
              400,
            );
          }

          const now = new Date();
          if (now < trackEvent.singleBookingStart) {
            throw new ApiError('BOOKING_NOT_OPEN', 'Single booking period has not started.', 400);
          }
          if (now > trackEvent.singleBookingEnd) {
            throw new ApiError('BOOKING_PERIOD_CLOSED', 'Single booking period has ended.', 400);
          }
        }

        if (event.maxAttendees && !eventReservation) {
          const [countResult] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(eventAttendees)
            .where(
              and(
                eq(eventAttendees.eventId, payment.itemId),
                inArray(eventAttendees.status, ['active', 'refund_requested']),
              ),
            );

          const [reservationCount] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(eventReservations)
            .where(
              and(
                eq(eventReservations.eventId, payment.itemId),
                gt(eventReservations.expiresAt, paidAt),
              ),
            );

          if (Number(countResult.count) + Number(reservationCount.count) >= event.maxAttendees) {
            throw new ApiError('EVENT_FULL', 'Event is at capacity. Please contact support.', 409);
          }
        }

        await tx
          .insert(eventAttendees)
          .values({
            eventId: payment.itemId,
            userId: payment.userId,
            paidAt,
            pricePaidCents: payment.amountCents,
            paymentId: payment.id,
            sourceTrackBookingId: null,
          })
          .onConflictDoUpdate({
            target: [eventAttendees.eventId, eventAttendees.userId],
            set: {
              status: 'active',
              cancelledAt: null,
              refundRequestedAt: null,
              adminNote: null,
              paidAt,
              pricePaidCents: payment.amountCents,
              paymentId: payment.id,
              sourceTrackBookingId: null,
            },
          });

        await tx.delete(eventReservations).where(eq(eventReservations.paymentId, payment.id));
      }

      if (payment.itemType === 'track' && payment.itemId) {
        const [track] = await tx
          .select({
            id: tracks.id,
            title: tracks.title,
            isPublished: tracks.isPublished,
            trackBookingStart: tracks.trackBookingStart,
            trackBookingEnd: tracks.trackBookingEnd,
            maxTrackBookings: tracks.maxTrackBookings,
          })
          .from(tracks)
          .where(eq(tracks.id, payment.itemId))
          .for('update')
          .limit(1);

        if (!track || !track.isPublished) {
          throw new ApiError('TRACK_NOT_FOUND', 'Track not found.', 404);
        }

        const now = new Date();
        const [trackReservation] = await tx
          .select({
            expiresAt: trackReservations.expiresAt,
          })
          .from(trackReservations)
          .where(eq(trackReservations.paymentId, payment.id))
          .limit(1);

        if (trackReservation && trackReservation.expiresAt <= now) {
          throw new ApiError(
            'RESERVATION_EXPIRED',
            'This reservation has expired. Please request a new code.',
            409,
          );
        }

        const trackEventRows = await tx
          .select({ eventId: trackEvents.eventId })
          .from(trackEvents)
          .where(eq(trackEvents.trackId, payment.itemId));

        if (trackEventRows.length === 0) {
          throw new ApiError('TRACK_EMPTY', 'Track has no events.', 400);
        }

        if (trackReservation) {
          const eventIds = trackEventRows.map((row) => row.eventId);
          const existingEventRows = await tx
            .select({ eventId: eventAttendees.eventId })
            .from(eventAttendees)
            .where(
              and(
                eq(eventAttendees.userId, payment.userId),
                inArray(eventAttendees.eventId, eventIds),
              ),
            );

          const reservedEventRows = await tx
            .select({
              eventId: eventReservations.eventId,
              expiresAt: eventReservations.expiresAt,
            })
            .from(eventReservations)
            .where(eq(eventReservations.paymentId, payment.id));

          const existingEventIds = new Set(existingEventRows.map((row) => row.eventId));
          const reservedEventIds = new Set(
            reservedEventRows.filter((row) => row.expiresAt > now).map((row) => row.eventId),
          );

          const missingReservation = eventIds.some(
            (eventId) => !existingEventIds.has(eventId) && !reservedEventIds.has(eventId),
          );

          if (missingReservation) {
            throw new ApiError(
              'RESERVATION_EXPIRED',
              'This reservation has expired. Please request a new code.',
              409,
            );
          }
        }

        if (track.trackBookingStart === null || track.trackBookingEnd === null) {
          throw new ApiError('BOOKING_NOT_CONFIGURED', 'Track booking not configured.', 400);
        }

        if (now < new Date(track.trackBookingStart)) {
          throw new ApiError('BOOKING_NOT_OPEN', 'Track booking not yet open.', 400);
        }
        if (now > new Date(track.trackBookingEnd)) {
          throw new ApiError('BOOKING_PERIOD_CLOSED', 'Track booking period closed.', 400);
        }

        await executeTrackBookingWrite(tx, {
          trackId: payment.itemId,
          userId: payment.userId,
          bookingSource: payment.amountCents > 0 ? 'paid' : 'free',
          paymentId: payment.id,
          pricePaidCents: payment.amountCents,
          maxTrackBookings: track.maxTrackBookings,
          bookedAt: paidAt,
          referenceTime: paidAt,
          paidAt,
          excludeReservationPaymentId: payment.id,
        });

        await tx.delete(eventReservations).where(eq(eventReservations.paymentId, payment.id));
        await tx.delete(trackReservations).where(eq(trackReservations.paymentId, payment.id));
      }

      if (payment.itemType === 'subscription') {
        // Serialize subscription grants per user across concurrent invoice confirmations.
        const [userLock] = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, payment.userId))
          .for('update')
          .limit(1);
        if (!userLock) {
          throw new ApiError('USER_NOT_FOUND', 'User not found.', 404);
        }

        await tx
          .update(subscriptions)
          .set({ status: 'expired' })
          .where(
            and(
              eq(subscriptions.userId, payment.userId),
              eq(subscriptions.status, 'active'),
              isNull(subscriptions.revokedAt),
              lt(subscriptions.endsAt, paidAt),
            ),
          );

        const [activeSubscription] = await tx
          .select({
            id: subscriptions.id,
            paymentId: subscriptions.paymentId,
            source: subscriptions.source,
            endsAt: subscriptions.endsAt,
          })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.userId, payment.userId),
              eq(subscriptions.status, 'active'),
              isNull(subscriptions.revokedAt),
              gte(subscriptions.endsAt, paidAt),
            ),
          )
          .for('update')
          .limit(1);

        const paidRenewalEndsAt = new Date(paidAt.getTime() + ONE_YEAR_MS);

        // A second paid subscription invoice should not create duplicate active rows.
        if (!activeSubscription) {
          await tx.insert(subscriptions).values({
            userId: payment.userId,
            status: 'active',
            startsAt: paidAt,
            endsAt: paidRenewalEndsAt,
            source: 'paid',
            pricePaidCents: payment.amountCents,
            paymentId: payment.id,
          });
        } else if (activeSubscription.source === 'paid') {
          alreadyProcessed = true;
        } else {
          // Convert legacy/gift entitlement into paid ownership so a paid invoice never ends
          // up without a paid active subscription due to grant/revoke timing races.
          await tx
            .update(subscriptions)
            .set({
              startsAt: paidAt,
              endsAt:
                activeSubscription.endsAt > paidRenewalEndsAt
                  ? activeSubscription.endsAt
                  : paidRenewalEndsAt,
              source: 'paid',
              pricePaidCents: payment.amountCents,
              paymentId: payment.id,
              revokedAt: null,
              revokedBy: null,
              revokeReason: null,
              status: 'active',
            })
            .where(eq(subscriptions.id, activeSubscription.id));
        }
      }

      if (payment.itemType === 'order' && payment.itemId) {
        await fulfillSeriesOrder({
          orderId: payment.itemId,
          paymentId: payment.id,
          userId: payment.userId,
          paidAt,
          tx,
        });
      }

      if (payment.itemType === 'masterclass' && payment.itemId) {
        await grantMasterclassEnrollment({
          userId: payment.userId,
          masterclassId: payment.itemId,
          source: 'paid',
          paymentId: payment.id,
          tx,
        });
      }

      await tx.update(payments).set({ status: 'paid', paidAt }).where(eq(payments.id, paymentId));
      return { status: 'paid', alreadyProcessed };
    });
  } catch (error) {
    if (shouldMarkFailedOnError) {
      await db
        .update(payments)
        .set({ status: 'failed' })
        .where(and(eq(payments.id, paymentId), eq(payments.status, 'pending')));
    }
    await db.delete(eventReservations).where(eq(eventReservations.paymentId, paymentId));
    await db.delete(trackReservations).where(eq(trackReservations.paymentId, paymentId));
    throw error;
  }
}

export async function confirmGatewayInvoicePayment(args: {
  invoiceId: string;
  source: ConfirmationSource;
  userId?: string;
  expectedInvoiceKey?: string;
}): Promise<ConfirmGatewayInvoiceResult> {
  const whereClause = args.userId
    ? and(eq(payments.fawaterkInvoiceId, args.invoiceId), eq(payments.userId, args.userId))
    : eq(payments.fawaterkInvoiceId, args.invoiceId);

  const [payment] = await db.select().from(payments).where(whereClause).limit(1);
  if (!payment) {
    throw new ApiError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
  }

  if (args.expectedInvoiceKey && payment.fawaterkInvoiceKey !== args.expectedInvoiceKey) {
    throw new ApiError('INVALID_INVOICE_KEY', 'Invalid invoice key', 401);
  }

  if (payment.status === 'paid') {
    if (payment.itemType === 'masterclass' && payment.itemId) {
      await grantMasterclassEnrollment({
        userId: payment.userId,
        masterclassId: payment.itemId,
        source: 'paid',
        paymentId: payment.id,
      });
    }

    let paymentMethod: string | undefined;
    try {
      const invoiceData = await getInvoiceData(args.invoiceId);
      paymentMethod = invoiceData.payment_method;
    } catch (error) {
      console.warn('[payments/confirm] Unable to enrich paid payment from gateway invoice', {
        source: args.source,
        invoiceId: args.invoiceId,
        paymentId: payment.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Analytics enrichment is best-effort — payment verification must succeed
    // even if enrichment queries fail (DB hiccup, timeout, etc.)
    let analytics = {};
    try {
      analytics = await loadVerifiedPaymentAnalytics(payment, paymentMethod);
    } catch (error) {
      console.warn('[payments/confirm] Analytics enrichment failed for already-paid payment', {
        paymentId: payment.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      status: 'paid',
      paymentId: payment.id,
      itemType: payment.itemType,
      itemId: payment.itemId,
      amountCents: payment.amountCents,
      ...analytics,
      fawaterkPaid: true,
      alreadyProcessed: true,
      confirmationSource: args.source,
    };
  }

  const invoiceData = await getInvoiceData(args.invoiceId);
  const fawaterkPaid = isInvoicePaid(invoiceData);

  if (!fawaterkPaid) {
    return {
      status: payment.status,
      paymentId: payment.id,
      itemType: payment.itemType,
      itemId: payment.itemId,
      fawaterkPaid: false,
      confirmationSource: args.source,
    };
  }

  const gatewayTotal = Number(invoiceData.total);
  if (!Number.isFinite(gatewayTotal) || gatewayTotal < 0) {
    throw new ApiError('INVALID_GATEWAY_AMOUNT', 'Gateway invoice amount is invalid.', 502);
  }

  const gatewayAmountCents = Math.round(gatewayTotal * 100);
  if (gatewayAmountCents !== payment.amountCents) {
    console.error('[payments/confirm] Gateway amount mismatch', {
      source: args.source,
      invoiceId: args.invoiceId,
      paymentId: payment.id,
      gatewayAmountCents,
      localAmountCents: payment.amountCents,
    });
    throw new ApiError(
      'INVOICE_AMOUNT_MISMATCH',
      'Invoice amount does not match payment record.',
      409,
    );
  }

  const gatewayCurrency = String(invoiceData.currency ?? '')
    .trim()
    .toUpperCase();
  const localCurrency = String(payment.currency ?? '')
    .trim()
    .toUpperCase();
  if (!gatewayCurrency || gatewayCurrency !== localCurrency) {
    console.error('[payments/confirm] Gateway currency mismatch', {
      source: args.source,
      invoiceId: args.invoiceId,
      paymentId: payment.id,
      gatewayCurrency,
      localCurrency,
    });
    throw new ApiError(
      'INVOICE_CURRENCY_MISMATCH',
      'Invoice currency does not match payment record.',
      409,
    );
  }

  const initialStatus: 'pending' | 'paid' | 'failed' | 'expired' = payment.status;
  if (initialStatus !== 'pending' && initialStatus !== 'expired') {
    return {
      status: initialStatus,
      paymentId: payment.id,
      itemType: payment.itemType,
      itemId: payment.itemId,
      fawaterkPaid: true,
      confirmationSource: args.source,
    };
  }

  const processResult = await processSuccessfulPayment(payment.id, {
    allowExpiredRecovery: initialStatus === 'expired',
  });
  const processStatus = processResult.status;
  const alreadyProcessed = Boolean(processResult.alreadyProcessed);
  const recoveredFromExpired = initialStatus === 'expired' && processStatus === 'paid';

  if (recoveredFromExpired) {
    console.info('[payments/confirm] Recovered expired payment after paid gateway invoice', {
      source: args.source,
      invoiceId: args.invoiceId,
      paymentId: payment.id,
    });
  }

  // Analytics enrichment is best-effort — never block payment confirmation
  let analytics = {};
  try {
    analytics = await loadVerifiedPaymentAnalytics(payment, invoiceData.payment_method);
  } catch (error) {
    console.warn('[payments/confirm] Analytics enrichment failed after payment processing', {
      paymentId: payment.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    status: processStatus,
    paymentId: payment.id,
    itemType: payment.itemType,
    itemId: payment.itemId,
    amountCents: payment.amountCents,
    ...analytics,
    fawaterkPaid: true,
    alreadyProcessed,
    recoveredFromExpired,
    confirmationSource: args.source,
  };
}

// --- Routes ---

export function registerPaymentRoutes(app: Hono) {
  // GET /payments/methods - List available payment methods
  app.get('/payments/methods', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    // Rate limiting
    const { allowed, resetAt } = paymentRateLimiter.consume(
      `methods:${session.user.id}`,
      METHODS_RATE_LIMIT,
    );
    if (!allowed) {
      c.header('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, 429);
    }

    try {
      const methods = await getPaymentMethods();
      return c.json({ data: methods });
    } catch (error) {
      console.error('[payments/methods] Error:', error);
      return c.json(
        { error: { code: 'PAYMENT_ERROR', message: 'Failed to fetch payment methods' } },
        500,
      );
    }
  });

  // POST /payments/checkout - Create payment and get redirect URL
  app.post('/payments/checkout', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    // Rate limiting - prevent checkout spam
    const { allowed, resetAt } = paymentRateLimiter.consume(
      `checkout:${session.user.id}`,
      CHECKOUT_RATE_LIMIT,
    );
    if (!allowed) {
      c.header('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, 429);
    }

    const rawBody = await c.req.json();
    const body =
      rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
        ? { ...(rawBody as Record<string, unknown>) }
        : {};
    const idempotencyHeader = c.req.header('idempotency-key');
    if (idempotencyHeader && !('idempotencyKey' in body)) {
      body.idempotencyKey = idempotencyHeader;
    }

    const result = checkoutSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: result.error.message } }, 400);
    }

    const { itemType, itemId, paymentMethodId, forceNewCode, idempotencyKey } = result.data;
    const promoCode = result.data.promoCode?.trim() || undefined;

    // Validate subscription doesn't need itemId
    if (itemType === 'subscription' && itemId) {
      return c.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: 'itemId should not be provided for subscription',
          },
        },
        400,
      );
    }

    // Validate event/track/order/masterclass needs itemId
    if (
      (itemType === 'event' ||
        itemType === 'track' ||
        itemType === 'order' ||
        itemType === 'masterclass') &&
      !itemId
    ) {
      return c.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: 'itemId is required for event/track/order/masterclass',
          },
        },
        400,
      );
    }

    const userId = session.user.id;

    // Build pending payment query (defined outside try for catch block access)
    const pendingWhere =
      itemType === 'subscription'
        ? and(
            eq(payments.userId, userId),
            eq(payments.itemType, 'subscription'),
            eq(payments.status, 'pending'),
          )
        : and(
            eq(payments.userId, userId),
            eq(payments.itemType, itemType),
            itemId ? eq(payments.itemId, itemId) : isNull(payments.itemId),
            eq(payments.status, 'pending'),
          );

    const checkoutIdempotencyCacheKey = idempotencyKey
      ? buildCheckoutIdempotencyCacheKey({
          userId,
          itemType,
          itemId,
          paymentMethodId,
          idempotencyKey,
        })
      : null;

    const cachedCheckoutResponse = checkoutIdempotencyCacheKey
      ? readCheckoutIdempotencyResponse(checkoutIdempotencyCacheKey)
      : null;
    if (cachedCheckoutResponse) {
      console.info('[payments/checkout] Returning cached idempotent response', {
        userId,
        itemType,
        itemId: itemId ?? null,
        paymentMethodId,
      });
      return c.json({ data: cachedCheckoutResponse });
    }

    const existingInFlight = checkoutIdempotencyCacheKey
      ? readCheckoutIdempotencyInFlight(checkoutIdempotencyCacheKey)
      : null;
    if (checkoutIdempotencyCacheKey && existingInFlight) {
      await existingInFlight.waitForCompletion;

      const completedResponse = readCheckoutIdempotencyResponse(checkoutIdempotencyCacheKey);
      if (completedResponse) {
        console.info('[payments/checkout] Returning idempotent response after in-flight wait', {
          userId,
          itemType,
          itemId: itemId ?? null,
          paymentMethodId,
        });
        return c.json({ data: completedResponse });
      }
    }

    const checkoutInFlightReservation = checkoutIdempotencyCacheKey
      ? createCheckoutInFlightReservation()
      : null;
    if (checkoutIdempotencyCacheKey && checkoutInFlightReservation) {
      checkoutIdempotencyInFlight.set(checkoutIdempotencyCacheKey, checkoutInFlightReservation);
    }

    const respondCheckoutSuccess = (payload: CheckoutSuccessPayload) => {
      if (checkoutIdempotencyCacheKey) {
        writeCheckoutIdempotencyResponse(checkoutIdempotencyCacheKey, payload);
      }
      return c.json({ data: payload });
    };

    try {
      // Note: Stale payment expiration moved to background job (see jobs/paymentExpiration.ts)

      const [existingPending] = await db
        .select()
        .from(payments)
        .where(pendingWhere)
        .orderBy(desc(payments.createdAt))
        .limit(1);

      if (existingPending) {
        const hasInvoice = Boolean(existingPending.fawaterkInvoiceId);
        if (!forceNewCode && hasInvoice) {
          return c.json(
            {
              error: {
                code: 'PENDING_PAYMENT',
                message: 'A pending payment already exists.',
                paymentId: existingPending.id,
                invoiceId: existingPending.fawaterkInvoiceId,
                fawryCode: existingPending.fawryCode,
                amanCode: existingPending.amanCode,
                masaryCode: existingPending.masaryCode,
                meezaReference: existingPending.meezaReference,
                meezaQrCode: existingPending.meezaQrCode,
                itemType,
                itemId,
                paymentMethodId,
              },
            },
            409,
          );
        }

        const expiredPayments = await db
          .update(payments)
          .set({ status: 'expired' })
          .where(pendingWhere)
          .returning({ id: payments.id });

        if (expiredPayments.length > 0) {
          const expiredPaymentIds = expiredPayments.map((row) => row.id);
          await db
            .delete(eventReservations)
            .where(inArray(eventReservations.paymentId, expiredPaymentIds));
          await db
            .delete(trackReservations)
            .where(inArray(trackReservations.paymentId, expiredPaymentIds));
        }
      }

      // Calculate base price (promo is validated later inside transaction for paid items)
      const prePriceResult = await calculatePrice(userId, itemType, itemId ?? null);

      // If free, process immediately without payment
      if (prePriceResult.amountCents === 0) {
        // Handle free registration/booking in a transaction
        const result = await db.transaction(async (tx) => {
          // Create payment record for tracking
          const [payment] = await tx
            .insert(payments)
            .values({
              userId,
              status: 'paid',
              amountCents: 0,
              currency: 'EGP',
              itemType,
              itemId: itemId ?? null,
              paidAt: new Date(),
              promoCodeId: prePriceResult.promoCodeId,
              discountAppliedCents: prePriceResult.discountAppliedCents,
              originalAmountCents: prePriceResult.originalAmountCents,
            })
            .returning();

          // Process based on item type
          if (itemType === 'event' && itemId) {
            await tx.insert(eventAttendees).values({
              eventId: itemId,
              userId,
              paidAt: new Date(),
              pricePaidCents: 0,
              paymentId: payment.id,
              sourceTrackBookingId: null,
            });
          }

          if (itemType === 'track' && itemId) {
            // Fetch track for maxTrackBookings (booking window already validated in calculatePrice)
            const [track] = await tx
              .select({ maxTrackBookings: tracks.maxTrackBookings })
              .from(tracks)
              .where(eq(tracks.id, itemId));

            const paidAt = new Date();
            await executeTrackBookingWrite(tx, {
              trackId: itemId,
              userId,
              bookingSource: 'free',
              paymentId: payment.id,
              pricePaidCents: 0,
              maxTrackBookings: track?.maxTrackBookings ?? null,
              bookedAt: paidAt,
              paidAt,
            });
          }

          // Note: Free subscriptions are not expected in normal flow
          return payment;
        });

        return respondCheckoutSuccess({ free: true, paymentId: result.id });
      }

      let amountCents = prePriceResult.amountCents;
      let itemName = prePriceResult.itemName;

      // Get user info for Fawaterk
      const [user] = await db
        .select({
          name: users.name,
          email: users.email,
          profileFirstName: profiles.firstName,
          profileLastName: profiles.lastName,
          phoneNumber: profiles.phoneNumber,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.id, users.id))
        .where(eq(users.id, userId));
      if (!user) {
        return c.json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } }, 404);
      }

      const methods = await getPaymentMethods();
      const selectedMethod = methods.find((method) => method.paymentId === paymentMethodId);
      if (!selectedMethod) {
        throw new ApiError('PAYMENT_METHOD_NOT_FOUND', 'Payment method not available.', 400);
      }

      const methodName = (selectedMethod.name_en ?? '').toLowerCase();
      const normalizedMethodName = methodName.replace(/[^a-z0-9]/g, '');
      const methodRedirect = String(selectedMethod.redirect ?? '').toLowerCase() === 'true';
      const forceRedirect =
        !methodRedirect &&
        (normalizedMethodName.includes('fawry') ||
          normalizedMethodName.includes('meeza') ||
          normalizedMethodName.includes('aman') ||
          normalizedMethodName.includes('masary') ||
          normalizedMethodName.includes('mobilewallet'));
      const requiresPhone = normalizedMethodName.includes('mobilewallet');
      const phoneNumber = user.phoneNumber?.trim();
      if (requiresPhone && !phoneNumber) {
        throw new ApiError(
          'PHONE_REQUIRED',
          'Phone number is required for mobile wallet payments. Please update your profile.',
          400,
        );
      }

      const reservedAt = new Date();
      const expiresAt = new Date(reservedAt.getTime() + RESERVATION_TTL_MS);
      let paymentId: string;

      if (itemType === 'event' && itemId) {
        const eventResult = await db.transaction(async (tx) => {
          const [event] = await tx
            .select({
              id: events.id,
              title: events.title,
              maxAttendees: events.maxAttendees,
            })
            .from(events)
            .where(eq(events.id, itemId))
            .for('update')
            .limit(1);

          if (!event) {
            throw new ApiError('EVENT_NOT_FOUND', 'Event not found.', 404);
          }

          const [existingRegistration] = await tx
            .select({ id: eventAttendees.id, status: eventAttendees.status })
            .from(eventAttendees)
            .where(and(eq(eventAttendees.eventId, itemId), eq(eventAttendees.userId, userId)))
            .limit(1);

          if (existingRegistration && existingRegistration.status !== 'cancelled') {
            throw new ApiError('ALREADY_REGISTERED', 'Already registered for this event.', 400);
          }

          const [trackEvent] = await tx
            .select({
              allowIndividualBooking: tracks.allowIndividualBooking,
              singleBookingStart: tracks.singleBookingStart,
              singleBookingEnd: tracks.singleBookingEnd,
            })
            .from(trackEvents)
            .innerJoin(tracks, eq(tracks.id, trackEvents.trackId))
            .where(eq(trackEvents.eventId, itemId));

          if (trackEvent) {
            if (!trackEvent.allowIndividualBooking) {
              throw new ApiError(
                'INDIVIDUAL_BOOKING_DISABLED',
                'Individual event booking is not available for this track.',
                400,
              );
            }

            if (!trackEvent.singleBookingStart || !trackEvent.singleBookingEnd) {
              throw new ApiError(
                'BOOKING_NOT_OPEN',
                'Single event booking is not enabled for this track.',
                400,
              );
            }

            if (reservedAt < trackEvent.singleBookingStart) {
              throw new ApiError('BOOKING_NOT_OPEN', 'Single booking period has not started.', 400);
            }
            if (reservedAt > trackEvent.singleBookingEnd) {
              throw new ApiError('BOOKING_PERIOD_CLOSED', 'Single booking period has ended.', 400);
            }
          }

          if (event.maxAttendees !== null) {
            const [attendeeCount] = await tx
              .select({ count: sql<number>`count(*)::int` })
              .from(eventAttendees)
              .where(
                and(
                  eq(eventAttendees.eventId, itemId),
                  inArray(eventAttendees.status, ['active', 'refund_requested']),
                ),
              );

            const [reservationCount] = await tx
              .select({ count: sql<number>`count(*)::int` })
              .from(eventReservations)
              .where(
                and(
                  eq(eventReservations.eventId, itemId),
                  gt(eventReservations.expiresAt, reservedAt),
                ),
              );

            if (
              Number(attendeeCount.count) + Number(reservationCount.count) >=
              event.maxAttendees
            ) {
              throw new ApiError('EVENT_FULL', 'Event capacity reached.', 409);
            }
          }

          const priceResult = await calculatePrice(userId, itemType, itemId, promoCode, tx);

          const [payment] = await tx
            .insert(payments)
            .values({
              userId,
              status: 'pending',
              amountCents: priceResult.amountCents,
              currency: 'EGP',
              itemType,
              itemId,
              promoCodeId: priceResult.promoCodeId,
              discountAppliedCents: priceResult.discountAppliedCents,
              originalAmountCents: priceResult.originalAmountCents,
            })
            .returning({ id: payments.id });

          await tx.insert(eventReservations).values({
            eventId: itemId,
            userId,
            paymentId: payment.id,
            reservedAt,
            expiresAt,
          });

          return {
            paymentId: payment.id,
            amountCents: priceResult.amountCents,
            itemName: priceResult.itemName,
          };
        });
        paymentId = eventResult.paymentId;
        amountCents = eventResult.amountCents;
        itemName = eventResult.itemName;
      } else if (itemType === 'track' && itemId) {
        const trackResult = await db.transaction(async (tx) => {
          const [track] = await tx
            .select({
              id: tracks.id,
              title: tracks.title,
              isPublished: tracks.isPublished,
              trackBookingStart: tracks.trackBookingStart,
              trackBookingEnd: tracks.trackBookingEnd,
              maxTrackBookings: tracks.maxTrackBookings,
            })
            .from(tracks)
            .where(eq(tracks.id, itemId))
            .for('update')
            .limit(1);

          if (!track || !track.isPublished) {
            throw new ApiError('TRACK_NOT_FOUND', 'Track not found.', 404);
          }

          if (track.trackBookingStart === null || track.trackBookingEnd === null) {
            throw new ApiError('BOOKING_NOT_CONFIGURED', 'Track booking not configured.', 400);
          }

          if (reservedAt < new Date(track.trackBookingStart)) {
            throw new ApiError('BOOKING_NOT_OPEN', 'Track booking not yet open.', 400);
          }
          if (reservedAt > new Date(track.trackBookingEnd)) {
            throw new ApiError('BOOKING_PERIOD_CLOSED', 'Track booking period closed.', 400);
          }

          const [existingBooking] = await tx
            .select({ id: trackBookings.id })
            .from(trackBookings)
            .where(
              activeTrackBookingWhere(
                eq(trackBookings.trackId, itemId),
                eq(trackBookings.userId, userId),
              ),
            )
            .limit(1);

          if (existingBooking) {
            throw new ApiError('ALREADY_BOOKED', 'Already booked this track', 400);
          }

          const trackEventRows = await tx
            .select({ eventId: events.id, maxAttendees: events.maxAttendees })
            .from(trackEvents)
            .innerJoin(events, eq(events.id, trackEvents.eventId))
            .where(eq(trackEvents.trackId, itemId))
            .for('update');

          if (trackEventRows.length === 0) {
            throw new ApiError('TRACK_EMPTY', 'Track has no events.', 400);
          }

          if (trackEventRows.some((row) => row.maxAttendees === null)) {
            throw new ApiError('CAPACITY_NOT_SET', 'Some events have no capacity set.', 400);
          }

          const eventIds = trackEventRows.map((row) => row.eventId);

          const existingEventRows = await tx
            .select({ eventId: eventAttendees.eventId })
            .from(eventAttendees)
            .where(
              and(
                eq(eventAttendees.userId, userId),
                inArray(eventAttendees.eventId, eventIds),
                inArray(eventAttendees.status, ['active', 'refund_requested']),
              ),
            );
          const existingEventIds = new Set(existingEventRows.map((row) => row.eventId));

          const attendeeCounts = await tx
            .select({
              eventId: eventAttendees.eventId,
              count: sql<number>`count(*)::int`,
            })
            .from(eventAttendees)
            .where(
              and(
                inArray(eventAttendees.eventId, eventIds),
                inArray(eventAttendees.status, ['active', 'refund_requested']),
              ),
            )
            .groupBy(eventAttendees.eventId);
          const reservationCounts = await tx
            .select({
              eventId: eventReservations.eventId,
              count: sql<number>`count(*)::int`,
            })
            .from(eventReservations)
            .where(
              and(
                inArray(eventReservations.eventId, eventIds),
                gt(eventReservations.expiresAt, reservedAt),
              ),
            )
            .groupBy(eventReservations.eventId);

          const attendeeCountMap = new Map(
            attendeeCounts.map((row) => [row.eventId, Number(row.count)]),
          );
          const reservationCountMap = new Map(
            reservationCounts.map((row) => [row.eventId, Number(row.count)]),
          );

          for (const row of trackEventRows) {
            if (existingEventIds.has(row.eventId)) {
              continue;
            }
            const attendeeCount = attendeeCountMap.get(row.eventId) ?? 0;
            const reservationCount = reservationCountMap.get(row.eventId) ?? 0;
            if (attendeeCount + reservationCount >= (row.maxAttendees ?? 0)) {
              throw new ApiError(
                'EVENT_FULL',
                'One or more events in this track are at capacity.',
                409,
              );
            }
          }

          const [bookingCount] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(trackBookings)
            .where(activeTrackBookingWhere(eq(trackBookings.trackId, itemId)));
          const [trackReservationCount] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(trackReservations)
            .where(
              and(
                eq(trackReservations.trackId, itemId),
                gt(trackReservations.expiresAt, reservedAt),
              ),
            );

          if (
            track.maxTrackBookings !== null &&
            Number(bookingCount.count) + Number(trackReservationCount.count) >=
              track.maxTrackBookings
          ) {
            throw new ApiError('TRACK_FULL', 'Track booking limit reached.', 409);
          }

          const priceResult = await calculatePrice(userId, itemType, itemId, promoCode, tx);

          const [payment] = await tx
            .insert(payments)
            .values({
              userId,
              status: 'pending',
              amountCents: priceResult.amountCents,
              currency: 'EGP',
              itemType,
              itemId,
              promoCodeId: priceResult.promoCodeId,
              discountAppliedCents: priceResult.discountAppliedCents,
              originalAmountCents: priceResult.originalAmountCents,
            })
            .returning({ id: payments.id });

          await tx.insert(trackReservations).values({
            trackId: itemId,
            userId,
            paymentId: payment.id,
            reservedAt,
            expiresAt,
          });

          const reservationValues = trackEventRows
            .filter((row) => !existingEventIds.has(row.eventId))
            .map((row) => ({
              eventId: row.eventId,
              userId,
              paymentId: payment.id,
              reservedAt,
              expiresAt,
            }));

          if (reservationValues.length > 0) {
            await tx.insert(eventReservations).values(reservationValues);
          }

          return {
            paymentId: payment.id,
            amountCents: priceResult.amountCents,
            itemName: priceResult.itemName,
          };
        });
        paymentId = trackResult.paymentId;
        amountCents = trackResult.amountCents;
        itemName = trackResult.itemName;
      } else {
        const [payment] = await db
          .insert(payments)
          .values({
            userId,
            status: 'pending',
            amountCents,
            currency: 'EGP',
            itemType,
            itemId: itemId ?? null,
            promoCodeId: prePriceResult.promoCodeId,
            discountAppliedCents: prePriceResult.discountAppliedCents,
            originalAmountCents: prePriceResult.originalAmountCents,
          })
          .returning({ id: payments.id });
        paymentId = payment.id;
      }

      // Create Fawaterk invoice
      const nameParts = (user.name ?? 'User').split(' ');
      const firstName = user.profileFirstName ?? nameParts[0] ?? 'User';
      const lastName = user.profileLastName ?? (nameParts.slice(1).join(' ') || 'Customer');
      const pendingParams = new URLSearchParams();
      pendingParams.set('item_type', itemType);
      if (itemId) {
        pendingParams.set('item_id', itemId);
      }
      pendingParams.set('method_id', String(paymentMethodId));
      pendingParams.set('payment_id', paymentId);
      const pendingUrl = `${env.APP_BASE_URL}/payment/pending?${pendingParams.toString()}`;
      const webhookBaseUrl = (env.API_BASE_URL ?? env.BETTER_AUTH_ISSUER ?? '').replace(/\/+$/, '');
      const webhookUrl = webhookBaseUrl ? `${webhookBaseUrl}/api/payments/webhook_json` : undefined;

      let invoiceResult: Awaited<ReturnType<typeof invoiceInitPay>>;
      try {
        console.info('[payments/checkout] Initiating payment', {
          paymentId,
          paymentMethodId,
          methodName: selectedMethod.name_en ?? null,
          methodRedirect,
          forceRedirect,
          itemType,
        });
        invoiceResult = await invoiceInitPay({
          paymentMethodId,
          invoiceNumber: paymentId,
          cartTotal: amountCents / 100, // Convert cents to EGP
          currency: 'EGP',
          customer: {
            first_name: firstName,
            last_name: lastName,
            email: user.email,
            phone: phoneNumber || undefined,
          },
          cartItems: [
            {
              name: itemName,
              price: (amountCents / 100).toFixed(2),
              quantity: '1',
            },
          ],
          redirectionUrls: {
            successUrl: `${env.APP_BASE_URL}/payment/success?payment_id=${paymentId}`,
            failUrl: `${env.APP_BASE_URL}/payment/failed?payment_id=${paymentId}`,
            pendingUrl,
            webhookUrl,
          },
          redirectOption: forceRedirect ? true : undefined,
          payload: { paymentId },
        });
      } catch (error) {
        await db.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));
        await db.delete(eventReservations).where(eq(eventReservations.paymentId, paymentId));
        await db.delete(trackReservations).where(eq(trackReservations.paymentId, paymentId));
        throw error;
      }

      // Update payment with Fawaterk invoice info
      await db
        .update(payments)
        .set({
          fawaterkInvoiceId: invoiceResult.invoiceId,
          fawaterkInvoiceKey: invoiceResult.invoiceKey,
          fawryCode: invoiceResult.paymentData.fawryCode ?? null,
          amanCode: invoiceResult.paymentData.amanCode ?? null,
          masaryCode: invoiceResult.paymentData.masaryCode ?? null,
          meezaReference: invoiceResult.paymentData.meezaReference ?? null,
          meezaQrCode: invoiceResult.paymentData.meezaQrCode ?? null,
        })
        .where(eq(payments.id, paymentId));

      return respondCheckoutSuccess({
        paymentId,
        invoiceId: invoiceResult.invoiceId,
        redirectUrl: invoiceResult.paymentData.redirectTo,
        fawryCode: invoiceResult.paymentData.fawryCode,
        meezaReference: invoiceResult.paymentData.meezaReference,
        meezaQrCode: invoiceResult.paymentData.meezaQrCode,
        amanCode: invoiceResult.paymentData.amanCode,
        masaryCode: invoiceResult.paymentData.masaryCode,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      if (isPostgresUniqueViolation(error)) {
        const [pendingPayment] = await db
          .select()
          .from(payments)
          .where(pendingWhere)
          .orderBy(desc(payments.createdAt))
          .limit(1);

        if (pendingPayment) {
          return c.json(
            {
              error: {
                code: 'PENDING_PAYMENT',
                message: 'A pending payment already exists.',
                paymentId: pendingPayment.id,
                invoiceId: pendingPayment.fawaterkInvoiceId,
                fawryCode: pendingPayment.fawryCode,
                amanCode: pendingPayment.amanCode,
                masaryCode: pendingPayment.masaryCode,
                meezaReference: pendingPayment.meezaReference,
                meezaQrCode: pendingPayment.meezaQrCode,
                itemType,
                itemId,
                paymentMethodId,
              },
            },
            409,
          );
        }
      }
      console.error('[payments/checkout] Error:', error);
      return c.json({ error: { code: 'PAYMENT_ERROR', message: 'Failed to create payment' } }, 500);
    } finally {
      if (checkoutIdempotencyCacheKey && checkoutInFlightReservation) {
        const activeReservation = checkoutIdempotencyInFlight.get(checkoutIdempotencyCacheKey);
        if (activeReservation === checkoutInFlightReservation) {
          checkoutIdempotencyInFlight.delete(checkoutIdempotencyCacheKey);
        }
        checkoutInFlightReservation.release();
      }
    }
  });

  // POST /payments/verify - Verify payment via Fawaterk API (polling)
  app.post('/payments/verify', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    // Rate limiting - prevent verification spam
    const { allowed, resetAt } = paymentRateLimiter.consume(
      `verify:${session.user.id}`,
      VERIFY_RATE_LIMIT,
    );
    if (!allowed) {
      c.header('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, 429);
    }

    const body = await c.req.json();
    const result = verifySchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: result.error.message } }, 400);
    }

    const { invoiceId } = result.data;

    try {
      const processResult = await confirmGatewayInvoicePayment({
        invoiceId,
        source: 'verify',
        userId: session.user.id,
      });
      return c.json({ data: processResult });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'PAYMENT_NOT_FOUND') {
          return c.json({ error: { code: 'NOT_FOUND', message: 'Payment not found' } }, 404);
        }
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      console.error('[payments/verify] Processing failed:', error);
      return c.json(
        { error: { code: 'PROCESSING_FAILED', message: 'Payment processing failed' } },
        500,
      );
    }
  });

  // GET /payments/price-preview - Preview price for an item
  // NOTE: Must be registered BEFORE /payments/:id to avoid route conflict
  app.get('/payments/price-preview', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    // Validate query parameters with Zod
    const pricePreviewSchema = z.object({
      itemType: z.enum(['event', 'track', 'subscription', 'order', 'masterclass']),
      itemId: z.string().uuid().optional(),
      promoCode: z.string().optional(),
    });

    const parseResult = pricePreviewSchema.safeParse({
      itemType: c.req.query('itemType'),
      itemId: c.req.query('itemId') || undefined,
      promoCode: c.req.query('promoCode') || undefined,
    });

    if (!parseResult.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid parameters' } }, 400);
    }

    const { itemType, itemId } = parseResult.data;
    const promoCode = parseResult.data.promoCode?.trim() || undefined;

    try {
      let promoError: string | null = null;
      let priceResult: PriceResult;

      try {
        priceResult = await calculatePrice(session.user.id, itemType, itemId ?? null, promoCode);
      } catch (error) {
        if (error instanceof ApiError && error.code === 'PROMO_INVALID') {
          promoError = error.message;
          priceResult = await calculatePrice(session.user.id, itemType, itemId ?? null);
        } else {
          throw error;
        }
      }

      return c.json({
        data: {
          itemName: priceResult.itemName,
          amountCents: priceResult.amountCents,
          amountFormatted: `${(priceResult.amountCents / 100).toFixed(2)} EGP`,
          originalAmountCents: priceResult.originalAmountCents,
          discountAppliedCents: priceResult.discountAppliedCents,
          discountSource: priceResult.discountSource,
          isSubscriber: priceResult.isSubscriber,
          isFree: priceResult.isFree,
          promoError,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      console.error('[payments/price-preview] Error:', error);
      return c.json({ error: { code: 'PRICE_ERROR', message: 'Failed to calculate price' } }, 500);
    }
  });

  // GET /payments/:id - Get payment status
  app.get('/payments/:id', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const paymentId = c.req.param('id');

    // Validate UUID format
    const uuidResult = z.string().uuid().safeParse(paymentId);
    if (!uuidResult.success) {
      return c.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid payment ID format' } },
        400,
      );
    }

    const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, paymentId), eq(payments.userId, session.user.id)));

    if (!payment) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Payment not found' } }, 404);
    }

    return c.json({
      data: {
        id: payment.id,
        status: payment.status,
        amountCents: payment.amountCents,
        currency: payment.currency,
        itemType: payment.itemType,
        itemId: payment.itemId,
        fawaterkInvoiceId: payment.fawaterkInvoiceId,
        fawryCode: payment.fawryCode,
        amanCode: payment.amanCode,
        masaryCode: payment.masaryCode,
        meezaReference: payment.meezaReference,
        meezaQrCode: payment.meezaQrCode,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
      },
    });
  });

  // POST /payments/webhook(_json) - Fawaterk webhook for server-to-server payment confirmation
  // This endpoint is NOT authenticated via session - uses HMAC signature verification
  const handleWebhook = async (c: Context) => {
    // IP-based rate limiting to prevent DoS attacks
    const clientIp =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'unknown';
    const { allowed, resetAt } = paymentRateLimiter.consume(
      `webhook:${clientIp}`,
      WEBHOOK_RATE_LIMIT,
    );
    if (!allowed) {
      c.header('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, 429);
    }

    const body = await c.req.json();
    const result = webhookSchema.safeParse(body);
    if (!result.success) {
      console.error('[payments/webhook] Invalid payload:', result.error.message);
      return c.json({ error: { code: 'INVALID_PAYLOAD' } }, 400);
    }

    const webhookData = result.data;

    // SECURITY: Verify HMAC signature using timing-safe comparison
    if (!verifyFawaterkWebhook(webhookData)) {
      console.error('[payments/webhook] Invalid signature');
      return c.json({ error: { code: 'INVALID_SIGNATURE' } }, 401);
    }

    try {
      const processResult = await confirmGatewayInvoicePayment({
        invoiceId: webhookData.invoice_id,
        expectedInvoiceKey: webhookData.invoice_key,
        source: 'webhook',
      });

      console.info('[payments/webhook] Confirmation processed', {
        invoiceId: webhookData.invoice_id,
        paymentId: processResult.paymentId,
        status: processResult.status,
        fawaterkPaid: processResult.fawaterkPaid,
        recoveredFromExpired: processResult.recoveredFromExpired ?? false,
      });

      return c.json({ data: processResult });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'PAYMENT_NOT_FOUND') {
          console.error(
            '[payments/webhook] Payment not found for invoice:',
            webhookData.invoice_id,
          );
          return c.json({ error: { code: 'PAYMENT_NOT_FOUND' } }, 404);
        }
        if (error.code === 'INVALID_INVOICE_KEY') {
          console.error('[payments/webhook] Invoice key mismatch');
          return c.json({ error: { code: 'INVALID_INVOICE_KEY' } }, 401);
        }
        console.error('[payments/webhook] Processing error:', error.code, error.message);
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      console.error('[payments/webhook] Processing failed:', error);
      return c.json({ error: { code: 'PROCESSING_FAILED' } }, 500);
    }
  };

  app.post('/payments/webhook', handleWebhook);
  app.post('/payments/webhook_json', handleWebhook);
}
