import { randomUUID } from 'node:crypto';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { env } from '../../../config/env.js';
import { db } from '../../../db/client.js';
import {
  ecdBookings,
  ecdCheckoutTokens,
  ecdHtmlForms,
  ecdSessions,
  ecdTickets,
  ecdWorkshopReservations,
} from '../../../db/schema/ecd.js';
import { profiles, users } from '../../../db/schema/index.js';
import { EmailDeliveryError } from '../../../services/email.js';
import { normalizeEgyptianWalletPhone } from '../users-phone.js';
import { escapeLikePattern, normalizeEmail, requireAdmin, requireManager } from '../utils.js';
import {
  calcEcdTotals,
  ecdBookingPageUrl,
  formatMoneyEgp,
  generateOpaqueToken,
  hashToken,
  makeOrderCode,
  splitBuyerName,
  ticketDisplayName,
  type EcdTicketType,
} from './helpers.js';
import { sendPaidBookingTicketEmails, sendSingleEcdTicketEmail } from './ticketEmail.js';

const listSchema = z.object({
  q: z.string().trim().max(120).optional(),
  ticketType: z.enum(['ct', 'fj']).optional(),
  status: z.enum(['draft', 'pending', 'paid', 'failed', 'expired', 'cancelled']).optional(),
  source: z.enum(['website', 'manual']).optional(),
  grantReason: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const createManualSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().email().max(255),
  phone: z.string().trim().min(5).max(40),
  ticketType: z.enum(['ct', 'fj']),
  isComplimentary: z.boolean().default(true),
  grantReason: z.string().trim().min(3).max(500),
});

const deleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

const updateTicketEmailSchema = z.object({
  attendeeEmail: z.string().email().max(255),
});

type ManualCreateInput = z.infer<typeof createManualSchema>;

async function createManualPaidBooking(params: {
  input: ManualCreateInput;
  staffUserId: string;
}) {
  const email = normalizeEmail(params.input.email);
  const phone =
    normalizeEgyptianWalletPhone(params.input.phone) ||
    params.input.phone.trim();
  const { firstName, lastName, name } = splitBuyerName(params.input.name);
  const totals = await calcEcdTotals({
    ticketType: params.input.ticketType as EcdTicketType,
    qty: 1,
    promoCode: null,
  });
  const unitPriceCents = totals.unitPriceCents;
  const totalCents = params.input.isComplimentary ? 0 : totals.totalCents;
  const discountCents = params.input.isComplimentary
    ? totals.unitPriceCents
    : totals.discountCents;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.ECD_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  const bookingId = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let userId = existing?.id;
    if (!userId) {
      const [created] = await tx
        .insert(users)
        .values({
          email,
          name,
          emailVerified: false,
        })
        .returning({ id: users.id });
      userId = created.id;
      await tx.insert(profiles).values({
        id: userId,
        firstName,
        lastName,
        phoneNumber: phone,
        role: 'user',
      });
    } else {
      await tx
        .update(profiles)
        .set({
          firstName,
          lastName,
          phoneNumber: phone,
          updatedAt: now,
        })
        .where(eq(profiles.id, userId));
      if (!existing?.name || existing.name === 'TrafficMENA Member') {
        await tx.update(users).set({ name, updatedAt: now }).where(eq(users.id, userId));
      }
    }

    const [form] = await tx
      .insert(ecdHtmlForms)
      .values({
        userId,
        company: null,
        jobTitle: null,
        country: 'Egypt',
        buyerMobile: phone,
        buyerCountryCode: '+20',
        newsOptIn: 0,
        rawPayload: {
          source: 'manual',
          grantReason: params.input.grantReason,
          isComplimentary: params.input.isComplimentary,
          createdByUserId: params.staffUserId,
        },
      })
      .returning({ id: ecdHtmlForms.id });

    let orderCode = makeOrderCode(now);
    for (let attempt = 0; attempt < 8; attempt++) {
      const [clashBooking] = await tx
        .select({ id: ecdBookings.id })
        .from(ecdBookings)
        .where(eq(ecdBookings.orderCode, orderCode))
        .limit(1);
      const [clashTicket] = await tx
        .select({ id: ecdTickets.id })
        .from(ecdTickets)
        .where(eq(ecdTickets.serial, orderCode))
        .limit(1);
      if (!clashBooking && !clashTicket) break;
      orderCode = makeOrderCode(now);
    }

    const publicToken = generateOpaqueToken(24);
    const [booking] = await tx
      .insert(ecdBookings)
      .values({
        userId,
        htmlFormId: form.id,
        orderCode,
        publicTokenHash: hashToken(publicToken),
        ticketType: params.input.ticketType,
        qty: 1,
        unitPriceCents,
        discountCents,
        totalCents,
        promoCode: null,
        paymentStatus: 'paid',
        paymentMethodName: params.input.isComplimentary
          ? 'ADMIN_COMPLIMENTARY'
          : 'ADMIN_MANUAL',
        buyerName: params.input.name.trim(),
        buyerEmail: email,
        buyerMobile: phone,
        registrationSource: 'manual',
        grantReason: params.input.grantReason.trim(),
        isComplimentary: params.input.isComplimentary ? 1 : 0,
        createdByUserId: params.staffUserId,
        paidAt: now,
        expiresAt,
      })
      .returning({ id: ecdBookings.id, orderCode: ecdBookings.orderCode });

    await tx.insert(ecdTickets).values({
      id: randomUUID(),
      bookingId: booking.id,
      userId,
      serial: orderCode,
      status: 'active',
      attendeeName: params.input.name.trim(),
      attendeeEmail: email,
      attendeeMobile: phone,
      sortOrder: 0,
    });

    return booking.id;
  });

  await sendPaidBookingTicketEmails(bookingId);
  return bookingId;
}

