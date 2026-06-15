import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { db } from '../../db/client.js';
import {
  libraryAssets,
  masterclassEnrollments,
  masterclassLessonFiles,
  masterclassLessonProgress,
  masterclassLessons,
  masterclassLessonVideos,
  masterclassModules,
  masterclasses,
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
import { getLearnerCertificateStatus, tryIssueCertificateOnCompletion } from '../../services/certificates.js';
import { ApiError } from '../../utils/errors.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { requireManager } from './utils.js';

const fileTypeSchema = z.enum(['excel', 'markdown', 'html', 'text', 'powerpoint']);
const uuidParamSchema = z.string().uuid();

const createMasterclassSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  priceInCents: z.number().int().min(0).optional().nullable(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const updateMasterclassSchema = createMasterclassSchema.partial();

const moduleInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const lessonInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const videoInputSchema = z.object({
  title: z.string().min(1).max(200),
  videoAssetId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const fileInputSchema = z.object({
  fileType: fileTypeSchema,
  displayName: z.string().min(1).max(200),
  fileUrl: z.string().url(),
  sortOrder: z.number().int().optional(),
});

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

const manualEnrollmentSchema = z.object({
  userId: z.string().uuid(),
  note: z.string().max(500).optional().nullable(),
});

async function assertVideoAsset(videoAssetId: string | null | undefined) {
  if (!videoAssetId) return;
  const [asset] = await db
    .select({ id: libraryAssets.id, fileType: libraryAssets.fileType })
    .from(libraryAssets)
    .where(eq(libraryAssets.id, videoAssetId))
    .limit(1);
  if (!asset) {
    throw new Error('Video asset not found.');
  }
  if (asset.fileType !== 'Video') {
    throw new Error('Selected asset must be a video from the library.');
  }
}

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
          .select({
            id: masterclassLessonVideos.id,
            lessonId: masterclassLessonVideos.lessonId,
            title: masterclassLessonVideos.title,
            videoAssetId: masterclassLessonVideos.videoAssetId,
            sortOrder: masterclassLessonVideos.sortOrder,
            createdAt: masterclassLessonVideos.createdAt,
            assetTitle: libraryAssets.title,
            embedUrl: libraryAssets.embedUrl,
            videoUrl: libraryAssets.videoUrl,
            thumbnailUrl: libraryAssets.thumbnailUrl,
          })
          .from(masterclassLessonVideos)
          .leftJoin(libraryAssets, eq(libraryAssets.id, masterclassLessonVideos.videoAssetId))
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

    const filter = c.req.query('filter') === 'mine' ? 'mine' : 'all';
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
          id: row.id,
          title: row.title,
          description: row.description,
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
    const enrolledIds = await getEnrolledMasterclassIds(session.user.id, [masterclass.id]);
    const isEnrolled = enrolledIds.has(masterclass.id);
    const sellable = isMasterclassSellable({ ...masterclass, lessonCount });

    if (!isEnrolled && !sellable) {
      return c.json({ error: { code: 'NOT_AVAILABLE', message: 'Masterclass not available.' } }, 404);
    }

    let modules: Array<{
      id: string;
      title: string;
      description: string | null;
      sort_order: number;
      lessons: Array<{
        id: string;
        title: string;
        description: string | null;
        sort_order: number;
        video_count: number;
        file_count: number;
      }>;
    }> = [];
    if (isEnrolled) {
      const tree = await loadMasterclassPreviewTree(masterclass.id);
      modules = tree.modules.map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        sort_order: module.sortOrder,
        lessons: module.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          sort_order: lesson.sortOrder,
          video_count: lesson.videos.length,
          file_count: lesson.files.length,
        })),
      }));
    }

    return c.json({
      data: {
        masterclass: {
          id: masterclass.id,
          title: masterclass.title,
          description: masterclass.description,
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
        title: masterclassLessonVideos.title,
        sort_order: masterclassLessonVideos.sortOrder,
        video_asset: {
          id: libraryAssets.id,
          title: libraryAssets.title,
          embed_url: libraryAssets.embedUrl,
          video_url: libraryAssets.videoUrl,
          embed_type: libraryAssets.embedType,
          thumbnail_url: libraryAssets.thumbnailUrl,
        },
      })
      .from(masterclassLessonVideos)
      .leftJoin(libraryAssets, eq(libraryAssets.id, masterclassLessonVideos.videoAssetId))
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

    return c.json({
      data: {
        lesson: {
          id: lesson?.id,
          title: lesson?.title,
          description: lesson?.description,
          module_id: context.moduleId,
          masterclass_id: context.masterclassId,
          is_completed: Boolean(progress),
        },
        videos,
        files: files.map((f) => ({
          id: f.id,
          file_type: f.fileType,
          display_name: f.displayName,
          file_url: f.fileUrl,
          sort_order: f.sortOrder,
        })),
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

    return c.json({
      data: {
        masterclass: {
          id: masterclass.id,
          title: masterclass.title,
          description: masterclass.description,
          image_url: masterclass.imageUrl,
        },
        progress: {
          total_lessons: totalLessons,
          completed_lessons: completedLessons,
        },
        modules: modules.map((module) => ({
          id: module.id,
          title: module.title,
          description: module.description,
          sort_order: module.sortOrder,
          lessons: (lessonsByModule.get(module.id) ?? []).map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
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
          ...row,
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

    const [created] = await db
      .insert(masterclasses)
      .values({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        imageUrl: parsed.data.imageUrl ?? null,
        priceInCents: parsed.data.priceInCents ?? null,
        isPublished: parsed.data.isPublished ?? false,
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();

    return c.json({ data: created }, 201);
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
    return c.json({ data: { masterclass, ...tree } });
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
        source: masterclassEnrollments.source,
        enrolledAt: masterclassEnrollments.enrolledAt,
        enrollmentNote: masterclassEnrollments.enrollmentNote,
        enrolledBy: masterclassEnrollments.enrolledBy,
        paymentId: masterclassEnrollments.paymentId,
      })
      .from(masterclassEnrollments)
      .innerJoin(users, eq(users.id, masterclassEnrollments.userId))
      .leftJoin(profiles, eq(profiles.id, users.id))
      .where(eq(masterclassEnrollments.masterclassId, idParsed.data))
      .orderBy(desc(masterclassEnrollments.enrolledAt));

    return c.json({ data: { items: rows } });
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
      .select({ id: masterclasses.id })
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

    const [created] = await db
      .insert(masterclassModules)
      .values({
        masterclassId: idParsed.data,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
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
    const parsed = moduleInputSchema.partial().safeParse(body);
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
    const staff = await requireManager(c);
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

    const [created] = await db
      .insert(masterclassLessons)
      .values({
        moduleId: moduleIdParsed.data,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
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
    const parsed = lessonInputSchema.partial().safeParse(body);
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
    const staff = await requireManager(c);
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

    try {
      await assertVideoAsset(parsed.data.videoAssetId);
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'INVALID_VIDEO',
            message: error instanceof Error ? error.message : 'Invalid video asset.',
          },
        },
        400,
      );
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(masterclassLessonVideos)
      .where(eq(masterclassLessonVideos.lessonId, lessonIdParsed.data));

    const [created] = await db
      .insert(masterclassLessonVideos)
      .values({
        lessonId: lessonIdParsed.data,
        title: parsed.data.title,
        videoAssetId: parsed.data.videoAssetId ?? null,
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
    const parsed = videoInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    if (parsed.data.videoAssetId !== undefined) {
      try {
        await assertVideoAsset(parsed.data.videoAssetId);
      } catch (error) {
        return c.json(
          {
            error: {
              code: 'INVALID_VIDEO',
              message: error instanceof Error ? error.message : 'Invalid video asset.',
            },
          },
          400,
        );
      }
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
    const staff = await requireManager(c);
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
        displayName: parsed.data.displayName,
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
    const parsed = fileInputSchema.partial().safeParse(body);
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
    const staff = await requireManager(c);
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
    return c.json({ data: { masterclass, lessonCount } });
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

    const [updated] = await db
      .update(masterclasses)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(masterclasses.id, idParsed.data))
      .returning();

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Masterclass not found.' } }, 404);
    }

    return c.json({ data: updated });
  });

  app.delete('/masterclasses/:id', async (c) => {
    const staff = await requireManager(c);
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
