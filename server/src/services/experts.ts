import { and, asc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  eventExperts,
  events,
  expertSkills,
  experts,
  skills,
  users,
} from '../db/schema/index.js';
import type { AppLocale } from '../utils/locale.js';
import {
  normalizeGuestExpert,
  type GuestExpertBilingual,
} from '../utils/contentMappers.js';
import {
  presentPublicGuestExpertFromEntity,
  type ExpertBilingualRow,
} from '../utils/expertPresentation.js';

export async function replaceEventExpertLinks(eventId: string, expertIds: string[]) {
  await db.delete(eventExperts).where(eq(eventExperts.eventId, eventId));
  if (expertIds.length === 0) return;
  await db.insert(eventExperts).values(
    expertIds.map((expertId, index) => ({
      eventId,
      expertId,
      sortOrder: index,
    })),
  );
}

export async function loadLinkedExpertsForEvent(eventId: string) {
  return db
    .select({
      id: experts.id,
      slug: experts.slug,
      displayNameEn: experts.displayNameEn,
      displayNameAr: experts.displayNameAr,
      headlineEn: experts.headlineEn,
      headlineAr: experts.headlineAr,
      bioEn: experts.bioEn,
      bioAr: experts.bioAr,
      avatarUrl: experts.avatarUrl,
      websiteUrl: experts.websiteUrl,
      linkedinUrl: experts.linkedinUrl,
      twitterUrl: experts.twitterUrl,
      isPublished: experts.isPublished,
      archivedAt: experts.archivedAt,
      sortOrder: eventExperts.sortOrder,
    })
    .from(eventExperts)
    .innerJoin(experts, eq(experts.id, eventExperts.expertId))
    .where(eq(eventExperts.eventId, eventId))
    .orderBy(asc(eventExperts.sortOrder), asc(experts.displayNameEn));
}

export async function loadLinkedExpertsForEvents(eventIds: string[]) {
  if (eventIds.length === 0) return new Map<string, Awaited<ReturnType<typeof loadLinkedExpertsForEvent>>>();

  const rows = await db
    .select({
      eventId: eventExperts.eventId,
      id: experts.id,
      slug: experts.slug,
      displayNameEn: experts.displayNameEn,
      displayNameAr: experts.displayNameAr,
      headlineEn: experts.headlineEn,
      headlineAr: experts.headlineAr,
      bioEn: experts.bioEn,
      bioAr: experts.bioAr,
      avatarUrl: experts.avatarUrl,
      websiteUrl: experts.websiteUrl,
      linkedinUrl: experts.linkedinUrl,
      twitterUrl: experts.twitterUrl,
      isPublished: experts.isPublished,
      archivedAt: experts.archivedAt,
      sortOrder: eventExperts.sortOrder,
    })
    .from(eventExperts)
    .innerJoin(experts, eq(experts.id, eventExperts.expertId))
    .where(inArray(eventExperts.eventId, eventIds))
    .orderBy(asc(eventExperts.sortOrder), asc(experts.displayNameEn));

  const map = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = map.get(row.eventId) ?? [];
    list.push(row);
    map.set(row.eventId, list);
  }
  return map;
}

export function formatGuestExpertsPresentation(
  linked: Awaited<ReturnType<typeof loadLinkedExpertsForEvent>>,
  guestExpertsJson: unknown,
  locale: AppLocale,
  isStaff: boolean,
) {
  if (linked.length > 0) {
    return linked.map((row) => {
      if (isStaff) {
        return {
          expertId: row.id,
          nameEn: row.displayNameEn,
          nameAr: row.displayNameAr,
          bioEn: row.bioEn ?? '',
          bioAr: row.bioAr ?? '',
          imageUrl: row.avatarUrl,
          slug: row.slug,
          isPublished: row.isPublished,
        };
      }
      return presentPublicGuestExpertFromEntity(row as ExpertBilingualRow, locale);
    });
  }

  if (!Array.isArray(guestExpertsJson)) return [];
  return (guestExpertsJson as GuestExpertBilingual[]).map((expert) =>
    normalizeGuestExpert(expert, locale),
  );
}

export async function presentEventGuestExperts(params: {
  eventId: string;
  guestExpertsJson: unknown;
  locale: AppLocale;
  isStaff: boolean;
}) {
  const linked = await loadLinkedExpertsForEvent(params.eventId);
  return formatGuestExpertsPresentation(
    linked,
    params.guestExpertsJson,
    params.locale,
    params.isStaff,
  );
}

export async function loadExpertSkillIds(expertId: string) {
  const rows = await db
    .select({ skillId: expertSkills.skillId })
    .from(expertSkills)
    .where(eq(expertSkills.expertId, expertId));
  return rows.map((row) => row.skillId);
}

export async function replaceExpertSkills(expertId: string, skillIds: string[]) {
  await db.delete(expertSkills).where(eq(expertSkills.expertId, expertId));
  if (skillIds.length === 0) return;
  await db.insert(expertSkills).values(skillIds.map((skillId) => ({ expertId, skillId })));
}

export async function loadPublicExpertEvents(expertId: string) {
  return db
    .select({
      id: events.id,
      titleEn: events.titleEn,
      titleAr: events.titleAr,
      date: events.date,
      imageUrl: events.imageUrl,
      isPublished: events.isPublished,
    })
    .from(eventExperts)
    .innerJoin(events, eq(events.id, eventExperts.eventId))
    .where(and(eq(eventExperts.expertId, expertId), eq(events.isPublished, true)))
    .orderBy(asc(events.date));
}

export async function assertSlugAvailable(slug: string, excludeExpertId?: string) {
  const conditions = excludeExpertId
    ? and(eq(experts.slug, slug), ne(experts.id, excludeExpertId))
    : eq(experts.slug, slug);
  const existing = await db.select({ id: experts.id }).from(experts).where(conditions).limit(1);
  return existing.length === 0;
}

export async function assertUserAssignmentAvailable(userId: string, excludeExpertId?: string) {
  const conditions = excludeExpertId
    ? and(eq(experts.assignedUserId, userId), ne(experts.id, excludeExpertId))
    : eq(experts.assignedUserId, userId);
  const existing = await db.select({ id: experts.id }).from(experts).where(conditions).limit(1);
  return existing.length === 0;
}

export async function findExpertByAssignedUser(userId: string) {
  const [row] = await db
    .select()
    .from(experts)
    .where(eq(experts.assignedUserId, userId))
    .limit(1);
  return row ?? null;
}

export async function loadExpertWithAssignee(expertId: string) {
  const rows = await db
    .select({
      expert: experts,
      assignedUserEmail: users.email,
    })
    .from(experts)
    .leftJoin(users, eq(users.id, experts.assignedUserId))
    .where(eq(experts.id, expertId))
    .limit(1);
  return rows[0] ?? null;
}

export async function expertIdsExist(ids: string[]) {
  if (ids.length === 0) return true;
  const rows = await db
    .select({ id: experts.id })
    .from(experts)
    .where(inArray(experts.id, ids));
  return rows.length === ids.length;
}

export async function countEventExpertLinks(expertId: string) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventExperts)
    .where(eq(eventExperts.expertId, expertId));
  return Number(count ?? 0);
}

export async function isExpertPubliclyVisible(expert: { isPublished: boolean; archivedAt: Date | null }) {
  return expert.isPublished && expert.archivedAt == null;
}

export async function listPublishedExperts() {
  return db
    .select()
    .from(experts)
    .where(and(eq(experts.isPublished, true), isNull(experts.archivedAt)))
    .orderBy(asc(experts.displayNameEn));
}
