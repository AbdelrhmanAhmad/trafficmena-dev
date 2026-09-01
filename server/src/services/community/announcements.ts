import { and, desc, eq, inArray, isNull, lte, or } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { activityAnnouncements } from '../../db/schema/index.js';

/** Publish due scheduled announcements idempotently. Returns count published this run. */
export async function publishDueAnnouncements(now = new Date()): Promise<number> {
  const due = await db
    .select({ id: activityAnnouncements.id })
    .from(activityAnnouncements)
    .where(
      and(
        eq(activityAnnouncements.status, 'scheduled'),
        lte(activityAnnouncements.scheduledAt, now),
        isNull(activityAnnouncements.cancelledAt),
      ),
    );

  if (due.length === 0) return 0;

  let published = 0;
  for (const row of due) {
    const result = await db
      .update(activityAnnouncements)
      .set({
        status: 'published',
        publishedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(activityAnnouncements.id, row.id),
          eq(activityAnnouncements.status, 'scheduled'),
          isNull(activityAnnouncements.cancelledAt),
        ),
      )
      .returning({ id: activityAnnouncements.id });

    published += result.length;
  }

  return published;
}

export async function getPublishedAnnouncementsForChannels(channelIds: string[]) {
  if (channelIds.length === 0) return [];
  return db
    .select()
    .from(activityAnnouncements)
    .where(
      and(
        eq(activityAnnouncements.status, 'published'),
        isNull(activityAnnouncements.archivedAt),
        or(
          isNull(activityAnnouncements.channelId),
          inArray(activityAnnouncements.channelId, channelIds),
        ),
      ),
    )
    .orderBy(desc(activityAnnouncements.publishedAt));
}
