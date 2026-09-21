import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../../db/client.js';
import { ecdBookings, ecdHtmlForms, ecdTickets } from '../../../db/schema/ecd.js';
import { users } from '../../../db/schema/index.js';
import { EmailDeliveryError } from '../../../services/email.js';
import { escapeLikePattern, normalizeEmail, requireManager } from '../utils.js';
import { formatMoneyEgp, ticketDisplayName } from './helpers.js';
import { sendSingleEcdTicketEmail } from './ticketEmail.js';

const listSchema = z.object({
  q: z.string().trim().max(120).optional(),
  ticketType: z.enum(['ct', 'fj']).optional(),
  status: z.enum(['draft', 'pending', 'paid', 'failed', 'expired', 'cancelled']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const updateTicketEmailSchema = z.object({
  attendeeEmail: z.string().email().max(255),
});

export function registerEcdAdminRoutes(app: Hono) {
  app.get('/admin/registrations', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const parsed = listSchema.safeParse({
      q: c.req.query('q') || undefined,
      ticketType: c.req.query('ticketType') || undefined,
      status: c.req.query('status') || undefined,
      page: c.req.query('page') || 1,
      pageSize: c.req.query('pageSize') || 25,
    });

    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid query.' } }, 400);
    }

    const { q, ticketType, status, page, pageSize } = parsed.data;
    const filters = [];
    if (ticketType) filters.push(eq(ecdBookings.ticketType, ticketType));
    if (status) filters.push(eq(ecdBookings.paymentStatus, status));
    if (q) {
      const like = `%${escapeLikePattern(q)}%`;
      filters.push(
        or(
          ilike(ecdBookings.orderCode, like),
          ilike(ecdBookings.buyerEmail, like),
          ilike(ecdBookings.buyerName, like),
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
        totalCents: ecdBookings.totalCents,
        paymentStatus: ecdBookings.paymentStatus,
        buyerName: ecdBookings.buyerName,
        buyerEmail: ecdBookings.buyerEmail,
        buyerMobile: ecdBookings.buyerMobile,
        promoCode: ecdBookings.promoCode,
        paidAt: ecdBookings.paidAt,
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
          totalCents: row.totalCents,
          amountFormatted: formatMoneyEgp(row.totalCents),
          paymentStatus: row.paymentStatus,
          buyerName: row.buyerName,
          buyerEmail: row.buyerEmail,
          buyerMobile: row.buyerMobile,
          promoCode: row.promoCode,
          paidAt: row.paidAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
          userId: row.userId,
          serials: tickets.map((t) => t.serial),
          tickets,
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

    return c.json({
      data: {
        booking,
        tickets,
        form: form ?? null,
        user: user ?? null,
        amountFormatted: formatMoneyEgp(booking.totalCents),
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
}
