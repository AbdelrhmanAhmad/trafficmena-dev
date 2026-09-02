import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Context, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { db } from '../../db/client.js';
import {
  masterclassEnrollments,
  masterclassLessonFiles,
  masterclassLessonProgress,
  masterclassLessons,
  masterclassLessonVideos,
  masterclassModules,
  masterclasses,
  payments,
  profiles,
  users,
} from '../../db/schema/index.js';
import {
  assertMasterclassSellable,
  countCompletedLessons,
  countMasterclassLessons,
  getEnrolledMasterclassIds,
  grantMasterclassEnrollment,
  isMasterclassSellable,
} from '../../services/masterclassSales.js';
import {
  expertIdsExist,
  loadLinkedExpertIdsForMasterclass,
  replaceMasterclassExpertLinks,
} from '../../services/experts.js';
import { notifyBusinessEvent } from '../../services/notifications/notify.js';
import {
  applyFirstPublishLaunch,
  getEffectiveProductVisibility,
  isDiscoveryBlocked,
} from '../../services/productVisibility.js';
import { getLearnerCertificateStatus, tryIssueCertificateOnCompletion } from '../../services/certificates.js';
import {
  bilingualDescriptionFields,
  bilingualDescriptionFromLegacy,
  bilingualDisplayNameFields,
  bilingualDisplayNameFromLegacy,
  bilingualTitleFields,
  bilingualTitleFromLegacy,
} from '../../utils/bilingualDb.js';
import {
  optionalBilingualDescriptionFields,
  optionalBilingualDisplayNameFields,
  requiredBilingualTitleFields,
} from '../../utils/bilingualSchemas.js';
import { ApiError } from '../../utils/errors.js';
import {
  presentAdminContent,
  presentAdminDisplayName,
  presentPublicContent,
  presentPublicDisplayName,
  presentPublicTitleOnly,
} from '../../utils/contentPresentation.js';
import { resolveLocaleFromRequest, type AppLocale } from '../../utils/locale.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { getOptionalUserRole, requireManager, requireContentDelete } from './utils.js';

const STAFF_ROLES = new Set(['owner', 'admin', 'manager']);

type BilingualContentRow = {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
};

async function resolvePresentationContext(c: Context) {
  const locale = resolveLocaleFromRequest(c);
  const session = await getSessionFromRequest(c);
  const role = session?.user ? await getOptionalUserRole(session.user.id) : null;
  const isStaff = Boolean(role && STAFF_ROLES.has(role));
  return { locale, isStaff };
}

function presentContentFields(row: BilingualContentRow, locale: AppLocale, isStaff: boolean) {
  const contentRow = {
    id: row.id,
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    descriptionEn: row.descriptionEn,
    descriptionAr: row.descriptionAr,
  };
  if (isStaff) {
    return presentAdminContent(contentRow);
  }
  const presented = presentPublicContent(contentRow, locale);
  return { title: presented.title, description: presented.description };
}

function presentVideoTitle(
  row: { id: string; titleEn: string; titleAr: string },
  locale: AppLocale,
  isStaff: boolean,
) {
  if (isStaff) {
    return { id: row.id, titleEn: row.titleEn, titleAr: row.titleAr };
  }
  return presentPublicTitleOnly(row, locale);
}

const fileTypeSchema = z.enum(['excel', 'markdown', 'html', 'text', 'powerpoint']);
const uuidParamSchema = z.string().uuid();

const masterclassFieldsSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    priceInCents: z.number().int().min(0).optional().nullable(),
    isPublished: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    expertIds: z.array(z.string().uuid()).max(50).optional(),
  })
  .merge(requiredBilingualTitleFields.partial())
  .merge(optionalBilingualDescriptionFields);

const createMasterclassSchema = masterclassFieldsSchema.refine(
  (data) => (data.titleEn && data.titleAr) || data.title,
  { message: 'Provide title or titleEn/titleAr.' },
);

const updateMasterclassSchema = masterclassFieldsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

const moduleFieldsSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional().nullable(),
    sortOrder: z.number().int().optional(),
  })
  .merge(requiredBilingualTitleFields.partial())
  .merge(optionalBilingualDescriptionFields);

const moduleInputSchema = moduleFieldsSchema.refine(
  (data) => (data.titleEn && data.titleAr) || data.title,
  { message: 'Provide title or titleEn/titleAr.' },
);

const lessonFieldsSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional().nullable(),
    sortOrder: z.number().int().optional(),
  })
  .merge(requiredBilingualTitleFields.partial())
  .merge(optionalBilingualDescriptionFields);

const lessonInputSchema = lessonFieldsSchema.refine(
  (data) => (data.titleEn && data.titleAr) || data.title,
  { message: 'Provide title or titleEn/titleAr.' },
);

const baseVideoInputSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    videoUrl: z.string().trim().min(1).max(1000),
    sortOrder: z.number().int().optional(),
  })
  .merge(requiredBilingualTitleFields.partial());

const videoInputSchema = baseVideoInputSchema.refine(
  (data) => (data.titleEn && data.titleAr) || data.title,
  { message: 'Provide title or titleEn/titleAr.' },
);

const MAX_VIDEOS_PER_LESSON = 20;

const baseFileInputSchema = z
  .object({
    fileType: fileTypeSchema,
    displayName: z.string().min(1).max(200).optional(),
    fileUrl: z.string().url(),
    sortOrder: z.number().int().optional(),
  })
  .merge(optionalBilingualDisplayNameFields.partial());

const fileInputSchema = baseFileInputSchema.refine(
  (data) => (data.displayNameEn && data.displayNameAr) || data.displayName,
  { message: 'Provide displayName or displayNameEn/displayNameAr.' },
);

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

const manualEnrollmentSchema = z.object({
  userId: z.string().uuid(),
  note: z.string().max(500).optional().nullable(),
});


