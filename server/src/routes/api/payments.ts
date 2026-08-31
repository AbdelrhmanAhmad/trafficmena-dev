import { and, desc, eq, gt, gte, inArray, isNull, lt, ne, type SQL, sql } from 'drizzle-orm';
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
  paymentFulfillmentFailures,
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
import { queuePaymentRegistrationConfirmation } from '../../services/registrationConfirmationEmail.js';
import {
  createTransaction,
  getPaymentMethods,
  getTransactionData,
  verifyCancelWebhook,
  verifyRefundWebhook,
  verifyTransactionWebhook,
} from '../../services/fawaterk.js';
import { validatePromoCode } from '../../services/promoCodes.js';
import {
  assertMasterclassSellable,
  getEnrolledMasterclassIds,
  grantMasterclassEnrollment,
} from '../../services/masterclassSales.js';
import {
  assertCheckoutAllowed,
  resolveEffectiveProductVisibility,
  type ProductVisibilityRecord,
} from '../../services/productVisibility.js';
import { paymentRateLimiter } from '../../services/rateLimiter.js';
import { activeTrackBookingWhere } from '../../utils/booking.js';
import { ApiError } from '../../utils/errors.js';
import { isInvoicePaid } from '../../utils/invoiceStatus.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { isEventHiddenFromNonStaff } from './eventVisibility.js';
import { loadVerifiedPaymentAnalytics } from './paymentAnalytics.js';
import { ONE_YEAR_MS } from './subscriptionShared.js';
import { fulfillSeriesOrder } from './orders.js';
import {
  filterLiveIncludedEvents,
  resolveTrackBasePrice,
  TICKET_TYPES,
  type TicketType,
} from './ticketAccess.js';
import { executeTrackBookingWrite, registerFreeEventAttendee } from './trackBookingShared.js';
import { isEgyptianMobileE164, normalizePhoneNumber, toFawaterkLocalPhone } from './users-phone.js';
import { getOptionalUserRole, getRequestIp, isKnownDatabaseConflict } from './utils.js';

// --- Rate Limit Rules ---
const CHECKOUT_RATE_LIMIT = { limit: 5, windowMs: 60_000 }; // 5 checkouts per minute
const PROMO_PREVIEW_RATE_LIMIT = { limit: 30, windowMs: 10 * 60_000 }; // throttle promo probing
const VERIFY_RATE_LIMIT = { limit: 30, windowMs: 60_000 }; // 30 verifications per minute
const METHODS_RATE_LIMIT = { limit: 60, windowMs: 60_000 }; // 60 method fetches per minute
const WEBHOOK_RATE_LIMIT = { limit: 100, windowMs: 60_000 }; // 100 webhooks per minute per IP
const RESERVATION_TTL_MS = 72 * 60 * 60 * 1000;
const CHECKOUT_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const CHECKOUT_IDEMPOTENCY_WAIT_TIMEOUT_MS = 30_000;

// --- Schemas ---

const checkoutSchema = z.object({
  itemType: z.enum(['event', 'track', 'subscription', 'order', 'masterclass']),
  itemId: z.string().uuid().optional(),
  paymentMethodId: z.number().int().positive(),
  forceNewCode: z.boolean().optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
  promoCode: z.string().optional(),
  ticketType: z.enum(TICKET_TYPES).optional(),
  // Mobile-wallet payer number entered at checkout (may differ from the profile phone). E.164.
  walletPhone: z.string().trim().max(20).optional(),
});

const verifySchema = z.object({
  paymentId: z.string().uuid(),
});

// v3 TR paid/pending webhook. transaction_key == the createTransaction intent_key. The hash is a
// non-empty string (not hard-assumed 64-hex — AE6); the verifier applies the hex/length hygiene.
const trWebhookSchema = z
  .object({
    transaction_key: z.string().min(1).max(255),
    transaction_id: z.union([z.number(), z.string()]),
    status: z.string().min(1).max(50),
    payment_method: z.string().min(1).max(100),
    transactionHashKey: z.string().min(1).max(512),
    pay_load: z.unknown().optional(),
  })
  .passthrough();

