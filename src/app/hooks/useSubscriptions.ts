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
import { currentSubscriptionQueryKey, getCurrentSubscriptionQueryKey } from '@/app/queryKeys';
import { useAuth } from '@/shared/context/AuthContext';

const SUBSCRIPTION_SETTINGS_KEY = ['subscription-settings'];
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
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;

  return useQuery<UserSubscription>({
    queryKey: getCurrentSubscriptionQueryKey(userId),
    queryFn: fetchCurrentSubscription,
    staleTime: 60 * 1000,
    enabled: (options?.enabled ?? Boolean(userId)) && Boolean(userId) && !loading,
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: currentSubscriptionQueryKey });
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_INFO_KEY });
    },
  });
}

export function useRevokeSubscriptionGrant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeSubscriptionGrant,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: currentSubscriptionQueryKey });
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_INFO_KEY });
    },
  });
}

export function useBulkSubscriptionGrants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubscriptionGrantsFromCsv,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: currentSubscriptionQueryKey });
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_INFO_KEY });
    },
  });
}
