import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminSettings } from '@/app/api/settings';
import { fetchAdminSettings, updateAdminSettings } from '@/app/api/settings';

const ADMIN_SETTINGS_QUERY_KEY = ['admin-settings'];

export function useAdminSettings() {
  return useQuery({
    queryKey: ADMIN_SETTINGS_QUERY_KEY,
    queryFn: fetchAdminSettings,
    staleTime: 30 * 1000,
  });
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAdminSettings,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_SETTINGS_QUERY_KEY });
      const previous = queryClient.getQueryData<AdminSettings>(ADMIN_SETTINGS_QUERY_KEY);

      queryClient.setQueryData<AdminSettings>(ADMIN_SETTINGS_QUERY_KEY, (current) => ({
        inviteOnly: variables.inviteOnly ?? current?.inviteOnly ?? false,
        eventMode: variables.eventMode ?? current?.eventMode ?? false,
        updatedAt: current?.updatedAt ?? null,
        updatedBy: current?.updatedBy ?? null,
      }));

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ADMIN_SETTINGS_QUERY_KEY, context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(ADMIN_SETTINGS_QUERY_KEY, data);
    },
  });
}
