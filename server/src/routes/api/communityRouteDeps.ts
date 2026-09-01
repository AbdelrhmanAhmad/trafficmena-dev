import type { Context } from 'hono';
import {
  filterAccessibleChannelIds as defaultFilterAccessibleChannelIds,
  loadChannelEntitlements as defaultLoadChannelEntitlements,
  userCanPostInChannel as defaultUserCanPostInChannel,
  userCanViewChannel as defaultUserCanViewChannel,
} from '../../services/community/access.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { consumeRateLimit as defaultConsumeRateLimit, getOptionalUserRole, requireManager } from './utils.js';

export type CommunityRouteDeps = {
  getSessionFromRequest: typeof getSessionFromRequest;
  getOptionalUserRole: typeof getOptionalUserRole;
  requireManager: typeof requireManager;
  consumeRateLimit: typeof defaultConsumeRateLimit;
  userCanViewChannel: typeof defaultUserCanViewChannel;
  userCanPostInChannel: typeof defaultUserCanPostInChannel;
  filterAccessibleChannelIds: typeof defaultFilterAccessibleChannelIds;
  loadChannelEntitlements: typeof defaultLoadChannelEntitlements;
};

export function createDefaultCommunityRouteDeps(): CommunityRouteDeps {
  return {
    getSessionFromRequest,
    getOptionalUserRole,
    requireManager,
    consumeRateLimit: defaultConsumeRateLimit,
    userCanViewChannel: defaultUserCanViewChannel,
    userCanPostInChannel: defaultUserCanPostInChannel,
    filterAccessibleChannelIds: defaultFilterAccessibleChannelIds,
    loadChannelEntitlements: defaultLoadChannelEntitlements,
  };
}

export function createTestAuthDeps(role: string | null, userId: string | null = null) {
  const resolvedUserId = userId ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  return {
    getSessionFromRequest: async () =>
      userId ? { user: { id: resolvedUserId, email: `${resolvedUserId}@example.com` } } : null,
    getOptionalUserRole: async () => role,
    requireManager: async (c: Context) => {
      if (!role || !['owner', 'admin', 'manager'].includes(role)) {
        return {
          response: c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, 401),
        };
      }
      return { userId: resolvedUserId, role };
    },
    consumeRateLimit: () => null,
  };
}
