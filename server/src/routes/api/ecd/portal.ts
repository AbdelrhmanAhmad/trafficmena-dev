import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../../db/client.js';
import { ecdBookings } from '../../../db/schema/ecd.js';
import { profiles } from '../../../db/schema/index.js';
import { sendOtpEmail } from '../../../services/email.js';
import { getSessionFromRequest } from '../../../utils/session.js';
import { normalizeEmail, normalizeRole, requireManager } from '../utils.js';
import { findBookingByPublicCode, serializeEcdBooking } from './bookings.js';
import { ecdBookingAppBaseUrl, maskEmail } from './helpers.js';
import {
  canRequestPortalOtp,
  getBearerRaw,
  issuePortalOtp,
  makePortalEditToken,
  verifyPortalEditToken,
  verifyPortalOtpCode,
} from './portalEditAuth.js';
import { reserveWorkshopsForBooking } from './workshopReserve.js';

const reserveSchema = z.object({
  sessionSlugs: z.array(z.string().trim().min(1).max(40)).max(12),
});

const otpVerifySchema = z.object({
  otp: z.string().trim().min(4).max(8),
});

type MutateAuth =
  | { mode: 'buyer'; userId: string }
  | { mode: 'staff'; userId: string; role: string }
  | { mode: 'otp'; bookingId: string };

async function resolvePortalMutateAuth(
  c: Context,
  booking: typeof ecdBookings.$inferSelect,
): Promise<MutateAuth | null> {
  const editToken = getBearerRaw(c);
  if (verifyPortalEditToken(editToken, booking.id)) {
    return { mode: 'otp', bookingId: booking.id };
  }

  const session = await getSessionFromRequest(c);
  if (!session?.user) return null;

  if (session.user.id === booking.userId) {
    return { mode: 'buyer', userId: session.user.id };
  }

  const [record] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1);
  const role = normalizeRole(record?.role ?? null);
  if (role === 'owner' || role === 'admin' || role === 'manager') {
    return { mode: 'staff', userId: session.user.id, role };
  }
  return null;
}

async function resolveViewer(
  c: Context,
  booking: typeof ecdBookings.$inferSelect,
): Promise<'anonymous' | 'buyer' | 'staff' | 'otp'> {
  const editToken = getBearerRaw(c);
  if (verifyPortalEditToken(editToken, booking.id)) return 'otp';

  const session = await getSessionFromRequest(c);
  if (!session?.user) return 'anonymous';
  if (session.user.id === booking.userId) return 'buyer';

  const [record] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1);
  const role = normalizeRole(record?.role ?? null);
  if (role === 'owner' || role === 'admin' || role === 'manager') return 'staff';
  return 'anonymous';
}

/**
 * SPA portal for invite QR → `/ecd/booking/:orderCode`.
 * View is public (order code is the invite secret).
 * Mutations: ECD portal OTP edit-token, buyer Better Auth session, or staff.
 */