async function getMasterclassLessonCountMap(
  masterclassIds: string[],
): Promise<Map<string, number>> {
  if (masterclassIds.length === 0) return new Map();

  const rows = await db
    .select({
      masterclassId: masterclassModules.masterclassId,
      lessonCount: sql<number>`count(${masterclassLessons.id})::int`,
    })
    .from(masterclassLessons)
    .innerJoin(masterclassModules, eq(masterclassModules.id, masterclassLessons.moduleId))
    .where(inArray(masterclassModules.masterclassId, masterclassIds))
    .groupBy(masterclassModules.masterclassId);

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.masterclassId, (map.get(row.masterclassId) ?? 0) + row.lessonCount);
  }
  return map;
}

async function assertModuleInMasterclass(masterclassId: string, moduleId: string) {
  const [module] = await db
    .select()
    .from(masterclassModules)
    .where(
      and(
        eq(masterclassModules.id, moduleId),
        eq(masterclassModules.masterclassId, masterclassId),
      ),
    )
    .limit(1);
  if (!module) {
    throw new ApiError('NOT_FOUND', 'Module not found.', 404);
  }
  return module;
}

async function assertLessonInModule(moduleId: string, lessonId: string) {
  const [lesson] = await db
    .select()
    .from(masterclassLessons)
    .where(and(eq(masterclassLessons.id, lessonId), eq(masterclassLessons.moduleId, moduleId)))
    .limit(1);
  if (!lesson) {
    throw new ApiError('NOT_FOUND', 'Lesson not found.', 404);
  }
  return lesson;
}

async function getLessonMasterclassContext(lessonId: string) {
  const [row] = await db
    .select({
      lessonId: masterclassLessons.id,
      moduleId: masterclassLessons.moduleId,
      masterclassId: masterclassModules.masterclassId,
    })
    .from(masterclassLessons)
    .innerJoin(masterclassModules, eq(masterclassModules.id, masterclassLessons.moduleId))
    .where(eq(masterclassLessons.id, lessonId))
    .limit(1);
  return row ?? null;
}

async function assertUserEnrolled(userId: string, masterclassId: string) {
  const enrolled = await getEnrolledMasterclassIds(userId, [masterclassId]);
  if (!enrolled.has(masterclassId)) {
    throw new ApiError('NOT_ENROLLED', 'Enrollment required to access this masterclass.', 403);
  }
}

async function loadMasterclassPreviewTree(masterclassId: string) {
  const modules = await db
    .select()
    .from(masterclassModules)
    .where(eq(masterclassModules.masterclassId, masterclassId))
    .orderBy(asc(masterclassModules.sortOrder), asc(masterclassModules.createdAt));

  if (modules.length === 0) {
    return { modules: [] };
  }

  const moduleIds = modules.map((m) => m.id);
  const lessons = await db
    .select()
    .from(masterclassLessons)
    .where(inArray(masterclassLessons.moduleId, moduleIds))
    .orderBy(asc(masterclassLessons.sortOrder), asc(masterclassLessons.createdAt));

  const lessonIds = lessons.map((l) => l.id);
  const [videos, files] = await Promise.all([
    lessonIds.length > 0
      ? db
          .select()
          .from(masterclassLessonVideos)
          .where(inArray(masterclassLessonVideos.lessonId, lessonIds))
          .orderBy(asc(masterclassLessonVideos.sortOrder), asc(masterclassLessonVideos.createdAt))
      : Promise.resolve([]),
    lessonIds.length > 0
      ? db
          .select()
          .from(masterclassLessonFiles)
          .where(inArray(masterclassLessonFiles.lessonId, lessonIds))
          .orderBy(asc(masterclassLessonFiles.sortOrder), asc(masterclassLessonFiles.createdAt))
      : Promise.resolve([]),
  ]);

  const lessonsByModule = new Map<string, typeof lessons>();
  for (const lesson of lessons) {
    const list = lessonsByModule.get(lesson.moduleId) ?? [];
    list.push(lesson);
    lessonsByModule.set(lesson.moduleId, list);
  }

  const videosByLesson = new Map<string, typeof videos>();
  for (const video of videos) {
    const list = videosByLesson.get(video.lessonId) ?? [];
    list.push(video);
    videosByLesson.set(video.lessonId, list);
  }

  const filesByLesson = new Map<string, typeof files>();
  for (const file of files) {
    const list = filesByLesson.get(file.lessonId) ?? [];
    list.push(file);
    filesByLesson.set(file.lessonId, list);
  }

  return {
    modules: modules.map((module) => ({
      ...module,
      lessons: (lessonsByModule.get(module.id) ?? []).map((lesson) => ({
        ...lesson,
        videos: videosByLesson.get(lesson.id) ?? [],
        files: filesByLesson.get(lesson.id) ?? [],
      })),
    })),
  };
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function applyReorder(
  orderedIds: string[],
  existingIds: string[],
  updateFn: (tx: DbTransaction, id: string, sortOrder: number) => Promise<void>,
) {
  if (orderedIds.length !== existingIds.length) {
    throw new ApiError('INVALID_REORDER', 'orderedIds must include every item exactly once.', 400);
  }
  const existingSet = new Set(existingIds);
  if (!orderedIds.every((id) => existingSet.has(id))) {
    throw new ApiError('INVALID_REORDER', 'orderedIds contains unknown or duplicate ids.', 400);
  }
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new ApiError('INVALID_REORDER', 'orderedIds must not contain duplicates.', 400);
  }

  await db.transaction(async (tx) => {
    await Promise.all(orderedIds.map((id, index) => updateFn(tx, id, index)));
  });
}

