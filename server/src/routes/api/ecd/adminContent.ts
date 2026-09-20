import { asc, eq } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../../db/client.js';
import {
  ecdPartners,
  ecdSpeakers,
  ecdTicketFeatures,
  ecdTicketPackages,
} from '../../../db/schema/ecd.js';
import { requireManager } from '../utils.js';
import { invalidateEcdPackageCache } from './helpers.js';
import { serializePackage } from './content.js';

const optionalUrl = z
  .string()
  .max(500)
  .nullable()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null));

const partnerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  logoUrl: optionalUrl,
  websiteUrl: optionalUrl,
  sortOrder: z.number().int().min(0).max(9999).optional(),
  published: z.boolean().optional(),
});

const speakerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().max(160).nullable().optional(),
  company: z.string().trim().max(160).nullable().optional(),
  photoUrl: optionalUrl,
  sortOrder: z.number().int().min(0).max(9999).optional(),
  published: z.boolean().optional(),
});

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

function boolToInt(v: boolean | undefined, fallback = 1) {
  if (v === undefined) return fallback;
  return v ? 1 : 0;
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
        items: rows.map((p) => ({
          id: p.id,
          name: p.name,
          logoUrl: p.logoUrl,
          websiteUrl: p.websiteUrl,
          sortOrder: p.sortOrder,
          published: p.published === 1,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
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
      .values({
        name: body.data.name,
        logoUrl: body.data.logoUrl ?? null,
        websiteUrl: body.data.websiteUrl ?? null,
        sortOrder: body.data.sortOrder ?? 0,
        published: boolToInt(body.data.published, 1),
      })
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
        name: body.data.name,
        logoUrl: body.data.logoUrl ?? null,
        websiteUrl: body.data.websiteUrl ?? null,
        sortOrder: body.data.sortOrder ?? 0,
        published: boolToInt(body.data.published, 1),
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
        items: rows.map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          company: s.company,
          photoUrl: s.photoUrl,
          sortOrder: s.sortOrder,
          published: s.published === 1,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
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
      .values({
        name: body.data.name,
        role: body.data.role ?? null,
        company: body.data.company ?? null,
        photoUrl: body.data.photoUrl ?? null,
        sortOrder: body.data.sortOrder ?? 0,
        published: boolToInt(body.data.published, 1),
      })
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
        name: body.data.name,
        role: body.data.role ?? null,
        company: body.data.company ?? null,
        photoUrl: body.data.photoUrl ?? null,
        sortOrder: body.data.sortOrder ?? 0,
        published: boolToInt(body.data.published, 1),
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
}

function serializePartner(p: typeof ecdPartners.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    logoUrl: p.logoUrl,
    websiteUrl: p.websiteUrl,
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
    sortOrder: s.sortOrder,
    published: s.published === 1,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}
