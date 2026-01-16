import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { db } from '../../db/client.js';
import {
  eventAttendees,
  events,
  payments,
  platformSettings,
  subscriptions,
  trackBookings,
  trackEvents,
  tracks,
  users,
} from '../../db/schema/index.js';
import {
  getInvoiceData,
  getPaymentMethods,
  invoiceInitPay,
  verifyFawaterkWebhook,
} from '../../services/fawaterk.js';
import { paymentRateLimiter } from '../../services/rateLimiter.js';
import { ApiError } from '../../utils/errors.js';
import { getSessionFromRequest } from '../../utils/session.js';

// --- Rate Limit Rules ---
const CHECKOUT_RATE_LIMIT = { limit: 5, windowMs: 60_000 }; // 5 checkouts per minute
const VERIFY_RATE_LIMIT = { limit: 30, windowMs: 60_000 }; // 30 verifications per minute
const METHODS_RATE_LIMIT = { limit: 60, windowMs: 60_000 }; // 60 method fetches per minute

// --- Schemas ---

const checkoutSchema = z.object({
  itemType: z.enum(['event', 'track', 'subscription']),
  itemId: z.string().uuid().optional(),
  paymentMethodId: z.number().int().positive(),
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

type TrackBookingResult = {
  totalEvents: number;
  existingCount: number;
  insertedCount: number;
  nullCapacityCount: number;
  currentBookings: number;
  bookingInserted: number;
};

type TrackBookingParams = {
  trackId: string;
  userId: string;
  paymentId: string;
  pricePaidCents: number;
  maxTrackBookings: number | null;
  paidAt: Date;
};

// --- Helpers ---

/**
 * Atomically books a track for a user with capacity validation.
 * Uses a single CTE query to:
 * 1. Lock all track events for atomic capacity checking
 * 2. Validate each event has capacity available
 * 3. Insert attendee records for events with space
 * 4. Create track booking if all events can accept the user
 *
 * Used by both paid and free track booking flows.
 */
async function executeAtomicTrackBooking(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  params: TrackBookingParams,
): Promise<TrackBookingResult> {
  const { trackId, userId, paymentId, pricePaidCents, maxTrackBookings, paidAt } = params;

  const atomicResult = await tx.execute(sql`
    WITH track_booking_check AS (
      SELECT COUNT(*) AS current_count FROM track_bookings WHERE track_id = ${trackId}
    ),
    locked_events AS (
      SELECT e.id, e.max_attendees
      FROM track_events te
      JOIN events e ON e.id = te.event_id
      WHERE te.track_id = ${trackId}
      FOR UPDATE
    ),
    existing AS (
      SELECT event_id
      FROM event_attendees
      WHERE user_id = ${userId}
        AND event_id IN (SELECT id FROM locked_events)
    ),
    attendee_counts AS (
      SELECT event_id, COUNT(*) AS attendee_count
      FROM event_attendees
      WHERE event_id IN (SELECT id FROM locked_events)
      GROUP BY event_id
    ),
    eligible AS (
      SELECT le.id AS event_id
      FROM locked_events le
      LEFT JOIN attendee_counts ac ON ac.event_id = le.id
      WHERE COALESCE(ac.attendee_count, 0) < le.max_attendees
    ),
    to_insert AS (
      SELECT event_id
      FROM eligible
      WHERE event_id NOT IN (SELECT event_id FROM existing)
    ),
    inserted_attendees AS (
      INSERT INTO event_attendees (event_id, user_id, paid_at, price_paid_cents, payment_id)
      SELECT event_id, ${userId}, ${paidAt}, ${pricePaidCents}, ${paymentId}
      FROM to_insert
      RETURNING event_id
    ),
    inserted_booking AS (
      INSERT INTO track_bookings (track_id, user_id, paid_at, price_paid_cents, payment_id)
      SELECT ${trackId}, ${userId}, ${paidAt}, ${pricePaidCents}, ${paymentId}
      WHERE (SELECT current_count FROM track_booking_check) < ${maxTrackBookings ?? 2147483647}
        AND (SELECT COUNT(*) FROM locked_events) > 0
        AND (SELECT COUNT(*) FROM locked_events WHERE max_attendees IS NULL) = 0
        AND (SELECT COUNT(*) FROM existing) + (SELECT COUNT(*) FROM inserted_attendees) >= (SELECT COUNT(*) FROM locked_events)
      ON CONFLICT (track_id, user_id) DO UPDATE
        SET paid_at = EXCLUDED.paid_at,
            price_paid_cents = EXCLUDED.price_paid_cents,
            payment_id = EXCLUDED.payment_id
      RETURNING id
    )
    SELECT
      (SELECT COUNT(*) FROM locked_events) AS total_events,
      (SELECT COUNT(*) FROM existing) AS existing_count,
      (SELECT COUNT(*) FROM inserted_attendees) AS inserted_count,
      (SELECT COUNT(*) FROM locked_events WHERE max_attendees IS NULL) AS null_capacity_count,
      (SELECT current_count FROM track_booking_check) AS current_bookings,
      (SELECT COUNT(*) FROM inserted_booking) AS booking_inserted
  `);

  const row = atomicResult.rows[0] as {
    total_events: string;
    existing_count: string;
    inserted_count: string;
    null_capacity_count: string;
    current_bookings: string;
    booking_inserted: string;
  };

  return {
    totalEvents: Number(row.total_events),
    existingCount: Number(row.existing_count),
    insertedCount: Number(row.inserted_count),
    nullCapacityCount: Number(row.null_capacity_count),
    currentBookings: Number(row.current_bookings),
    bookingInserted: Number(row.booking_inserted),
  };
}

/**
 * Validates track booking result and throws appropriate errors.
 * Shared validation logic for both paid and free track booking flows.
 */
function validateTrackBookingResult(
  result: TrackBookingResult,
  maxTrackBookings: number | null,
): void {
  if (result.totalEvents === 0) {
    throw new ApiError('TRACK_EMPTY', 'Track has no events.', 400);
  }
  if (result.nullCapacityCount > 0) {
    throw new ApiError('CAPACITY_NOT_SET', 'Some events have no capacity set.', 400);
  }
  if (result.existingCount + result.insertedCount < result.totalEvents) {
    throw new ApiError('EVENT_FULL', 'One or more events in this track are at capacity.', 409);
  }
  if (result.bookingInserted === 0) {
    if (maxTrackBookings !== null && result.currentBookings >= maxTrackBookings) {
      throw new ApiError('TRACK_FULL', 'Track booking limit reached.', 409);
    }
  }
}

async function calculatePrice(
  userId: string,
  itemType: 'event' | 'track' | 'subscription',
  itemId: string | null,
): Promise<{ amountCents: number; itemName: string }> {
  // Get subscription status
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        gte(subscriptions.endsAt, new Date()),
      ),
    );
  const isSubscriber = !!subscription;

  // Get global discount percentage
  const [settings] = await db.select().from(platformSettings).limit(1);
  const discountPercent = settings?.subscriberDiscountPercent ?? 0;

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
    return { amountCents: settings.annualSubscriptionPriceCents, itemName: 'Annual Subscription' };
  }

  if (itemType === 'event' && itemId) {
    const [event] = await db.select().from(events).where(eq(events.id, itemId));
    if (!event) throw new ApiError('NOT_FOUND', 'Event not found', 404);

    const [trackEvent] = await db
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

      const now = new Date();
      if (now < trackEvent.singleBookingStart) {
        throw new ApiError('BOOKING_NOT_OPEN', 'Single booking period has not started.', 400);
      }
      if (now > trackEvent.singleBookingEnd) {
        throw new ApiError('BOOKING_PERIOD_CLOSED', 'Single booking period has ended.', 400);
      }
    }

    // Check if already registered
    const [existingReg] = await db
      .select()
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, itemId), eq(eventAttendees.userId, userId)));
    if (existingReg) {
      throw new ApiError('ALREADY_REGISTERED', 'Already registered for this event', 400);
    }

    if (event.maxAttendees) {
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventAttendees)
        .where(eq(eventAttendees.eventId, itemId));

      if (Number(countResult.count) >= event.maxAttendees) {
        throw new ApiError('EVENT_FULL', 'Event capacity reached.', 409);
      }
    }

    const basePrice = event.priceInCents ?? 0;

    // Online event = FREE for subscribers (derive from existing fields)
    const isOnline = event.meetingLink && !event.location;
    if (isSubscriber && isOnline) {
      return { amountCents: 0, itemName: event.title };
    }

    // Apply global discount for subscribers on offline/hybrid events
    if (isSubscriber && basePrice > 0) {
      const discounted = Math.round(basePrice * (1 - discountPercent / 100));
      return { amountCents: discounted, itemName: event.title };
    }

    return { amountCents: basePrice, itemName: event.title };
  }

  if (itemType === 'track' && itemId) {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, itemId));
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

    // Check if already booked
    const [existingBooking] = await db
      .select()
      .from(trackBookings)
      .where(and(eq(trackBookings.trackId, itemId), eq(trackBookings.userId, userId)));
    if (existingBooking?.paidAt) {
      throw new ApiError('ALREADY_BOOKED', 'Already booked this track', 400);
    }

    const basePrice = track.priceInCents ?? 0;

    // Apply global discount for subscribers
    if (isSubscriber && basePrice > 0) {
      const discounted = Math.round(basePrice * (1 - discountPercent / 100));
      return { amountCents: discounted, itemName: track.title };
    }

    return { amountCents: basePrice, itemName: track.title };
  }

  throw new ApiError('INVALID_ITEM', 'Invalid item type', 400);
}

