import { useMemo } from 'react';
import { useCurrentUser } from '@/app/hooks/useCurrentUser';

export const useIsManager = () => {
  const { data, isLoading } = useCurrentUser();

  const isManager = useMemo(() => {
    if (!data?.profile?.role) return false;
    return data.profile.role.toLowerCase() === 'manager';
  }, [data?.profile?.role]);

  return {
    isManager,
    loading: isLoading,
  };
};
