import { asc, eq } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../../db/client.js';
import {
  ecdPartners,
  ecdSessions,
  ecdSpeakers,
  ecdTicketFeatures,
  ecdTicketPackages,
} from '../../../db/schema/ecd.js';
import { requireManager } from '../utils.js';
import { invalidateEcdPackageCache } from './helpers.js';
import { serializePackage, serializeSession } from './content.js';

const optionalUrl = z
  .string()
  .max(500)
  .nullable()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null));

const partnerTiers = [
  'title',
  'strategic',
  'innovation',
  'empowerment',
  'community',
] as const;

const partnerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  logoUrl: optionalUrl,
  websiteUrl: optionalUrl,
  tier: z.enum(partnerTiers).optional(),
  blurb: z.string().trim().max(400).nullable().optional(),
  supportedAsset: z.string().trim().max(200).nullable().optional(),
  experienceUrl: optionalUrl,
  featured: z.boolean().optional(),
  featuredSortOrder: z.number().int().min(0).max(9999).optional(),
  showOnHome: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  published: z.boolean().optional(),
});

function partnerValues(data: z.infer<typeof partnerSchema>) {
  return {
    name: data.name,
    logoUrl: data.logoUrl ?? null,
    websiteUrl: data.websiteUrl ?? null,
    tier: data.tier ?? 'community',
    blurb: data.blurb ?? null,
    supportedAsset: data.supportedAsset ?? null,
    experienceUrl: data.experienceUrl ?? null,
    featured: boolToInt(data.featured, 0),
    featuredSortOrder: data.featuredSortOrder ?? 0,
    showOnHome: boolToInt(data.showOnHome, 1),
    sortOrder: data.sortOrder ?? 0,
    published: boolToInt(data.published, 1),
  };
}

const speakerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().max(160).nullable().optional(),
  company: z.string().trim().max(160).nullable().optional(),
  photoUrl: optionalUrl,
  roomIndex: z.number().int().min(0).max(4).optional(),
  speakerType: z
    .enum(['Founder', 'Operator', 'Executive', 'Specialist'])
    .nullable()
    .optional(),
  statusTag: z.string().trim().max(40).nullable().optional(),
  expertise: z.array(z.string().trim().max(40)).max(12).optional(),
  sessionTitle: z.string().trim().max(300).nullable().optional(),
  sessionLabel: z.string().trim().max(120).nullable().optional(),
  proof: z.string().trim().max(400).nullable().optional(),
  featured: z.boolean().optional(),
  featuredSortOrder: z.number().int().min(0).max(9999).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  published: z.boolean().optional(),
});

function speakerValues(data: z.infer<typeof speakerSchema>) {
  return {
    name: data.name,
    role: data.role ?? null,
    company: data.company ?? null,
    photoUrl: data.photoUrl ?? null,
    roomIndex: data.roomIndex ?? 0,
    speakerType: data.speakerType ?? null,
    statusTag: data.statusTag ?? 'Confirmed',
    expertise: data.expertise ?? [],
    sessionTitle: data.sessionTitle ?? null,
    sessionLabel: data.sessionLabel ?? null,
    proof: data.proof ?? null,
    featured: boolToInt(data.featured, 0),
    featuredSortOrder: data.featuredSortOrder ?? 0,
    sortOrder: data.sortOrder ?? 0,
    published: boolToInt(data.published, 1),
  };
}

const featureSchema = z.object({
  kind: z.enum(['included', 'excluded']),
  label: z.string().trim().min(1).max(200),
  emphasis: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const packageUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  eyebrow: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  tagline: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(1000),
  badge: z.string().trim().max(80).nullable().optional(),
  ctaLabel: z.string().trim().min(1).max(80),
  /** EGP major units (e.g. 2500). Converted to cents server-side. */
  priceEgp: z.number().positive().max(1_000_000),
  features: z.array(featureSchema).max(40),
});

const sessionSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9][a-z0-9_-]*$/i, 'Invalid slug'),
  trackIndex: z.number().int().min(0).max(4),
  timeLabel: z.string().trim().min(1).max(20),
  format: z.string().trim().max(60).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  title: z.string().trim().min(1).max(300),
  speakerLabel: z.string().trim().max(160).nullable().optional(),
  topics: z.array(z.string().trim().max(40)).max(12).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  learn: z.array(z.string().trim().max(200)).max(12).optional(),
  output: z.string().trim().max(300).nullable().optional(),
  tools: z.string().trim().max(120).nullable().optional(),
  level: z.string().trim().max(60).nullable().optional(),
  fullJourneyOnly: z.boolean().optional(),
  capacity: z.number().int().min(0).max(10000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  published: z.boolean().optional(),
});

