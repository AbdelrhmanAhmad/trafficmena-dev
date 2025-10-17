/**
 * Dashboard Analytics Service
 *
 * Provides comprehensive analytics and metrics for the TrafficMENA admin dashboard.
 * Handles data fetching from Supabase with proper error handling and caching.
 */

import { supabase } from '@/shared/integrations/supabase/client';

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

export class DashboardAnalyticsService {
  private static instance: DashboardAnalyticsService;

  static getInstance(): DashboardAnalyticsService {
    if (!DashboardAnalyticsService.instance) {
      DashboardAnalyticsService.instance = new DashboardAnalyticsService();
    }
    return DashboardAnalyticsService.instance;
  }

  /**
   * Get total number of users
   */
  async getTotalUsers(): Promise<DashboardMetric> {
    try {
      // First check if profiles table exists and has data
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Profiles table error:', error);
        return {
          value: 0,
          label: 'Total Users',
          trend: {
            value: 0,
            isPositive: true,
            period: 'vs last month',
          },
        };
      }

      const currentCount = count ?? 0;

      // Only calculate trends if we have users
      if (currentCount === 0) {
        return {
          value: 0,
          label: 'Total Users',
          trend: {
            value: 0,
            isPositive: true,
            period: 'vs last month',
          },
        };
      }

      // Get last month's count for trend calculation
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const { count: lastMonthCount, error: trendError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', lastMonth.toISOString());

      if (trendError) {
        console.error('Trend calculation error:', trendError);
        return {
          value: currentCount,
          label: 'Total Users',
          trend: {
            value: 0,
            isPositive: true,
            period: 'vs last month',
          },
        };
      }

      const previousCount = lastMonthCount ?? 0;
      const growth =
        previousCount > 0
          ? ((currentCount - previousCount) / previousCount) * 100
          : currentCount > 0
            ? 100
            : 0; // 100% growth if we went from 0 to any number

      return {
        value: currentCount,
        label: 'Total Users',
        trend: {
          value: Math.abs(growth),
          isPositive: growth >= 0,
          period: 'vs last month',
        },
      };
    } catch (error) {
      console.error('Error fetching total users:', error);
      return {
        value: 0,
        label: 'Total Users',
        trend: {
          value: 0,
          isPositive: true,
          period: 'vs last month',
        },
      };
    }
  }

  /**
   * Get total number of active events
   */
  async getActiveEvents(): Promise<DashboardMetric> {
    try {
      const now = new Date().toISOString();

      const { count, error } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('date', now);

      if (error) throw error;

      return {
        value: count || 0,
        label: 'Active Events',
      };
    } catch (error) {
      console.error('Error fetching active events:', error);
      return {
        value: 0,
        label: 'Active Events',
        error: 'Failed to load',
      };
    }
  }

  /**
   * Get total event attendees
   */
  async getTotalAttendees(): Promise<DashboardMetric> {
    try {
      const { count, error } = await supabase
        .from('event_attendees')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      // Get this month's attendees for trend
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const { count: thisMonthCount } = await supabase
        .from('event_attendees')
        .select('*', { count: 'exact', head: true })
        .gte('registered_at', thisMonth.toISOString());

      return {
        value: count || 0,
        label: 'Event Attendees',
        trend: {
          value: thisMonthCount || 0,
          isPositive: true,
          period: 'this month',
        },
      };
    } catch (error) {
      console.error('Error fetching total attendees:', error);
      return {
        value: 0,
        label: 'Event Attendees',
        error: 'Failed to load',
      };
    }
  }

  /**
   * Get library assets count
   */
  async getLibraryAssets(): Promise<DashboardMetric> {
    try {
      const { count, error } = await supabase
        .from('library_assets')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      return {
        value: count || 0,
        label: 'Library Assets',
      };
    } catch (error) {
      console.error('Error fetching library assets:', error);
      return {
        value: 0,
        label: 'Library Assets',
        error: 'Failed to load',
      };
    }
  }

