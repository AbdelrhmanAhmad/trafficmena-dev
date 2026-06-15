/**
 * Dashboard Metrics Hooks
 *
 * TanStack Query hooks for managing dashboard analytics data
 * Provides caching, loading states, and error handling for admin dashboard
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  type DashboardAnalytics,
  SimpleDashboardService,
} from '@/shared/services/SimpleDashboardService';

// Query keys for cache management
export const DASHBOARD_QUERY_KEYS = {
  analytics: ['dashboard', 'analytics'] as const,
  totalUsers: ['dashboard', 'totalUsers'] as const,
  activeEvents: ['dashboard', 'activeEvents'] as const,
  totalAttendees: ['dashboard', 'totalAttendees'] as const,
  libraryAssets: ['dashboard', 'libraryAssets'] as const,
  monthlyGrowth: ['dashboard', 'monthlyGrowth'] as const,
  recentActivity: ['dashboard', 'recentActivity'] as const,
};

// Service instance
const dashboardService = SimpleDashboardService.getInstance();

/**
 * Hook for fetching comprehensive dashboard analytics
 */
export const useDashboardAnalytics = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.analytics,
    queryFn: () => dashboardService.getDashboardAnalytics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const refreshMetrics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.analytics });
  }, [queryClient]);

  const refreshAllMetrics = useCallback(() => {
    // Invalidate all dashboard-related queries
    Object.values(DASHBOARD_QUERY_KEYS).forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, [queryClient]);

  return {
    ...query,
    data: query.data as DashboardAnalytics | undefined,
    refreshMetrics,
    refreshAllMetrics,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message || 'Failed to load dashboard metrics',
  };
};

/**
 * Hook for fetching total users metric
 */
export const useTotalUsers = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.totalUsers,
    queryFn: () => dashboardService.getTotalUsers(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching active events metric
 */
export const useActiveEvents = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.activeEvents,
    queryFn: () => dashboardService.getActiveEvents(),
    staleTime: 2 * 60 * 1000, // More frequent updates for events
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching total attendees metric
 */
export const useTotalAttendees = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.totalAttendees,
    queryFn: () => dashboardService.getTotalAttendees(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching library assets metric
 */
export const useLibraryAssets = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.libraryAssets,
    queryFn: () => dashboardService.getLibraryAssets(),
    staleTime: 10 * 60 * 1000, // Less frequent updates for library
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching monthly growth metric
 */
export const useMonthlyGrowth = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.monthlyGrowth,
    queryFn: () => dashboardService.getMonthlyGrowth(),
    staleTime: 30 * 60 * 1000, // Less frequent updates for growth
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching recent activity
 */
export const useRecentActivity = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.recentActivity,
    queryFn: () => dashboardService.getRecentActivity(),
    staleTime: 2 * 60 * 1000, // More frequent updates for activity
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Utility hook for prefetching dashboard data
 */
export const usePrefetchDashboard = () => {
  const queryClient = useQueryClient();

  const prefetchAnalytics = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: DASHBOARD_QUERY_KEYS.analytics,
      queryFn: () => dashboardService.getDashboardAnalytics(),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  return { prefetchAnalytics };
};

/**
 * Hook for invalidating specific metric queries
 */
export const useMetricsInvalidation = () => {
  const queryClient = useQueryClient();

  const invalidateUsers = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: DASHBOARD_QUERY_KEYS.totalUsers,
    });
    queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.analytics });
  }, [queryClient]);

  const invalidateEvents = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: DASHBOARD_QUERY_KEYS.activeEvents,
    });
    queryClient.invalidateQueries({
      queryKey: DASHBOARD_QUERY_KEYS.totalAttendees,
    });
    queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.analytics });
  }, [queryClient]);

  const invalidateLibrary = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: DASHBOARD_QUERY_KEYS.libraryAssets,
    });
    queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.analytics });
  }, [queryClient]);

  return {
    invalidateUsers,
    invalidateEvents,
    invalidateLibrary,
  };
};
