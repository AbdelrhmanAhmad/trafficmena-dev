import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Context, Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { expertSkills, experts, skills, users } from '../../db/schema/index.js';
import {
  assertSlugAvailable,
  assertUserAssignmentAvailable,
  countEventExpertLinks,
  findExpertByAssignedUser,
  loadExpertSkillIds,
  loadExpertWithAssignee,
  loadPublicExpertEvents,
  replaceExpertSkills,
} from '../../services/experts.js';
import { bilingualDisplayNameFields } from '../../utils/bilingualDb.js';
import {
  sanitizeExternalUrl,
  sanitizePlainText,
  sanitizeRichTextHtml,
  slugifyExpert,
} from '../../utils/expertContent.js';
import {
  presentAdminExpert,
  presentPublicExpert,
} from '../../utils/expertPresentation.js';
import { presentPublicNameRow, presentPublicTitleOnly } from '../../utils/contentPresentation.js';
import { resolveLocaleFromRequest } from '../../utils/locale.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { getOptionalUserRole, requireAdmin, requireManager } from './utils.js';

const STAFF_ROLES = new Set(['owner', 'admin', 'manager']);

async function resolvePresentationContext(c: Context) {
  const locale = resolveLocaleFromRequest(c);
  const session = await getSessionFromRequest(c);
  const role = session?.user ? await getOptionalUserRole(session.user.id) : null;
  const isStaff = Boolean(role && STAFF_ROLES.has(role));
  return { locale, isStaff, session, role };
}

const optionalUrlField = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .nullable()
  .transform((value) => sanitizeExternalUrl(value ?? null));

const expertContentFieldsSchema = z.object({
  displayNameEn: z.string().trim().min(1).max(180),
  displayNameAr: z.string().trim().min(1).max(180),
  headlineEn: z.string().trim().max(300).optional().nullable(),
  headlineAr: z.string().trim().max(300).optional().nullable(),
  bioEn: z.string().max(20000).optional().nullable(),
  bioAr: z.string().max(20000).optional().nullable(),
  avatarUrl: optionalUrlField,
  websiteUrl: optionalUrlField,
  linkedinUrl: optionalUrlField,
  twitterUrl: optionalUrlField,
  skillIds: z.array(z.string().uuid()).max(30).optional(),
});

const createExpertSchema = expertContentFieldsSchema.extend({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens.')
    .optional(),
  assignedUserId: z.string().uuid().optional().nullable(),
  isPublished: z.boolean().optional(),
});

const adminUpdateExpertSchema = expertContentFieldsSchema.partial().extend({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  assignedUserId: z.string().uuid().optional().nullable(),
  isPublished: z.boolean().optional(),
});

const assignUserSchema = z.object({
  assignedUserId: z.string().uuid().nullable(),
});

function mapSanitizedExpertContent(data: z.infer<typeof expertContentFieldsSchema>) {
  return {
    ...bilingualDisplayNameFields(data.displayNameEn, data.displayNameAr),
    headlineEn: sanitizePlainText(data.headlineEn, 300),
    headlineAr: sanitizePlainText(data.headlineAr, 300),
    bioEn: sanitizeRichTextHtml(data.bioEn),
    bioAr: sanitizeRichTextHtml(data.bioAr),
    avatarUrl: data.avatarUrl,
    websiteUrl: data.websiteUrl,
    linkedinUrl: data.linkedinUrl,
    twitterUrl: data.twitterUrl,
  };
}

async function loadExpertSkillsPublic(expertId: string, locale: ReturnType<typeof resolveLocaleFromRequest>, isStaff: boolean) {
  const rows = await db
    .select({
      id: skills.id,
      nameEn: skills.nameEn,
      nameAr: skills.nameAr,
      category: skills.category,
    })
    .from(expertSkills)
    .innerJoin(skills, eq(skills.id, expertSkills.skillId))
    .where(eq(expertSkills.expertId, expertId))
    .orderBy(asc(skills.nameEn));

  return rows.map((row) => ({
    ...presentPublicNameRow(row, locale, isStaff),
    id: row.id,
    category: row.category,
  }));
}

