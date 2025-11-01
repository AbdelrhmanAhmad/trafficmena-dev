import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';

export const useIsAdmin = () => {
  const { loading, hasRankAtLeast } = useRolePermissions();

  return {
    isAdmin: hasRankAtLeast('admin'),
    loading,
  };
};
