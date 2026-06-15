/**
 * Simplified Dashboard Service for Empty Database Compatibility
 *
 * This service provides safe fallbacks for empty databases while the
 * main service is being debugged.
 */

export interface DashboardMetric {
  value: number;
  label: string;
  trend?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  loading?: boolean;
  error?: string;
}

export interface ActivityItem {
  description: string;
  timestamp: string;
  type: 'user' | 'event' | 'registration';
}

export interface DashboardAnalytics {
  totalUsers: DashboardMetric;
  activeEvents: DashboardMetric;
  totalAttendees: DashboardMetric;
  libraryAssets: DashboardMetric;
  monthlyGrowth: DashboardMetric;
  recentActivity: ActivityItem[];
}

export class SimpleDashboardService {
  private static instance: SimpleDashboardService;

  static getInstance(): SimpleDashboardService {
    if (!SimpleDashboardService.instance) {
      SimpleDashboardService.instance = new SimpleDashboardService();
    }
    return SimpleDashboardService.instance;
  }

  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    // Return safe mock data for empty databases
    return {
      totalUsers: {
        value: 0,
        label: 'Total Users',
        trend: {
          value: 0,
          isPositive: true,
          period: 'ready to grow',
        },
      },
      activeEvents: {
        value: 0,
        label: 'Active Events',
        trend: {
          value: 0,
          isPositive: true,
          period: 'ready to start',
        },
      },
      totalAttendees: {
        value: 0,
        label: 'Total Attendees',
        trend: {
          value: 0,
          isPositive: true,
          period: 'awaiting first event',
        },
      },
      libraryAssets: {
        value: 0,
        label: 'Library Assets',
        trend: {
          value: 0,
          isPositive: true,
          period: 'ready for content',
        },
      },
      monthlyGrowth: {
        value: 0,
        label: 'Monthly Growth',
        trend: {
          value: 0,
          isPositive: true,
          period: 'ready to launch',
        },
      },
      recentActivity: [
        {
          description: 'Welcome to TrafficMENA Admin Dashboard',
          timestamp: new Date().toLocaleDateString(),
          type: 'user',
        },
        {
          description: 'Your platform is ready for the first users',
          timestamp: new Date().toLocaleDateString(),
          type: 'event',
        },
        {
          description: 'Create your first event to get started',
          timestamp: new Date().toLocaleDateString(),
          type: 'event',
        },
        {
          description: 'Build your MENA marketing community',
          timestamp: new Date().toLocaleDateString(),
          type: 'user',
        },
      ],
    };
  }
}
