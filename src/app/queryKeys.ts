export const currentUserQueryKey = ['current-user'] as const;

export function getCurrentUserQueryKey(userId?: string | null) {
  return [...currentUserQueryKey, userId ?? 'guest'] as const;
}

export const currentSubscriptionQueryKey = ['current-subscription'] as const;

export function getCurrentSubscriptionQueryKey(userId?: string | null) {
  return [...currentSubscriptionQueryKey, userId ?? 'guest'] as const;
}
