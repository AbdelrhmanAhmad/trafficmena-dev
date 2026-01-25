import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type CurrentUserResponse,
  fetchCurrentUser,
  type UpdateCurrentUserPayload,
  updateCurrentUser,
} from '@/app/api/users';

export const currentUserQueryKey = ['current-user'];

export function useCurrentUser(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: (): Promise<CurrentUserResponse> => fetchCurrentUser(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
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