function parseManualCsv(text: string): {
  rows: ManualCreateInput[];
  errors: Array<{ line: number; email: string; reason: string }>;
} {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const errors: Array<{ line: number; email: string; reason: string }> = [];
  const rows: ManualCreateInput[] = [];

  if (lines.length === 0) {
    return { rows, errors: [{ line: 0, email: '', reason: 'CSV is empty' }] };
  }

  let start = 0;
  const header = lines[0].toLowerCase();
  if (header.includes('email') && header.includes('name')) {
    start = 1;
  }

  for (let i = start; i < lines.length; i++) {
    const lineNo = i + 1;
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const [name, email, phone, ticketRaw, freeRaw, reason] = cols;
    if (!name || !email || !phone || !ticketRaw || !reason) {
      errors.push({
        line: lineNo,
        email: email || '',
        reason: 'Expected columns: name,email,phone,ticket_type,free,reason',
      });
      continue;
    }
    const ticketNorm = ticketRaw.toLowerCase().replace(/\s+/g, '');
    let ticketType: 'ct' | 'fj' | null = null;
    if (ticketNorm === 'ct' || ticketNorm === 'standard' || ticketNorm === 'standardpass') {
      ticketType = 'ct';
    } else if (
      ticketNorm === 'fj' ||
      ticketNorm === 'allaccess' ||
      ticketNorm === 'allaccesspass'
    ) {
      ticketType = 'fj';
    }
    if (!ticketType) {
      errors.push({
        line: lineNo,
        email,
        reason: 'ticket_type must be ct/standard or fj/allaccess',
      });
      continue;
    }
    const freeNorm = String(freeRaw ?? '1').toLowerCase();
    const isComplimentary =
      freeNorm === '1' ||
      freeNorm === 'true' ||
      freeNorm === 'yes' ||
      freeNorm === 'free' ||
      freeNorm === '';
    const parsed = createManualSchema.safeParse({
      name,
      email,
      phone,
      ticketType,
      isComplimentary,
      grantReason: reason,
    });
    if (!parsed.success) {
      errors.push({
        line: lineNo,
        email,
        reason: parsed.error.issues[0]?.message || 'Invalid row',
      });
      continue;
    }
    rows.push(parsed.data);
  }

  return { rows, errors };
}

