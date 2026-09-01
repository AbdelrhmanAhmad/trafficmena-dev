import { and, eq, ne, sql } from 'drizzle-orm';
import type { Context, Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { skills, userSkills } from '../../db/schema/index.js';
import {
  bilingualDescriptionFields,
  bilingualDescriptionFromLegacy,
  bilingualNameFields,
  bilingualNameFromLegacy,
} from '../../utils/bilingualDb.js';
import {
  optionalBilingualDescriptionFields,
} from '../../utils/bilingualSchemas.js';
import { presentPublicNameRow } from '../../utils/contentPresentation.js';
import { resolveLocaleFromRequest } from '../../utils/locale.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { getOptionalUserRole, requireAdmin, requireManager } from './utils.js';

const STAFF_ROLES = new Set(['owner', 'admin', 'manager']);

async function resolvePresentationContext(c: Context) {
  const locale = resolveLocaleFromRequest(c);
  const session = await getSessionFromRequest(c);
  const role = session?.user ? await getOptionalUserRole(session.user.id) : null;
  const isStaff = Boolean(role && STAFF_ROLES.has(role));
  return { locale, isStaff };
}

const createSkillSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    nameEn: z.string().trim().min(1).max(255).optional(),
    nameAr: z.string().trim().min(1).max(255).optional(),
    category: z.string().trim().max(255).optional(),
    description: z.string().trim().max(500).optional(),
  })
  .merge(optionalBilingualDescriptionFields)
  .refine((data) => (data.nameEn && data.nameAr) || data.name, {
    message: 'Provide name or nameEn/nameAr.',
  });

const updateSkillSchema = z
  .object({
    nameEn: z.string().trim().min(1).max(255),
    nameAr: z.string().trim().min(1).max(255),
    category: z.string().trim().max(255).optional().nullable(),
    description: z.string().trim().max(500).optional().nullable(),
  })
  .merge(optionalBilingualDescriptionFields);

const userSkillBodySchema = z.object({
  skillId: z.string().uuid(),
});

