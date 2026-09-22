import { eq } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { env } from '../../../config/env.js';
import { db } from '../../../db/client.js';
import { ecdBookings, ecdHtmlForms, ecdTickets } from '../../../db/schema/ecd.js';
import {
  ecdBookingPageUrl,
  formatMoneyEgp,
  getBearerToken,
  hashToken,
  maskEmail,
  requireEcdToken,
  resolveEcdToken,
  splitBuyerName,
  ticketDisplayName,
  verifyBookingAccessToken,
} from './helpers.js';
import { loadWorkshopRows, reserveWorkshopsForBooking } from './workshopReserve.js';

export async function serializeEcdBooking(bookingId: string) {
  const [booking] = await db.select().from(ecdBookings).where(eq(ecdBookings.id, bookingId)).limit(1);
  if (!booking) return null;

  const tickets = await db
    .select()
    .from(ecdTickets)
    .where(eq(ecdTickets.bookingId, bookingId));

  let form: typeof ecdHtmlForms.$inferSelect | null = null;
  if (booking.htmlFormId) {
    const [row] = await db
      .select()
      .from(ecdHtmlForms)
      .where(eq(ecdHtmlForms.id, booking.htmlFormId))
      .limit(1);
    form = row ?? null;
  }

  const workshops = await loadWorkshopRows(bookingId);
  const { firstName } = splitBuyerName(booking.buyerName);
  const name = await ticketDisplayName(booking.ticketType);
  const bookingPageUrl = ecdBookingPageUrl(booking.orderCode);

  return {
    bookingId: booking.id,
    orderCode: booking.orderCode,
    bookingPageUrl,
    paymentStatus: booking.paymentStatus,
    ticketType: booking.ticketType,
    ticketName: name,
    qty: booking.qty,
    unitPriceCents: booking.unitPriceCents,
    discountCents: booking.discountCents,
    totalCents: booking.totalCents,
    amountFormatted: formatMoneyEgp(booking.totalCents),
    promoCode: booking.promoCode,
    buyerName: booking.buyerName,
    buyerFirstName: firstName,
    buyerEmail: booking.buyerEmail,
    maskedEmail: maskEmail(booking.buyerEmail),
    buyerMobile: booking.buyerMobile,
    paidAt: booking.paidAt?.toISOString() ?? null,
    venueCheckedInAt: booking.venueCheckedInAt?.toISOString() ?? null,
    paymentMethodName: booking.paymentMethodName,
    paymentRef: `PAY-${booking.orderCode}`,
    event: {
      title: env.ECD_EVENT_TITLE,
      startIso: env.ECD_EVENT_START_ISO,
      endIso: env.ECD_EVENT_END_ISO,
      location: env.ECD_EVENT_LOCATION,
    },
    form: form
      ? {
          company: form.company,
          jobTitle: form.jobTitle,
          country: form.country,
          needInvoice: form.needInvoice === 1,
          invoiceCompany: form.invoiceCompany,
          taxId: form.taxId,
          billingAddress: form.billingAddress,
          store: form.store,
          linkedinUrl: form.linkedinUrl,
          facebookUrl: form.facebookUrl,
          accessibilityNeeds: form.accessibilityNeeds,
          newsOptIn: form.newsOptIn === 1,
        }
      : null,
    tickets: tickets.map((t) => ({
      id: t.id,
      serial: t.serial,
      status: t.status,
      attendeeName: t.attendeeName,
      attendeeEmail: t.attendeeEmail,
      attendeeMobile: t.attendeeMobile,
      attendeeCompany: t.attendeeCompany,
      attendeeTitle: t.attendeeTitle,
      interests: t.interests ?? [],
      ticketName: name,
      qrPayload: bookingPageUrl,
    })),
    workshops,
  };
}

export async function findBookingByPublicCode(code: string) {
  const [byOrder] = await db
    .select()
    .from(ecdBookings)
    .where(eq(ecdBookings.orderCode, code))
    .limit(1);
  if (byOrder) return byOrder;

  const [ticket] = await db.select().from(ecdTickets).where(eq(ecdTickets.serial, code)).limit(1);
  if (!ticket) return null;

  const [byTicket] = await db
    .select()
    .from(ecdBookings)
    .where(eq(ecdBookings.id, ticket.bookingId))
    .limit(1);
  return byTicket ?? null;
}

async function authorizeBookingView(
  booking: typeof ecdBookings.$inferSelect,
  opts: { bearer?: string; publicToken?: string; access?: string },
) {
  if (opts.bearer) {
    const resolved = await resolveEcdToken(opts.bearer);
    if (resolved && resolved.bookingId === booking.id) return true;
  }
  if (opts.publicToken && hashToken(opts.publicToken) === booking.publicTokenHash) {
    return true;
  }
  if (verifyBookingAccessToken(booking.orderCode, opts.access)) {
    return true;
  }
  return false;
}

const reserveSchema = z.object({
  sessionSlugs: z.array(z.string().trim().min(1).max(40)).max(12),
});

export function registerEcdBookingRoutes(app: Hono) {
  app.get('/booking/:orderCode', async (c) => {
    const code = decodeURIComponent(c.req.param('orderCode'));
    const publicToken = c.req.query('publicToken') || undefined;
    const access = c.req.query('access') || undefined;
    const bearer = getBearerToken(c);

    const booking = await findBookingByPublicCode(code);
    if (!booking) {
      return c.json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } }, 404);
    }

    const authorized = await authorizeBookingView(booking, {
      bearer: bearer || undefined,
      publicToken,
      access,
    });
    if (!authorized) {
      return c.json(
        { error: { code: 'ECD_FORBIDDEN', message: 'Not allowed to view this booking.' } },
        403,
      );
    }

    const data = await serializeEcdBooking(booking.id);
    return c.json({ data });
  });

  app.get('/me/booking', requireEcdToken, async (c) => {
    const token = c.get('ecdToken');
    const data = await serializeEcdBooking(token.bookingId);
    if (!data) {
      return c.json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } }, 404);
    }
    return c.json({ data });
  });

  /**
   * Persist Full Journey workshop picks (HTML confirmation — Bearer / publicToken / access).
   */
  app.post('/booking/:orderCode/workshops', async (c) => {
    const code = decodeURIComponent(c.req.param('orderCode'));
    const publicToken = c.req.query('publicToken') || undefined;
    const access = c.req.query('access') || undefined;
    const bearer = getBearerToken(c);

    const booking = await findBookingByPublicCode(code);
    if (!booking) {
      return c.json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } }, 404);
    }

    const authorized = await authorizeBookingView(booking, {
      bearer: bearer || undefined,
      publicToken,
      access,
    });
    if (!authorized) {
      return c.json({ error: { code: 'ECD_FORBIDDEN', message: 'Not allowed.' } }, 403);
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
      console.error('[ecd] workshop reserve failed', err);
      return c.json(
        { error: { code: 'RESERVE_FAILED', message: 'Could not save workshop selection.' } },
        500,
      );
    }
  });
}
