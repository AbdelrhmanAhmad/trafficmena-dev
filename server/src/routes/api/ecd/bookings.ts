import { asc, eq } from 'drizzle-orm';
import type { Hono } from 'hono';
import { env } from '../../../config/env.js';
import { db } from '../../../db/client.js';
import { ecdBookings, ecdHtmlForms, ecdTickets } from '../../../db/schema/ecd.js';
import {
  formatMoneyEgp,
  getBearerToken,
  hashToken,
  maskEmail,
  requireEcdToken,
  resolveEcdToken,
  splitBuyerName,
  verifyBookingAccessToken,
} from './helpers.js';

function ticketName(type: string) {
  return type === 'ct' ? 'Control Tower Pass' : 'Full Journey Pass';
}

async function serializeBooking(bookingId: string) {
  const [booking] = await db.select().from(ecdBookings).where(eq(ecdBookings.id, bookingId)).limit(1);
  if (!booking) return null;

  const tickets = await db
    .select()
    .from(ecdTickets)
    .where(eq(ecdTickets.bookingId, bookingId))
    .orderBy(asc(ecdTickets.sortOrder));

  let form = null;
  if (booking.htmlFormId) {
    const [row] = await db
      .select()
      .from(ecdHtmlForms)
      .where(eq(ecdHtmlForms.id, booking.htmlFormId))
      .limit(1);
    form = row ?? null;
  }

  const { firstName } = splitBuyerName(booking.buyerName);

  return {
    bookingId: booking.id,
    orderCode: booking.orderCode,
    paymentStatus: booking.paymentStatus,
    ticketType: booking.ticketType,
    ticketName: ticketName(booking.ticketType),
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
    paymentMethodName: booking.paymentMethodName,
    paymentRef: booking.fawaterkIntentKey
      ? `PAY-${booking.orderCode}`
      : `PAY-${booking.orderCode}`,
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
      ticketName: ticketName(booking.ticketType),
    })),
  };
}

/** Resolve by order code OR ticket serial (unified public IDs). */
async function findBookingByPublicCode(code: string) {
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

    let authorized = false;
    if (bearer) {
      const resolved = await resolveEcdToken(bearer);
      if (resolved && resolved.bookingId === booking.id) authorized = true;
    }
    if (!authorized && publicToken) {
      if (hashToken(publicToken) === booking.publicTokenHash) authorized = true;
    }
    // Email / shared confirmation links (HMAC of order code).
    if (!authorized && verifyBookingAccessToken(booking.orderCode, access)) {
      authorized = true;
    }

    if (!authorized) {
      return c.json({ error: { code: 'ECD_FORBIDDEN', message: 'Not allowed to view this booking.' } }, 403);
    }

    const data = await serializeBooking(booking.id);
    return c.json({ data });
  });

  app.get('/me/booking', requireEcdToken, async (c) => {
    const token = c.get('ecdToken');
    const data = await serializeBooking(token.bookingId);
    if (!data) {
      return c.json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } }, 404);
    }
    return c.json({ data });
  });
}
