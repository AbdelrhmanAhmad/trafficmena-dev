import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';

export const useIsManager = () => {
  const { loading, hasRankAtLeast } = useRolePermissions();

  return {
    isManager: hasRankAtLeast('manager'),
    loading,
  };
};
