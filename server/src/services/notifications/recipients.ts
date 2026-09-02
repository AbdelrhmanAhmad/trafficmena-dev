import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  activityChannelEntitlements,
  activityChannels,
  eventAttendees,
  masterclassEnrollments,
  profiles,
  trackBookings,
  users,
} from '../../db/schema/index.js';
import { activeTrackBookingWhere } from '../../utils/booking.js';
import { classifyEmail, classifyPhone } from './contact.js';
import type { AudiencePreview, AudienceSpec } from './types.js';

/** Deduplicate audience user IDs (preserves first-seen order). */
export function dedupeAudienceUserIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

function uniqueIds(ids: string[]): string[] {
  return dedupeAudienceUserIds(ids);
}

async function allNonArchivedUserIds(): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isArchived, false));
  return rows.map((r) => r.id);
}

async function resolveActivityChannelMembers(channelId: string): Promise<string[]> {
  const [channel] = await db
    .select({
      id: activityChannels.id,
      channelType: activityChannels.channelType,
      archivedAt: activityChannels.archivedAt,
    })
    .from(activityChannels)
    .where(eq(activityChannels.id, channelId))
    .limit(1);

  if (!channel || channel.archivedAt) {
    return [];
  }

  if (channel.channelType === 'open' || channel.channelType === 'staff_post') {
    return allNonArchivedUserIds();
  }

  // entitlement_gated: union of active track buyers + masterclass enrollees for linked entitlements
  const entitlements = await db
    .select({
      trackId: activityChannelEntitlements.trackId,
      masterclassId: activityChannelEntitlements.masterclassId,
    })
    .from(activityChannelEntitlements)
    .where(eq(activityChannelEntitlements.channelId, channelId));

  const trackIds = entitlements.map((e) => e.trackId).filter((id): id is string => Boolean(id));
  const masterclassIds = entitlements
    .map((e) => e.masterclassId)
    .filter((id): id is string => Boolean(id));

  const ids: string[] = [];

  if (trackIds.length > 0) {
    const buyers = await db
      .select({ userId: trackBookings.userId })
      .from(trackBookings)
      .innerJoin(users, eq(users.id, trackBookings.userId))
      .where(
        and(
          activeTrackBookingWhere(inArray(trackBookings.trackId, trackIds)),
          eq(users.isArchived, false),
        ),
      );
    for (const row of buyers) ids.push(row.userId);
  }

  if (masterclassIds.length > 0) {
    const enrollees = await db
      .select({ userId: masterclassEnrollments.userId })
      .from(masterclassEnrollments)
      .innerJoin(users, eq(users.id, masterclassEnrollments.userId))
      .where(
        and(
          inArray(masterclassEnrollments.masterclassId, masterclassIds),
          eq(users.isArchived, false),
        ),
      );
    for (const row of enrollees) ids.push(row.userId);
  }

  return uniqueIds(ids);
}

export async function resolveAudience(spec: AudienceSpec): Promise<string[]> {
  switch (spec.type) {
    case 'all_users':
      return allNonArchivedUserIds();

    case 'event_attendees': {
      const rows = await db
        .select({ userId: eventAttendees.userId })
        .from(eventAttendees)
        .innerJoin(users, eq(users.id, eventAttendees.userId))
        .where(
          and(
            eq(eventAttendees.eventId, spec.eventId),
            eq(eventAttendees.status, 'active'),
            eq(users.isArchived, false),
          ),
        );
      return uniqueIds(rows.map((r) => r.userId));
    }

    case 'track_buyers': {
      const rows = await db
        .select({ userId: trackBookings.userId })
        .from(trackBookings)
        .innerJoin(users, eq(users.id, trackBookings.userId))
        .where(
          and(
            activeTrackBookingWhere(eq(trackBookings.trackId, spec.trackId)),
            eq(users.isArchived, false),
          ),
        );
      return uniqueIds(rows.map((r) => r.userId));
    }

    case 'masterclass_enrollees': {
      const rows = await db
        .select({ userId: masterclassEnrollments.userId })
        .from(masterclassEnrollments)
        .innerJoin(users, eq(users.id, masterclassEnrollments.userId))
        .where(
          and(
            eq(masterclassEnrollments.masterclassId, spec.masterclassId),
            eq(users.isArchived, false),
          ),
        );
      return uniqueIds(rows.map((r) => r.userId));
    }

    case 'activity_channel_members':
      return resolveActivityChannelMembers(spec.channelId);

    case 'role_based': {
      if (!spec.roles.length) return [];
      const roles = spec.roles.map((r) => r.toLowerCase());
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .innerJoin(profiles, eq(profiles.id, users.id))
        .where(and(eq(users.isArchived, false), inArray(profiles.role, roles as any)));
      return uniqueIds(rows.map((r) => r.id));
    }

    case 'explicit_users': {
      if (!spec.userIds.length) return [];
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(and(inArray(users.id, uniqueIds(spec.userIds)), eq(users.isArchived, false)));
      return uniqueIds(rows.map((r) => r.id));
    }

    default:
      return [];
  }
}

