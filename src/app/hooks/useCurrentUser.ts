import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type CurrentUserResponse,
  fetchCurrentUser,
  type UpdateCurrentUserPayload,
  updateCurrentUser,
} from '@/app/api/users';
import { currentUserQueryKey, getCurrentUserQueryKey } from '@/app/queryKeys';
import { useAuth } from '@/shared/context/AuthContext';

export function useCurrentUser(options?: { enabled?: boolean }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: getCurrentUserQueryKey(userId),
    queryFn: (): Promise<CurrentUserResponse> => fetchCurrentUser(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: (options?.enabled ?? Boolean(userId)) && Boolean(userId) && !loading,
  });
}

export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCurrentUserPayload) => updateCurrentUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
    },
  });
}