export function registerEcdPortalRoutes(app: Hono) {
  app.get('/portal/:orderCode', async (c) => {
    const code = decodeURIComponent(c.req.param('orderCode'));
    const booking = await findBookingByPublicCode(code);
    if (!booking || booking.paymentStatus !== 'paid') {
      return c.json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } }, 404);
    }

    const data = await serializeEcdBooking(booking.id);
    if (!data) {
      return c.json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } }, 404);
    }

    const viewer = await resolveViewer(c, booking);
    const canEdit = viewer === 'buyer' || viewer === 'staff' || viewer === 'otp';

    return c.json({
      data: {
        ...data,
        viewer: viewer === 'otp' ? 'buyer' : viewer,
        buyerEmailLocked: data.buyerEmail,
        maskedEmail: maskEmail(booking.buyerEmail),
        bookingAppBaseUrl: ecdBookingAppBaseUrl(),
        canEdit,
        canCheckIn: viewer === 'staff',
      },
    });
  });

  /** ECD-only OTP — no Turnstile; locked to booking buyer email. */
  app.post('/portal/:orderCode/otp/request', async (c) => {
    const code = decodeURIComponent(c.req.param('orderCode'));
    const booking = await findBookingByPublicCode(code);
    if (!booking || booking.paymentStatus !== 'paid') {
      return c.json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } }, 404);
    }

    const rate = canRequestPortalOtp(booking.id);
    if (!rate.ok) {
      return c.json({ error: { code: rate.code, message: rate.message } }, 429);
    }

    const email = normalizeEmail(booking.buyerEmail);
    if (!email || !email.includes('@')) {
      return c.json(
        { error: { code: 'INVALID_EMAIL', message: 'Booking has no valid buyer email.' } },
        400,
      );
    }

    const { otp, ttlMinutes } = issuePortalOtp(booking.id);
    try {
      await sendOtpEmail({ email, otp, ttlMinutes });
    } catch (err) {
      console.error('[ecd] portal OTP send failed', err);
      return c.json(
        { error: { code: 'OTP_SEND_FAILED', message: 'Could not send verification code.' } },
        500,
      );
    }

    return c.json({
      data: {
        sent: true,
        maskedEmail: maskEmail(email),
        ttlMinutes,
      },
    });
  });

  app.post('/portal/:orderCode/otp/verify', async (c) => {
    const code = decodeURIComponent(c.req.param('orderCode'));
    const booking = await findBookingByPublicCode(code);
    if (!booking || booking.paymentStatus !== 'paid') {
      return c.json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } }, 404);
    }

    const body = otpVerifySchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'OTP required.' } }, 400);
    }

    const checked = verifyPortalOtpCode(booking.id, body.data.otp);
    if (!checked.ok) {
      return c.json({ error: { code: checked.code, message: checked.message } }, 401);
    }

    const editToken = makePortalEditToken(booking.id);
    return c.json({
      data: {
        verified: true,
        editToken,
        expiresInSeconds: 2 * 60 * 60,
      },
    });
  });

  app.post('/portal/:orderCode/workshops', async (c) => {
    const code = decodeURIComponent(c.req.param('orderCode'));
    const booking = await findBookingByPublicCode(code);
    if (!booking) {
      return c.json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } }, 404);
    }

    const authz = await resolvePortalMutateAuth(c, booking);
    if (!authz) {
      return c.json(
        {
          error: {
            code: 'OTP_REQUIRED',
            message: 'Verify with the buyer email OTP, or sign in as staff.',
          },
        },
        401,
      );
    }

    const body = reserveSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json(
        { error: { code: 'INVALID_REQUEST', message: 'sessionSlugs array required.' } },
        400,
      );
    }

    try {
      const result = await reserveWorkshopsForBooking(booking, body.data.sessionSlugs);
      if (!result.ok) {
        return c.json(
          { error: { code: result.code, message: result.message, slug: result.slug } },
          result.status,
        );
      }
      return c.json({ data: { workshops: result.workshops, cleared: result.cleared } });
    } catch (err) {
      console.error('[ecd] portal workshop reserve failed', err);
      return c.json(
        { error: { code: 'RESERVE_FAILED', message: 'Could not save workshop selection.' } },
        500,
      );
    }
  });

  /** Staff-only venue check-in from the portal page (same as admin). */
  app.post('/portal/:orderCode/venue-check-in', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const code = decodeURIComponent(c.req.param('orderCode'));
    const booking = await findBookingByPublicCode(code);
    if (!booking) {
      return c.json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } }, 404);
    }
    if (booking.paymentStatus !== 'paid') {
      return c.json(
        { error: { code: 'NOT_PAID', message: 'Only paid bookings can check in.' } },
        400,
      );
    }
    if (booking.venueCheckedInAt) {
      return c.json({
        data: {
          alreadyCheckedIn: true,
          venueCheckedInAt: booking.venueCheckedInAt.toISOString(),
        },
      });
    }

    const [updated] = await db
      .update(ecdBookings)
      .set({ venueCheckedInAt: new Date(), updatedAt: new Date() })
      .where(eq(ecdBookings.id, booking.id))
      .returning({ venueCheckedInAt: ecdBookings.venueCheckedInAt });

    return c.json({
      data: {
        alreadyCheckedIn: false,
        venueCheckedInAt: updated.venueCheckedInAt?.toISOString() ?? null,
      },
    });
  });
}
