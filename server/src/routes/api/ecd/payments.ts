import { and, eq } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { env } from '../../../config/env.js';
import { db } from '../../../db/client.js';
import { ecdBookings, ecdTickets } from '../../../db/schema/ecd.js';
import { profiles, users } from '../../../db/schema/index.js';
import {
  createTransaction,
  getPaymentMethods,
  getTransactionData,
  verifyTransactionWebhook,
} from '../../../services/fawaterk.js';
import {
  isEgyptianMobileE164,
  normalizeEgyptianWalletPhone,
  toFawaterkLocalPhone,
} from '../users-phone.js';
import { getRequestIp, requireManager } from '../utils.js';
import {
  ecdRateLimiter,
  ecdConfirmBaseUrl,
  formatMoneyEgp,
  isEcdSimulatePayments,
  loadBookingForToken,
  makeBookingAccessToken,
  requireEcdToken,
  splitBuyerName,
  ticketDisplayName,
  verifyBookingAccessToken,
} from './helpers.js';

const paySchema = z.object({
  paymentMethodId: z.number().int().positive(),
  walletPhone: z.string().trim().max(20).optional(),
  forceNewCode: z.boolean().optional(),
});

const verifySchema = z.object({
  bookingId: z.string().uuid().optional(),
});

async function markBookingPaid(params: {
  bookingId: string;
  transactionId?: number | null;
  source: 'verify' | 'webhook' | 'simulate' | 'admin';
}) {
  const now = new Date();

  // Simulate may promote draft → pending first, then complete.
  if (params.source === 'simulate') {
    await db
      .update(ecdBookings)
      .set({
        paymentStatus: 'pending',
        fawaterkIntentKey: `ecd_sim_${params.bookingId}`,
        paymentMethodName: 'ECD_SIMULATE',
        updatedAt: now,
      })
      .where(and(eq(ecdBookings.id, params.bookingId), eq(ecdBookings.paymentStatus, 'draft')));
  }

  const [updated] = await db
    .update(ecdBookings)
    .set({
      paymentStatus: 'paid',
      paidAt: now,
      fawaterkTransactionId: params.transactionId ?? undefined,
      updatedAt: now,
    })
    .where(and(eq(ecdBookings.id, params.bookingId), eq(ecdBookings.paymentStatus, 'pending')))
    .returning();

  if (!updated) {
    const [existing] = await db
      .select()
      .from(ecdBookings)
      .where(eq(ecdBookings.id, params.bookingId))
      .limit(1);
    return { booking: existing ?? null, alreadyProcessed: existing?.paymentStatus === 'paid' };
  }

  await db
    .update(ecdTickets)
    .set({ status: 'active', updatedAt: now })
    .where(eq(ecdTickets.bookingId, params.bookingId));

  console.info('[ecd] booking paid', {
    bookingId: params.bookingId,
    source: params.source,
    orderCode: updated.orderCode,
  });

  // Non-blocking: ticket QR emails to attendees
  void import('./ticketEmail.js')
    .then(({ sendPaidBookingTicketEmails }) => sendPaidBookingTicketEmails(params.bookingId))
    .catch((error) => console.error('[ecd] ticket email batch failed', error));

  return { booking: updated, alreadyProcessed: false };
}

type EcdBookingRow = typeof ecdBookings.$inferSelect;

/**
 * Ask Fawaterk (or ECD simulate) whether this booking is paid and fulfill if so.
 * Shared by buyer verify, access-token verify, and admin verify.
 */
