import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../../db/client.js';
import { ecdSponsorInquiries } from '../../../db/schema/ecd.js';
import { ecdRateLimiter, randomSerialSuffix } from './helpers.js';
import { escapeLikePattern, normalizeEmail, requireManager } from '../utils.js';

const OPEN_STATUSES = ['new', 'reviewed', 'in_progress', 'accepted'] as const;

const submitSchema = z.object({
  company: z.string().trim().min(1).max(200),
  website: z.string().trim().max(500).optional().nullable(),
  sector: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(80),
  companySize: z.string().trim().min(1).max(40),
  contactName: z.string().trim().min(1).max(120),
  contactTitle: z.string().trim().min(1).max(120),
  contactEmail: z.string().email().max(255),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  preferredContact: z.string().trim().max(40).optional().default('Email'),
  objectives: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  interestedLevel: z.string().trim().min(1).max(80),
  interestedProperties: z.array(z.string().trim().min(1).max(80)).max(20).optional().default([]),
  targetAudience: z.string().trim().max(300).optional().nullable(),
  timing: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  budgetBand: z.string().trim().max(80).optional().nullable(),
  consent: z.literal(true),
});

const listSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(['new', 'reviewed', 'in_progress', 'accepted', 'rejected']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const statusSchema = z.object({
  status: z.enum(['new', 'reviewed', 'in_progress', 'accepted', 'rejected']),
  adminNotes: z.string().trim().max(4000).optional().nullable(),
});

function serializeInquiry(row: typeof ecdSponsorInquiries.$inferSelect) {
  return {
    id: row.id,
    requestCode: row.requestCode,
    status: row.status,
    company: row.company,
    website: row.website,
    sector: row.sector,
    country: row.country,
    companySize: row.companySize,
    contactName: row.contactName,
    contactTitle: row.contactTitle,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    preferredContact: row.preferredContact,
    objectives: row.objectives ?? [],
    interestedLevel: row.interestedLevel,
    interestedProperties: row.interestedProperties ?? [],
    targetAudience: row.targetAudience,
    timing: row.timing,
    notes: row.notes,
    budgetBand: row.budgetBand,
    consent: row.consent === 1,
    adminNotes: row.adminNotes,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedByUserId: row.reviewedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function makeRequestCode() {
  return `ECD26-P-${randomSerialSuffix(4)}`;
}

export function registerEcdSponsorInquiryRoutes(app: Hono) {
  /** Public submit from become-a-sponsor.html */
  app.post('/sponsor-inquiries', async (c) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown';
    const rate = ecdRateLimiter.consume(`ecd-sponsor-inq:${ip}`, {
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.allowed) {
      return c.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many submissions. Try again later.' } },
        429,
      );
    }

    const body = submitSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json(
        { error: { code: 'INVALID_REQUEST', message: 'Please complete all required fields.' } },
        400,
      );
    }

    const data = body.data;
    const email = normalizeEmail(data.contactEmail);

    const [existing] = await db
      .select({
        id: ecdSponsorInquiries.id,
        requestCode: ecdSponsorInquiries.requestCode,
        status: ecdSponsorInquiries.status,
      })
      .from(ecdSponsorInquiries)
      .where(
        and(
          eq(ecdSponsorInquiries.contactEmail, email),
          inArray(ecdSponsorInquiries.status, [...OPEN_STATUSES]),
        ),
      )
      .limit(1);

    if (existing) {
      return c.json(
        {
          error: {
            code: 'DUPLICATE_INQUIRY',
            message: 'An open partnership inquiry already exists for this email.',
            requestCode: existing.requestCode,
            status: existing.status,
          },
        },
        409,
      );
    }

    let requestCode = makeRequestCode();
    for (let i = 0; i < 6; i++) {
      const [clash] = await db
        .select({ id: ecdSponsorInquiries.id })
        .from(ecdSponsorInquiries)
        .where(eq(ecdSponsorInquiries.requestCode, requestCode))
        .limit(1);
      if (!clash) break;
      requestCode = makeRequestCode();
    }

    const [row] = await db
      .insert(ecdSponsorInquiries)
      .values({
        requestCode,
        status: 'new',
        company: data.company,
        website: data.website || null,
        sector: data.sector,
        country: data.country,
        companySize: data.companySize,
        contactName: data.contactName,
        contactTitle: data.contactTitle,
        contactEmail: email,
        contactPhone: data.contactPhone || null,
        preferredContact: data.preferredContact || 'Email',
        objectives: data.objectives,
        interestedLevel: data.interestedLevel,
        interestedProperties: data.interestedProperties || [],
        targetAudience: data.targetAudience || null,
        timing: data.timing || null,
        notes: data.notes || null,
        budgetBand: data.budgetBand || null,
        consent: 1,
      })
      .returning();

    return c.json(
      {
        data: {
          id: row.id,
          requestCode: row.requestCode,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
        },
      },
      201,
    );
  });

  app.get('/admin/sponsor-inquiries', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const parsed = listSchema.safeParse({
      q: c.req.query('q') || undefined,
      status: c.req.query('status') || undefined,
      page: c.req.query('page') || 1,
      pageSize: c.req.query('pageSize') || 25,
    });
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid query.' } }, 400);
    }

    const { q, status, page, pageSize } = parsed.data;
    const filters = [];
    if (status) filters.push(eq(ecdSponsorInquiries.status, status));
    if (q) {
      const like = `%${escapeLikePattern(q)}%`;
      filters.push(
        or(
          ilike(ecdSponsorInquiries.requestCode, like),
          ilike(ecdSponsorInquiries.company, like),
          ilike(ecdSponsorInquiries.contactEmail, like),
          ilike(ecdSponsorInquiries.contactName, like),
        ),
      );
    }
    const whereClause = filters.length ? and(...filters) : undefined;
    const offset = (page - 1) * pageSize;

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(ecdSponsorInquiries)
      .where(whereClause);

    const rows = await db
      .select()
      .from(ecdSponsorInquiries)
      .where(whereClause)
      .orderBy(desc(ecdSponsorInquiries.createdAt))
      .limit(pageSize)
      .offset(offset);

    return c.json({
      data: {
        items: rows.map(serializeInquiry),
        pagination: {
          page,
          pageSize,
          total: Number(countRow?.total ?? 0),
        },
      },
    });
  });

  app.get('/admin/sponsor-inquiries/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = c.req.param('id');
    const [row] = await db
      .select()
      .from(ecdSponsorInquiries)
      .where(eq(ecdSponsorInquiries.id, id))
      .limit(1);
    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Inquiry not found.' } }, 404);
    }
    return c.json({ data: { inquiry: serializeInquiry(row) } });
  });

  app.patch('/admin/sponsor-inquiries/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = c.req.param('id');
    const body = statusSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'Valid status required.' } }, 400);
    }

    const [existing] = await db
      .select({ id: ecdSponsorInquiries.id })
      .from(ecdSponsorInquiries)
      .where(eq(ecdSponsorInquiries.id, id))
      .limit(1);
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Inquiry not found.' } }, 404);
    }

    const patch: Partial<typeof ecdSponsorInquiries.$inferInsert> = {
      status: body.data.status,
      reviewedAt: new Date(),
      reviewedByUserId: staff.userId,
      updatedAt: new Date(),
    };
    if (body.data.adminNotes !== undefined) {
      patch.adminNotes = body.data.adminNotes || null;
    }

    const [row] = await db
      .update(ecdSponsorInquiries)
      .set(patch)
      .where(eq(ecdSponsorInquiries.id, id))
      .returning();

    return c.json({ data: { inquiry: serializeInquiry(row) } });
  });
}
