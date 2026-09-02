import { and, asc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  eventExperts,
  events,
  expertSkills,
  experts,
  libraryAssetExperts,
  libraryAssets,
  masterclassExperts,
  masterclasses,
  series,
  seriesExperts,
  skills,
  trackExperts,
  tracks,
  users,
} from '../db/schema/index.js';
import type { AppLocale } from '../utils/locale.js';
import { formatGuestExpertsPresentation } from '../utils/expertEventPresentation.js';
import { getEffectiveProductVisibility } from './productVisibility.js';
import {
  isMasterclassDiscoveryVisible,
  shouldIncludeLinkedLibraryAsset,
  shouldIncludeLinkedMasterclass,
} from './expertLinkedContentVisibility.js';

export type ExpertLinkedTitleRow = {
  id: string;
  titleEn: string;
  titleAr: string;
  imageUrl: string | null;
  isPublished?: boolean;
  isPublic?: boolean;
};

export async function replaceTrackExpertLinks(trackId: string, expertIds: string[]) {
  await db.delete(trackExperts).where(eq(trackExperts.trackId, trackId));
  if (expertIds.length === 0) return;
  await db.insert(trackExperts).values(
    expertIds.map((expertId, index) => ({
      trackId,
      expertId,
      sortOrder: index,
    })),
  );
}

export async function replaceSeriesExpertLinks(seriesId: string, expertIds: string[]) {
  await db.delete(seriesExperts).where(eq(seriesExperts.seriesId, seriesId));
  if (expertIds.length === 0) return;
  await db.insert(seriesExperts).values(
    expertIds.map((expertId, index) => ({
      seriesId,
      expertId,
      sortOrder: index,
    })),
  );
}

export async function replaceMasterclassExpertLinks(masterclassId: string, expertIds: string[]) {
  await db.delete(masterclassExperts).where(eq(masterclassExperts.masterclassId, masterclassId));
  if (expertIds.length === 0) return;
  await db.insert(masterclassExperts).values(
    expertIds.map((expertId, index) => ({
      masterclassId,
      expertId,
      sortOrder: index,
    })),
  );
}

export async function replaceLibraryAssetExpertLinks(libraryAssetId: string, expertIds: string[]) {
  await db.delete(libraryAssetExperts).where(eq(libraryAssetExperts.libraryAssetId, libraryAssetId));
  if (expertIds.length === 0) return;
  await db.insert(libraryAssetExperts).values(
    expertIds.map((expertId, index) => ({
      libraryAssetId,
      expertId,
      sortOrder: index,
    })),
  );
}

export async function loadLinkedExpertIdsForTrack(trackId: string) {
  const rows = await db
    .select({ expertId: trackExperts.expertId })
    .from(trackExperts)
    .where(eq(trackExperts.trackId, trackId))
    .orderBy(asc(trackExperts.sortOrder));
  return rows.map((row) => row.expertId);
}

export async function loadLinkedExpertIdsForSeries(seriesId: string) {
  const rows = await db
    .select({ expertId: seriesExperts.expertId })
    .from(seriesExperts)
    .where(eq(seriesExperts.seriesId, seriesId))
    .orderBy(asc(seriesExperts.sortOrder));
  return rows.map((row) => row.expertId);
}

export async function loadLinkedExpertIdsForMasterclass(masterclassId: string) {
  const rows = await db
    .select({ expertId: masterclassExperts.expertId })
    .from(masterclassExperts)
    .where(eq(masterclassExperts.masterclassId, masterclassId))
    .orderBy(asc(masterclassExperts.sortOrder));
  return rows.map((row) => row.expertId);
}

export async function loadLinkedExpertIdsForLibraryAsset(libraryAssetId: string) {
  const rows = await db
    .select({ expertId: libraryAssetExperts.expertId })
    .from(libraryAssetExperts)
    .where(eq(libraryAssetExperts.libraryAssetId, libraryAssetId))
    .orderBy(asc(libraryAssetExperts.sortOrder));
  return rows.map((row) => row.expertId);
}

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

export { formatGuestExpertsPresentation } from '../utils/expertEventPresentation.js';

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

export async function loadPublicExpertEvents(expertId: string, isStaff = false) {
  const conditions = [eq(eventExperts.expertId, expertId)];
  if (!isStaff) conditions.push(eq(events.isPublished, true));

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
    .where(and(...conditions))
    .orderBy(asc(events.date));
}

export async function loadPublicExpertTracks(expertId: string, isStaff = false) {
  const conditions = [eq(trackExperts.expertId, expertId)];
  if (!isStaff) conditions.push(eq(tracks.isPublished, true));

  return db
    .select({
      id: tracks.id,
      titleEn: tracks.titleEn,
      titleAr: tracks.titleAr,
      imageUrl: tracks.imageUrl,
      isPublished: tracks.isPublished,
    })
    .from(trackExperts)
    .innerJoin(tracks, eq(tracks.id, trackExperts.trackId))
    .where(and(...conditions))
    .orderBy(asc(tracks.sortOrder), asc(tracks.titleEn));
}