function sessionValues(data: z.infer<typeof sessionSchema>) {
  const trackIndex = data.trackIndex;
  const fj =
    data.fullJourneyOnly !== undefined
      ? boolToInt(data.fullJourneyOnly, trackIndex >= 2 ? 1 : 0)
      : trackIndex >= 2
        ? 1
        : 0;
  return {
    slug: data.slug.trim().toLowerCase(),
    trackIndex,
    timeLabel: data.timeLabel,
    format: data.format ?? null,
    category: data.category ?? null,
    title: data.title,
    speakerLabel: data.speakerLabel ?? 'Speaker will be announced',
    topics: data.topics ?? [],
    description: data.description ?? null,
    learn: data.learn ?? [],
    output: data.output ?? null,
    tools: data.tools ?? null,
    level: data.level ?? null,
    fullJourneyOnly: fj,
    capacity: data.capacity ?? null,
    sortOrder: data.sortOrder ?? 0,
    published: boolToInt(data.published, 1),
  };
}

function boolToInt(v: boolean | undefined, fallback = 1) {
  if (v === undefined) return fallback;
  return v ? 1 : 0;
}

function serializeAdminSession(s: typeof ecdSessions.$inferSelect) {
  return {
    ...serializeSession(s),
    published: s.published === 1,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export function registerEcdAdminContentRoutes(app: Hono) {
  // ——— Partners ———
  app.get('/admin/partners', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const rows = await db
      .select()
      .from(ecdPartners)
      .orderBy(asc(ecdPartners.sortOrder), asc(ecdPartners.name));

    return c.json({
      data: {
        items: rows.map(serializePartner),
      },
    });
  });

  app.post('/admin/partners', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = partnerSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid partner payload.' } }, 400);
    }

    const [row] = await db
      .insert(ecdPartners)
      .values(partnerValues(body.data))
      .returning();

    return c.json({ data: { partner: serializePartner(row) } }, 201);
  });

  app.put('/admin/partners/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = partnerSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid partner payload.' } }, 400);
    }

    const [row] = await db
      .update(ecdPartners)
      .set({
        ...partnerValues(body.data),
        updatedAt: new Date(),
      })
      .where(eq(ecdPartners.id, c.req.param('id')))
      .returning();

    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Partner not found.' } }, 404);
    }
    return c.json({ data: { partner: serializePartner(row) } });
  });

  app.delete('/admin/partners/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const [row] = await db
      .delete(ecdPartners)
      .where(eq(ecdPartners.id, c.req.param('id')))
      .returning({ id: ecdPartners.id });

    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Partner not found.' } }, 404);
    }
    return c.json({ data: { deleted: true, id: row.id } });
  });

  // ——— Speakers ———
  app.get('/admin/speakers', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const rows = await db
      .select()
      .from(ecdSpeakers)
      .orderBy(asc(ecdSpeakers.sortOrder), asc(ecdSpeakers.name));

    return c.json({
      data: {
        items: rows.map((s) => serializeSpeaker(s)),
      },
    });
  });

  app.post('/admin/speakers', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = speakerSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid speaker payload.' } }, 400);
    }

    const [row] = await db
      .insert(ecdSpeakers)
      .values(speakerValues(body.data))
      .returning();

    return c.json({ data: { speaker: serializeSpeaker(row) } }, 201);
  });

  app.put('/admin/speakers/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = speakerSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid speaker payload.' } }, 400);
    }

    const [row] = await db
      .update(ecdSpeakers)
      .set({
        ...speakerValues(body.data),
        updatedAt: new Date(),
      })
      .where(eq(ecdSpeakers.id, c.req.param('id')))
      .returning();

    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Speaker not found.' } }, 404);
    }
    return c.json({ data: { speaker: serializeSpeaker(row) } });
  });

  app.delete('/admin/speakers/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const [row] = await db
      .delete(ecdSpeakers)
      .where(eq(ecdSpeakers.id, c.req.param('id')))
      .returning({ id: ecdSpeakers.id });

    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Speaker not found.' } }, 404);
    }
    return c.json({ data: { deleted: true, id: row.id } });
  });

  // ——— Packages (exactly ct / fj — update only) ———
  app.get('/admin/packages', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const [packages, features] = await Promise.all([
      db.select().from(ecdTicketPackages),
      db.select().from(ecdTicketFeatures).orderBy(asc(ecdTicketFeatures.sortOrder)),
    ]);

    const byType: Record<string, ReturnType<typeof serializePackage>> = {};
    for (const pkg of packages) {
      byType[pkg.ticketType] = serializePackage(pkg, features);
    }

    return c.json({
      data: {
        packages: {
          ct: byType.ct ?? null,
          fj: byType.fj ?? null,
        },
      },
    });
  });

  app.put('/admin/packages/:ticketType', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const ticketTypeParam = c.req.param('ticketType');
    if (ticketTypeParam !== 'ct' && ticketTypeParam !== 'fj') {
      return c.json(
        { error: { code: 'INVALID_TICKET_TYPE', message: 'Only ct and fj packages exist.' } },
        400,
      );
    }
    const ticketType: 'ct' | 'fj' = ticketTypeParam;

    const body = packageUpdateSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json(
        { error: { code: 'INVALID_REQUEST', message: 'Invalid package payload.' } },
        400,
      );
    }

    const priceCents = Math.round(body.data.priceEgp * 100);

    const updated = await db.transaction(async (tx) => {
      const [pkg] = await tx
        .update(ecdTicketPackages)
        .set({
          displayName: body.data.displayName,
          eyebrow: body.data.eyebrow,
          title: body.data.title,
          tagline: body.data.tagline,
          description: body.data.description,
          badge: body.data.badge ?? null,
          ctaLabel: body.data.ctaLabel,
          priceCents,
          updatedAt: new Date(),
        })
        .where(eq(ecdTicketPackages.ticketType, ticketType))
        .returning();

      if (!pkg) return null;

      await tx.delete(ecdTicketFeatures).where(eq(ecdTicketFeatures.ticketType, ticketType));

      if (body.data.features.length > 0) {
        await tx.insert(ecdTicketFeatures).values(
          body.data.features.map((f, i) => ({
            ticketType,
            kind: f.kind,
            label: f.label,
            emphasis: f.emphasis ? 1 : 0,
            sortOrder: f.sortOrder ?? i,
          })),
        );
      }

      const features = await tx
        .select()
        .from(ecdTicketFeatures)
        .where(eq(ecdTicketFeatures.ticketType, ticketType))
        .orderBy(asc(ecdTicketFeatures.sortOrder));

      return serializePackage(pkg, features);
    });

    if (!updated) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Package not found. Run seed-ecd-content.mjs first.',
          },
        },
        404,
      );
    }

    invalidateEcdPackageCache();
    return c.json({ data: { package: updated } });
  });

  // ——— Agenda sessions / FJ workshops ———
  app.get('/admin/sessions', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const rows = await db
      .select()
      .from(ecdSessions)
      .orderBy(asc(ecdSessions.trackIndex), asc(ecdSessions.sortOrder));

    return c.json({ data: { items: rows.map(serializeAdminSession) } });
  });

  app.post('/admin/sessions', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = sessionSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json(
        { error: { code: 'INVALID_REQUEST', message: 'Invalid session payload.' } },
        400,
      );
    }

    try {
      const [row] = await db.insert(ecdSessions).values(sessionValues(body.data)).returning();
      return c.json({ data: { session: serializeAdminSession(row) } }, 201);
    } catch (err: any) {
      if (err?.code === '23505') {
        return c.json(
          { error: { code: 'SLUG_EXISTS', message: 'Session slug already exists.' } },
          409,
        );
      }
      throw err;
    }
  });

  app.put('/admin/sessions/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = c.req.param('id');
    const body = sessionSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json(
        { error: { code: 'INVALID_REQUEST', message: 'Invalid session payload.' } },
        400,
      );
    }

    try {
      const [row] = await db
        .update(ecdSessions)
        .set({ ...sessionValues(body.data), updatedAt: new Date() })
        .where(eq(ecdSessions.id, id))
        .returning();
      if (!row) {
        return c.json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } }, 404);
      }
      return c.json({ data: { session: serializeAdminSession(row) } });
    } catch (err: any) {
      if (err?.code === '23505') {
        return c.json(
          { error: { code: 'SLUG_EXISTS', message: 'Session slug already exists.' } },
          409,
        );
      }
      throw err;
    }
  });

  app.delete('/admin/sessions/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = c.req.param('id');
    const [row] = await db.delete(ecdSessions).where(eq(ecdSessions.id, id)).returning();
    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } }, 404);
    }
    return c.json({ data: { deleted: true, id: row.id } });
  });
}

function serializePartner(p: typeof ecdPartners.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    logoUrl: p.logoUrl,
    websiteUrl: p.websiteUrl,
    tier: p.tier,
    blurb: p.blurb,
    supportedAsset: p.supportedAsset,
    experienceUrl: p.experienceUrl,
    featured: p.featured === 1,
    featuredSortOrder: p.featuredSortOrder,
    showOnHome: p.showOnHome === 1,
    sortOrder: p.sortOrder,
    published: p.published === 1,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function serializeSpeaker(s: typeof ecdSpeakers.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    role: s.role,
    company: s.company,
    photoUrl: s.photoUrl,
    roomIndex: s.roomIndex,
    speakerType: s.speakerType,
    statusTag: s.statusTag,
    expertise: s.expertise ?? [],
    sessionTitle: s.sessionTitle,
    sessionLabel: s.sessionLabel,
    proof: s.proof,
    featured: s.featured === 1,
    featuredSortOrder: s.featuredSortOrder,
    sortOrder: s.sortOrder,
    published: s.published === 1,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}
