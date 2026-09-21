import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { env } from '../../../config/env.js';
import { db } from '../../../db/client.js';
import {
  ecdBookings,
  ecdCheckoutTokens,
  ecdHtmlForms,
  ecdTickets,
} from '../../../db/schema/ecd.js';
import { profiles, users } from '../../../db/schema/index.js';
import { getRequestIp, normalizeEmail } from '../utils.js';
import {
  calcEcdTotals,
  ecdRateLimiter,
  generateOpaqueToken,
  hashToken,
  makeOrderCode,
  makeTicketSerial,
  splitBuyerName,
  type EcdTicketType,
} from './helpers.js';

const attendeeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(255),
  mobile: z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
  title: z.string().trim().max(160).optional().nullable(),
  interests: z.array(z.string().max(80)).max(20).optional().nullable(),
});

const sessionSchema = z.object({
  ticketType: z.enum(['ct', 'fj']),
  qty: z.number().int().min(1).max(20).default(1),
  promoCode: z.string().trim().max(40).optional().nullable(),
  clientTotalCents: z.number().int().nonnegative().optional(),
  buyer: z.object({
    name: z.string().trim().min(2).max(160),
    email: z.string().email().max(255),
    mobile: z.string().trim().min(5).max(40),
    countryCode: z.string().trim().max(10).optional().nullable(),
    country: z.string().trim().min(2).max(80),
    company: z.string().trim().min(1).max(160),
    title: z.string().trim().min(1).max(160),
    store: z.string().trim().min(1).max(200),
    linkedin: z.string().trim().max(300).optional().nullable(),
    facebook: z.string().trim().max(300).optional().nullable(),
    access: z.string().trim().max(400).optional().nullable(),
    newsOptIn: z.boolean().optional(),
    needInvoice: z.boolean().optional(),
    invoiceCompany: z.string().trim().max(160).optional().nullable(),
    taxId: z.string().trim().max(80).optional().nullable(),
    billingAddress: z.string().trim().max(400).optional().nullable(),
  }).superRefine((buyer, ctx) => {
    if (!(buyer.linkedin || '').trim() && !(buyer.facebook || '').trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Add a LinkedIn or a Facebook profile.',
        path: ['linkedin'],
      });
    }
  }),
  attendees: z.array(attendeeSchema).max(20).optional().nullable(),
});

