import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminSettings, PublicSettings } from '@/app/api/settings';
import {
  fetchAdminSettings,
  fetchPublicSettings,
  updateAdminSettings,
} from '@/app/api/settings';

const ADMIN_SETTINGS_QUERY_KEY = ['admin-settings'];
export const PUBLIC_SETTINGS_QUERY_KEY = ['public-settings'];

export function usePublicSettings() {
  return useQuery({
    queryKey: PUBLIC_SETTINGS_QUERY_KEY,
    queryFn: fetchPublicSettings,
    staleTime: 10 * 1000,
    refetchOnMount: 'always',
  });
}

/** Module visibility for nav and route gates. */
export function useModuleFlags() {
  const { data, isLoading, isError } = usePublicSettings();

  // While loading with no cached data, hide modules (avoid flashing disabled modules as visible).
  // After load, use API values; default enabled only when data is missing after settle.
  const masterclassesEnabled = data
    ? data.masterclassesEnabled
    : isLoading
      ? false
      : true;
  const digitalProductsEnabled = data
    ? data.digitalProductsEnabled
    : isLoading
      ? false
      : true;

  return {
    isLoading,
    isError,
    masterclassesEnabled,
    digitalProductsEnabled,
  };
}

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
      await queryClient.cancelQueries({ queryKey: PUBLIC_SETTINGS_QUERY_KEY });

      const previousAdmin = queryClient.getQueryData<AdminSettings>(ADMIN_SETTINGS_QUERY_KEY);
      const previousPublic = queryClient.getQueryData<PublicSettings>(PUBLIC_SETTINGS_QUERY_KEY);

      const nextMasterclasses =
        variables.masterclassesEnabled ??
        previousAdmin?.masterclassesEnabled ??
        previousPublic?.masterclassesEnabled ??
        true;
      const nextDigitalProducts =
        variables.digitalProductsEnabled ??
        previousAdmin?.digitalProductsEnabled ??
        previousPublic?.digitalProductsEnabled ??
        true;

      queryClient.setQueryData<AdminSettings>(ADMIN_SETTINGS_QUERY_KEY, (current) => ({
        inviteOnly: variables.inviteOnly ?? current?.inviteOnly ?? false,
        eventMode: variables.eventMode ?? current?.eventMode ?? false,
        masterclassesEnabled: nextMasterclasses,
        digitalProductsEnabled: nextDigitalProducts,
        updatedAt: current?.updatedAt ?? null,
        updatedBy: current?.updatedBy ?? null,
      }));

      queryClient.setQueryData<PublicSettings>(PUBLIC_SETTINGS_QUERY_KEY, (current) => ({
        inviteOnly: variables.inviteOnly ?? current?.inviteOnly ?? false,
        masterclassesEnabled: nextMasterclasses,
        digitalProductsEnabled: nextDigitalProducts,
      }));

      return { previousAdmin, previousPublic };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousAdmin) {
        queryClient.setQueryData(ADMIN_SETTINGS_QUERY_KEY, context.previousAdmin);
      }
      if (context?.previousPublic) {
        queryClient.setQueryData(PUBLIC_SETTINGS_QUERY_KEY, context.previousPublic);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(ADMIN_SETTINGS_QUERY_KEY, data);
      queryClient.setQueryData<PublicSettings>(PUBLIC_SETTINGS_QUERY_KEY, {
        inviteOnly: data.inviteOnly,
        masterclassesEnabled: data.masterclassesEnabled,
        digitalProductsEnabled: data.digitalProductsEnabled,
      });
      void queryClient.invalidateQueries({ queryKey: PUBLIC_SETTINGS_QUERY_KEY });
    },
  });
}