export function registerSkillRoutes(app: Hono) {
  app.get('/skills', async (c) => {
    const { locale, isStaff } = await resolvePresentationContext(c);

    const rows = await db
      .select({
        id: skills.id,
        nameEn: skills.nameEn,
        nameAr: skills.nameAr,
        category: skills.category,
        description: skills.description,
      })
      .from(skills)
      .orderBy(skills.nameEn);

    return c.json({
      items: rows.map((row) => presentPublicNameRow(row, locale, isStaff)),
    });
  });

  app.post('/skills', async (c) => {
    const session = await getSessionFromRequest(c);

    if (!session || !session.user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to create skills.',
          },
        },
        401,
      );
    }

    const body = createSkillSchema.safeParse(await c.req.json().catch(() => ({})));

    if (!body.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: body.error.message,
          },
        },
        400,
      );
    }

    const normalizedName = (body.data.name ?? body.data.nameEn ?? '').trim();
    const lowerName = normalizedName.toLowerCase();

    const existing = await db
      .select({ id: skills.id })
      .from(skills)
      .where(sql`lower(${skills.name}) = ${lowerName}`)
      .limit(1);

    if (existing.length > 0) {
      return c.json(
        {
          error: {
            code: 'SKILL_EXISTS',
            message: 'This skill already exists.',
          },
        },
        409,
      );
    }

    const nameFields =
      body.data.nameEn && body.data.nameAr
        ? bilingualNameFields(body.data.nameEn.trim(), body.data.nameAr.trim())
        : bilingualNameFromLegacy(normalizedName);

    const inserted = await db
      .insert(skills)
      .values({
        ...nameFields,
        ...bilingualDescriptionFromLegacy(body.data.description),
        category: body.data.category,
      })
      .returning({
        id: skills.id,
        name: skills.name,
        category: skills.category,
        description: skills.description,
      });

    return c.json({ success: true, skill: inserted[0] });
  });

  app.put('/skills/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const skillId = c.req.param('id');
    const body = updateSkillSchema.safeParse(await c.req.json().catch(() => ({})));

    if (!body.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: body.error.message,
          },
        },
        400,
      );
    }

    const nameFields = bilingualNameFields(body.data.nameEn.trim(), body.data.nameAr.trim());
    const lowerName = nameFields.nameEn.toLowerCase();

    const duplicate = await db
      .select({ id: skills.id })
      .from(skills)
      .where(and(sql`lower(${skills.nameEn}) = ${lowerName}`, ne(skills.id, skillId)))
      .limit(1);

    if (duplicate.length > 0) {
      return c.json(
        {
          error: {
            code: 'SKILL_EXISTS',
            message: 'This skill already exists.',
          },
        },
        409,
      );
    }

    const descriptionFields =
      body.data.descriptionEn !== undefined || body.data.descriptionAr !== undefined
        ? bilingualDescriptionFields(body.data.descriptionEn, body.data.descriptionAr)
        : bilingualDescriptionFromLegacy(body.data.description);

    const [updated] = await db
      .update(skills)
      .set({
        ...nameFields,
        ...descriptionFields,
        category: body.data.category ?? null,
      })
      .where(eq(skills.id, skillId))
      .returning({
        id: skills.id,
        name: skills.name,
        nameEn: skills.nameEn,
        nameAr: skills.nameAr,
        category: skills.category,
        description: skills.description,
      });

    if (!updated) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Skill not found.',
          },
        },
        404,
      );
    }

    return c.json({ success: true, skill: updated });
  });

  app.delete('/skills/:id', async (c) => {
    const staff = await requireAdmin(c);
    if ('response' in staff) return staff.response;

    const skillId = c.req.param('id');
    const [deleted] = await db.delete(skills).where(eq(skills.id, skillId)).returning({ id: skills.id });

    if (!deleted) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Skill not found.',
          },
        },
        404,
      );
    }

    return c.json({ success: true });
  });

  app.get('/user/skills', async (c) => {
    const session = await getSessionFromRequest(c);

    if (!session || !session.user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          },
        },
        401,
      );
    }

    const { locale, isStaff } = await resolvePresentationContext(c);

    const rows = await db
      .select({
        skillId: userSkills.skillId,
        nameEn: skills.nameEn,
        nameAr: skills.nameAr,
        category: skills.category,
      })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(userSkills.userId, session.user.id))
      .orderBy(skills.nameEn);

    return c.json({
      items: rows.map((row) => {
        const presented = presentPublicNameRow(
          { nameEn: row.nameEn, nameAr: row.nameAr },
          locale,
          isStaff,
        );
        return {
          skillId: row.skillId,
          ...presented,
          category: row.category,
        };
      }),
    });
  });

  app.post('/user/skills', async (c) => {
    const session = await getSessionFromRequest(c);

    if (!session || !session.user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          },
        },
        401,
      );
    }

    const body = userSkillBodySchema.safeParse(await c.req.json().catch(() => ({})));

    if (!body.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: body.error.message,
          },
        },
        400,
      );
    }

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(userSkills)
      .where(
        and(eq(userSkills.userId, session.user.id), eq(userSkills.skillId, body.data.skillId)),
      );

    if (Number(count ?? 0) > 0) {
      return c.json({ success: true, message: 'Skill already linked.' });
    }

    await db.insert(userSkills).values({
      userId: session.user.id,
      skillId: body.data.skillId,
    });

    return c.json({ success: true });
  });

  app.delete('/user/skills/:skillId', async (c) => {
    const session = await getSessionFromRequest(c);

    if (!session || !session.user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          },
        },
        401,
      );
    }

    const skillId = c.req.param('skillId');

    await db
      .delete(userSkills)
      .where(and(eq(userSkills.userId, session.user.id), eq(userSkills.skillId, skillId)));

    return c.json({ success: true });
  });
}