export function registerEcdSessionRoutes(app: Hono) {
  app.post('/session', async (c) => {
    const ip = getRequestIp(c);
    const limited = ecdRateLimiter.consume(`ecd:session:${ip}`, { limit: 20, windowMs: 60_000 });
    if (!limited.allowed) {
      return c.json(
        { error: { code: 'ECD_RATE_LIMITED', message: 'Too many checkout attempts. Try again shortly.' } },
        429,
      );
    }

    const body = sessionSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json(
        { error: { code: 'INVALID_REQUEST', message: 'Invalid checkout session payload.', details: body.error.flatten() } },
        400,
      );
    }

    const data = body.data;
    // New checkout is single-ticket; auto-build attendee from buyer when omitted.
    const attendees =
      data.attendees && data.attendees.length > 0
        ? data.attendees
        : [
            {
              name: data.buyer.name,
              email: data.buyer.email,
              mobile: data.buyer.mobile,
              company: data.buyer.company,
              title: data.buyer.title,
              interests: null,
            },
          ];
    if (attendees.length !== data.qty) {
      return c.json(
        { error: { code: 'QTY_MISMATCH', message: 'Attendee count must match ticket quantity.' } },
        400,
      );
    }

    const totals = await calcEcdTotals({
      ticketType: data.ticketType as EcdTicketType,
      qty: data.qty,
      promoCode: data.promoCode,
    });

    if (
      typeof data.clientTotalCents === 'number' &&
      data.clientTotalCents !== totals.totalCents
    ) {
      return c.json(
        {
          error: {
            code: 'price_changed',
            message: 'The ticket price changed while you were checking out.',
            data: { newTotalCents: totals.totalCents, amountFormatted: `${(totals.totalCents / 100).toLocaleString('en-EG')} EGP` },
          },
        },
        409,
      );
    }

    const email = normalizeEmail(data.buyer.email);
    const { firstName, lastName, name } = splitBuyerName(data.buyer.name);
    const expiresAt = new Date(Date.now() + env.ECD_TOKEN_TTL_HOURS * 60 * 60 * 1000);

    const result = await db.transaction(async (tx) => {
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
          phoneNumber: data.buyer.mobile,
          role: 'user',
        });
      } else {
        await tx
          .update(profiles)
          .set({
            firstName,
            lastName,
            phoneNumber: data.buyer.mobile,
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, userId));
        if (!existing?.name || existing.name === 'TrafficMENA Member') {
          await tx.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, userId));
        }
      }

      const [form] = await tx
        .insert(ecdHtmlForms)
        .values({
          userId,
          company: data.buyer.company || null,
          jobTitle: data.buyer.title || null,
          country: data.buyer.country,
          needInvoice: data.buyer.needInvoice ? 1 : 0,
          invoiceCompany: data.buyer.invoiceCompany || null,
          taxId: data.buyer.taxId || null,
          billingAddress: data.buyer.billingAddress || null,
          buyerMobile: data.buyer.mobile,
          buyerCountryCode: data.buyer.countryCode || null,
          store: data.buyer.store || null,
          linkedinUrl: data.buyer.linkedin || null,
          facebookUrl: data.buyer.facebook || null,
          accessibilityNeeds: data.buyer.access || null,
          newsOptIn: data.buyer.newsOptIn ? 1 : 0,
          rawPayload: data,
        })
        .returning({ id: ecdHtmlForms.id });

      const bookedAt = new Date();
      let orderCode = makeOrderCode(bookedAt);
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
        orderCode = makeOrderCode(bookedAt);
      }

      const publicToken = generateOpaqueToken(24);
      const [booking] = await tx
        .insert(ecdBookings)
        .values({
          userId,
          htmlFormId: form.id,
          orderCode,
          publicTokenHash: hashToken(publicToken),
          ticketType: data.ticketType,
          qty: totals.qty,
          unitPriceCents: totals.unitPriceCents,
          discountCents: totals.discountCents,
          totalCents: totals.totalCents,
          promoCode: totals.promoCode,
          paymentStatus: 'draft',
          buyerName: data.buyer.name.trim(),
          buyerEmail: email,
          buyerMobile: data.buyer.mobile,
          expiresAt,
        })
        .returning();

      const ticketRows = [];
      for (let i = 0; i < attendees.length; i++) {
        const att = attendees[i];
        const ticketId = randomUUID();
        // Unify public IDs: ticket #1 serial === orderCode; extras get sibling codes.
        let serial = i === 0 ? orderCode : makeTicketSerial({ bookedAt });
        for (let retry = 0; retry < 5; retry++) {
          const [exists] = await tx
            .select({ id: ecdTickets.id })
            .from(ecdTickets)
            .where(eq(ecdTickets.serial, serial))
            .limit(1);
          if (!exists) break;
          serial = makeTicketSerial({ bookedAt });
        }
        const [ticket] = await tx
          .insert(ecdTickets)
          .values({
            id: ticketId,
            bookingId: booking.id,
            userId,
            serial,
            status: 'held',
            attendeeName: att.name.trim(),
            attendeeEmail: normalizeEmail(att.email),
            attendeeMobile: att.mobile || null,
            attendeeCompany: att.company || null,
            attendeeTitle: att.title || null,
            interests: att.interests || [],
            sortOrder: i,
          })
          .returning({
            id: ecdTickets.id,
            serial: ecdTickets.serial,
            attendeeName: ecdTickets.attendeeName,
            status: ecdTickets.status,
          });
        ticketRows.push(ticket);
      }

      const checkoutToken = generateOpaqueToken(32);
      await tx.insert(ecdCheckoutTokens).values({
        tokenHash: hashToken(checkoutToken),
        userId,
        bookingId: booking.id,
        expiresAt,
      });

      return {
        checkoutToken,
        publicToken,
        booking,
        tickets: ticketRows,
        totals,
      };
    });

    return c.json({
      data: {
        checkoutToken: result.checkoutToken,
        publicToken: result.publicToken,
        bookingId: result.booking.id,
        orderCode: result.booking.orderCode,
        expiresAt: result.booking.expiresAt.toISOString(),
        ticketType: result.booking.ticketType,
        qty: result.booking.qty,
        unitPriceCents: result.totals.unitPriceCents,
        discountCents: result.totals.discountCents,
        totalCents: result.totals.totalCents,
        amountFormatted: `${(result.totals.totalCents / 100).toLocaleString('en-EG')} EGP`,
        ticketName: result.totals.ticketName,
        tickets: result.tickets,
      },
    });
  });
}
