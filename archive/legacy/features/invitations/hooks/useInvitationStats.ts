import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/integrations/supabase/client';

interface InvitationStats {
  totalInvitations: number;
  pendingInvitations: number;
  sentInvitations: number;
  acceptedInvitations: number;
  failedInvitations: number;
  expiredInvitations: number;
  acceptanceRate: number;
  recentActivity: any[];
}

/**
 * Simplified hook to get invitation statistics
 */
export function useInvitationStats() {
  const {
    data: stats = getDefaultStats(),
    isLoading,
    error,
  } = useQuery({
    queryKey: ['invitation-stats'],
    queryFn: async () => {
      try {
        // Use a single query to get all status counts efficiently

        const { data, error } = await supabase.from('invitations').select('status');

        if (error) {
          // If we have an RLS/auth issue, return default stats
          if (error.code === 'PGRST116' || error.message?.includes('permission')) {
            return getDefaultStats();
          }
          throw error;
        }

        // Count by status in JavaScript to avoid multiple DB queries
        const counts = {
          total: 0,
          pending: 0,
          sent: 0,
          accepted: 0,
          failed: 0,
          expired: 0,
        };

        if (data) {
          counts.total = data.length;

          data.forEach((invitation) => {
            switch (invitation.status) {
              case 'pending':
                counts.pending++;
                break;
              case 'sent':
                counts.sent++;
                break;
              case 'accepted':
                counts.accepted++;
                break;
              case 'failed':
                counts.failed++;
                break;
              case 'expired':
                counts.expired++;
                break;
            }
          });
        }

        const acceptanceRate =
          counts.total > 0 ? Math.round((counts.accepted / counts.total) * 100) : 0;

        const stats = {
          totalInvitations: counts.total,
          pendingInvitations: counts.pending,
          sentInvitations: counts.sent,
          acceptedInvitations: counts.accepted,
          failedInvitations: counts.failed,
          expiredInvitations: counts.expired,
          acceptanceRate,
          recentActivity: [],
        };

        return stats;
      } catch (error) {
        // If it's an authentication or permission error, return defaults
        if (error instanceof Error) {
          if (
            error.message?.includes('permission') ||
            error.message?.includes('auth') ||
            error.message?.includes('RLS')
          ) {
            return getDefaultStats();
          }
        }

        // Re-throw other errors
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    // Add error handling to prevent UI crashes
    retry: (failureCount, error) => {
      // Don't retry auth/permission errors
      if (
        error instanceof Error &&
        (error.message?.includes('permission') ||
          error.message?.includes('auth') ||
          error.message?.includes('RLS'))
      ) {
        return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
    // Always return default stats on error
    onError: (error) => {},
  });

  return { stats, isLoading, error };
}

function getDefaultStats(): InvitationStats {
  return {
    totalInvitations: 0,
    pendingInvitations: 0,
    sentInvitations: 0,
    acceptedInvitations: 0,
    failedInvitations: 0,
    expiredInvitations: 0,
    acceptanceRate: 0,
    recentActivity: [],
  };
}

// Export for dashboard metrics if needed
export function useDashboardMetrics() {
  const { stats } = useInvitationStats();

  const metrics = [
    {
      title: 'Total Invitations',
      value: stats.totalInvitations.toString(),
      trend: 'up',
      change: '+0%',
    },
    {
      title: 'Acceptance Rate',
      value: `${stats.acceptanceRate}%`,
      trend: stats.acceptanceRate > 50 ? 'up' : 'down',
      change: '+0%',
    },
    {
      title: 'Pending',
      value: stats.pendingInvitations.toString(),
      trend: 'up',
      change: '+0%',
    },
    {
      title: 'Accepted',
      value: stats.acceptedInvitations.toString(),
      trend: 'up',
      change: '+0%',
    },
  ];

  return { metrics, isLoading: false };
}