export async function reconcileEcdBookingPayment(
  booking: EcdBookingRow,
  source: 'verify' | 'admin' | 'simulate' = 'verify',
): Promise<{
  status: string;
  alreadyProcessed?: boolean;
  bookingId: string;
  orderCode: string;
  access: string;
  simulated?: boolean;
}> {
  const access = makeBookingAccessToken(booking.orderCode);

  if (booking.paymentStatus === 'paid') {
    return {
      status: 'paid',
      alreadyProcessed: true,
      bookingId: booking.id,
      orderCode: booking.orderCode,
      access,
    };
  }

  if (isEcdSimulatePayments()) {
    const result = await markBookingPaid({
      bookingId: booking.id,
      transactionId: null,
      source: 'simulate',
    });
    return {
      status: 'paid',
      simulated: true,
      alreadyProcessed: result.alreadyProcessed,
      bookingId: booking.id,
      orderCode: booking.orderCode,
      access,
    };
  }

  if (!booking.fawaterkIntentKey) {
    return {
      status: booking.paymentStatus || 'pending',
      bookingId: booking.id,
      orderCode: booking.orderCode,
      access,
    };
  }

  const gateway = await getTransactionData(booking.fawaterkIntentKey);
  if (gateway.expiredOrMissing) {
    await db
      .update(ecdBookings)
      .set({ paymentStatus: 'expired', updatedAt: new Date() })
      .where(eq(ecdBookings.id, booking.id));
    return {
      status: 'expired',
      bookingId: booking.id,
      orderCode: booking.orderCode,
      access,
    };
  }

  if (gateway.paid === 1) {
    const result = await markBookingPaid({
      bookingId: booking.id,
      transactionId: gateway.transactionId ?? null,
      source: source === 'admin' ? 'admin' : 'verify',
    });
    return {
      status: 'paid',
      alreadyProcessed: result.alreadyProcessed,
      bookingId: booking.id,
      orderCode: booking.orderCode,
      access,
    };
  }

  return {
    status: booking.paymentStatus || 'pending',
    bookingId: booking.id,
    orderCode: booking.orderCode,
    access,
  };
}

