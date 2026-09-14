import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { env } from '../../../config/env.js';
import { db } from '../../../db/client.js';
import { ecdBookings, ecdTickets } from '../../../db/schema/ecd.js';
import { sendEcdTicketEmail } from '../../../services/email.js';
import { makeBookingAccessToken } from './helpers.js';

function ticketPackageName(type: string) {
  return type === 'ct' ? 'Control Tower Pass' : 'Full Journey Pass';
}

function confirmBaseUrl() {
  return (
    env.ECD_CONFIRM_BASE_URL ||
    env.ECD_CORS_ALLOWLIST.find((o) => o.startsWith('http')) ||
    'http://127.0.0.1:5500'
  ).replace(/\/+$/, '');
}

export async function sendSingleEcdTicketEmail(params: {
  ticketId: string;
  toEmail?: string;
}) {
  const [ticket] = await db
    .select()
    .from(ecdTickets)
    .where(eq(ecdTickets.id, params.ticketId))
    .limit(1);
  if (!ticket) {
    return { ok: false as const, code: 'TICKET_NOT_FOUND' as const };
  }

  const [booking] = await db
    .select()
    .from(ecdBookings)
    .where(eq(ecdBookings.id, ticket.bookingId))
    .limit(1);
  if (!booking) {
    return { ok: false as const, code: 'BOOKING_NOT_FOUND' as const };
  }

  const to = (params.toEmail || ticket.attendeeEmail || '').trim().toLowerCase();
  if (!to || !to.includes('@')) {
    return { ok: false as const, code: 'INVALID_EMAIL' as const };
  }

  const qrDataUrl = await QRCode.toDataURL(ticket.serial, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
    color: { dark: '#101010', light: '#FFFFFF' },
  });

  const access = makeBookingAccessToken(booking.orderCode);
  // Prefer ticket serial in the URL when it matches the order (single-ticket unify).
  const linkCode = ticket.serial || booking.orderCode;
  const confirmationUrl = `${confirmBaseUrl()}/booking-confirmation.html?order=${encodeURIComponent(linkCode)}&access=${encodeURIComponent(access)}`;

  await sendEcdTicketEmail({
    email: to,
    attendeeName: ticket.attendeeName,
    serial: ticket.serial,
    orderCode: booking.orderCode,
    ticketName: ticketPackageName(booking.ticketType),
    eventTitle: env.ECD_EVENT_TITLE,
    eventStartIso: env.ECD_EVENT_START_ISO,
    eventLocation: env.ECD_EVENT_LOCATION,
    qrDataUrl,
    confirmationUrl,
  });

  return { ok: true as const, email: to, ticketId: ticket.id, serial: ticket.serial };
}

/** Fire-and-forget after payment — never throws to caller. */
export async function sendPaidBookingTicketEmails(bookingId: string) {
  const tickets = await db.select().from(ecdTickets).where(eq(ecdTickets.bookingId, bookingId));
  const results: Array<{ ticketId: string; ok: boolean; error?: string }> = [];

  for (const ticket of tickets) {
    try {
      const result = await sendSingleEcdTicketEmail({ ticketId: ticket.id });
      results.push({
        ticketId: ticket.id,
        ok: result.ok,
        error: result.ok ? undefined : result.code,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'send_failed';
      console.error('[ecd] ticket email failed', { ticketId: ticket.id, message });
      results.push({ ticketId: ticket.id, ok: false, error: message });
    }
  }

  console.info('[ecd] ticket emails dispatched', {
    bookingId,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  });

  return results;
}