// Legacy v2 invoice webhook shape — post-cutover this only feeds the log-only tripwire.
const legacyWebhookSchema = z
  .object({
    invoice_id: z.number().int().positive(),
  })
  .passthrough();

const cancelWebhookSchema = z
  .object({
    referenceId: z.union([z.number(), z.string()]),
    paymentMethod: z.string().min(1).max(100),
    status: z.string().max(50).optional(),
    transactionKey: z.string().max(255).optional(),
    hashKey: z.string().min(1).max(512),
  })
  .passthrough();

const failedWebhookSchema = z
  .object({
    transaction_id: z.union([z.number(), z.string()]),
    transaction_key: z.string().min(1).max(255),
    payment_method: z.string().min(1).max(100),
    hashKey: z.string().min(1).max(512),
  })
  .passthrough();

const refundWebhookSchema = z
  .object({
    transactionId: z.union([z.number(), z.string()]),
    amount: z.union([z.number(), z.string()]),
    currency: z.string().min(1).max(10),
    hashKey: z.string().min(1).max(512),
  })
  .passthrough();

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
  itemType: 'event' | 'track' | 'subscription' | 'order' | 'masterclass';
  itemId: string | null;
  ticketType?: TicketType | null;
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
  itemType: 'event' | 'track' | 'subscription' | 'order' | 'masterclass';
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
      // invoiceId is null on v3 rows; the gateway transaction id (when confirmed) is the v3
      // correlation key for dead-letter triage — surfaced in the failure log below.
      invoiceId: payments.fawaterkInvoiceId,
      transactionId: payments.fawaterkTransactionId,
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
    invoiceId:
      payment.invoiceId == null
        ? null
        : Number.isFinite(Number(payment.invoiceId))
          ? Number(payment.invoiceId)
          : null,
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

function toVisibilityRecord(
  settings: {
    subscriptionsEnabled: boolean;
    masterclassesEnabled: boolean;
    digitalProductsEnabled: boolean;
    masterclassesLaunched: boolean;
    digitalProductsLaunched: boolean;
  } | undefined,
): ProductVisibilityRecord | null {
  if (!settings) return null;
  return {
    subscriptionsEnabled: settings.subscriptionsEnabled,
    masterclassesEnabled: settings.masterclassesEnabled,
    digitalProductsEnabled: settings.digitalProductsEnabled,
    masterclassesLaunched: settings.masterclassesLaunched,
    digitalProductsLaunched: settings.digitalProductsLaunched,
  };
}

