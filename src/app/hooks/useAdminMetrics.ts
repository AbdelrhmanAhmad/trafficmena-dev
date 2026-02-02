import { useQuery } from '@tanstack/react-query';
import { type AdminMetricsOverview, fetchAdminMetricsOverview } from '@/app/api/adminMetrics';

type UseAdminMetricsOptions = {
  enabled?: boolean;
};

export function useAdminMetricsOverview(options?: UseAdminMetricsOptions) {
  return useQuery<AdminMetricsOverview>({
    queryKey: ['admin', 'metrics', 'overview'],
    queryFn: () => fetchAdminMetricsOverview(),
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
