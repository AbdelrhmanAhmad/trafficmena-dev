import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/app/hooks/useCurrentUser';
import { useCurrentSubscription } from '@/app/hooks/useSubscriptions';
import { useAuth } from '@/shared/context/AuthContext';
import { pushToDataLayer } from './gtm';
import { buildGlobalVariablesPayload, getGlobalVariablesTrackingKey } from './helpers';

// Fires global_variables on every route change with full user context.
// Must be rendered inside AuthProvider and BrowserRouter.
export function usePageTracking(): void {
  const { key: locationKey, pathname } = useLocation();
  const { user, loading: authLoading } = useAuth();
  const currentUserQuery = useCurrentUser({ enabled: !!user });
  const subscriptionQuery = useCurrentSubscription({ enabled: !!user });
  const prevTrackingKeyRef = useRef<string>('');

  useEffect(() => {
    const payload = buildGlobalVariablesPayload({
      pathname,
      authLoading,
      user,
      profile: currentUserQuery.data?.profile,
      totalPaidPurchases: currentUserQuery.data?.totalPaidPurchases ?? 0,
      totalRegistrations: currentUserQuery.data?.totalRegistrations ?? 0,
      totalRevenue: currentUserQuery.data?.totalRevenue ?? 0,
      accountCreationDate: currentUserQuery.data?.accountCreationDate ?? '',
      subscriptionStatus: subscriptionQuery.data?.status,
      currentUserReady: !user || currentUserQuery.data !== undefined,
      subscriptionReady: !user || subscriptionQuery.data !== undefined,
    });

    if (!payload) {
      return;
    }

    const trackingKey = getGlobalVariablesTrackingKey(pathname, locationKey);
    if (trackingKey === prevTrackingKeyRef.current) {
      return;
    }

    prevTrackingKeyRef.current = trackingKey;
    pushToDataLayer(payload);
  }, [authLoading, currentUserQuery.data, locationKey, pathname, subscriptionQuery.data, user]);
}