export function registerMasterclassRoutes(app: Hono) {
  // --- Store (authenticated members) — register before /:id ------------------

  app.get('/masterclasses/store', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const { locale, isStaff } = await resolvePresentationContext(c);
    const filter = c.req.query('filter') === 'mine' ? 'mine' : 'all';
    const visibility = await getEffectiveProductVisibility();
    const discoveryBlocked = isDiscoveryBlocked('masterclasses', visibility);

    if (discoveryBlocked && filter !== 'mine') {
      return c.json({ data: { items: [] } });
    }

    const enrolledIds = await getEnrolledMasterclassIds(session.user.id);

    const rows = await db
      .select()
      .from(masterclasses)
      .orderBy(asc(masterclasses.sortOrder), desc(masterclasses.createdAt));

    const lessonCountMap = await getMasterclassLessonCountMap(rows.map((row) => row.id));

    const items = rows
      .filter((row) => {
        const enrolled = enrolledIds.has(row.id);
        const lessonCount = lessonCountMap.get(row.id) ?? 0;
        if (filter === 'mine') return enrolled;
        return isMasterclassSellable({ ...row, lessonCount }) || enrolled;
      })
      .map((row) => {
        const lessonCount = lessonCountMap.get(row.id) ?? 0;
        return {
          ...presentContentFields(row, locale, isStaff),
          id: row.id,
          image_url: row.imageUrl,
          price_in_cents: row.priceInCents,
          is_enrolled: enrolledIds.has(row.id),
          is_sellable: isMasterclassSellable({ ...row, lessonCount }),
          lesson_count: lessonCount,
        };
      });

    return c.json({ data: { items } });
  });

  app.get('/masterclasses/store/:id', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const { locale, isStaff } = await resolvePresentationContext(c);

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    const visibility = await getEffectiveProductVisibility();
    const discoveryBlocked = isDiscoveryBlocked('masterclasses', visibility);

    const [masterclass] = await db
      .select()
      .from(masterclasses)
      .where(eq(masterclasses.id, idParsed.data))
      .limit(1);

    if (!masterclass) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Masterclass not found.' } }, 404);
    }

    const lessonCount = await countMasterclassLessons(masterclass.id);
    const enrolledIds = await getEnrolledMasterclassIds(session.user.id, [masterclass.id]);
    const isEnrolled = enrolledIds.has(masterclass.id);
    const sellable = isMasterclassSellable({ ...masterclass, lessonCount });

    if (discoveryBlocked && !isEnrolled) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Masterclass not found.' } }, 404);
    }

    if (!isEnrolled && !sellable) {
      return c.json({ error: { code: 'NOT_AVAILABLE', message: 'Masterclass not available.' } }, 404);
    }

    let modules: Array<{
      id: string;
      title?: string;
      titleEn?: string;
      titleAr?: string;
      description?: string | null;
      descriptionEn?: string | null;
      descriptionAr?: string | null;
      sort_order: number;
      lessons: Array<{
        id: string;
        title?: string;
        titleEn?: string;
        titleAr?: string;
        description?: string | null;
        descriptionEn?: string | null;
        descriptionAr?: string | null;
        sort_order: number;
        video_count: number;
        file_count: number;
      }>;
    }> = [];
    if (isEnrolled) {
      const tree = await loadMasterclassPreviewTree(masterclass.id);
      modules = tree.modules.map((module) => {
        const moduleFields = presentContentFields(module, locale, isStaff);
        return {
          id: module.id,
          ...moduleFields,
          sort_order: module.sortOrder,
          lessons: module.lessons.map((lesson) => ({
            id: lesson.id,
            ...presentContentFields(lesson, locale, isStaff),
            sort_order: lesson.sortOrder,
            video_count: lesson.videos.length,
            file_count: lesson.files.length,
          })),
        };
      });
    }

    const masterclassFields = presentContentFields(masterclass, locale, isStaff);

    return c.json({
      data: {
        masterclass: {
          ...masterclassFields,
          id: masterclass.id,
          image_url: masterclass.imageUrl,
          price_in_cents: masterclass.priceInCents,
          is_enrolled: isEnrolled,
          is_sellable: sellable,
          lesson_count: lessonCount,
        },
        modules,
      },
    });
  });

  // --- Learn (enrolled members) — register before generic /:id --------------

  app.get('/masterclasses/learn/lessons/:lessonId', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const { locale, isStaff } = await resolvePresentationContext(c);

    const lessonIdParsed = uuidParamSchema.safeParse(c.req.param('lessonId'));
    if (!lessonIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid lesson id.' } }, 400);
    }

    const context = await getLessonMasterclassContext(lessonIdParsed.data);
    if (!context) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Lesson not found.' } }, 404);
    }

    try {
      await assertUserEnrolled(session.user.id, context.masterclassId);
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      throw error;
    }

    const [lesson] = await db
      .select()
      .from(masterclassLessons)
      .where(eq(masterclassLessons.id, lessonIdParsed.data))
      .limit(1);

    const videos = await db
      .select({
        id: masterclassLessonVideos.id,
        titleEn: masterclassLessonVideos.titleEn,
        titleAr: masterclassLessonVideos.titleAr,
        sort_order: masterclassLessonVideos.sortOrder,
        video_url: masterclassLessonVideos.videoUrl,
      })
      .from(masterclassLessonVideos)
      .where(eq(masterclassLessonVideos.lessonId, lessonIdParsed.data))
      .orderBy(asc(masterclassLessonVideos.sortOrder), asc(masterclassLessonVideos.createdAt));

    const files = await db
      .select()
      .from(masterclassLessonFiles)
      .where(eq(masterclassLessonFiles.lessonId, lessonIdParsed.data))
      .orderBy(asc(masterclassLessonFiles.sortOrder), asc(masterclassLessonFiles.createdAt));

    const [progress] = await db
      .select({ id: masterclassLessonProgress.id })
      .from(masterclassLessonProgress)
      .where(
        and(
          eq(masterclassLessonProgress.userId, session.user.id),
          eq(masterclassLessonProgress.lessonId, lessonIdParsed.data),
        ),
      )
      .limit(1);

    const lessonFields = lesson ? presentContentFields(lesson, locale, isStaff) : {};

    return c.json({
      data: {
        lesson: {
          id: lesson?.id,
          ...lessonFields,
          module_id: context.moduleId,
          masterclass_id: context.masterclassId,
          is_completed: Boolean(progress),
        },
        videos: videos.map((v) => ({
          ...presentVideoTitle(v, locale, isStaff),
          sort_order: v.sort_order,
          video_url: v.video_url,
        })),
        files: files.map((f) => {
          if (isStaff) {
            const adminFields = presentAdminDisplayName(f);
            return {
              id: f.id,
              file_type: f.fileType,
              displayNameEn: adminFields.displayNameEn,
              displayNameAr: adminFields.displayNameAr,
              file_url: f.fileUrl,
              sort_order: f.sortOrder,
            };
          }
          const { displayName } = presentPublicDisplayName(f, locale);
          return {
            id: f.id,
            file_type: f.fileType,
            display_name: displayName,
            file_url: f.fileUrl,
            sort_order: f.sortOrder,
          };
        }),
      },
    });
  });

  app.post('/masterclasses/learn/lessons/:lessonId/complete', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const lessonIdParsed = uuidParamSchema.safeParse(c.req.param('lessonId'));
    if (!lessonIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid lesson id.' } }, 400);
    }

    const context = await getLessonMasterclassContext(lessonIdParsed.data);
    if (!context) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Lesson not found.' } }, 404);
    }

    try {
      await assertUserEnrolled(session.user.id, context.masterclassId);
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      throw error;
    }

    await db
      .insert(masterclassLessonProgress)
      .values({
        userId: session.user.id,
        lessonId: lessonIdParsed.data,
        completionMethod: 'manual',
      })
      .onConflictDoNothing();

    await tryIssueCertificateOnCompletion(session.user.id, context.masterclassId);

    return c.json({ data: { lesson_id: lessonIdParsed.data, completed: true } });
  });

  app.delete('/masterclasses/learn/lessons/:lessonId/complete', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const lessonIdParsed = uuidParamSchema.safeParse(c.req.param('lessonId'));
    if (!lessonIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid lesson id.' } }, 400);
    }

    const context = await getLessonMasterclassContext(lessonIdParsed.data);
    if (!context) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Lesson not found.' } }, 404);
    }

    try {
      await assertUserEnrolled(session.user.id, context.masterclassId);
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      throw error;
    }

    await db
      .delete(masterclassLessonProgress)
      .where(
        and(
          eq(masterclassLessonProgress.userId, session.user.id),
          eq(masterclassLessonProgress.lessonId, lessonIdParsed.data),
        ),
      );

    return c.json({ data: { lesson_id: lessonIdParsed.data, completed: false } });
  });

  app.get('/masterclasses/learn/:id/certificate', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    try {
      await assertUserEnrolled(session.user.id, idParsed.data);
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      throw error;
    }

    const status = await getLearnerCertificateStatus(session.user.id, idParsed.data);
    return c.json({ data: status });
  });

  app.get('/masterclasses/learn/:id', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const { locale, isStaff } = await resolvePresentationContext(c);

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    const [masterclass] = await db
      .select()
      .from(masterclasses)
      .where(eq(masterclasses.id, idParsed.data))
      .limit(1);

    if (!masterclass) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Masterclass not found.' } }, 404);
    }

    try {
      await assertUserEnrolled(session.user.id, masterclass.id);
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      throw error;
    }

    const [totalLessons, completedLessons] = await Promise.all([
      countMasterclassLessons(masterclass.id),
      countCompletedLessons(session.user.id, masterclass.id),
    ]);

    const modules = await db
      .select()
      .from(masterclassModules)
      .where(eq(masterclassModules.masterclassId, masterclass.id))
      .orderBy(asc(masterclassModules.sortOrder), asc(masterclassModules.createdAt));

    const moduleIds = modules.map((m) => m.id);
    const lessons =
      moduleIds.length > 0
        ? await db
            .select()
            .from(masterclassLessons)
            .where(inArray(masterclassLessons.moduleId, moduleIds))
            .orderBy(asc(masterclassLessons.sortOrder), asc(masterclassLessons.createdAt))
        : [];

    const lessonIds = lessons.map((l) => l.id);
    const completedRows =
      lessonIds.length > 0
        ? await db
            .select({ lessonId: masterclassLessonProgress.lessonId })
            .from(masterclassLessonProgress)
            .where(
              and(
                eq(masterclassLessonProgress.userId, session.user.id),
                inArray(masterclassLessonProgress.lessonId, lessonIds),
              ),
            )
        : [];
    const completedSet = new Set(completedRows.map((r) => r.lessonId));

    const lessonsByModule = new Map<string, typeof lessons>();
    for (const lesson of lessons) {
      const list = lessonsByModule.get(lesson.moduleId) ?? [];
      list.push(lesson);
      lessonsByModule.set(lesson.moduleId, list);
    }

    const masterclassFields = presentContentFields(masterclass, locale, isStaff);

    return c.json({
      data: {
        masterclass: {
          ...masterclassFields,
          id: masterclass.id,
          image_url: masterclass.imageUrl,
        },
        progress: {
          total_lessons: totalLessons,
          completed_lessons: completedLessons,
        },
        modules: modules.map((module) => ({
          id: module.id,
          ...presentContentFields(module, locale, isStaff),
          sort_order: module.sortOrder,
          lessons: (lessonsByModule.get(module.id) ?? []).map((lesson) => ({
            id: lesson.id,
            ...presentContentFields(lesson, locale, isStaff),
            sort_order: lesson.sortOrder,
            is_completed: completedSet.has(lesson.id),
          })),
        })),
      },
    });
  });

  // --- Admin ----------------------------------------------------------------

  app.get('/masterclasses', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const rows = await db
      .select()
      .from(masterclasses)
      .orderBy(asc(masterclasses.sortOrder), desc(masterclasses.createdAt));

    const lessonCountMap = await getMasterclassLessonCountMap(rows.map((row) => row.id));

    return c.json({
      data: {
        items: rows.map((row) => ({
          ...presentAdminContent(row),
          imageUrl: row.imageUrl,
          priceInCents: row.priceInCents,
          isPublished: row.isPublished,
          sortOrder: row.sortOrder,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          lessonCount: lessonCountMap.get(row.id) ?? 0,
        })),
      },
    });
  });

  app.post('/masterclasses', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = await c.req.json().catch(() => ({}));
    const parsed = createMasterclassSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    if (parsed.data.expertIds?.length) {
      const valid = await expertIdsExist(parsed.data.expertIds);
      if (!valid) {
        return c.json(
          { error: { code: 'INVALID_EXPERT_IDS', message: 'One or more expert IDs are invalid.' } },
          400,
        );
      }
    }

    const titleFields =
      parsed.data.titleEn && parsed.data.titleAr
        ? bilingualTitleFields(parsed.data.titleEn, parsed.data.titleAr)
        : bilingualTitleFromLegacy(parsed.data.title!);
    const descriptionFields =
      parsed.data.descriptionEn !== undefined || parsed.data.descriptionAr !== undefined
        ? bilingualDescriptionFields(
            parsed.data.descriptionEn ?? parsed.data.description ?? null,
            parsed.data.descriptionAr ?? parsed.data.description ?? null,
          )
        : bilingualDescriptionFromLegacy(parsed.data.description);

    const [created] = await db
      .insert(masterclasses)
      .values({
        ...titleFields,
        ...descriptionFields,
        imageUrl: parsed.data.imageUrl ?? null,
        priceInCents: parsed.data.priceInCents ?? null,
        isPublished: parsed.data.isPublished ?? false,
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();

    await applyFirstPublishLaunch('masterclasses', false, created.isPublished);

    if (parsed.data.expertIds?.length) {
      await replaceMasterclassExpertLinks(created.id, parsed.data.expertIds);
    }

    return c.json({ data: created, expertIds: parsed.data.expertIds ?? [] }, 201);
  });

  app.get('/masterclasses/:id/preview', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    const [masterclass] = await db
      .select()
      .from(masterclasses)
      .where(eq(masterclasses.id, idParsed.data))
      .limit(1);

    if (!masterclass) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Masterclass not found.' } }, 404);
    }

    const tree = await loadMasterclassPreviewTree(masterclass.id);
    return c.json({
      data: {
        masterclass: presentAdminContent(masterclass),
        modules: tree.modules.map((module) => ({
          ...presentAdminContent(module),
          sortOrder: module.sortOrder,
          createdAt: module.createdAt,
          updatedAt: module.updatedAt,
          masterclassId: module.masterclassId,
          lessons: module.lessons.map((lesson) => ({
            ...presentAdminContent(lesson),
            sortOrder: lesson.sortOrder,
            createdAt: lesson.createdAt,
            updatedAt: lesson.updatedAt,
            moduleId: lesson.moduleId,
            videos: lesson.videos.map((video) => ({
              id: video.id,
              lessonId: video.lessonId,
              titleEn: video.titleEn,
              titleAr: video.titleAr,
              videoUrl: video.videoUrl,
              sortOrder: video.sortOrder,
              createdAt: video.createdAt,
            })),
            files: lesson.files.map((file) => ({
              id: file.id,
              lessonId: file.lessonId,
              fileType: file.fileType,
              fileUrl: file.fileUrl,
              sortOrder: file.sortOrder,
              createdAt: file.createdAt,
              ...presentAdminDisplayName(file),
            })),
          })),
        })),
      },
    });
  });

  app.get('/masterclasses/:id/enrollments', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    const [masterclass] = await db
      .select({ id: masterclasses.id })
      .from(masterclasses)
      .where(eq(masterclasses.id, idParsed.data))
      .limit(1);

    if (!masterclass) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Masterclass not found.' } }, 404);
    }

    const rows = await db
      .select({
        id: masterclassEnrollments.id,
        userId: masterclassEnrollments.userId,
        email: users.email,
        name: users.name,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        phoneNumber: profiles.phoneNumber,
        source: masterclassEnrollments.source,
        enrolledAt: masterclassEnrollments.enrolledAt,
        enrollmentNote: masterclassEnrollments.enrollmentNote,
        enrolledBy: masterclassEnrollments.enrolledBy,
        paymentId: masterclassEnrollments.paymentId,
        purchasedPriceInCents: payments.amountCents,
      })
      .from(masterclassEnrollments)
      .innerJoin(users, eq(users.id, masterclassEnrollments.userId))
      .leftJoin(profiles, eq(profiles.id, users.id))
      .leftJoin(payments, eq(payments.id, masterclassEnrollments.paymentId))
      .where(eq(masterclassEnrollments.masterclassId, idParsed.data))
      .orderBy(desc(masterclassEnrollments.enrolledAt));

    const totalLessons = await countMasterclassLessons(idParsed.data);
    const items = await Promise.all(
      rows.map(async (row) => {
        const completedLessons = await countCompletedLessons(row.userId, idParsed.data);
        return {
          ...row,
          totalLessons,
          completedLessons,
          isComplete: totalLessons > 0 && completedLessons >= totalLessons,
        };
      }),
    );

    return c.json({ data: { items } });
  });

  app.post('/masterclasses/:id/enrollments/manual', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = manualEnrollmentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const [masterclass] = await db
      .select({ id: masterclasses.id, title: masterclasses.title })
      .from(masterclasses)
      .where(eq(masterclasses.id, idParsed.data))
      .limit(1);

    if (!masterclass) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Masterclass not found.' } }, 404);
    }

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, parsed.data.userId))
      .limit(1);

    if (!user) {
      return c.json({ error: { code: 'USER_NOT_FOUND', message: 'User not found.' } }, 404);
    }

    const enrolledIds = await getEnrolledMasterclassIds(parsed.data.userId, [idParsed.data]);
    if (enrolledIds.has(idParsed.data)) {
      return c.json(
        { error: { code: 'ALREADY_ENROLLED', message: 'User is already enrolled.' } },
        409,
      );
    }

    await grantMasterclassEnrollment({
      userId: parsed.data.userId,
      masterclassId: idParsed.data,
      source: 'manual',
      enrolledBy: staff.userId,
      enrollmentNote: parsed.data.note ?? null,
    });

    void notifyBusinessEvent({
      type: 'access_granted',
      entityType: 'masterclass',
      entityId: idParsed.data,
      recipientUserIds: [parsed.data.userId],
      templateKey: 'access_granted',
      payload: {
        itemTitle: masterclass.title,
        itemUrl: `${env.APP_BASE_URL.replace(/\/$/, '')}/dashboard/masterclasses/${idParsed.data}/learn`,
      },
    }).catch((err) => console.error('[notifications]', err));

    return c.json({ data: { userId: parsed.data.userId, masterclassId: idParsed.data } }, 201);
  });

  app.put('/masterclasses/:id/modules/reorder', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const existing = await db
      .select({ id: masterclassModules.id })
      .from(masterclassModules)
      .where(eq(masterclassModules.masterclassId, idParsed.data));

    try {
      await applyReorder(
        parsed.data.orderedIds,
        existing.map((row) => row.id),
        async (tx, moduleId, sortOrder) => {
          await tx
            .update(masterclassModules)
            .set({ sortOrder, updatedAt: new Date() })
            .where(
              and(
                eq(masterclassModules.id, moduleId),
                eq(masterclassModules.masterclassId, idParsed.data),
              ),
            );
        },
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      throw error;
    }

    return c.json({ data: { success: true } });
  });

  app.post('/masterclasses/:id/modules', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    const [masterclass] = await db
      .select({ id: masterclasses.id })
      .from(masterclasses)
      .where(eq(masterclasses.id, idParsed.data))
      .limit(1);

    if (!masterclass) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Masterclass not found.' } }, 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = moduleInputSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(masterclassModules)
      .where(eq(masterclassModules.masterclassId, idParsed.data));

    const moduleTitleFields =
      parsed.data.titleEn && parsed.data.titleAr
        ? bilingualTitleFields(parsed.data.titleEn, parsed.data.titleAr)
        : bilingualTitleFromLegacy(parsed.data.title!);
    const moduleDescriptionFields =
      parsed.data.descriptionEn !== undefined || parsed.data.descriptionAr !== undefined
        ? bilingualDescriptionFields(
            parsed.data.descriptionEn ?? parsed.data.description ?? null,
            parsed.data.descriptionAr ?? parsed.data.description ?? null,
          )
        : bilingualDescriptionFromLegacy(parsed.data.description);

    const [created] = await db
      .insert(masterclassModules)
      .values({
        masterclassId: idParsed.data,
        ...moduleTitleFields,
        ...moduleDescriptionFields,
        sortOrder: parsed.data.sortOrder ?? (countRow?.count ?? 0),
      })
      .returning();

    return c.json({ data: created }, 201);
  });

  app.put('/masterclasses/:id/modules/:moduleId', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    const moduleIdParsed = uuidParamSchema.safeParse(c.req.param('moduleId'));
    if (!idParsed.success || !moduleIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    try {
      await assertModuleInMasterclass(idParsed.data, moduleIdParsed.data);
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      throw error;
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = moduleFieldsSchema.partial().safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const [updated] = await db
      .update(masterclassModules)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(masterclassModules.id, moduleIdParsed.data))
      .returning();

    return c.json({ data: updated });
  });

  app.delete('/masterclasses/:id/modules/:moduleId', async (c) => {
    const staff = await requireContentDelete(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    const moduleIdParsed = uuidParamSchema.safeParse(c.req.param('moduleId'));
    if (!idParsed.success || !moduleIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    const [deleted] = await db
      .delete(masterclassModules)
      .where(
        and(
          eq(masterclassModules.id, moduleIdParsed.data),
          eq(masterclassModules.masterclassId, idParsed.data),
        ),
      )
      .returning({ id: masterclassModules.id });

    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Module not found.' } }, 404);
    }

    return c.json({ data: { id: deleted.id } });
  });

  app.put('/masterclasses/:id/modules/:moduleId/lessons/reorder', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    const moduleIdParsed = uuidParamSchema.safeParse(c.req.param('moduleId'));
    if (!idParsed.success || !moduleIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    try {
      await assertModuleInMasterclass(idParsed.data, moduleIdParsed.data);
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      throw error;
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const existing = await db
      .select({ id: masterclassLessons.id })
      .from(masterclassLessons)
      .where(eq(masterclassLessons.moduleId, moduleIdParsed.data));

    try {
      await applyReorder(
        parsed.data.orderedIds,
        existing.map((row) => row.id),
        async (tx, lessonId, sortOrder) => {
          await tx
            .update(masterclassLessons)
            .set({ sortOrder, updatedAt: new Date() })
            .where(
              and(
                eq(masterclassLessons.id, lessonId),
                eq(masterclassLessons.moduleId, moduleIdParsed.data),
              ),
            );
        },
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      throw error;
    }

    return c.json({ data: { success: true } });
  });

  app.post('/masterclasses/:id/modules/:moduleId/lessons', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    const moduleIdParsed = uuidParamSchema.safeParse(c.req.param('moduleId'));
    if (!idParsed.success || !moduleIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    try {
      await assertModuleInMasterclass(idParsed.data, moduleIdParsed.data);
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      throw error;
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = lessonInputSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(masterclassLessons)
      .where(eq(masterclassLessons.moduleId, moduleIdParsed.data));

    const lessonTitleFields =
      parsed.data.titleEn && parsed.data.titleAr
        ? bilingualTitleFields(parsed.data.titleEn, parsed.data.titleAr)
        : bilingualTitleFromLegacy(parsed.data.title!);
    const lessonDescriptionFields =
      parsed.data.descriptionEn !== undefined || parsed.data.descriptionAr !== undefined
        ? bilingualDescriptionFields(
            parsed.data.descriptionEn ?? parsed.data.description ?? null,
            parsed.data.descriptionAr ?? parsed.data.description ?? null,
          )
        : bilingualDescriptionFromLegacy(parsed.data.description);

    const [created] = await db
      .insert(masterclassLessons)
      .values({
        moduleId: moduleIdParsed.data,
        ...lessonTitleFields,
        ...lessonDescriptionFields,
        sortOrder: parsed.data.sortOrder ?? (countRow?.count ?? 0),
      })
      .returning();

    return c.json({ data: created }, 201);
  });

  app.put('/masterclasses/:id/modules/:moduleId/lessons/:lessonId', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    const moduleIdParsed = uuidParamSchema.safeParse(c.req.param('moduleId'));
    const lessonIdParsed = uuidParamSchema.safeParse(c.req.param('lessonId'));
    if (!idParsed.success || !moduleIdParsed.success || !lessonIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    try {
      await assertModuleInMasterclass(idParsed.data, moduleIdParsed.data);
      await assertLessonInModule(moduleIdParsed.data, lessonIdParsed.data);
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      throw error;
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = lessonFieldsSchema.partial().safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const [updated] = await db
      .update(masterclassLessons)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(masterclassLessons.id, lessonIdParsed.data))
      .returning();

    return c.json({ data: updated });
  });

  app.delete('/masterclasses/:id/modules/:moduleId/lessons/:lessonId', async (c) => {
    const staff = await requireContentDelete(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    const moduleIdParsed = uuidParamSchema.safeParse(c.req.param('moduleId'));
    const lessonIdParsed = uuidParamSchema.safeParse(c.req.param('lessonId'));
    if (!idParsed.success || !moduleIdParsed.success || !lessonIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    const [deleted] = await db
      .delete(masterclassLessons)
      .where(
        and(
          eq(masterclassLessons.id, lessonIdParsed.data),
          eq(masterclassLessons.moduleId, moduleIdParsed.data),
        ),
      )
      .returning({ id: masterclassLessons.id });

    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Lesson not found.' } }, 404);
    }

    return c.json({ data: { id: deleted.id } });
  });

  app.post('/masterclasses/:id/modules/:moduleId/lessons/:lessonId/videos', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    const moduleIdParsed = uuidParamSchema.safeParse(c.req.param('moduleId'));
    const lessonIdParsed = uuidParamSchema.safeParse(c.req.param('lessonId'));
    if (!idParsed.success || !moduleIdParsed.success || !lessonIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    try {
      await assertModuleInMasterclass(idParsed.data, moduleIdParsed.data);
      await assertLessonInModule(moduleIdParsed.data, lessonIdParsed.data);
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      throw error;
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = videoInputSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(masterclassLessonVideos)
      .where(eq(masterclassLessonVideos.lessonId, lessonIdParsed.data));

    if ((countRow?.count ?? 0) >= MAX_VIDEOS_PER_LESSON) {
      return c.json(
        {
          error: {
            code: 'LIMIT_EXCEEDED',
            message: `A lesson can have at most ${MAX_VIDEOS_PER_LESSON} video URLs.`,
            maxVideos: MAX_VIDEOS_PER_LESSON,
          },
        },
        400,
      );
    }

    const [created] = await db
      .insert(masterclassLessonVideos)
      .values({
        lessonId: lessonIdParsed.data,
        ...(parsed.data.titleEn && parsed.data.titleAr
          ? bilingualTitleFields(parsed.data.titleEn, parsed.data.titleAr)
          : bilingualTitleFromLegacy(parsed.data.title!)),
        videoUrl: parsed.data.videoUrl,
        sortOrder: parsed.data.sortOrder ?? (countRow?.count ?? 0),
      })
      .returning();

    return c.json({ data: created }, 201);
  });

  app.put('/masterclasses/:id/modules/:moduleId/lessons/:lessonId/videos/:videoId', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const lessonIdParsed = uuidParamSchema.safeParse(c.req.param('lessonId'));
    const videoIdParsed = uuidParamSchema.safeParse(c.req.param('videoId'));
    if (!lessonIdParsed.success || !videoIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = baseVideoInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const [updated] = await db
      .update(masterclassLessonVideos)
      .set(parsed.data)
      .where(
        and(
          eq(masterclassLessonVideos.id, videoIdParsed.data),
          eq(masterclassLessonVideos.lessonId, lessonIdParsed.data),
        ),
      )
      .returning();

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Video not found.' } }, 404);
    }

    return c.json({ data: updated });
  });

  app.delete('/masterclasses/:id/modules/:moduleId/lessons/:lessonId/videos/:videoId', async (c) => {
    const staff = await requireContentDelete(c);
    if ('response' in staff) return staff.response;

    const lessonIdParsed = uuidParamSchema.safeParse(c.req.param('lessonId'));
    const videoIdParsed = uuidParamSchema.safeParse(c.req.param('videoId'));
    if (!lessonIdParsed.success || !videoIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    const [deleted] = await db
      .delete(masterclassLessonVideos)
      .where(
        and(
          eq(masterclassLessonVideos.id, videoIdParsed.data),
          eq(masterclassLessonVideos.lessonId, lessonIdParsed.data),
        ),
      )
      .returning({ id: masterclassLessonVideos.id });

    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Video not found.' } }, 404);
    }

    return c.json({ data: { id: deleted.id } });
  });

  app.post('/masterclasses/:id/modules/:moduleId/lessons/:lessonId/files', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    const moduleIdParsed = uuidParamSchema.safeParse(c.req.param('moduleId'));
    const lessonIdParsed = uuidParamSchema.safeParse(c.req.param('lessonId'));
    if (!idParsed.success || !moduleIdParsed.success || !lessonIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    try {
      await assertModuleInMasterclass(idParsed.data, moduleIdParsed.data);
      await assertLessonInModule(moduleIdParsed.data, lessonIdParsed.data);
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      throw error;
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = fileInputSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(masterclassLessonFiles)
      .where(eq(masterclassLessonFiles.lessonId, lessonIdParsed.data));

    const [created] = await db
      .insert(masterclassLessonFiles)
      .values({
        lessonId: lessonIdParsed.data,
        fileType: parsed.data.fileType,
        ...(parsed.data.displayNameEn && parsed.data.displayNameAr
          ? bilingualDisplayNameFields(parsed.data.displayNameEn, parsed.data.displayNameAr)
          : bilingualDisplayNameFromLegacy(parsed.data.displayName!)),
        fileUrl: parsed.data.fileUrl,
        sortOrder: parsed.data.sortOrder ?? (countRow?.count ?? 0),
      })
      .returning();

    return c.json({ data: created }, 201);
  });

  app.put('/masterclasses/:id/modules/:moduleId/lessons/:lessonId/files/:fileId', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const lessonIdParsed = uuidParamSchema.safeParse(c.req.param('lessonId'));
    const fileIdParsed = uuidParamSchema.safeParse(c.req.param('fileId'));
    if (!lessonIdParsed.success || !fileIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = baseFileInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const [updated] = await db
      .update(masterclassLessonFiles)
      .set(parsed.data)
      .where(
        and(
          eq(masterclassLessonFiles.id, fileIdParsed.data),
          eq(masterclassLessonFiles.lessonId, lessonIdParsed.data),
        ),
      )
      .returning();

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'File not found.' } }, 404);
    }

    return c.json({ data: updated });
  });

  app.delete('/masterclasses/:id/modules/:moduleId/lessons/:lessonId/files/:fileId', async (c) => {
    const staff = await requireContentDelete(c);
    if ('response' in staff) return staff.response;

    const lessonIdParsed = uuidParamSchema.safeParse(c.req.param('lessonId'));
    const fileIdParsed = uuidParamSchema.safeParse(c.req.param('fileId'));
    if (!lessonIdParsed.success || !fileIdParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid id.' } }, 400);
    }

    const [deleted] = await db
      .delete(masterclassLessonFiles)
      .where(
        and(
          eq(masterclassLessonFiles.id, fileIdParsed.data),
          eq(masterclassLessonFiles.lessonId, lessonIdParsed.data),
        ),
      )
      .returning({ id: masterclassLessonFiles.id });

    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'File not found.' } }, 404);
    }

    return c.json({ data: { id: deleted.id } });
  });

  app.get('/masterclasses/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    const [masterclass] = await db
      .select()
      .from(masterclasses)
      .where(eq(masterclasses.id, idParsed.data))
      .limit(1);

    if (!masterclass) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Masterclass not found.' } }, 404);
    }

    const lessonCount = await countMasterclassLessons(masterclass.id);
    const expertIds = await loadLinkedExpertIdsForMasterclass(masterclass.id);
    return c.json({
      data: {
        masterclass: presentAdminContent(masterclass),
        lessonCount,
        expertIds,
      },
    });
  });

  app.put('/masterclasses/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = updateMasterclassSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const [existingMasterclass] = await db
      .select({ isPublished: masterclasses.isPublished })
      .from(masterclasses)
      .where(eq(masterclasses.id, idParsed.data))
      .limit(1);

    if (!existingMasterclass) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Masterclass not found.' } }, 404);
    }

    if (parsed.data.expertIds !== undefined) {
      if (parsed.data.expertIds.length > 0) {
        const valid = await expertIdsExist(parsed.data.expertIds);
        if (!valid) {
          return c.json(
            { error: { code: 'INVALID_EXPERT_IDS', message: 'One or more expert IDs are invalid.' } },
            400,
          );
        }
      }
    }

    const { expertIds, ...masterclassUpdates } = parsed.data;

    const [updated] = await db
      .update(masterclasses)
      .set({ ...masterclassUpdates, updatedAt: new Date() })
      .where(eq(masterclasses.id, idParsed.data))
      .returning();

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Masterclass not found.' } }, 404);
    }

    const willBePublished = parsed.data.isPublished ?? updated.isPublished;
    await applyFirstPublishLaunch(
      'masterclasses',
      existingMasterclass.isPublished,
      willBePublished,
    );

    if (expertIds !== undefined) {
      await replaceMasterclassExpertLinks(idParsed.data, expertIds);
    }

    const linkedExpertIds = await loadLinkedExpertIdsForMasterclass(idParsed.data);
    return c.json({ data: updated, expertIds: linkedExpertIds });
  });

  app.delete('/masterclasses/:id', async (c) => {
    const staff = await requireContentDelete(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    const [deleted] = await db
      .delete(masterclasses)
      .where(eq(masterclasses.id, idParsed.data))
      .returning({ id: masterclasses.id });

    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Masterclass not found.' } }, 404);
    }

    return c.json({ data: { id: deleted.id } });
  });
}
