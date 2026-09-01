import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  activityChannelEntitlements,
  trackBookings,
} from '../../db/schema/index.js';
import { getEnrolledMasterclassIds } from '../masterclassSales.js';
import { activeTrackBookingWhere } from '../../utils/booking.js';

export type ChannelType = 'staff_post' | 'entitlement_gated' | 'open';

const STAFF_ROLES = new Set(['owner', 'admin', 'manager']);

export function isStaffRole(role: string | null | undefined): boolean {
  return Boolean(role && STAFF_ROLES.has(role));
}

export async function loadChannelEntitlements(channelId: string) {
  return db
    .select({
      trackId: activityChannelEntitlements.trackId,
      masterclassId: activityChannelEntitlements.masterclassId,
    })
    .from(activityChannelEntitlements)
    .where(eq(activityChannelEntitlements.channelId, channelId));
}

export async function userHasTrackEntitlement(userId: string, trackId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: trackBookings.id })
    .from(trackBookings)
    .where(activeTrackBookingWhere(eq(trackBookings.trackId, trackId), eq(trackBookings.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function userHasMasterclassEntitlement(
  userId: string,
  masterclassId: string,
): Promise<boolean> {
  const enrolled = await getEnrolledMasterclassIds(userId, [masterclassId]);
  return enrolled.has(masterclassId);
}

export async function userCanViewChannel(params: {
  channel: { id: string; channelType: ChannelType; archivedAt: Date | null };
  userId: string;
  role: string | null;
}): Promise<boolean> {
  if (params.channel.archivedAt && !isStaffRole(params.role)) return false;

  if (params.channel.channelType === 'open' || params.channel.channelType === 'staff_post') {
    return true;
  }

  if (params.channel.channelType === 'entitlement_gated') {
    const entitlements = await loadChannelEntitlements(params.channel.id);
    for (const ent of entitlements) {
      if (ent.trackId && (await userHasTrackEntitlement(params.userId, ent.trackId))) return true;
      if (
        ent.masterclassId &&
        (await userHasMasterclassEntitlement(params.userId, ent.masterclassId))
      ) {
        return true;
      }
    }
    return false;
  }

  return false;
}

export async function userCanPostInChannel(params: {
  channel: { id: string; channelType: ChannelType; archivedAt: Date | null };
  userId: string;
  role: string | null;
}): Promise<boolean> {
  if (params.channel.archivedAt) return false;
  if (!(await userCanViewChannel(params))) return false;

  if (params.channel.channelType === 'staff_post') {
    return isStaffRole(params.role);
  }

  return true;
}

export async function filterAccessibleChannelIds(params: {
  userId: string;
  role: string | null;
  channels: Array<{ id: string; channelType: ChannelType; archivedAt: Date | null }>;
}): Promise<Set<string>> {
  const allowed = new Set<string>();
  for (const channel of params.channels) {
    if (await userCanViewChannel({ channel, userId: params.userId, role: params.role })) {
      allowed.add(channel.id);
    }
  }
  return allowed;
}