async function processSuccessfulPayment(paymentId: string) {
  // CRITICAL: Entire payment processing must be in a single transaction
  // to ensure atomicity - if fulfillment fails, payment stays pending
  return db.transaction(async (tx) => {
    // Step 1: Atomic lock and status update - only succeeds if status is still 'pending'
    // This prevents race conditions between webhook and polling
    const [updated] = await tx
      .update(payments)
      .set({ status: 'paid', paidAt: new Date() })
      .where(and(eq(payments.id, paymentId), eq(payments.status, 'pending')))
      .returning();

    if (!updated) {
      // Either already processed or doesn't exist
      const [existing] = await tx.select().from(payments).where(eq(payments.id, paymentId));
      if (existing?.status === 'paid') {
        return { alreadyProcessed: true };
      }
      throw new Error('Payment not found or invalid state');
    }

    let itemName = 'Purchase';
    const paidAt = new Date();

    if (updated.itemType === 'event' && updated.itemId) {
      // Check capacity AFTER payment is marked paid
      const [event] = await tx.select().from(events).where(eq(events.id, updated.itemId));
      if (!event) {
        await tx.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));
        throw new ApiError('EVENT_NOT_FOUND', 'Event not found.', 404);
      }
      itemName = event.title ?? 'Event';

      const [trackEvent] = await tx
        .select({
          allowIndividualBooking: tracks.allowIndividualBooking,
          singleBookingStart: tracks.singleBookingStart,
          singleBookingEnd: tracks.singleBookingEnd,
        })
        .from(trackEvents)
        .innerJoin(tracks, eq(tracks.id, trackEvents.trackId))
        .where(eq(trackEvents.eventId, updated.itemId));

      if (trackEvent) {
        if (!trackEvent.allowIndividualBooking) {
          await tx.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));
          throw new ApiError(
            'INDIVIDUAL_BOOKING_DISABLED',
            'Individual event booking is not available for this track.',
            400,
          );
        }

        if (!trackEvent.singleBookingStart || !trackEvent.singleBookingEnd) {
          await tx.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));
          throw new ApiError(
            'BOOKING_NOT_OPEN',
            'Single event booking is not enabled for this track.',
            400,
          );
        }

        const now = new Date();
        if (now < trackEvent.singleBookingStart) {
          await tx.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));
          throw new ApiError('BOOKING_NOT_OPEN', 'Single booking period has not started.', 400);
        }
        if (now > trackEvent.singleBookingEnd) {
          await tx.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));
          throw new ApiError('BOOKING_PERIOD_CLOSED', 'Single booking period has ended.', 400);
        }
      }

      if (event.maxAttendees) {
        const [countResult] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(eventAttendees)
          .where(eq(eventAttendees.eventId, updated.itemId));

        if (Number(countResult.count) >= event.maxAttendees) {
          // Mark payment as failed - needs manual refund
          await tx.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));
          throw new ApiError('EVENT_FULL', 'Event full. Refund will be processed.', 409);
        }
      }

      await tx
        .insert(eventAttendees)
        .values({
          eventId: updated.itemId,
          userId: updated.userId,
          paidAt,
          pricePaidCents: updated.amountCents,
          paymentId: updated.id,
        })
        .onConflictDoNothing();
    }

    if (updated.itemType === 'track' && updated.itemId) {
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
        .where(eq(tracks.id, updated.itemId))
        .for('update')
        .limit(1);

      if (!track || !track.isPublished) {
        await tx.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));
        throw new ApiError('TRACK_NOT_FOUND', 'Track not found.', 404);
      }

      itemName = track.title ?? 'Track';

      if (track.trackBookingStart === null || track.trackBookingEnd === null) {
        await tx.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));
        throw new ApiError('BOOKING_NOT_CONFIGURED', 'Track booking not configured.', 400);
      }

      const now = new Date();
      if (now < new Date(track.trackBookingStart)) {
        await tx.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));
        throw new ApiError('BOOKING_NOT_OPEN', 'Track booking not yet open.', 400);
      }
      if (now > new Date(track.trackBookingEnd)) {
        await tx.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));
        throw new ApiError('BOOKING_PERIOD_CLOSED', 'Track booking period closed.', 400);
      }

      const bookingResult = await executeAtomicTrackBooking(tx, {
        trackId: updated.itemId,
        userId: updated.userId,
        paymentId: updated.id,
        pricePaidCents: updated.amountCents,
        maxTrackBookings: track.maxTrackBookings,
        paidAt,
      });

      // Validate and mark payment as failed if booking couldn't complete
      try {
        validateTrackBookingResult(bookingResult, track.maxTrackBookings);
      } catch (error) {
        await tx.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));
        throw error;
      }
    }

    if (updated.itemType === 'subscription') {
      itemName = 'Annual Subscription';

      await tx.insert(subscriptions).values({
        userId: updated.userId,
        status: 'active',
        startsAt: paidAt,
        endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 365 days
        pricePaidCents: updated.amountCents,
        paymentId: updated.id,
      });
    }

    return { success: true, itemName };
  });
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

    const body = await c.req.json();
    const result = checkoutSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: result.error.message } }, 400);
    }

    const { itemType, itemId, paymentMethodId } = result.data;

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

    try {
      const userId = session.user.id;

      // Note: Stale payment expiration moved to background job (see jobs/paymentExpiration.ts)

      if (itemType === 'subscription') {
        const [existingPending] = await db
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.userId, userId),
              eq(payments.itemType, 'subscription'),
              eq(payments.status, 'pending'),
            ),
          )
          .orderBy(desc(payments.createdAt))
          .limit(1);

        if (existingPending) {
          if (existingPending.fawaterkInvoiceId) {
            return c.json(
              {
                error: {
                  code: 'PENDING_PAYMENT',
                  message: 'A pending subscription payment already exists.',
                  paymentId: existingPending.id,
                  invoiceId: existingPending.fawaterkInvoiceId,
                },
              },
              409,
            );
          }

          await db
            .update(payments)
            .set({ status: 'expired' })
            .where(eq(payments.id, existingPending.id));
        }
      }

      // Calculate price and validate
      const { amountCents, itemName } = await calculatePrice(userId, itemType, itemId ?? null);

      // If free, process immediately without payment
      if (amountCents === 0) {
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
            });
          }

          if (itemType === 'track' && itemId) {
            // Fetch track for maxTrackBookings (booking window already validated in calculatePrice)
            const [track] = await tx
              .select({ maxTrackBookings: tracks.maxTrackBookings })
              .from(tracks)
              .where(eq(tracks.id, itemId));

            const paidAt = new Date();
            const bookingResult = await executeAtomicTrackBooking(tx, {
              trackId: itemId,
              userId,
              paymentId: payment.id,
              pricePaidCents: 0,
              maxTrackBookings: track?.maxTrackBookings ?? null,
              paidAt,
            });

            // Validate result - errors will rollback the transaction
            validateTrackBookingResult(bookingResult, track?.maxTrackBookings ?? null);
          }

          // Note: Free subscriptions are not expected in normal flow
          return payment;
        });

        return c.json({ data: { free: true, paymentId: result.id } });
      }

      // Get user info for Fawaterk
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return c.json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } }, 404);
      }

      // Create pending payment record
      const [payment] = await db
        .insert(payments)
        .values({
          userId,
          status: 'pending',
          amountCents,
          currency: 'EGP',
          itemType,
          itemId: itemId ?? null,
        })
        .returning();

      // Create Fawaterk invoice
      const nameParts = (user.name ?? 'User').split(' ');
      const firstName = nameParts[0] ?? 'User';
      const lastName = nameParts.slice(1).join(' ') || 'Customer';

      const invoiceResult = await invoiceInitPay({
        paymentMethodId,
        cartTotal: amountCents / 100, // Convert cents to EGP
        currency: 'EGP',
        customer: {
          first_name: firstName,
          last_name: lastName,
          email: user.email,
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
          pendingUrl: `${env.APP_BASE_URL}/payment/pending`,
        },
        payload: { paymentId: payment.id },
      });

      // Update payment with Fawaterk invoice info
      await db
        .update(payments)
        .set({
          fawaterkInvoiceId: invoiceResult.invoiceId,
          fawaterkInvoiceKey: invoiceResult.invoiceKey,
        })
        .where(eq(payments.id, payment.id));

      return c.json({
        data: {
          paymentId: payment.id,
          invoiceId: invoiceResult.invoiceId,
          redirectUrl: invoiceResult.paymentData.redirectTo,
          fawryCode: invoiceResult.paymentData.fawryCode,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      console.error('[payments/checkout] Error:', error);
      return c.json({ error: { code: 'PAYMENT_ERROR', message: 'Failed to create payment' } }, 500);
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

    // CRITICAL: Verify user ownership
    const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.fawaterkInvoiceId, invoiceId), eq(payments.userId, session.user.id)));

    if (!payment) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Payment not found' } }, 404);
    }

    if (payment.status === 'paid') {
      return c.json({ data: { status: 'paid', alreadyProcessed: true } });
    }

    if (payment.status !== 'pending') {
      return c.json({ data: { status: payment.status } });
    }

    try {
      // Call Fawaterk to verify
      const invoiceData = await getInvoiceData(invoiceId);

      if (invoiceData.paid !== 1) {
        return c.json({ data: { status: 'pending', fawaterkPaid: false } });
      }

      // Payment confirmed - process it
      const processResult = await processSuccessfulPayment(payment.id);
      return c.json({ data: { status: 'paid', ...processResult } });
    } catch (error) {
      if (error instanceof ApiError) {
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
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
      },
    });
  });

  // GET /payments/price-preview - Preview price for an item
  app.get('/payments/price-preview', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    // Validate query parameters with Zod
    const pricePreviewSchema = z.object({
      itemType: z.enum(['event', 'track', 'subscription']),
      itemId: z.string().uuid().optional(),
    });

    const parseResult = pricePreviewSchema.safeParse({
      itemType: c.req.query('itemType'),
      itemId: c.req.query('itemId') || undefined,
    });

    if (!parseResult.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid parameters' } }, 400);
    }

    const { itemType, itemId } = parseResult.data;

    try {
      const { amountCents, itemName } = await calculatePrice(
        session.user.id,
        itemType,
        itemId ?? null,
      );

      // Get subscription status for context
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, session.user.id),
            eq(subscriptions.status, 'active'),
            gte(subscriptions.endsAt, new Date()),
          ),
        );

      return c.json({
        data: {
          itemName,
          amountCents,
          amountFormatted: `${(amountCents / 100).toFixed(2)} EGP`,
          isSubscriber: !!subscription,
          isFree: amountCents === 0,
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

  // POST /payments/webhook - Fawaterk webhook for server-to-server payment confirmation
  // This endpoint is NOT authenticated via session - uses HMAC signature verification
  app.post('/payments/webhook', async (c) => {
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

    // Find payment by Fawaterk invoice ID
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.fawaterkInvoiceId, webhookData.invoice_id));

    if (!payment) {
      console.error('[payments/webhook] Payment not found for invoice:', webhookData.invoice_id);
      return c.json({ error: { code: 'PAYMENT_NOT_FOUND' } }, 404);
    }

    // Skip if already processed
    if (payment.status === 'paid') {
      return c.json({ data: { status: 'paid', alreadyProcessed: true } });
    }

    if (payment.status !== 'pending') {
      return c.json({ data: { status: payment.status } });
    }

    try {
      // Process the successful payment
      const processResult = await processSuccessfulPayment(payment.id);
      console.log('[payments/webhook] Payment processed:', payment.id);
      return c.json({ data: { status: 'paid', ...processResult } });
    } catch (error) {
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
  });
}
