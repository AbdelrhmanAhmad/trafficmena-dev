/**
 * Dashboard Components
 *
 * Centralized exports for all dashboard-related UI components
 */

// Re-export types for convenience
export type {
  ActivityItem,
  DashboardAnalytics,
  DashboardMetric,
} from '@/shared/services/SimpleDashboardService';
export { MetricCard } from './MetricCard';
export { MetricGrid } from './MetricGrid';
export { TrendIndicator } from './TrendIndicator';