export function registerEcdPaymentRoutes(app: Hono) {
  app.get('/payment-methods', requireEcdToken, async (c) => {
    const ip = getRequestIp(c);
    const limited = ecdRateLimiter.consume(`ecd:methods:${ip}`, { limit: 60, windowMs: 60_000 });
    if (!limited.allowed) {
      return c.json({ error: { code: 'ECD_RATE_LIMITED', message: 'Too many requests.' } }, 429);
    }

    try {
      const methods = await getPaymentMethods();
      return c.json({ data: methods });
    } catch (error) {
      console.error('[ecd] payment methods failed', error);
      return c.json(
        { error: { code: 'ECD_METHODS_UNAVAILABLE', message: 'Payment methods unavailable.' } },
        503,
      );
    }
  });

  app.post('/pay', requireEcdToken, async (c) => {
    const token = c.get('ecdToken');
    const ip = getRequestIp(c);
    const limited = ecdRateLimiter.consume(`ecd:pay:${token.userId}`, {
      limit: 8,
      windowMs: 60_000,
    });
    if (!limited.allowed) {
      return c.json(
        { error: { code: 'ECD_RATE_LIMITED', message: 'Too many payment attempts.' } },
        429,
      );
    }

    const body = paySchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid pay payload.' } }, 400);
    }

    const booking = await loadBookingForToken(token.bookingId);
    if (!booking) {
      return c.json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } }, 404);
    }

    if (booking.expiresAt.getTime() <= Date.now()) {
      await db
        .update(ecdBookings)
        .set({ paymentStatus: 'expired', updatedAt: new Date() })
        .where(eq(ecdBookings.id, booking.id));
      return c.json(
        {
          error: {
            code: 'hold_expired',
            message: 'Your hold expired — we re-checked availability.',
          },
        },
        410,
      );
    }

    if (booking.paymentStatus === 'paid') {
      return c.json({
        data: {
          status: 'duplicate',
          code: 'duplicate',
          bookingId: booking.id,
          orderCode: booking.orderCode,
          message: 'This booking already exists',
        },
      });
    }

    if (booking.paymentStatus === 'pending' && booking.fawaterkIntentKey && !body.data.forceNewCode) {
      return c.json({
        data: {
          status: 'pending',
          bookingId: booking.id,
          orderCode: booking.orderCode,
          redirectUrl: undefined,
          fawryCode: booking.fawryCode,
          amanCode: booking.amanCode,
          masaryCode: booking.masaryCode,
          meezaReference: booking.meezaReference,
          meezaQrCode: booking.meezaQrCode,
          amountFormatted: formatMoneyEgp(booking.totalCents),
        },
      });
    }

    const [user] = await db
      .select({
        email: users.email,
        name: users.name,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        phoneNumber: profiles.phoneNumber,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.id, users.id))
      .where(eq(users.id, token.userId))
      .limit(1);

    if (!user) {
      return c.json({ error: { code: 'USER_NOT_FOUND', message: 'Buyer account missing.' } }, 404);
    }

    let methods: Awaited<ReturnType<typeof getPaymentMethods>> = [];
    try {
      methods = await getPaymentMethods();
    } catch (error) {
      console.error('[ecd] methods lookup failed', error);
      return c.json(
        { error: { code: 'ECD_METHODS_UNAVAILABLE', message: 'Payment service unavailable.' } },
        503,
      );
    }

    const method = methods.find((m) => m.paymentId === body.data.paymentMethodId);
    if (!method) {
      return c.json(
        { error: { code: 'INVALID_METHOD', message: 'Selected payment method is not available.' } },
        400,
      );
    }

    const methodName = method.name_en || '';
    const isWallet = methodName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .includes('mobilewallet');
    let walletPhone = body.data.walletPhone
      ? normalizeEgyptianWalletPhone(body.data.walletPhone)
      : '';
    if (isWallet) {
      if (!walletPhone || !isEgyptianMobileE164(walletPhone)) {
        return c.json(
          {
            error: {
              code: 'WALLET_PHONE_REQUIRED',
              message: 'A valid Egyptian mobile wallet number is required.',
            },
          },
          400,
        );
      }
    } else {
      walletPhone = '';
    }

    const { firstName, lastName } = splitBuyerName(booking.buyerName);
    const contactPhone = walletPhone || booking.buyerMobile || user.phoneNumber || undefined;
    const confirmBase = ecdConfirmBaseUrl();
    const apiBase = (env.API_BASE_URL || `http://localhost:${env.PORT || 3001}`).replace(/\/+$/, '');
    const ticketName = await ticketDisplayName(booking.ticketType);
    const unitEgp = booking.unitPriceCents / 100;
    const dueDate = new Date(Date.now() + env.ECD_TOKEN_TTL_HOURS * 60 * 60 * 1000);

    // ECD test mode: skip Mastercard/Fawaterk — stay on checkout and use Check Status.
    if (isEcdSimulatePayments()) {
      await db
        .update(ecdBookings)
        .set({
          paymentStatus: 'pending',
          paymentMethodId: body.data.paymentMethodId,
          paymentMethodName: `ECD_SIMULATE:${methodName || body.data.paymentMethodId}`,
          fawaterkIntentKey: `ecd_sim_${booking.id}`,
          updatedAt: new Date(),
        })
        .where(eq(ecdBookings.id, booking.id));

      console.info('[ecd] simulate pay — awaiting Check Status', {
        bookingId: booking.id,
        orderCode: booking.orderCode,
      });

      return c.json({
        data: {
          bookingId: booking.id,
          orderCode: booking.orderCode,
          status: 'pending',
          simulated: true,
          redirectUrl: null,
          invoiceUrl: null,
          message: 'Test mode: use Check Status to complete payment.',
        },
      });
    }

    try {
      const txResult = await createTransaction({
        paymentMethodId: body.data.paymentMethodId,
        cartTotal: booking.totalCents / 100,
        currency: booking.currency || 'EGP',
        customer: {
          first_name: user.firstName || firstName,
          last_name: user.lastName || lastName,
          email: user.email,
          phone: contactPhone ? toFawaterkLocalPhone(contactPhone) : undefined,
        },
        cartItems: [
          {
            name: `ECommerce Day 2026 — ${ticketName}`,
            price: unitEgp,
            quantity: booking.qty,
          },
        ],
        redirectionUrls: {
          successUrl: `${confirmBase}/booking-confirmation.html?order=${encodeURIComponent(booking.orderCode)}&access=${encodeURIComponent(makeBookingAccessToken(booking.orderCode))}&status=success`,
          failUrl: `${confirmBase}/checkout.html?order=${encodeURIComponent(booking.orderCode)}&status=failed`,
          pendingUrl: `${confirmBase}/booking-confirmation.html?order=${encodeURIComponent(booking.orderCode)}&access=${encodeURIComponent(makeBookingAccessToken(booking.orderCode))}&status=pending`,
          webhookUrl: `${apiBase}/api/ecd/payments/webhook`,
        },
        payload: {
          ecd: true,
          bookingId: booking.id,
          orderCode: booking.orderCode,
        },
        dueDate,
        mobileWalletNumber: isWallet && walletPhone ? toFawaterkLocalPhone(walletPhone) : undefined,
      });

      const [updated] = await db
        .update(ecdBookings)
        .set({
          paymentStatus: 'pending',
          paymentMethodId: body.data.paymentMethodId,
          paymentMethodName: methodName,
          fawaterkIntentKey: txResult.intentKey,
          fawryCode: txResult.paymentData.fawryCode ?? null,
          amanCode: txResult.paymentData.amanCode ?? null,
          masaryCode: txResult.paymentData.masaryCode ?? null,
          meezaReference: txResult.paymentData.meezaReference ?? null,
          meezaQrCode: txResult.paymentData.meezaQrCode ?? null,
          updatedAt: new Date(),
        })
        .where(eq(ecdBookings.id, booking.id))
        .returning();

      return c.json({
        data: {
          status: 'processing',
          bookingId: updated.id,
          orderCode: updated.orderCode,
          redirectUrl: txResult.redirectUrl,
          fawryCode: updated.fawryCode,
          amanCode: updated.amanCode,
          masaryCode: updated.masaryCode,
          meezaReference: updated.meezaReference,
          meezaQrCode: updated.meezaQrCode,
          amountFormatted: formatMoneyEgp(updated.totalCents),
        },
      });
    } catch (error) {
      console.error('[ecd] createTransaction failed', error);
      await db
        .update(ecdBookings)
        .set({ paymentStatus: 'failed', updatedAt: new Date() })
        .where(eq(ecdBookings.id, booking.id));
      return c.json(
        {
          error: {
            code: 'failed',
            message: "Payment didn't go through",
          },
        },
        502,
      );
    }
  });

  app.post('/verify', requireEcdToken, async (c) => {
    const token = c.get('ecdToken');
    const limited = ecdRateLimiter.consume(`ecd:verify:${token.userId}`, {
      limit: 30,
      windowMs: 60_000,
    });
    if (!limited.allowed) {
      return c.json({ error: { code: 'ECD_RATE_LIMITED', message: 'Too many verify attempts.' } }, 429);
    }

    const body = verifySchema.safeParse(await c.req.json().catch(() => ({})));
    const bookingId = body.success && body.data.bookingId ? body.data.bookingId : token.bookingId;
    if (bookingId !== token.bookingId) {
      return c.json({ error: { code: 'BOOKING_MISMATCH', message: 'Booking does not match token.' } }, 403);
    }

    const booking = await loadBookingForToken(bookingId);
    if (!booking) {
      return c.json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } }, 404);
    }

    try {
      const result = await reconcileEcdBookingPayment(booking, 'verify');
      return c.json({ data: result });
    } catch (error) {
      console.error('[ecd] verify failed', error);
      return c.json(
        { error: { code: 'ECD_VERIFY_FAILED', message: 'Unable to verify payment right now.' } },
        502,
      );
    }
  });

  /**
   * Public verify after Fawaterk redirect (no checkout Bearer required).
   * Auth: booking access token from success/pending URL.
   */
  app.post('/booking/:orderCode/verify-payment', async (c) => {
    const ip = getRequestIp(c);
    const limited = ecdRateLimiter.consume(`ecd:verify-access:${ip}`, {
      limit: 40,
      windowMs: 60_000,
    });
    if (!limited.allowed) {
      return c.json({ error: { code: 'ECD_RATE_LIMITED', message: 'Too many verify attempts.' } }, 429);
    }

    const orderCode = c.req.param('orderCode');
    const body = await c.req.json().catch(() => ({}));
    const access =
      (typeof body?.access === 'string' && body.access) ||
      c.req.query('access') ||
      '';

    if (!verifyBookingAccessToken(orderCode, access)) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Invalid booking access.' } }, 403);
    }

    const [booking] = await db
      .select()
      .from(ecdBookings)
      .where(eq(ecdBookings.orderCode, orderCode))
      .limit(1);
    if (!booking) {
      return c.json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } }, 404);
    }

    try {
      const result = await reconcileEcdBookingPayment(booking, 'verify');
      return c.json({ data: result });
    } catch (error) {
      console.error('[ecd] access verify failed', error);
      return c.json(
        { error: { code: 'ECD_VERIFY_FAILED', message: 'Unable to verify payment right now.' } },
        502,
      );
    }
  });

  /** Admin: pull latest status from Fawaterk and mark paid if confirmed. */
  app.post('/admin/registrations/:id/verify-payment', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = c.req.param('id');
    const [booking] = await db.select().from(ecdBookings).where(eq(ecdBookings.id, id)).limit(1);
    if (!booking) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Registration not found.' } }, 404);
    }

    try {
      const result = await reconcileEcdBookingPayment(booking, 'admin');
      const [fresh] = await db.select().from(ecdBookings).where(eq(ecdBookings.id, id)).limit(1);
      return c.json({
        data: {
          ...result,
          paymentStatus: fresh?.paymentStatus ?? result.status,
          paidAt: fresh?.paidAt?.toISOString() ?? null,
          amountFormatted: fresh ? formatMoneyEgp(fresh.totalCents) : undefined,
        },
      });
    } catch (error) {
      console.error('[ecd] admin verify failed', error);
      return c.json(
        { error: { code: 'ECD_VERIFY_FAILED', message: 'Unable to verify payment with gateway.' } },
        502,
      );
    }
  });

  app.post('/payments/webhook', async (c) => {
    const ip = getRequestIp(c);
    const limited = ecdRateLimiter.consume(`ecd:webhook:${ip}`, { limit: 100, windowMs: 60_000 });
    if (!limited.allowed) {
      return c.json({ error: { code: 'ECD_RATE_LIMITED', message: 'Too many webhooks.' } }, 429);
    }

    const raw = await c.req.json().catch(() => null);
    const schema = z
      .object({
        transaction_key: z.string().min(1),
        transaction_id: z.union([z.number(), z.string()]),
        status: z.string().min(1).max(50),
        payment_method: z.string().min(1).max(100),
        transactionHashKey: z.string().min(1).max(512),
      })
      .passthrough();

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_WEBHOOK', message: 'Invalid webhook body.' } }, 400);
    }

    const ok = verifyTransactionWebhook({
      transaction_id: parsed.data.transaction_id,
      transaction_key: parsed.data.transaction_key,
      payment_method: parsed.data.payment_method,
      hash: parsed.data.transactionHashKey,
    });
    if (!ok) {
      return c.json({ error: { code: 'WEBHOOK_INVALID_SIGNATURE', message: 'Invalid signature.' } }, 401);
    }

    const [booking] = await db
      .select()
      .from(ecdBookings)
      .where(eq(ecdBookings.fawaterkIntentKey, parsed.data.transaction_key))
      .limit(1);

    if (!booking) {
      // Not an ECD intent — acknowledge so Fawaterk does not retry forever.
      return c.json({ data: { ignored: true } });
    }

    const status = parsed.data.status.toLowerCase();
    if (status.includes('fail') || status.includes('cancel')) {
      await db
        .update(ecdBookings)
        .set({
          paymentStatus: status.includes('cancel') ? 'cancelled' : 'failed',
          updatedAt: new Date(),
        })
        .where(eq(ecdBookings.id, booking.id));
      return c.json({ data: { ok: true, status: 'failed' } });
    }

    // Re-verify with gateway before fulfilling
    try {
      const gateway = await getTransactionData(parsed.data.transaction_key);
      if (gateway.paid === 1) {
        const txId =
          typeof parsed.data.transaction_id === 'number'
            ? parsed.data.transaction_id
            : Number(parsed.data.transaction_id);
        await markBookingPaid({
          bookingId: booking.id,
          transactionId: Number.isFinite(txId) ? txId : gateway.transactionId ?? null,
          source: 'webhook',
        });
      }
    } catch (error) {
      console.error('[ecd] webhook reconcile failed', error);
    }

    return c.json({ data: { ok: true } });
  });
}
