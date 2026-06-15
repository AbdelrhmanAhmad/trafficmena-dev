import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  masterclassEnrollments,
  masterclassLessonProgress,
  masterclassLessons,
  masterclassModules,
  masterclasses,
} from '../db/schema/index.js';
import { ApiError } from '../utils/errors.js';

export async function getEnrolledMasterclassIds(
  userId: string,
  masterclassIds?: string[],
): Promise<Set<string>> {
  const conditions = [eq(masterclassEnrollments.userId, userId)];
  if (masterclassIds?.length) {
    conditions.push(inArray(masterclassEnrollments.masterclassId, masterclassIds));
  }
  const rows = await db
    .select({ masterclassId: masterclassEnrollments.masterclassId })
    .from(masterclassEnrollments)
    .where(and(...conditions));
  return new Set(rows.map((r) => r.masterclassId));
}

export function isMasterclassSellable(row: {
  isPublished: boolean;
  priceInCents: number | null;
  lessonCount: number;
}): boolean {
  return row.isPublished && (row.priceInCents ?? 0) > 0 && row.lessonCount > 0;
}

export async function assertMasterclassSellable(masterclassId: string) {
  const [row] = await db
    .select({
      id: masterclasses.id,
      title: masterclasses.title,
      priceInCents: masterclasses.priceInCents,
      isPublished: masterclasses.isPublished,
      imageUrl: masterclasses.imageUrl,
      lessonCount: sql<number>`count(distinct ${masterclassLessons.id})::int`,
    })
    .from(masterclasses)
    .leftJoin(masterclassModules, eq(masterclassModules.masterclassId, masterclasses.id))
    .leftJoin(masterclassLessons, eq(masterclassLessons.moduleId, masterclassModules.id))
    .where(eq(masterclasses.id, masterclassId))
    .groupBy(masterclasses.id);

  if (!row) {
    throw new ApiError('MASTERCLASS_NOT_FOUND', 'Masterclass not found.', 404);
  }
  if (!isMasterclassSellable(row)) {
    throw new ApiError('MASTERCLASS_NOT_SELLABLE', 'Masterclass is not available for purchase.', 409);
  }
  return row;
}

export async function grantMasterclassEnrollment(args: {
  userId: string;
  masterclassId: string;
  source: 'paid' | 'manual';
  paymentId?: string | null;
  enrolledBy?: string | null;
  enrollmentNote?: string | null;
  tx?: Parameters<Parameters<typeof db.transaction>[0]>[0];
}): Promise<void> {
  const client = args.tx ?? db;
  const [existing] = await client
    .select({ id: masterclassEnrollments.id })
    .from(masterclassEnrollments)
    .where(
      and(
        eq(masterclassEnrollments.userId, args.userId),
        eq(masterclassEnrollments.masterclassId, args.masterclassId),
      ),
    )
    .limit(1);

  if (existing) return;

  await client.insert(masterclassEnrollments).values({
    userId: args.userId,
    masterclassId: args.masterclassId,
    source: args.source,
    paymentId: args.paymentId ?? null,
    enrolledBy: args.enrolledBy ?? null,
    enrollmentNote: args.enrollmentNote ?? null,
  });
}

export async function countMasterclassLessons(masterclassId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(${masterclassLessons.id})::int` })
    .from(masterclassLessons)
    .innerJoin(masterclassModules, eq(masterclassModules.id, masterclassLessons.moduleId))
    .where(eq(masterclassModules.masterclassId, masterclassId));
  return row?.count ?? 0;
}

export async function countCompletedLessons(userId: string, masterclassId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(${masterclassLessonProgress.id})::int` })
    .from(masterclassLessonProgress)
    .innerJoin(masterclassLessons, eq(masterclassLessons.id, masterclassLessonProgress.lessonId))
    .innerJoin(masterclassModules, eq(masterclassModules.id, masterclassLessons.moduleId))
    .where(
      and(
        eq(masterclassLessonProgress.userId, userId),
        eq(masterclassModules.masterclassId, masterclassId),
      ),
    );
  return row?.count ?? 0;
}
