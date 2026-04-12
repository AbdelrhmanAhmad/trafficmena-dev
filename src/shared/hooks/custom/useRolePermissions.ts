import { useMemo } from 'react';
import { useCurrentUser } from '@/app/hooks/useCurrentUser';
import { useAuth } from '@/shared/context/AuthContext';

export type UserRole = 'owner' | 'admin' | 'manager' | 'expert' | 'user';

const ROLE_PRIORITY: Record<UserRole, number> = {
  user: 0,
  expert: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

const normalizeRole = (value: string | null | undefined): UserRole => {
  const normalized = (value ?? '').toLowerCase();
  if (normalized === 'owner' || normalized === 'admin' || normalized === 'manager') {
    return normalized;
  }
  if (normalized === 'expert') return 'expert';
  if (normalized === 'member') return 'user';
  return 'user';
};

export const useRolePermissions = () => {
  const { user } = useAuth();
  const { data, isLoading } = useCurrentUser({ enabled: !!user });

  const role = useMemo(() => normalizeRole(data?.profile?.role), [data?.profile?.role]);
  const rank = ROLE_PRIORITY[role];

  const permissions = useMemo(
    () => ({
      role,
      rank,
      isOwner: role === 'owner',
      isAdmin: rank >= ROLE_PRIORITY.admin,
      isManager: rank >= ROLE_PRIORITY.manager,
      isExpert: role === 'expert',
      isMember: role === 'user',
      canManageContent: rank >= ROLE_PRIORITY.manager,
      canDeleteContent: rank >= ROLE_PRIORITY.admin,
      canManageInvites: rank >= ROLE_PRIORITY.manager,
      canManageUsers: rank >= ROLE_PRIORITY.admin,
      canAccessAdmin: rank >= ROLE_PRIORITY.manager,
      canAccessSubscriptionPages: rank >= ROLE_PRIORITY.admin,
      hasRole: (required: UserRole | UserRole[]) => {
        const roles = Array.isArray(required) ? required : [required];
        return roles.includes(role);
      },
      hasRankAtLeast: (required: UserRole) => rank >= ROLE_PRIORITY[required],
    }),
    [role, rank],
  );

  return {
    loading: isLoading,
    ...permissions,
  };
};

export const getRolePriority = (role: UserRole) => ROLE_PRIORITY[role];