async function workshopsForBookings(bookingIds: string[]) {
  if (bookingIds.length === 0) return new Map<string, any[]>();
  const rows = await db
    .select({
      id: ecdWorkshopReservations.id,
      bookingId: ecdWorkshopReservations.bookingId,
      sessionId: ecdWorkshopReservations.sessionId,
      timeLabel: ecdWorkshopReservations.timeLabel,
      sessionCheckedInAt: ecdWorkshopReservations.sessionCheckedInAt,
      slug: ecdSessions.slug,
      title: ecdSessions.title,
      trackIndex: ecdSessions.trackIndex,
    })
    .from(ecdWorkshopReservations)
    .innerJoin(ecdSessions, eq(ecdWorkshopReservations.sessionId, ecdSessions.id))
    .where(inArray(ecdWorkshopReservations.bookingId, bookingIds));

  const map = new Map<string, any[]>();
  for (const r of rows) {
    const list = map.get(r.bookingId) || [];
    list.push({
      id: r.id,
      sessionId: r.sessionId,
      slug: r.slug,
      title: r.title,
      trackIndex: r.trackIndex,
      timeLabel: r.timeLabel,
      sessionCheckedInAt: r.sessionCheckedInAt?.toISOString() ?? null,
    });
    map.set(r.bookingId, list);
  }
  return map;
}