export function registerExpertRoutes(app: Hono) {
  app.get('/experts', async (c) => {
    const { locale, isStaff } = await resolvePresentationContext(c);

    const rows = isStaff
      ? await db.select().from(experts).orderBy(asc(experts.displayNameEn))
      : await db
          .select()
          .from(experts)
          .where(and(eq(experts.isPublished, true), isNull(experts.archivedAt)))
          .orderBy(asc(experts.displayNameEn));

    return c.json({
      items: rows.map((row) => ({
        ...presentPublicExpert(row, locale),
        isPublished: isStaff ? row.isPublished : undefined,
        archivedAt: isStaff ? row.archivedAt : undefined,
        assignedUserId: isStaff ? row.assignedUserId : undefined,
      })),
    });
  });

  app.get('/experts/s/:slug', async (c) => {
    const slug = c.req.param('slug');
    const { locale, isStaff } = await resolvePresentationContext(c);

    const [row] = await db.select().from(experts).where(eq(experts.slug, slug)).limit(1);
    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Expert profile not found.' } }, 404);
    }

    const isPublic = row.isPublished && row.archivedAt == null;
    if (!isPublic && !isStaff) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Expert profile not found.' } }, 404);
    }

    const skillItems = await loadExpertSkillsPublic(row.id, locale, isStaff);
    const relatedEvents = isPublic
      ? (await loadPublicExpertEvents(row.id)).map((event) => ({
          ...presentPublicTitleOnly(event, locale),
          date: event.date,
          imageUrl: event.imageUrl,
        }))
      : [];

    return c.json({
      expert: isStaff ? presentAdminExpert(row) : presentPublicExpert(row, locale),
      skills: skillItems,
      events: relatedEvents,
    });
  });

  app.get('/experts/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const expertId = c.req.param('id');
    const loaded = await loadExpertWithAssignee(expertId);
    if (!loaded) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Expert not found.' } }, 404);
    }

    const skillIds = await loadExpertSkillIds(expertId);
    return c.json({
      expert: presentAdminExpert({
        ...loaded.expert,
        assignedUserEmail: loaded.assignedUserEmail,
      }),
      skillIds,
    });
  });

  app.post('/experts', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = createExpertSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: body.error.message } }, 400);
    }

    const slug =
      body.data.slug ??
      slugifyExpert(body.data.displayNameEn);
    if (!(await assertSlugAvailable(slug))) {
      return c.json({ error: { code: 'SLUG_EXISTS', message: 'Slug already in use.' } }, 409);
    }

    if (body.data.assignedUserId) {
      const userExists = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, body.data.assignedUserId))
        .limit(1);
      if (userExists.length === 0) {
        return c.json({ error: { code: 'USER_NOT_FOUND', message: 'Assigned user not found.' } }, 404);
      }
      if (!(await assertUserAssignmentAvailable(body.data.assignedUserId))) {
        return c.json(
          { error: { code: 'USER_ALREADY_ASSIGNED', message: 'User already linked to another expert.' } },
          409,
        );
      }
    }

    const content = mapSanitizedExpertContent(body.data);
    const publishNow = body.data.isPublished === true;

    const [created] = await db
      .insert(experts)
      .values({
        slug,
        ...content,
        assignedUserId: body.data.assignedUserId ?? null,
        isPublished: publishNow,
        publishedAt: publishNow ? new Date() : null,
      })
      .returning();

    if (body.data.skillIds) {
      await replaceExpertSkills(created.id, body.data.skillIds);
    }

    return c.json({ expert: presentAdminExpert(created) }, 201);
  });

  app.put('/experts/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const expertId = c.req.param('id');
    const body = adminUpdateExpertSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: body.error.message } }, 400);
    }

    const [existing] = await db.select().from(experts).where(eq(experts.id, expertId)).limit(1);
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Expert not found.' } }, 404);
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (body.data.slug && body.data.slug !== existing.slug) {
      if (!(await assertSlugAvailable(body.data.slug, expertId))) {
        return c.json({ error: { code: 'SLUG_EXISTS', message: 'Slug already in use.' } }, 409);
      }
      patch.slug = body.data.slug;
    }

    if (body.data.assignedUserId !== undefined) {
      if (body.data.assignedUserId) {
        const userExists = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, body.data.assignedUserId))
          .limit(1);
        if (userExists.length === 0) {
          return c.json({ error: { code: 'USER_NOT_FOUND', message: 'Assigned user not found.' } }, 404);
        }
        if (!(await assertUserAssignmentAvailable(body.data.assignedUserId, expertId))) {
          return c.json(
            { error: { code: 'USER_ALREADY_ASSIGNED', message: 'User already linked to another expert.' } },
            409,
          );
        }
      }
      patch.assignedUserId = body.data.assignedUserId;
    }

    if (
      body.data.displayNameEn &&
      body.data.displayNameAr &&
      (body.data.displayNameEn ||
        body.data.displayNameAr ||
        body.data.headlineEn !== undefined ||
        body.data.bioEn !== undefined)
    ) {
      const merged = mapSanitizedExpertContent({
        displayNameEn: body.data.displayNameEn ?? existing.displayNameEn,
        displayNameAr: body.data.displayNameAr ?? existing.displayNameAr,
        headlineEn: body.data.headlineEn ?? existing.headlineEn,
        headlineAr: body.data.headlineAr ?? existing.headlineAr,
        bioEn: body.data.bioEn ?? existing.bioEn,
        bioAr: body.data.bioAr ?? existing.bioAr,
        avatarUrl: body.data.avatarUrl ?? existing.avatarUrl,
        websiteUrl: body.data.websiteUrl ?? existing.websiteUrl,
        linkedinUrl: body.data.linkedinUrl ?? existing.linkedinUrl,
        twitterUrl: body.data.twitterUrl ?? existing.twitterUrl,
      });
      Object.assign(patch, merged);
    } else {
      if (body.data.headlineEn !== undefined) patch.headlineEn = sanitizePlainText(body.data.headlineEn, 300);
      if (body.data.headlineAr !== undefined) patch.headlineAr = sanitizePlainText(body.data.headlineAr, 300);
      if (body.data.bioEn !== undefined) patch.bioEn = sanitizeRichTextHtml(body.data.bioEn);
      if (body.data.bioAr !== undefined) patch.bioAr = sanitizeRichTextHtml(body.data.bioAr);
      if (body.data.avatarUrl !== undefined) patch.avatarUrl = body.data.avatarUrl;
      if (body.data.websiteUrl !== undefined) patch.websiteUrl = body.data.websiteUrl;
      if (body.data.linkedinUrl !== undefined) patch.linkedinUrl = body.data.linkedinUrl;
      if (body.data.twitterUrl !== undefined) patch.twitterUrl = body.data.twitterUrl;
      if (body.data.displayNameEn && body.data.displayNameAr) {
        Object.assign(
          patch,
          bilingualDisplayNameFields(body.data.displayNameEn, body.data.displayNameAr),
        );
      }
    }

    if (body.data.isPublished !== undefined) {
      patch.isPublished = body.data.isPublished;
      patch.publishedAt = body.data.isPublished ? existing.publishedAt ?? new Date() : null;
    }

    const [updated] = await db
      .update(experts)
      .set(patch)
      .where(eq(experts.id, expertId))
      .returning();

    if (body.data.skillIds) {
      await replaceExpertSkills(expertId, body.data.skillIds);
    }

    return c.json({ expert: presentAdminExpert(updated) });
  });

  app.post('/experts/:id/publish', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const [updated] = await db
      .update(experts)
      .set({ isPublished: true, publishedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(experts.id, c.req.param('id')), isNull(experts.archivedAt)))
      .returning();

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Expert not found or archived.' } }, 404);
    }
    return c.json({ expert: presentAdminExpert(updated) });
  });

  app.post('/experts/:id/unpublish', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const [updated] = await db
      .update(experts)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(experts.id, c.req.param('id')))
      .returning();

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Expert not found.' } }, 404);
    }
    return c.json({ expert: presentAdminExpert(updated) });
  });

  app.post('/experts/:id/archive', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const [updated] = await db
      .update(experts)
      .set({
        archivedAt: new Date(),
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(eq(experts.id, c.req.param('id')))
      .returning();

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Expert not found.' } }, 404);
    }
    return c.json({ expert: presentAdminExpert(updated) });
  });

  app.post('/experts/:id/restore', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const [updated] = await db
      .update(experts)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(eq(experts.id, c.req.param('id')))
      .returning();

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Expert not found.' } }, 404);
    }
    return c.json({ expert: presentAdminExpert(updated) });
  });

  app.put('/experts/:id/assign-user', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = assignUserSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: body.error.message } }, 400);
    }

    const expertId = c.req.param('id');
    if (body.data.assignedUserId) {
      const userExists = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, body.data.assignedUserId))
        .limit(1);
      if (userExists.length === 0) {
        return c.json({ error: { code: 'USER_NOT_FOUND', message: 'Assigned user not found.' } }, 404);
      }
      if (!(await assertUserAssignmentAvailable(body.data.assignedUserId, expertId))) {
        return c.json(
          { error: { code: 'USER_ALREADY_ASSIGNED', message: 'User already linked to another expert.' } },
          409,
        );
      }
    }

    const [updated] = await db
      .update(experts)
      .set({ assignedUserId: body.data.assignedUserId, updatedAt: new Date() })
      .where(eq(experts.id, expertId))
      .returning();

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Expert not found.' } }, 404);
    }
    return c.json({ expert: presentAdminExpert(updated) });
  });

  app.delete('/experts/:id', async (c) => {
    const staff = await requireAdmin(c);
    if ('response' in staff) return staff.response;

    const expertId = c.req.param('id');
    const links = await countEventExpertLinks(expertId);
    if (links > 0) {
      return c.json(
        {
          error: {
            code: 'EXPERT_IN_USE',
            message: 'Cannot permanently delete an expert linked to events. Archive instead.',
          },
        },
        409,
      );
    }

    const [deleted] = await db.delete(experts).where(eq(experts.id, expertId)).returning({ id: experts.id });
    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Expert not found.' } }, 404);
    }
    return c.json({ success: true });
  });

  app.get('/me/expert-profile', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, 401);
    }

    const expert = await findExpertByAssignedUser(session.user.id);
    if (!expert) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No expert profile assigned to this user.' } }, 404);
    }

    const { locale } = await resolvePresentationContext(c);
    const skillIds = await loadExpertSkillIds(expert.id);
    return c.json({
      expert: presentAdminExpert(expert),
      skillIds,
      canEdit: expert.archivedAt == null,
    });
  });

  app.patch('/me/expert-profile', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, 401);
    }

    const expert = await findExpertByAssignedUser(session.user.id);
    if (!expert) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No expert profile assigned to this user.' } }, 404);
    }
    if (expert.archivedAt) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Archived profiles are admin-only.' } }, 403);
    }

    const selfEditSchema = expertContentFieldsSchema.partial();
    const body = selfEditSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: body.error.message } }, 400);
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.displayNameEn && body.data.displayNameAr) {
      Object.assign(
        patch,
        bilingualDisplayNameFields(body.data.displayNameEn, body.data.displayNameAr),
      );
    }
    if (body.data.headlineEn !== undefined) patch.headlineEn = sanitizePlainText(body.data.headlineEn, 300);
    if (body.data.headlineAr !== undefined) patch.headlineAr = sanitizePlainText(body.data.headlineAr, 300);
    if (body.data.bioEn !== undefined) patch.bioEn = sanitizeRichTextHtml(body.data.bioEn);
    if (body.data.bioAr !== undefined) patch.bioAr = sanitizeRichTextHtml(body.data.bioAr);
    if (body.data.avatarUrl !== undefined) patch.avatarUrl = body.data.avatarUrl;
    if (body.data.websiteUrl !== undefined) patch.websiteUrl = body.data.websiteUrl;
    if (body.data.linkedinUrl !== undefined) patch.linkedinUrl = body.data.linkedinUrl;
    if (body.data.twitterUrl !== undefined) patch.twitterUrl = body.data.twitterUrl;

    const [updated] = await db.update(experts).set(patch).where(eq(experts.id, expert.id)).returning();

    if (body.data.skillIds) {
      await replaceExpertSkills(expert.id, body.data.skillIds);
    }

    return c.json({ expert: presentAdminExpert(updated) });
  });
}
