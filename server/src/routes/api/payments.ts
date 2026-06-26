import { and, desc, eq, gt, gte, inArray, isNull, lt, ne, sql } from 'drizzle-orm';
import type { Context, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { db } from '../../db/client.js';
import {
  eventAttendees,
  eventReservations,
  events,
  paymentFulfillmentFailures,
  payments,
  platformSettings,
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
import { paymentRateLimiter } from '../../services/rateLimiter.js';
import { activeTrackBookingWhere } from '../../utils/booking.js';
import { ApiError } from '../../utils/errors.js';
import { isInvoicePaid } from '../../utils/invoiceStatus.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { isEventHiddenFromNonStaff } from './eventVisibility.js';
import { loadVerifiedPaymentAnalytics } from './paymentAnalytics.js';
import { ONE_YEAR_MS } from './subscriptionShared.js';
import {
  filterLiveIncludedEvents,
  resolveTrackBasePrice,
  TICKET_TYPES,
  type TicketType,
} from './ticketAccess.js';
import { executeTrackBookingWrite } from './trackBookingShared.js';
import { isEgyptianMobileE164, toFawaterkLocalPhone } from './users-phone.js';
import { getOptionalUserRole, isKnownDatabaseConflict } from './utils.js';

// --- Rate Limit Rules ---
const CHECKOUT_RATE_LIMIT = { limit: 5, windowMs: 60_000 }; // 5 checkouts per minute
const VERIFY_RATE_LIMIT = { limit: 30, windowMs: 60_000 }; // 30 verifications per minute
const METHODS_RATE_LIMIT = { limit: 60, windowMs: 60_000 }; // 60 method fetches per minute
const WEBHOOK_RATE_LIMIT = { limit: 100, windowMs: 60_000 }; // 100 webhooks per minute per IP
const RESERVATION_TTL_MS = 72 * 60 * 60 * 1000;
const CHECKOUT_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const CHECKOUT_IDEMPOTENCY_WAIT_TIMEOUT_MS = 30_000;

// --- Schemas ---

const checkoutSchema = z.object({
  itemType: z.enum(['event', 'track', 'subscription']),
  itemId: z.string().uuid().optional(),
  paymentMethodId: z.number().int().positive(),
  forceNewCode: z.boolean().optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
  promoCode: z.string().optional(),
  ticketType: z.enum(TICKET_TYPES).optional(),
});

const verifySchema = z.object({
  invoiceId: z.number().int().positive(),
});

const webhookSchema = z.object({
  invoice_id: z.number().int().positive(),
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
  invoiceId?: number;
  redirectUrl?: string;
  fawryCode?: string;
  meezaReference?: string;
  meezaQrCode?: string;
  amanCode?: string;
  masaryCode?: string;
};

type DbClient = typeof db | DbTransaction;

type ConfirmationSource = 'verify' | 'webhook' | 'reconcile';

type ConfirmGatewayInvoiceResult = {
  status: 'pending' | 'paid' | 'failed' | 'expired';
  paymentId: string;
  itemType: 'event' | 'track' | 'subscription';
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
  itemType: 'event' | 'track' | 'subscription';
  itemId?: string;
  paymentMethodId: number;
  idempotencyKey: string;
  ticketType?: TicketType | null;
}): string {
  const { userId, itemType, itemId, paymentMethodId, idempotencyKey, ticketType } = params;
  const normalizedItemId = itemId ?? 'none';
  // ticketType is part of the key so re-submitting the same idempotency key with a different ticket
  // type issues a fresh checkout instead of returning the cached (wrong-variant) response.
  return [
    userId,
    itemType,
    normalizedItemId,
    String(paymentMethodId),
    ticketType ?? 'none',
    idempotencyKey,
  ].join(':');
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

async function waitForCheckoutInFlight(
  reservation: CheckoutInFlightReservation,
): Promise<'completed' | 'timeout'> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      reservation.waitForCompletion.then(() => 'completed' as const),
      new Promise<'timeout'>((resolve) => {
        timeout = setTimeout(() => resolve('timeout'), CHECKOUT_IDEMPOTENCY_WAIT_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function readExistingFreeCheckoutPayment(params: {
  userId: string;
  itemType: 'event' | 'track' | 'subscription';
  itemId: string | null;
  ticketType?: TicketType | null;
}): Promise<CheckoutSuccessPayload | null> {
  const [payment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.userId, params.userId),
        eq(payments.itemType, params.itemType),
        params.itemId ? eq(payments.itemId, params.itemId) : isNull(payments.itemId),
        params.ticketType
          ? eq(payments.ticketType, params.ticketType)
          : isNull(payments.ticketType),
        eq(payments.status, 'paid'),
        eq(payments.amountCents, 0),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);

  return payment ? { free: true, paymentId: payment.id } : null;
}

function replacementReservationExclusion(
  paymentIdColumn: typeof eventReservations.paymentId | typeof trackReservations.paymentId,
  replacedPendingPaymentIds: string[],
) {
  const [paymentId] = replacedPendingPaymentIds;
  return paymentId ? ne(paymentIdColumn, paymentId) : undefined;
}

async function expirePendingPaymentsForReplacement(
  dbClient: DbClient,
  replacedPendingPaymentIds: string[],
): Promise<void> {
  if (replacedPendingPaymentIds.length === 0) {
    return;
  }

  await dbClient
    .update(payments)
    .set({ status: 'expired' })
    .where(inArray(payments.id, replacedPendingPaymentIds));
}

async function restoreReplacedPendingPayment(replacedPendingPaymentIds: string[]): Promise<void> {
  if (replacedPendingPaymentIds.length === 0) {
    return;
  }

  await db
    .update(payments)
    .set({ status: 'pending' })
    .where(and(inArray(payments.id, replacedPendingPaymentIds), eq(payments.status, 'expired')));
}

async function deleteReplacedPendingReservations(
  dbClient: DbClient,
  replacedPendingPaymentIds: string[],
): Promise<void> {
  if (replacedPendingPaymentIds.length === 0) {
    return;
  }

  await dbClient
    .delete(eventReservations)
    .where(inArray(eventReservations.paymentId, replacedPendingPaymentIds));
  await dbClient
    .delete(trackReservations)
    .where(inArray(trackReservations.paymentId, replacedPendingPaymentIds));
}

function isPostgresUniqueViolation(error: unknown): boolean {
  return isKnownDatabaseConflict(error) === 'unique';
}

function formatPaymentFailureError(error: unknown): { code?: string; message: string } {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: String(error) };
}

async function recordPaymentFulfillmentFailure(
  paymentId: string,
  error: unknown,
  source: ConfirmationSource,
) {
  const failure = formatPaymentFailureError(error);
  const [payment] = await db
    .select({
      id: payments.id,
      userId: payments.userId,
      status: payments.status,
      itemType: payments.itemType,
      itemId: payments.itemId,
      ticketType: payments.ticketType,
      amountCents: payments.amountCents,
      invoiceId: payments.fawaterkInvoiceId,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment) {
    return { payment: null, failure };
  }

  const now = new Date();
  const [existingFailure] = await db
    .select({ id: paymentFulfillmentFailures.id })
    .from(paymentFulfillmentFailures)
    .where(
      and(
        eq(paymentFulfillmentFailures.paymentId, payment.id),
        isNull(paymentFulfillmentFailures.resolvedAt),
      ),
    )
    .limit(1);

  const failureValues = {
    userId: payment.userId,
    paymentStatus: payment.status,
    itemType: payment.itemType,
    itemId: payment.itemId,
    ticketType: payment.ticketType,
    invoiceId: payment.invoiceId,
    amountCents: payment.amountCents,
    confirmationSource: source,
    errorCode: failure.code ?? null,
    errorMessage: failure.message,
    updatedAt: now,
  };

  if (existingFailure) {
    await db
      .update(paymentFulfillmentFailures)
      .set({
        ...failureValues,
        failureCount: sql`${paymentFulfillmentFailures.failureCount} + 1`,
      })
      .where(eq(paymentFulfillmentFailures.id, existingFailure.id));
  } else {
    await db.insert(paymentFulfillmentFailures).values({
      paymentId: payment.id,
      ...failureValues,
    });
  }

  return { payment, failure };
}

async function reportPaidFulfillmentFailure(
  paymentId: string,
  error: unknown,
  source: ConfirmationSource,
): Promise<void> {
  const failure = formatPaymentFailureError(error);
  try {
    const report = await recordPaymentFulfillmentFailure(paymentId, error, source);

    console.error('[payments/fulfillment_failed_after_gateway_paid]', {
      payment: report.payment ?? { id: paymentId },
      failure: report.failure,
      opsAction:
        'Gateway confirmed payment but local fulfillment failed. Review payment_fulfillment_failures and contact the buyer for manual booking or refund.',
    });
  } catch (reportError) {
    console.error('[payments/fulfillment_failed_after_gateway_paid] report failed', {
      paymentId,
      failure,
      reportError: reportError instanceof Error ? reportError.message : String(reportError),
    });
  }
}

async function calculatePrice(
  userId: string,
  itemType: 'event' | 'track' | 'subscription',
  itemId: string | null,
  promoCode?: string,
  tx?: DbTransaction,
  ticketType?: TicketType | null,
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
    // Parallel fetch: event details + track event info + existing registration + viewer role
    const [eventResult, trackEventResult, existingRegResult, role] = await Promise.all([
      dbClient.select().from(events).where(eq(events.id, itemId)),
      dbClient
        .select({
          isPublished: tracks.isPublished,
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
      getOptionalUserRole(userId, dbClient),
    ]);

    const [event] = eventResult;
    const [trackEvent] = trackEventResult;
    const [existingReg] = existingRegResult;
    const isStaff = Boolean(role && ['owner', 'admin', 'manager'].includes(role));

    if (!event) throw new ApiError('NOT_FOUND', 'Event not found', 404);

    // Drafts (and events in unpublished tracks) aren't payable: throw the same not-found as a
    // missing event so price-preview/checkout can't reveal or transact a known draft id. (D-1)
    if (
      isEventHiddenFromNonStaff({
        isPublished: event.isPublished,
        linkedTrackIsPublished: trackEvent ? trackEvent.isPublished : null,
        isStaff,
      })
    ) {
      throw new ApiError('NOT_FOUND', 'Event not found', 404);
    }

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

    // Online event = FREE for subscribers (explicit delivery mode, no longer inferred from location)
    const isOnline = event.eventFormat === 'online';
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

    // When the track offers ticket types, price comes from the selected variant (required + enabled).
    // Otherwise fall back to the legacy single price — unchanged for tracks not using ticket types.
    const baseResult = resolveTrackBasePrice(track, ticketType);
    if (!baseResult.ok) {
      if (baseResult.reason === 'ticket_type_required') {
        throw new ApiError('TICKET_TYPE_REQUIRED', 'Select a ticket type for this track.', 400);
      }
      throw new ApiError('TICKET_TYPE_DISABLED', 'That ticket type is not available.', 400);
    }
    const basePrice = baseResult.basePrice;
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

  throw new ApiError('INVALID_ITEM', 'Invalid item type', 400);
}

type ProcessSuccessfulPaymentOptions = {
  allowExpiredRecovery?: boolean;
  confirmationSource?: ConfirmationSource;
};

type ProcessSuccessfulPaymentResult = {
  status: 'pending' | 'paid' | 'failed' | 'expired';
  alreadyProcessed?: boolean;
};

async function processSuccessfulPayment(
  paymentId: string,
  options: ProcessSuccessfulPaymentOptions = {},
): Promise<ProcessSuccessfulPaymentResult> {
  const { allowExpiredRecovery = false, confirmationSource = 'verify' } = options;

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
          .select({ eventId: trackEvents.eventId, eventFormat: events.eventFormat })
          .from(trackEvents)
          .innerJoin(events, eq(events.id, trackEvents.eventId))
          .where(eq(trackEvents.trackId, payment.itemId));

        if (trackEventRows.length === 0) {
          throw new ApiError('TRACK_EMPTY', 'Track has no events.', 400);
        }

        if (trackReservation) {
          // Checkout only reserves the ticket's live-included sessions, so the fulfillment
          // pre-check must require reservations for that same subset — not every track event —
          // or an online_only/offline_only buyer would be falsely rejected as RESERVATION_EXPIRED.
          const eventIds = filterLiveIncludedEvents(trackEventRows, payment.ticketType).map(
            (row) => row.eventId,
          );
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
          ticketType: payment.ticketType,
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

      await tx.update(payments).set({ status: 'paid', paidAt }).where(eq(payments.id, paymentId));
      return { status: 'paid', alreadyProcessed };
    });
  } catch (error) {
    // Gateway has already confirmed money movement before this function runs. Keep the local
    // payment retryable and preserve reservations; operators can resolve the dead-letter row.
    await reportPaidFulfillmentFailure(paymentId, error, confirmationSource);
    throw error;
  }
}

export async function confirmGatewayInvoicePayment(args: {
  invoiceId: number;
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
    confirmationSource: args.source,
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

    const { itemType, itemId, paymentMethodId, forceNewCode, idempotencyKey, ticketType } =
      result.data;
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

    // Validate event/track needs itemId
    if ((itemType === 'event' || itemType === 'track') && !itemId) {
      return c.json(
        { error: { code: 'INVALID_INPUT', message: 'itemId is required for event/track' } },
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
          ticketType,
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
      const waitResult = await waitForCheckoutInFlight(existingInFlight);
      if (waitResult === 'timeout') {
        console.warn('[payments/checkout] Idempotent checkout still in progress after wait', {
          userId,
          itemType,
          itemId: itemId ?? null,
          paymentMethodId,
        });
        return c.json(
          {
            error: {
              code: 'CHECKOUT_IN_PROGRESS',
              message: 'Checkout request is still processing. Please retry shortly.',
            },
          },
          409,
        );
      }

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

    let checkoutPriceResult: PriceResult | null = null;

    try {
      // Note: Stale payment expiration moved to background job (see jobs/paymentExpiration.ts)

      const [existingPending] = await db
        .select()
        .from(payments)
        .where(pendingWhere)
        .orderBy(desc(payments.createdAt))
        .limit(1);

      const calculatedPriceResult = await calculatePrice(
        userId,
        itemType,
        itemId ?? null,
        undefined,
        undefined,
        ticketType,
      );
      checkoutPriceResult = calculatedPriceResult;
      let replacedPendingPaymentIds: string[] = [];

      if (existingPending) {
        const hasInvoice = Boolean(existingPending.fawaterkInvoiceId);
        if (!forceNewCode) {
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
                ticketType: existingPending.ticketType,
              },
            },
            409,
          );
        }

        if (!hasInvoice) {
          console.info('[payments/checkout] Replacing pending payment without gateway invoice', {
            paymentId: existingPending.id,
            itemType,
            itemId: itemId ?? null,
          });
        }
        replacedPendingPaymentIds = [existingPending.id];
      }

      let amountCents = calculatedPriceResult.amountCents;
      let itemName = calculatedPriceResult.itemName;

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
      if (requiresPhone) {
        if (!phoneNumber) {
          throw new ApiError(
            'PHONE_REQUIRED',
            'Phone number is required for mobile wallet payments. Please update your profile.',
            400,
          );
        }
        // Fawaterk mobile wallet only works for Egyptian (+20) numbers. Reject others up front
        // instead of sending the user into a gateway flow that can't fulfill the charge.
        if (!isEgyptianMobileE164(phoneNumber)) {
          throw new ApiError(
            'PHONE_NOT_EGYPTIAN',
            'Mobile wallet payments require an Egyptian (+20) mobile number. Please update your profile or choose another payment method.',
            400,
          );
        }
      }

      // If free, process immediately without payment
      if (calculatedPriceResult.amountCents === 0) {
        // Handle free registration/booking in a transaction
        const result = await db.transaction(async (tx) => {
          await expirePendingPaymentsForReplacement(tx, replacedPendingPaymentIds);
          await deleteReplacedPendingReservations(tx, replacedPendingPaymentIds);

          // Create payment record for tracking
          const paidAt = new Date();
          const [payment] = await tx
            .insert(payments)
            .values({
              userId,
              status: 'paid',
              amountCents: 0,
              currency: 'EGP',
              itemType,
              itemId: itemId ?? null,
              ticketType: ticketType ?? null,
              paidAt,
              promoCodeId: calculatedPriceResult.promoCodeId,
              discountAppliedCents: calculatedPriceResult.discountAppliedCents,
              originalAmountCents: calculatedPriceResult.originalAmountCents,
            })
            .returning();

          // Process based on item type
          if (itemType === 'event' && itemId) {
            await tx.insert(eventAttendees).values({
              eventId: itemId,
              userId,
              paidAt,
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

            await executeTrackBookingWrite(tx, {
              trackId: itemId,
              userId,
              bookingSource: 'free',
              paymentId: payment.id,
              pricePaidCents: 0,
              ticketType: ticketType ?? null,
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

          await expirePendingPaymentsForReplacement(tx, replacedPendingPaymentIds);
          // Free the (event_id,user_id) reservation slot now, before inserting the new hold below —
          // the unique index would otherwise collide on a "change ticket / new code" replacement.
          await deleteReplacedPendingReservations(tx, replacedPendingPaymentIds);

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
                  replacementReservationExclusion(
                    eventReservations.paymentId,
                    replacedPendingPaymentIds,
                  ),
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

          await expirePendingPaymentsForReplacement(tx, replacedPendingPaymentIds);
          // Free the (track_id,user_id) + per-event reservation slots now, before inserting the new
          // holds below — the unique indexes would otherwise collide on a "change ticket / new code"
          // replacement, destroying the buyer's hold and 500ing the request.
          await deleteReplacedPendingReservations(tx, replacedPendingPaymentIds);

          const trackEventRows = await tx
            .select({
              eventId: events.id,
              maxAttendees: events.maxAttendees,
              eventFormat: events.eventFormat,
            })
            .from(trackEvents)
            .innerJoin(events, eq(events.id, trackEvents.eventId))
            .where(eq(trackEvents.trackId, itemId))
            .for('update');

          if (trackEventRows.length === 0) {
            throw new ApiError('TRACK_EMPTY', 'Track has no events.', 400);
          }

          // Capacity + reservations only cover the sessions this ticket includes. Legacy tracks
          // (no ticketType) include every event, preserving today's behavior.
          const liveIncludedEventRows = filterLiveIncludedEvents(trackEventRows, ticketType);

          if (liveIncludedEventRows.length === 0) {
            throw new ApiError(
              'TICKET_EVENT_COVERAGE',
              'This ticket type has no matching live sessions.',
              400,
            );
          }

          if (liveIncludedEventRows.some((row) => row.maxAttendees === null)) {
            throw new ApiError('CAPACITY_NOT_SET', 'Some events have no capacity set.', 400);
          }

          const eventIds = liveIncludedEventRows.map((row) => row.eventId);

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
                replacementReservationExclusion(
                  eventReservations.paymentId,
                  replacedPendingPaymentIds,
                ),
              ),
            )
            .groupBy(eventReservations.eventId);

          const attendeeCountMap = new Map(
            attendeeCounts.map((row) => [row.eventId, Number(row.count)]),
          );
          const reservationCountMap = new Map(
            reservationCounts.map((row) => [row.eventId, Number(row.count)]),
          );

          for (const row of liveIncludedEventRows) {
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
                replacementReservationExclusion(
                  trackReservations.paymentId,
                  replacedPendingPaymentIds,
                ),
              ),
            );

          if (
            track.maxTrackBookings !== null &&
            Number(bookingCount.count) + Number(trackReservationCount.count) >=
              track.maxTrackBookings
          ) {
            throw new ApiError('TRACK_FULL', 'Track booking limit reached.', 409);
          }

          const priceResult = await calculatePrice(
            userId,
            itemType,
            itemId,
            promoCode,
            tx,
            ticketType,
          );

          const [payment] = await tx
            .insert(payments)
            .values({
              userId,
              status: 'pending',
              amountCents: priceResult.amountCents,
              currency: 'EGP',
              itemType,
              itemId,
              ticketType: ticketType ?? null,
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

          const reservationValues = liveIncludedEventRows
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
        const [payment] = await db.transaction(async (tx) => {
          await expirePendingPaymentsForReplacement(tx, replacedPendingPaymentIds);
          return tx
            .insert(payments)
            .values({
              userId,
              status: 'pending',
              amountCents,
              currency: 'EGP',
              itemType,
              itemId: itemId ?? null,
              promoCodeId: calculatedPriceResult.promoCodeId,
              discountAppliedCents: calculatedPriceResult.discountAppliedCents,
              originalAmountCents: calculatedPriceResult.originalAmountCents,
            })
            .returning({ id: payments.id });
        });
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
            // Convert canonical E.164 (+20...) to the local MSISDN (01...) Fawaterk expects.
            // Non-+20 numbers pass through unchanged; wallet is already guarded to +20 above.
            phone: phoneNumber ? toFawaterkLocalPhone(phoneNumber) : undefined,
          },
          cartItems: [
            {
              name: itemName,
              price: (amountCents / 100).toFixed(2),
              quantity: '1',
            },
          ],
          redirectionUrls: {
            successUrl: `${env.APP_BASE_URL}/payment/success`,
            failUrl: `${env.APP_BASE_URL}/payment/failed`,
            pendingUrl,
            webhookUrl,
          },
          redirectOption: forceRedirect ? true : undefined,
          payload: { paymentId },
        });

        // Persist the Fawaterk invoice details. The replaced hold was already released inside the
        // checkout transaction above, so there is nothing left to clean up on the success path.
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
      } catch (error) {
        await db.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));
        await db.delete(eventReservations).where(eq(eventReservations.paymentId, paymentId));
        await db.delete(trackReservations).where(eq(trackReservations.paymentId, paymentId));
        await restoreReplacedPendingPayment(replacedPendingPaymentIds);
        throw error;
      }

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
                ticketType: pendingPayment.ticketType,
              },
            },
            409,
          );
        }

        if (checkoutPriceResult?.amountCents === 0) {
          const existingFreePayment = await readExistingFreeCheckoutPayment({
            userId,
            itemType,
            itemId: itemId ?? null,
            ticketType,
          });
          if (existingFreePayment) {
            return c.json({ data: existingFreePayment });
          }
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
      itemType: z.enum(['event', 'track', 'subscription']),
      itemId: z.string().uuid().optional(),
      promoCode: z.string().optional(),
      ticketType: z.enum(TICKET_TYPES).optional(),
    });

    const parseResult = pricePreviewSchema.safeParse({
      itemType: c.req.query('itemType'),
      itemId: c.req.query('itemId') || undefined,
      promoCode: c.req.query('promoCode') || undefined,
      ticketType: c.req.query('ticketType') || undefined,
    });

    if (!parseResult.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid parameters' } }, 400);
    }

    const { itemType, itemId, ticketType } = parseResult.data;
    const promoCode = parseResult.data.promoCode?.trim() || undefined;

    try {
      let promoError: string | null = null;
      let priceResult: PriceResult;

      try {
        priceResult = await calculatePrice(
          session.user.id,
          itemType,
          itemId ?? null,
          promoCode,
          undefined,
          ticketType,
        );
      } catch (error) {
        if (error instanceof ApiError && error.code === 'PROMO_INVALID') {
          promoError = error.message;
          priceResult = await calculatePrice(
            session.user.id,
            itemType,
            itemId ?? null,
            undefined,
            undefined,
            ticketType,
          );
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
        ticketType: payment.ticketType,
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