export function registerEcdAdminRoutes(app: Hono) {
  app.get('/admin/registrations', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const parsed = listSchema.safeParse({
      q: c.req.query('q') || undefined,
      ticketType: c.req.query('ticketType') || undefined,
      status: c.req.query('status') || undefined,
      source: c.req.query('source') || undefined,
      grantReason: c.req.query('grantReason') || undefined,
      page: c.req.query('page') || 1,
      pageSize: c.req.query('pageSize') || 25,
    });

    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid query.' } }, 400);
    }

    const { q, ticketType, status, source, grantReason, page, pageSize } = parsed.data;
    const filters = [];
    if (ticketType) filters.push(eq(ecdBookings.ticketType, ticketType));
    if (status) filters.push(eq(ecdBookings.paymentStatus, status));
    if (source) filters.push(eq(ecdBookings.registrationSource, source));
    if (grantReason) {
      filters.push(ilike(ecdBookings.grantReason, `%${escapeLikePattern(grantReason)}%`));
    }
    if (q) {
      const like = `%${escapeLikePattern(q)}%`;
      filters.push(
        or(
          ilike(ecdBookings.orderCode, like),
          ilike(ecdBookings.buyerEmail, like),
          ilike(ecdBookings.buyerName, like),
          ilike(ecdBookings.buyerMobile, like),
          ilike(ecdBookings.grantReason, like),
          sql`exists (
            select 1 from ecd_tickets t
            where t.booking_id = ${ecdBookings.id}
              and (t.serial ilike ${like} or t.attendee_email ilike ${like} or t.attendee_name ilike ${like})
          )`,
        ),
      );
    }

    const whereClause = filters.length ? and(...filters) : undefined;
    const offset = (page - 1) * pageSize;

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(ecdBookings)
      .where(whereClause);

    const rows = await db
      .select({
        id: ecdBookings.id,
        orderCode: ecdBookings.orderCode,
        ticketType: ecdBookings.ticketType,
        qty: ecdBookings.qty,
        unitPriceCents: ecdBookings.unitPriceCents,
        discountCents: ecdBookings.discountCents,
        totalCents: ecdBookings.totalCents,
        paymentStatus: ecdBookings.paymentStatus,
        buyerName: ecdBookings.buyerName,
        buyerEmail: ecdBookings.buyerEmail,
        buyerMobile: ecdBookings.buyerMobile,
        promoCode: ecdBookings.promoCode,
        registrationSource: ecdBookings.registrationSource,
        grantReason: ecdBookings.grantReason,
        isComplimentary: ecdBookings.isComplimentary,
        paidAt: ecdBookings.paidAt,
        venueCheckedInAt: ecdBookings.venueCheckedInAt,
        attendeeFrameUrl: ecdBookings.attendeeFrameUrl,
        createdAt: ecdBookings.createdAt,
        htmlFormId: ecdBookings.htmlFormId,
        userId: ecdBookings.userId,
      })
      .from(ecdBookings)
      .where(whereClause)
      .orderBy(desc(ecdBookings.createdAt))
      .limit(pageSize)
      .offset(offset);

    const bookingIds = rows.map((r) => r.id);
    const ticketRows =
      bookingIds.length === 0
        ? []
        : await db
            .select({
              id: ecdTickets.id,
              bookingId: ecdTickets.bookingId,
              serial: ecdTickets.serial,
              attendeeName: ecdTickets.attendeeName,
              attendeeEmail: ecdTickets.attendeeEmail,
              status: ecdTickets.status,
            })
            .from(ecdTickets)
            .where(inArray(ecdTickets.bookingId, bookingIds));

    const formIds = rows.map((r) => r.htmlFormId).filter(Boolean) as string[];
    const forms =
      formIds.length === 0
        ? []
        : await db.select().from(ecdHtmlForms).where(inArray(ecdHtmlForms.id, formIds));

    const formById = new Map(forms.map((f) => [f.id, f]));
    const ticketsByBooking = new Map<string, typeof ticketRows>();
    for (const t of ticketRows) {
      const list = ticketsByBooking.get(t.bookingId) || [];
      list.push(t);
      ticketsByBooking.set(t.bookingId, list);
    }

    const workshopsByBooking = await workshopsForBookings(bookingIds);

    const nameCache = new Map<string, string>();
    async function nameFor(type: string) {
      const cached = nameCache.get(type);
      if (cached) return cached;
      const n = await ticketDisplayName(type);
      nameCache.set(type, n);
      return n;
    }

    const items = await Promise.all(
      rows.map(async (row) => {
        const form = row.htmlFormId ? formById.get(row.htmlFormId) : null;
        const tickets = ticketsByBooking.get(row.id) || [];
        return {
          id: row.id,
          orderCode: row.orderCode,
          ticketType: row.ticketType,
          ticketName: await nameFor(row.ticketType),
          qty: row.qty,
          unitPriceCents: row.unitPriceCents,
          discountCents: row.discountCents,
          totalCents: row.totalCents,
          amountFormatted: formatMoneyEgp(row.totalCents),
          unitPriceFormatted: formatMoneyEgp(row.unitPriceCents * row.qty),
          discountFormatted: formatMoneyEgp(row.discountCents),
          paymentStatus: row.paymentStatus,
          buyerName: row.buyerName,
          buyerEmail: row.buyerEmail,
          buyerMobile: row.buyerMobile,
          promoCode: row.promoCode,
          registrationSource: row.registrationSource || 'website',
          grantReason: row.grantReason,
          isComplimentary: row.isComplimentary === 1,
          paidAt: row.paidAt?.toISOString() ?? null,
          venueCheckedInAt: row.venueCheckedInAt?.toISOString() ?? null,
          attendeeFrameUrl: row.attendeeFrameUrl ?? null,
          bookingPageUrl: ecdBookingPageUrl(row.orderCode),
          createdAt: row.createdAt.toISOString(),
          userId: row.userId,
          serials: tickets.map((t) => t.serial),
          tickets,
          workshops: workshopsByBooking.get(row.id) || [],
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
        };
      }),
    );

    return c.json({
      data: {
        items,
        pagination: {
          page,
          pageSize,
          total: Number(countRow?.total ?? 0),
        },
      },
    });
  });

  app.get('/admin/registrations/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = c.req.param('id');
    const [booking] = await db.select().from(ecdBookings).where(eq(ecdBookings.id, id)).limit(1);
    if (!booking) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Registration not found.' } }, 404);
    }

    const tickets = await db.select().from(ecdTickets).where(eq(ecdTickets.bookingId, id));
    const [form] = booking.htmlFormId
      ? await db.select().from(ecdHtmlForms).where(eq(ecdHtmlForms.id, booking.htmlFormId)).limit(1)
      : [null];
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, booking.userId))
      .limit(1);

    const workshopsMap = await workshopsForBookings([id]);

    return c.json({
      data: {
        booking: {
          ...booking,
          venueCheckedInAt: booking.venueCheckedInAt?.toISOString() ?? null,
          paidAt: booking.paidAt?.toISOString() ?? null,
          createdAt: booking.createdAt.toISOString(),
          updatedAt: booking.updatedAt.toISOString(),
          expiresAt: booking.expiresAt.toISOString(),
        },
        tickets,
        form: form ?? null,
        user: user ?? null,
        workshops: workshopsMap.get(id) || [],
        amountFormatted: formatMoneyEgp(booking.totalCents),
      },
    });
  });

  /** Venue / bracelet check-in (QR at gate). Idempotent. */
  app.post('/admin/registrations/:id/venue-check-in', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = c.req.param('id');
    const [booking] = await db.select().from(ecdBookings).where(eq(ecdBookings.id, id)).limit(1);
    if (!booking) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Registration not found.' } }, 404);
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
      .where(eq(ecdBookings.id, id))
      .returning({ venueCheckedInAt: ecdBookings.venueCheckedInAt });

    return c.json({
      data: {
        alreadyCheckedIn: false,
        venueCheckedInAt: updated.venueCheckedInAt?.toISOString() ?? null,
      },
    });
  });

  /** Workshop / room entry check-in. */
  app.post('/admin/workshop-reservations/:id/session-check-in', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = c.req.param('id');
    const [row] = await db
      .select({
        id: ecdWorkshopReservations.id,
        bookingId: ecdWorkshopReservations.bookingId,
        sessionCheckedInAt: ecdWorkshopReservations.sessionCheckedInAt,
        paymentStatus: ecdBookings.paymentStatus,
        venueCheckedInAt: ecdBookings.venueCheckedInAt,
      })
      .from(ecdWorkshopReservations)
      .innerJoin(ecdBookings, eq(ecdWorkshopReservations.bookingId, ecdBookings.id))
      .where(eq(ecdWorkshopReservations.id, id))
      .limit(1);

    if (!row) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Workshop reservation not found.' } },
        404,
      );
    }
    if (row.paymentStatus !== 'paid') {
      return c.json({ error: { code: 'NOT_PAID', message: 'Booking is not paid.' } }, 400);
    }
    if (!row.venueCheckedInAt) {
      return c.json(
        {
          error: {
            code: 'VENUE_REQUIRED',
            message: 'Venue check-in (bracelet) required before session entry.',
          },
        },
        400,
      );
    }
    if (row.sessionCheckedInAt) {
      return c.json({
        data: {
          alreadyCheckedIn: true,
          sessionCheckedInAt: row.sessionCheckedInAt.toISOString(),
        },
      });
    }

    const [updated] = await db
      .update(ecdWorkshopReservations)
      .set({ sessionCheckedInAt: new Date(), updatedAt: new Date() })
      .where(eq(ecdWorkshopReservations.id, id))
      .returning({ sessionCheckedInAt: ecdWorkshopReservations.sessionCheckedInAt });

    return c.json({
      data: {
        alreadyCheckedIn: false,
        sessionCheckedInAt: updated.sessionCheckedInAt?.toISOString() ?? null,
        venueCheckedInAt: row.venueCheckedInAt?.toISOString() ?? null,
      },
    });
  });

  app.patch('/admin/tickets/:ticketId', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const ticketId = c.req.param('ticketId');
    const body = updateTicketEmailSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json(
        { error: { code: 'INVALID_REQUEST', message: 'Valid attendee email required.' } },
        400,
      );
    }

    const email = normalizeEmail(body.data.attendeeEmail);
    const [updated] = await db
      .update(ecdTickets)
      .set({ attendeeEmail: email, updatedAt: new Date() })
      .where(eq(ecdTickets.id, ticketId))
      .returning({
        id: ecdTickets.id,
        bookingId: ecdTickets.bookingId,
        serial: ecdTickets.serial,
        attendeeName: ecdTickets.attendeeName,
        attendeeEmail: ecdTickets.attendeeEmail,
        status: ecdTickets.status,
      });

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Ticket not found.' } }, 404);
    }

    return c.json({ data: { ticket: updated } });
  });

  app.post('/admin/tickets/:ticketId/send-email', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const ticketId = c.req.param('ticketId');
    const optionalEmail = z
      .object({ attendeeEmail: z.string().email().max(255).optional() })
      .safeParse(await c.req.json().catch(() => ({})));

    try {
      if (optionalEmail.success && optionalEmail.data.attendeeEmail) {
        const email = normalizeEmail(optionalEmail.data.attendeeEmail);
        await db
          .update(ecdTickets)
          .set({ attendeeEmail: email, updatedAt: new Date() })
          .where(eq(ecdTickets.id, ticketId));
      }

      const result = await sendSingleEcdTicketEmail({
        ticketId,
        toEmail: optionalEmail.success ? optionalEmail.data.attendeeEmail : undefined,
      });

      if (!result.ok) {
        const status =
          result.code === 'TICKET_NOT_FOUND' || result.code === 'BOOKING_NOT_FOUND' ? 404 : 400;
        return c.json(
          { error: { code: result.code, message: 'Could not send ticket email.' } },
          status,
        );
      }

      return c.json({ data: { sent: true, email: result.email, serial: result.serial } });
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        return c.json(
          { error: { code: 'EMAIL_DELIVERY_FAILED', message: 'Email provider rejected the send.' } },
          502,
        );
      }
      console.error('[ecd] admin send ticket email failed', error);
      return c.json(
        { error: { code: 'EMAIL_SEND_FAILED', message: 'Failed to send ticket email.' } },
        500,
      );
    }
  });

  app.post('/admin/registrations', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = createManualSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid registration payload.',
            details: body.error.flatten(),
          },
        },
        400,
      );
    }

    try {
      const bookingId = await createManualPaidBooking({
        input: body.data,
        staffUserId: staff.userId,
      });
      return c.json({ data: { bookingId } }, 201);
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        return c.json(
          {
            error: {
              code: 'EMAIL_DELIVERY_FAILED',
              message: 'Registration created but email provider rejected the send.',
            },
          },
          502,
        );
      }
      console.error('[ecd] admin create registration failed', error);
      return c.json(
        { error: { code: 'CREATE_FAILED', message: 'Failed to create registration.' } },
        500,
      );
    }
  });

  app.post('/admin/registrations/bulk', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = z
      .object({ csv: z.string().min(1).max(500_000) })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'CSV payload required.' } }, 400);
    }

    const parsed = parseManualCsv(body.data.csv);
    if (parsed.errors.length > 0) {
      return c.json(
        {
          error: {
            code: 'CSV_VALIDATION_FAILED',
            message: 'Validation errors (no rows were applied).',
            details: { errors: parsed.errors },
          },
        },
        400,
      );
    }
    if (parsed.rows.length === 0) {
      return c.json({ error: { code: 'CSV_EMPTY', message: 'No data rows in CSV.' } }, 400);
    }

    const created: string[] = [];
    try {
      for (const row of parsed.rows) {
        const bookingId = await createManualPaidBooking({
          input: row,
          staffUserId: staff.userId,
        });
        created.push(bookingId);
      }
      return c.json({ data: { createdCount: created.length, bookingIds: created } }, 201);
    } catch (error) {
      console.error('[ecd] admin bulk registration failed', error);
      return c.json(
        {
          error: {
            code: 'BULK_CREATE_FAILED',
            message: `Failed after creating ${created.length} of ${parsed.rows.length} rows.`,
            details: { createdCount: created.length },
          },
        },
        500,
      );
    }
  });

  app.delete('/admin/registrations', async (c) => {
    const staff = await requireAdmin(c);
    if ('response' in staff) return staff.response;

    const body = deleteSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'ids array required.' } }, 400);
    }

    const ids = body.data.ids;
    const bookings = await db
      .select({ id: ecdBookings.id, htmlFormId: ecdBookings.htmlFormId })
      .from(ecdBookings)
      .where(inArray(ecdBookings.id, ids));

    if (bookings.length === 0) {
      return c.json({ data: { deleted: 0 } });
    }

    const bookingIds = bookings.map((b) => b.id);
    const formIds = bookings.map((b) => b.htmlFormId).filter(Boolean) as string[];

    await db.transaction(async (tx) => {
      await tx
        .delete(ecdWorkshopReservations)
        .where(inArray(ecdWorkshopReservations.bookingId, bookingIds));
      await tx.delete(ecdCheckoutTokens).where(inArray(ecdCheckoutTokens.bookingId, bookingIds));
      await tx.delete(ecdTickets).where(inArray(ecdTickets.bookingId, bookingIds));
      await tx.delete(ecdBookings).where(inArray(ecdBookings.id, bookingIds));

      for (const formId of formIds) {
        const [stillUsed] = await tx
          .select({ id: ecdBookings.id })
          .from(ecdBookings)
          .where(eq(ecdBookings.htmlFormId, formId))
          .limit(1);
        if (!stillUsed) {
          await tx.delete(ecdHtmlForms).where(eq(ecdHtmlForms.id, formId));
        }
      }
    });

    return c.json({ data: { deleted: bookingIds.length } });
  });
}
