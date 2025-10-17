import { useMemo } from 'react';
import { useCurrentUser } from '@/app/hooks/useCurrentUser';

export const useIsAdmin = () => {
  const { data, isLoading } = useCurrentUser();

  const isAdmin = useMemo(() => {
    if (!data) return false;
    return (data.profile?.role ?? '').toLowerCase() === 'admin';
  }, [data]);

  return {
    isAdmin,
    loading: isLoading,
  };
};