export type RecipientContact = {
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  name: string | null;
};

export async function loadRecipientContacts(userIds: string[]): Promise<RecipientContact[]> {
  const ids = uniqueIds(userIds);
  if (ids.length === 0) return [];

  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      phoneNumber: profiles.phoneNumber,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.id, users.id))
    .where(and(inArray(users.id, ids), eq(users.isArchived, false)));

  return rows.map((r) => ({
    userId: r.userId,
    email: r.email,
    phoneNumber: r.phoneNumber,
    name: r.name,
  }));
}

export async function previewAudience(spec: AudienceSpec): Promise<AudiencePreview> {
  const userIds = await resolveAudience(spec);
  const contacts = await loadRecipientContacts(userIds);

  let emailDeliverable = 0;
  let emailSkipped = 0;
  let whatsappEligible = 0;
  let whatsappSkipped = 0;

  for (const contact of contacts) {
    const email = classifyEmail(contact.email);
    if (email.status === 'deliverable') emailDeliverable += 1;
    else emailSkipped += 1;

    const phone = classifyPhone(contact.phoneNumber);
    if (phone.status === 'deliverable') whatsappEligible += 1;
    else whatsappSkipped += 1;
  }

  return {
    total: contacts.length,
    emailDeliverable,
    emailSkipped,
    whatsappEligible,
    whatsappSkipped,
  };
}

export function audienceSpecToRef(spec: AudienceSpec): {
  audienceType: AudienceSpec['type'];
  audienceRef: Record<string, unknown>;
} {
  switch (spec.type) {
    case 'all_users':
      return { audienceType: spec.type, audienceRef: {} };
    case 'event_attendees':
      return { audienceType: spec.type, audienceRef: { eventId: spec.eventId } };
    case 'track_buyers':
      return { audienceType: spec.type, audienceRef: { trackId: spec.trackId } };
    case 'masterclass_enrollees':
      return { audienceType: spec.type, audienceRef: { masterclassId: spec.masterclassId } };
    case 'activity_channel_members':
      return { audienceType: spec.type, audienceRef: { channelId: spec.channelId } };
    case 'role_based':
      return { audienceType: spec.type, audienceRef: { roles: spec.roles } };
    case 'explicit_users':
      return { audienceType: spec.type, audienceRef: { userIds: spec.userIds } };
    default:
      return { audienceType: 'explicit_users', audienceRef: {} };
  }
}

export function audienceRefToSpec(
  audienceType: string | null | undefined,
  audienceRef: Record<string, unknown> | null | undefined,
): AudienceSpec | null {
  const ref = audienceRef ?? {};
  switch (audienceType) {
    case 'all_users':
      return { type: 'all_users' };
    case 'event_attendees':
      return typeof ref.eventId === 'string'
        ? { type: 'event_attendees', eventId: ref.eventId }
        : null;
    case 'track_buyers':
      return typeof ref.trackId === 'string' ? { type: 'track_buyers', trackId: ref.trackId } : null;
    case 'masterclass_enrollees':
      return typeof ref.masterclassId === 'string'
        ? { type: 'masterclass_enrollees', masterclassId: ref.masterclassId }
        : null;
    case 'activity_channel_members':
      return typeof ref.channelId === 'string'
        ? { type: 'activity_channel_members', channelId: ref.channelId }
        : null;
    case 'role_based':
      return Array.isArray(ref.roles)
        ? { type: 'role_based', roles: ref.roles.filter((r): r is string => typeof r === 'string') }
        : null;
    case 'explicit_users':
      return Array.isArray(ref.userIds)
        ? {
            type: 'explicit_users',
            userIds: ref.userIds.filter((id): id is string => typeof id === 'string'),
          }
        : null;
    default:
      return null;
  }
}
