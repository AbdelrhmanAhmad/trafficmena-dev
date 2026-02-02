import type { UserRole } from '@/shared/hooks/custom/useRolePermissions';

export function getAdminDashboardPath(role: UserRole): string {
  if (role === 'manager') {
    return '/admin/library';
  }
  if (role === 'admin' || role === 'owner') {
    return '/admin';
  }
  return '/dashboard';
}