  /**
   * Get monthly growth rate
   */
  async getMonthlyGrowth(): Promise<DashboardMetric> {
    try {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const lastMonth = new Date(thisMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const { count: thisMonthUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thisMonth.toISOString());

      const { count: lastMonthUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastMonth.toISOString())
        .lt('created_at', thisMonth.toISOString());

      const currentCount = thisMonthUsers || 0;
      const previousCount = lastMonthUsers || 0;
      const growth = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0;

      return {
        value: Math.round(growth),
        label: 'Monthly Growth',
        trend: {
          value: Math.abs(growth),
          isPositive: growth >= 0,
          period: 'user growth',
        },
      };
    } catch (error) {
      console.error('Error fetching monthly growth:', error);
      return {
        value: 0,
        label: 'Monthly Growth',
        error: 'Failed to load',
      };
    }
  }

  /**
   * Get recent activity metrics
   */
  async getRecentActivity(): Promise<ActivityItem[]> {
    // Always provide meaningful default activity for empty databases
    const defaultActivities: ActivityItem[] = [
      {
        description: 'Welcome to TrafficMENA Dashboard',
        timestamp: new Date().toLocaleDateString(),
        type: 'user',
      },
      {
        description: 'Admin dashboard is ready for your first users',
        timestamp: new Date().toLocaleDateString(),
        type: 'event',
      },
      {
        description: 'Start by creating your first event',
        timestamp: new Date().toLocaleDateString(),
        type: 'event',
      },
      {
        description: 'Build your MENA marketing community',
        timestamp: new Date().toLocaleDateString(),
        type: 'user',
      },
    ];

    try {
      const activities: ActivityItem[] = [];

      // For empty databases, return helpful defaults immediately
      // Check if we have any data at all first
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: eventCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });

      // If no users and no events, return defaults
      if ((userCount ?? 0) === 0 && (eventCount ?? 0) === 0) {
        return defaultActivities;
      }

      // Try to get real recent activity (safe queries only)
      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - 7);

      // Get recent user registrations (safe)
      try {
        const { data: recentUsers, error: usersError } = await supabase
          .from('profiles')
          .select('created_at, email')
          .gte('created_at', thisWeek.toISOString())
          .order('created_at', { ascending: false })
          .limit(3);

        if (!usersError && recentUsers) {
          recentUsers.forEach((user) => {
            if (user?.created_at && user?.email) {
              activities.push({
                description: `New user: ${user.email}`,
                timestamp: new Date(user.created_at).toLocaleDateString(),
                type: 'user',
              });
            }
          });
        }
      } catch (e) {
        console.warn('Could not fetch recent users:', e);
      }

      // Get recent events (safe)
      try {
        const { data: recentEvents, error: eventsError } = await supabase
          .from('events')
          .select('created_at, title')
          .gte('created_at', thisWeek.toISOString())
          .order('created_at', { ascending: false })
          .limit(3);

        if (!eventsError && recentEvents) {
          recentEvents.forEach((event) => {
            if (event?.created_at && event?.title) {
              activities.push({
                description: `New event: ${event.title}`,
                timestamp: new Date(event.created_at).toLocaleDateString(),
                type: 'event',
              });
            }
          });
        }
      } catch (e) {
        console.warn('Could not fetch recent events:', e);
      }

      // Get recent registrations (safe - no joins)
      try {
        const { data: recentAttendees, error: attendeesError } = await supabase
          .from('event_attendees')
          .select('registered_at')
          .gte('registered_at', thisWeek.toISOString())
          .order('registered_at', { ascending: false })
          .limit(3);

        if (!attendeesError && recentAttendees) {
          recentAttendees.forEach((attendee) => {
            if (attendee?.registered_at) {
              activities.push({
                description: 'New event registration',
                timestamp: new Date(attendee.registered_at).toLocaleDateString(),
                type: 'registration',
              });
            }
          });
        }
      } catch (e) {
        console.warn('Could not fetch recent attendees:', e);
      }

      // Return real activities if we have them, otherwise return defaults
      if (activities.length > 0) {
        return activities
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 6);
      }

      return defaultActivities;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return defaultActivities;
    }
  }

  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    try {
      const [
        totalUsers,
        activeEvents,
        totalAttendees,
        libraryAssets,
        monthlyGrowth,
        recentActivity,
      ] = await Promise.all([
        this.getTotalUsers(),
        this.getActiveEvents(),
        this.getTotalAttendees(),
        this.getLibraryAssets(),
        this.getMonthlyGrowth(),
        this.getRecentActivity(),
      ]);

      return {
        totalUsers,
        activeEvents,
        totalAttendees,
        libraryAssets,
        monthlyGrowth,
        recentActivity,
      };
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      throw error;
    }
  }
}