export async function loadPublicExpertSeries(expertId: string, isStaff = false) {
  const conditions = [eq(seriesExperts.expertId, expertId)];
  if (!isStaff) conditions.push(eq(series.isPublished, true));

  return db
    .select({
      id: series.id,
      titleEn: series.titleEn,
      titleAr: series.titleAr,
      imageUrl: series.imageUrl,
      isPublished: series.isPublished,
    })
    .from(seriesExperts)
    .innerJoin(series, eq(series.id, seriesExperts.seriesId))
    .where(and(...conditions))
    .orderBy(asc(series.sortOrder), asc(series.titleEn));
}

export async function loadPublicExpertMasterclasses(expertId: string, isStaff = false) {
  if (!isStaff) {
    const visibility = await getEffectiveProductVisibility();
    if (!isMasterclassDiscoveryVisible(visibility)) return [];
  }

  const conditions = [eq(masterclassExperts.expertId, expertId)];
  if (!isStaff) conditions.push(eq(masterclasses.isPublished, true));

  const rows = await db
    .select({
      id: masterclasses.id,
      titleEn: masterclasses.titleEn,
      titleAr: masterclasses.titleAr,
      imageUrl: masterclasses.imageUrl,
      isPublished: masterclasses.isPublished,
    })
    .from(masterclassExperts)
    .innerJoin(masterclasses, eq(masterclasses.id, masterclassExperts.masterclassId))
    .where(and(...conditions))
    .orderBy(asc(masterclasses.sortOrder), asc(masterclasses.titleEn));

  if (isStaff) return rows;

  const visibility = await getEffectiveProductVisibility();
  return rows.filter((row) =>
    shouldIncludeLinkedMasterclass(row.isPublished, false, visibility),
  );
}

export async function loadPublicExpertLibraryAssets(expertId: string, isStaff = false) {
  const conditions = [eq(libraryAssetExperts.expertId, expertId)];
  if (!isStaff) conditions.push(eq(libraryAssets.isPublic, true));

  const rows = await db
    .select({
      id: libraryAssets.id,
      titleEn: libraryAssets.titleEn,
      titleAr: libraryAssets.titleAr,
      imageUrl: libraryAssets.thumbnailUrl,
      isPublic: libraryAssets.isPublic,
    })
    .from(libraryAssetExperts)
    .innerJoin(libraryAssets, eq(libraryAssets.id, libraryAssetExperts.libraryAssetId))
    .where(and(...conditions))
    .orderBy(asc(libraryAssetExperts.sortOrder), asc(libraryAssets.titleEn));

  return rows.filter((row) => shouldIncludeLinkedLibraryAsset(row.isPublic, isStaff));
}

export async function loadPublicExpertLinkedContent(expertId: string, options: { isStaff: boolean }) {
  const { isStaff } = options;
  const [events, tracks, seriesRows, masterclassesRows, libraryAssets] = await Promise.all([
    loadPublicExpertEvents(expertId, isStaff),
    loadPublicExpertTracks(expertId, isStaff),
    loadPublicExpertSeries(expertId, isStaff),
    loadPublicExpertMasterclasses(expertId, isStaff),
    loadPublicExpertLibraryAssets(expertId, isStaff),
  ]);

  return { events, tracks, series: seriesRows, masterclasses: masterclassesRows, libraryAssets };
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

export async function countExpertContentLinks(expertId: string) {
  const [eventCount, trackCount, seriesCount, masterclassCount, libraryCount] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(eventExperts)
      .where(eq(eventExperts.expertId, expertId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(trackExperts)
      .where(eq(trackExperts.expertId, expertId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(seriesExperts)
      .where(eq(seriesExperts.expertId, expertId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(masterclassExperts)
      .where(eq(masterclassExperts.expertId, expertId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(libraryAssetExperts)
      .where(eq(libraryAssetExperts.expertId, expertId)),
  ]);

  return (
    Number(eventCount[0]?.count ?? 0) +
    Number(trackCount[0]?.count ?? 0) +
    Number(seriesCount[0]?.count ?? 0) +
    Number(masterclassCount[0]?.count ?? 0) +
    Number(libraryCount[0]?.count ?? 0)
  );
}

/** @deprecated Use countExpertContentLinks */
export async function countEventExpertLinks(expertId: string) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventExperts)
    .where(eq(eventExperts.expertId, expertId));
  return Number(count ?? 0);
}

export async function listPublishedExperts() {
  return db
    .select()
    .from(experts)
    .where(and(eq(experts.isPublished, true), isNull(experts.archivedAt)))
    .orderBy(asc(experts.displayNameEn));
}
