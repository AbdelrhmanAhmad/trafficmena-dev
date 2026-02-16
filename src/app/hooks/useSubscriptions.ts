import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SubscriptionInfo, UserSubscription } from '@/app/api/subscriptions';
import {
  createSubscriptionGrant,
  createSubscriptionGrantsFromCsv,
  fetchCurrentSubscription,
  fetchSubscriptionInfo,
  fetchSubscriptionSettings,
  revokeSubscriptionGrant,
  updateSubscriptionSettings,
} from '@/app/api/subscriptions';

const SUBSCRIPTION_SETTINGS_KEY = ['subscription-settings'];
const CURRENT_SUBSCRIPTION_KEY = ['current-subscription'];
const SUBSCRIPTION_INFO_KEY = ['subscription-info'];

export function useSubscriptionSettings() {
  return useQuery({
    queryKey: SUBSCRIPTION_SETTINGS_KEY,
    queryFn: fetchSubscriptionSettings,
    staleTime: 60 * 1000,
  });
}

export function useUpdateSubscriptionSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSubscriptionSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(SUBSCRIPTION_SETTINGS_KEY, data);
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_INFO_KEY });
    },
  });
}

export function useCurrentSubscription(options?: { enabled?: boolean }) {
  return useQuery<UserSubscription>({
    queryKey: CURRENT_SUBSCRIPTION_KEY,
    queryFn: fetchCurrentSubscription,
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useSubscriptionInfo() {
  return useQuery<SubscriptionInfo>({
    queryKey: SUBSCRIPTION_INFO_KEY,
    queryFn: fetchSubscriptionInfo,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSubscriptionGrant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubscriptionGrant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: CURRENT_SUBSCRIPTION_KEY });
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_INFO_KEY });
    },
  });
}

export function useRevokeSubscriptionGrant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeSubscriptionGrant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: CURRENT_SUBSCRIPTION_KEY });
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_INFO_KEY });
    },
  });
}

export function useBulkSubscriptionGrants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubscriptionGrantsFromCsv,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: CURRENT_SUBSCRIPTION_KEY });
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_INFO_KEY });
    },
  });
}