async function calculatePrice(
  userId: string,
  itemType: 'event' | 'track' | 'subscription' | 'order' | 'masterclass',
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
  const visibility = resolveEffectiveProductVisibility(toVisibilityRecord(settings));
  const isSubscriber = !!subscription;
  const rawDiscount = settings?.subscriberDiscountPercent;
  const discountPercent =
    rawDiscount !== null && rawDiscount !== undefined && rawDiscount >= 1 && rawDiscount <= 99
      ? rawDiscount
      : 20;

  if (itemType === 'subscription') {
    assertCheckoutAllowed(visibility, 'subscription');
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

    if (productLines.length > 0) {
      assertCheckoutAllowed(visibility, 'digital_product_order');
    }

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
    assertCheckoutAllowed(visibility, 'masterclass');
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
    const result: ProcessSuccessfulPaymentResult = await db.transaction(async (tx) => {
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

    if (result.status === 'paid' && !result.alreadyProcessed) {
      queuePaymentRegistrationConfirmation(paymentId);
    }

    return result;
  } catch (error) {
    // Gateway has already confirmed money movement before this function runs. Keep the local
    // payment retryable and preserve reservations; operators can resolve the dead-letter row.
    await reportPaidFulfillmentFailure(paymentId, error, confirmationSource);
    throw error;
  }
}

// Pure decision helper — gateway vs local amount + currency equality. Returns the matched cents on
// success, or the ApiError code to throw on mismatch. Extracted so the equality rules are unit-
// testable without a database (U9 T6).
export function evaluateGatewayAmountCurrency(input: {
  gatewayTotal: number;
  gatewayCurrency: string | null | undefined;
  localAmountCents: number;
  localCurrency: string | null | undefined;
}):
  | { ok: true; amountCents: number }
  | {
      ok: false;
      code: 'INVALID_GATEWAY_AMOUNT' | 'INVOICE_AMOUNT_MISMATCH' | 'INVOICE_CURRENCY_MISMATCH';
    } {
  if (!Number.isFinite(input.gatewayTotal) || input.gatewayTotal < 0) {
    return { ok: false, code: 'INVALID_GATEWAY_AMOUNT' };
  }
  const gatewayAmountCents = Math.round(input.gatewayTotal * 100);
  if (gatewayAmountCents !== input.localAmountCents) {
    return { ok: false, code: 'INVOICE_AMOUNT_MISMATCH' };
  }
  const gatewayCurrency = String(input.gatewayCurrency ?? '')
    .trim()
    .toUpperCase();
  const localCurrency = String(input.localCurrency ?? '')
    .trim()
    .toUpperCase();
  if (!gatewayCurrency || gatewayCurrency !== localCurrency) {
    return { ok: false, code: 'INVOICE_CURRENCY_MISMATCH' };
  }
  return { ok: true, amountCents: gatewayAmountCents };
}

// Single confirmation chokepoint. Keyed on our payment row (webhook matches by intent key;
// verify/reconcile by payment id). Preserves every v2 fulfillment safety property: the conditional
// userId ownership scoping (IDOR guard — payment ids travel in redirect URLs and are not secret),
// the already-paid short-circuit, amount+currency equality, expired-row recovery, and the
// FOR-UPDATE compare-and-swap + inside-transaction failure write inside processSuccessfulPayment.
// The webhook data alone never fulfills — we always re-verify via getTransactionData (KTD-5).
export async function confirmGatewayTransactionPayment(args: {
  paymentId?: string;
  intentKey?: string;
  source: ConfirmationSource;
  userId?: string;
}): Promise<ConfirmGatewayInvoiceResult> {
  let identifierClause: SQL;
  if (args.paymentId) {
    identifierClause = eq(payments.id, args.paymentId);
  } else if (args.intentKey) {
    identifierClause = eq(payments.fawaterkIntentKey, args.intentKey);
  } else {
    throw new ApiError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
  }
  const whereClause = args.userId
    ? and(identifierClause, eq(payments.userId, args.userId))
    : identifierClause;

  const [payment] = await db.select().from(payments).where(whereClause).limit(1);
  if (!payment) {
    throw new ApiError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
  }

  const intentKey = payment.fawaterkIntentKey;

  if (payment.status === 'paid') {
    // Idempotent short-circuit. Enrich the payment-method label best-effort, only when there is an
    // intent to consult (free/legacy paid rows have none).
    let paymentMethod: string | undefined;
    if (intentKey) {
      try {
        const gatewayTx = await getTransactionData(intentKey);
        paymentMethod = gatewayTx.paymentMethod;
      } catch (error) {
        console.warn('[payments/confirm] Unable to enrich paid payment from gateway', {
          source: args.source,
          paymentId: payment.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Analytics enrichment is best-effort — payment verification must succeed even if it fails.
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
      ticketType: payment.ticketType,
      amountCents: payment.amountCents,
      ...analytics,
      fawaterkPaid: Boolean(intentKey),
      alreadyProcessed: true,
      confirmationSource: args.source,
    };
  }

  // Intent-less rows (crash window before the intent persisted, voided v2, free rows): no gateway to
  // consult → return the local status and make no gateway call (R9).
  if (!intentKey) {
    return {
      status: payment.status,
      paymentId: payment.id,
      itemType: payment.itemType,
      itemId: payment.itemId,
      fawaterkPaid: false,
      confirmationSource: args.source,
    };
  }

  const gatewayTx = await getTransactionData(intentKey);
  const fawaterkPaid = isInvoicePaid({ paid: gatewayTx.paid, paid_at: gatewayTx.paidAt ?? null });

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

  const amountCheck = evaluateGatewayAmountCurrency({
    gatewayTotal: Number(gatewayTx.total),
    gatewayCurrency: gatewayTx.currency,
    localAmountCents: payment.amountCents,
    localCurrency: payment.currency,
  });
  if (!amountCheck.ok) {
    console.error('[payments/confirm] Gateway amount/currency check failed', {
      source: args.source,
      paymentId: payment.id,
      code: amountCheck.code,
      gatewayTotal: gatewayTx.total,
      gatewayCurrency: gatewayTx.currency,
      localAmountCents: payment.amountCents,
      localCurrency: payment.currency,
    });
    if (amountCheck.code === 'INVALID_GATEWAY_AMOUNT') {
      throw new ApiError('INVALID_GATEWAY_AMOUNT', 'Gateway transaction amount is invalid.', 502);
    }
    if (amountCheck.code === 'INVOICE_AMOUNT_MISMATCH') {
      throw new ApiError(
        'INVOICE_AMOUNT_MISMATCH',
        'Invoice amount does not match payment record.',
        409,
      );
    }
    throw new ApiError(
      'INVOICE_CURRENCY_MISMATCH',
      'Invoice currency does not match payment record.',
      409,
    );
  }

  // Persist the gateway transaction id the first time we see it (admin/triage correlation data).
  if (gatewayTx.transactionId && payment.fawaterkTransactionId == null) {
    await db
      .update(payments)
      .set({ fawaterkTransactionId: gatewayTx.transactionId })
      .where(eq(payments.id, payment.id));
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
    console.info('[payments/confirm] Recovered expired payment after paid gateway transaction', {
      source: args.source,
      paymentId: payment.id,
    });
  }

  // Analytics enrichment is best-effort — never block payment confirmation.
  let analytics = {};
  try {
    analytics = await loadVerifiedPaymentAnalytics(payment, gatewayTx.paymentMethod);
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
    ticketType: payment.ticketType,
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
    const walletPhoneInput = result.data.walletPhone?.trim() || undefined;

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
        const hasIntent = Boolean(existingPending.fawaterkIntentKey);
        if (!forceNewCode) {
          return c.json(
            {
              error: {
                code: 'PENDING_PAYMENT',
                message: 'A pending payment already exists.',
                paymentId: existingPending.id,
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

        if (!hasIntent) {
          console.info('[payments/checkout] Replacing pending payment without gateway intent', {
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
      const requiresPhone = normalizedMethodName.includes('mobilewallet');
      const profilePhone = user.phoneNumber?.trim() || undefined;
      // Wallet methods charge the number the user entered at checkout (their wallet may be on a
      // different number than their profile); fall back to the profile phone for older clients.
      // Non-wallet methods keep using the profile phone as the customer contact number.
      const walletNumber = requiresPhone
        ? normalizePhoneNumber(walletPhoneInput || profilePhone || '')
        : undefined;
      if (requiresPhone) {
        if (!walletNumber) {
          throw new ApiError(
            'PHONE_REQUIRED',
            'Enter the mobile number your wallet is registered on.',
            400,
          );
        }
        // Fawaterk mobile wallet only works for Egyptian (+20) numbers. Reject others up front
        // instead of sending the user into a gateway flow that can't fulfill the charge.
        if (!isEgyptianMobileE164(walletNumber)) {
          throw new ApiError(
            'PHONE_NOT_EGYPTIAN',
            'Mobile wallet payments require an Egyptian (+20) mobile number.',
            400,
          );
        }
      }
      // Contact phone sent to the gateway: the wallet number for wallet payments, else the profile.
      const contactPhone = requiresPhone ? walletNumber : profilePhone;

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
            await registerFreeEventAttendee(tx, {
              eventId: itemId,
              userId,
              paidAt,
              paymentId: payment.id,
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

      let transactionResult: Awaited<ReturnType<typeof createTransaction>>;
      try {
        transactionResult = await createTransaction({
          paymentMethodId,
          cartTotal: amountCents / 100, // EGP (numeric under v3)
          currency: 'EGP',
          customer: {
            first_name: firstName,
            last_name: lastName,
            email: user.email,
            // Convert canonical E.164 (+20...) to the local MSISDN (01...) Fawaterk expects.
            // Non-+20 numbers pass through unchanged; wallet is already guarded to +20 above.
            phone: contactPhone ? toFawaterkLocalPhone(contactPhone) : undefined,
          },
          cartItems: [
            {
              name: itemName,
              price: Number((amountCents / 100).toFixed(2)),
              quantity: 1,
            },
          ],
          redirectionUrls: {
            // Bake our own identifier onto the return URLs — v3 does not document what it appends
            // (AE4). The _json suffix on the webhook URL selects JSON delivery.
            successUrl: `${env.APP_BASE_URL}/payment/success?payment_id=${paymentId}`,
            failUrl: `${env.APP_BASE_URL}/payment/failed?payment_id=${paymentId}`,
            pendingUrl,
            webhookUrl,
          },
          payload: { paymentId },
          // Align the gateway reference lifetime to our 72h pending window (RESERVATION_TTL_MS) —
          // v3's own default is only +2 days, which would render dead codes as payable.
          dueDate: expiresAt,
          mobileWalletNumber:
            requiresPhone && walletNumber ? toFawaterkLocalPhone(walletNumber) : undefined,
        });

        // Persist the intent key + reference codes before responding. Once createTransaction
        // succeeds the intent is live at the gateway, so a payment_data parsing surprise must NOT
        // mark the row failed — only a createTransaction failure does (handled in catch).
        await db
          .update(payments)
          .set({
            fawaterkIntentKey: transactionResult.intentKey,
            fawryCode: transactionResult.paymentData.fawryCode ?? null,
            amanCode: transactionResult.paymentData.amanCode ?? null,
            masaryCode: transactionResult.paymentData.masaryCode ?? null,
            meezaReference: transactionResult.paymentData.meezaReference ?? null,
            meezaQrCode: transactionResult.paymentData.meezaQrCode ?? null,
          })
          .where(eq(payments.id, paymentId));

        console.info('[payments/checkout] Initiating payment', {
          paymentId,
          paymentMethodId,
          methodName: selectedMethod.name_en ?? null,
          methodRedirect,
          itemType,
          intentKey: transactionResult.intentKey,
        });
      } catch (error) {
        await db.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));
        await db.delete(eventReservations).where(eq(eventReservations.paymentId, paymentId));
        await db.delete(trackReservations).where(eq(trackReservations.paymentId, paymentId));
        await restoreReplacedPendingPayment(replacedPendingPaymentIds);
        throw error;
      }

      return respondCheckoutSuccess({
        paymentId,
        redirectUrl: transactionResult.redirectUrl,
        fawryCode: transactionResult.paymentData.fawryCode,
        meezaReference: transactionResult.paymentData.meezaReference,
        meezaQrCode: transactionResult.paymentData.meezaQrCode,
        amanCode: transactionResult.paymentData.amanCode,
        masaryCode: transactionResult.paymentData.masaryCode,
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

    const { paymentId } = result.data;

    try {
      // Session-scoped: userId scoping in confirm enforces the payment belongs to the caller.
      const processResult = await confirmGatewayTransactionPayment({
        paymentId,
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

    const { allowed, resetAt } = paymentRateLimiter.consume(
      `price-preview:${session.user.id}`,
      PROMO_PREVIEW_RATE_LIMIT,
    );
    if (!allowed) {
      c.header('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, 429);
    }

    // Validate query parameters with Zod
    const pricePreviewSchema = z.object({
      itemType: z.enum(['event', 'track', 'subscription', 'order', 'masterclass']),
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
        fawaterkTransactionId: payment.fawaterkTransactionId,
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

  // Shared per-IP webhook throttle. All four webhook routes are unauthenticated public POSTs, so
  // none may ship unthrottled. Returns a 429 response to short-circuit, or null to proceed.
  const enforceWebhookRateLimit = (c: Context): Response | null => {
    const clientIp = getRequestIp(c);
    const { allowed, resetAt } = paymentRateLimiter.consume(
      `webhook:${clientIp}`,
      WEBHOOK_RATE_LIMIT,
    );
    if (!allowed) {
      c.header('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, 429);
    }
    return null;
  };

  // POST /payments/webhook(_json) - Fawaterk paid/pending TR webhook (server-to-server confirmation).
  // NOT session-authenticated — HMAC signature verification only. Three-case semantics (KTD-6):
  // paid+matched → confirm result; paid+unknown transaction_key → 404 (prompts gateway retry, bridges
  // the checkout-persist race); pending → 200 ack (no DB write); legacy shape → log-only tripwire.
  const handlePaidWebhook = async (c: Context) => {
    const limited = enforceWebhookRateLimit(c);
    if (limited) {
      return limited;
    }

    const body = await c.req.json().catch(() => null);

    const tr = trWebhookSchema.safeParse(body);
    if (tr.success) {
      const data = tr.data;
      // SECURITY: verify the transaction HMAC before any lookup or state change.
      const verified = verifyTransactionWebhook({
        transaction_id: data.transaction_id,
        transaction_key: data.transaction_key,
        payment_method: data.payment_method,
        hash: data.transactionHashKey,
      });
      if (!verified) {
        console.error('[payments/webhook] Invalid TR signature');
        return c.json({ error: { code: 'INVALID_SIGNATURE' } }, 401);
      }

      // Async references (Fawry/Aman/Masary) fire status:"pending" — acknowledge, no fulfillment.
      if (data.status.toLowerCase() === 'pending') {
        console.info('[payments/webhook] Pending acknowledgement', {
          transactionKey: data.transaction_key,
          paymentMethod: data.payment_method,
        });
        return c.json({ data: { status: 'pending' } });
      }

      try {
        // Match by intent key. confirm re-verifies via getTransactionData — webhook never fulfills
        // on its own (KTD-5).
        const processResult = await confirmGatewayTransactionPayment({
          intentKey: data.transaction_key,
          source: 'webhook',
        });
        console.info('[payments/webhook] Confirmation processed', {
          transactionKey: data.transaction_key,
          paymentId: processResult.paymentId,
          status: processResult.status,
          fawaterkPaid: processResult.fawaterkPaid,
          recoveredFromExpired: processResult.recoveredFromExpired ?? false,
        });
        return c.json({ data: processResult });
      } catch (error) {
        if (error instanceof ApiError && error.code === 'PAYMENT_NOT_FOUND') {
          console.error('[payments/webhook] No payment for transaction_key', data.transaction_key);
          return c.json({ error: { code: 'PAYMENT_NOT_FOUND' } }, 404);
        }
        if (error instanceof ApiError) {
          console.error('[payments/webhook] Processing error:', error.code, error.message);
          return c.json(
            { error: { code: error.code, message: error.message } },
            error.status as ContentfulStatusCode,
          );
        }
        console.error('[payments/webhook] Processing failed:', error);
        return c.json({ error: { code: 'PROCESSING_FAILED' } }, 500);
      }
    }

    // Legacy v2 invoice payload → log-only tripwire (no verification, no DB write), 200. Feeds the
    // support protocol; removed after two silent weeks.
    const legacy = legacyWebhookSchema.safeParse(body);
    if (legacy.success) {
      console.warn(
        `[payments/webhook] post-cutover legacy webhook, invoice_id=${legacy.data.invoice_id} — manual review`,
      );
      return c.json({ data: { status: 'legacy_acknowledged' } });
    }

    console.error('[payments/webhook] Invalid payload');
    return c.json({ error: { code: 'INVALID_PAYLOAD' } }, 400);
  };

  // Cancel/failed/refund webhooks: verify the signature UNCONDITIONALLY (the contract signs every
  // delivery), then log-only — no DB writes in v1 (KTD-7). "Verify when present" would let any
  // unauthenticated caller inject forged entries into the triage logs.
  const handleCancelWebhook = async (c: Context) => {
    const limited = enforceWebhookRateLimit(c);
    if (limited) {
      return limited;
    }
    const parsed = cancelWebhookSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_PAYLOAD' } }, 400);
    }
    const data = parsed.data;
    const verified = verifyCancelWebhook({
      referenceId: data.referenceId,
      paymentMethod: data.paymentMethod,
      hash: data.hashKey,
    });
    if (!verified) {
      console.error('[payments/webhook_cancel] Invalid signature');
      return c.json({ error: { code: 'INVALID_SIGNATURE' } }, 401);
    }
    // Log-only: the 72h TTL job remains the sole capacity-release mechanism (v2 parity). Captures
    // volume evidence for the Phase 7 pending→expired upgrade decision.
    console.info('[payments/webhook_cancel] Cancel webhook', {
      referenceId: data.referenceId,
      transactionKey: data.transactionKey ?? null,
      status: data.status ?? null,
      paymentMethod: data.paymentMethod,
    });
    return c.json({ data: { status: 'acknowledged' } });
  };

  const handleFailedWebhook = async (c: Context) => {
    const limited = enforceWebhookRateLimit(c);
    if (limited) {
      return limited;
    }
    const parsed = failedWebhookSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_PAYLOAD' } }, 400);
    }
    const data = parsed.data;
    const verified = verifyTransactionWebhook({
      transaction_id: data.transaction_id,
      transaction_key: data.transaction_key,
      payment_method: data.payment_method,
      hash: data.hashKey,
    });
    if (!verified) {
      console.error('[payments/webhook_failed] Invalid signature');
      return c.json({ error: { code: 'INVALID_SIGNATURE' } }, 401);
    }
    // Log-only: a pending → failed transition is unrecoverable by every confirm/reconcile scan and
    // would strand money when a user retries an intent and pays.
    console.info('[payments/webhook_failed] Failed webhook', {
      transactionKey: data.transaction_key,
      paymentMethod: data.payment_method,
    });
    return c.json({ data: { status: 'acknowledged' } });
  };

  const handleRefundWebhook = async (c: Context) => {
    const limited = enforceWebhookRateLimit(c);
    if (limited) {
      return limited;
    }
    const parsed = refundWebhookSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_PAYLOAD' } }, 400);
    }
    const data = parsed.data;
    const verified = verifyRefundWebhook({
      transactionId: data.transactionId,
      amount: data.amount,
      currency: data.currency,
      hash: data.hashKey,
    });
    if (!verified) {
      console.error('[payments/webhook_refund] Invalid signature');
      return c.json({ error: { code: 'INVALID_SIGNATURE' } }, 401);
    }
    // Log-only: refunds stay manual via the dashboard + R31 support protocol.
    console.info('[payments/webhook_refund] Refund webhook', {
      transactionId: data.transactionId,
      amount: data.amount,
      currency: data.currency,
    });
    return c.json({ data: { status: 'acknowledged' } });
  };

  app.post('/payments/webhook', handlePaidWebhook);
  app.post('/payments/webhook_json', handlePaidWebhook);
  app.post('/payments/webhook_cancel', handleCancelWebhook);
  app.post('/payments/webhook_failed_json', handleFailedWebhook);
  app.post('/payments/webhook_refund', handleRefundWebhook);
}
