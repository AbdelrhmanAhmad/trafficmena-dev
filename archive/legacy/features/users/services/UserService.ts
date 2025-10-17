import { supabase } from '@/shared/integrations/supabase/client';
import type { Database } from '@/shared/integrations/supabase/types';
import { AppErrorHandler } from '@/shared/utils/errorHandling';
import { sanitizeSearchQuery } from '@/shared/utils/inputSanitization';
import type { ActivityData } from '@/types';
import { ApiResponseValidator, SafeMapper } from '@/utils/typeValidation';
import type {
  PagedResult,
  ProfileUpdateData,
  UserActivity,
  UserEngagement,
  UserFilters,
  UserListItem,
  UserProfile,
  UserSkill,
  UserStatistics,
  UserWithAuth,
} from '../types';

// Database type aliases for easier usage
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type UserSkillRow = Database['public']['Tables']['user_skills']['Row'];

/**
 * User Service
 * Handles all user management operations and statistics
 */
export class UserService {
  private static instance: UserService;

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Get paginated users (admin only)
   * SECURITY: Uses profiles table only - no direct auth.users access
   */
  async getUsers(
    page: number,
    itemsPerPage: number,
    filters?: UserFilters,
  ): Promise<PagedResult<UserListItem>> {
    try {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase.from('profiles').select(`
          id,
          first_name,
          last_name,
          email,
          role,
          user_type,
          subscription_status,
          primary_goal,
          created_at
        `);

      // Apply filters
      if (filters) {
        if (filters.role && filters.role !== 'all') {
          query = query.eq('role', filters.role);
        }

        if (filters.search_query) {
          // CRITICAL SECURITY FIX: Sanitize search query to prevent SQL injection
          const sanitizationResult = sanitizeSearchQuery(filters.search_query);
          if (!sanitizationResult.isValid) {
            throw new Error(`Invalid search query: ${sanitizationResult.error}`);
          }

          // Use sanitized value in query - Supabase's .or() method handles parameterization
          const sanitizedQuery = sanitizationResult.sanitizedValue;
          query = query.or(
            `first_name.ilike.%${sanitizedQuery}%,last_name.ilike.%${sanitizedQuery}%`,
          );
        }

        if (filters.created_after) {
          query = query.gte('created_at', filters.created_after);
        }

        if (filters.created_before) {
          query = query.lte('created_at', filters.created_before);
        }
      }

      const [{ count }, { data, error }] = await Promise.all([
        query.select('*', { count: 'exact', head: true }),
        query.order('created_at', { ascending: false }).range(from, to),
      ]);

      if (error) throw error;

      // Transform the data to match UserListItem interface
      // SECURITY: Email comes from profiles table, last_sign_in_at removed for security
      const users: UserListItem[] = SafeMapper.mapArray(
        data,
        (item: ProfileRow) => ({
          id: item.id,
          email: item.email || '',
          first_name: item.first_name,
          last_name: item.last_name,
          role: item.role,
          user_type: (item as ProfileRow & { user_type?: string }).user_type as
            | 'learner'
            | 'expert'
            | undefined,
          subscription_status: item.subscription_status,
          created_at: item.created_at,
        }),
        ApiResponseValidator.validateUserListItem,
      );

      return {
        items: users,
        total: count ?? 0,
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Get user by ID with secure profile data
   * SECURITY: Uses secure RPC function instead of direct auth.users access
   */
  async getUserById(id: string): Promise<UserWithAuth | null> {
    try {
      // SECURITY FIX: Use secure RPC function instead of direct auth.users access
      const { data: safeProfile, error } = await supabase
        .rpc('get_safe_profile_data', { target_user_id: id })
        .single();

      if (error) {
        console.error('Error fetching safe profile data:', error);
        return null;
      }

      if (!safeProfile) {
        return null;
      }

      // Build UserWithAuth from the secure profile data
      return {
        id: safeProfile.id,
        email: safeProfile.email,
        created_at: safeProfile.created_at,
        profile: {
          id: safeProfile.id,
          first_name: safeProfile.first_name,
          last_name: safeProfile.last_name,
          phone_number: safeProfile.phone_number,
          role: (safeProfile.role as UserProfile['role']) ?? 'user',
          user_type: (safeProfile.user_type as UserProfile['user_type']) ?? 'learner',
          subscription_status: safeProfile.subscription_status,
          experience_level:
            (safeProfile.experience_level as UserProfile['experience_level'] | undefined) ?? null,
          primary_goal: safeProfile.primary_goal,
          primary_challenge: safeProfile.primary_challenge,
          created_at: safeProfile.created_at,
          updated_at: safeProfile.updated_at,
          last_login_at: null,
        } as UserProfile,
      };
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, data: ProfileUpdateData): Promise<UserProfile | null> {
    try {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        throw error;
      }

      // Record activity
      await this.recordUserActivity(userId, 'profile_update', data);

      return updatedProfile;
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  }

  /**
   * Update user role (admin only)
   * SECURITY: Application-level authorization check added
   */
  async updateUserRole(userId: string, role: 'user' | 'manager' | 'admin'): Promise<boolean> {
    try {
      // CRITICAL SECURITY FIX: Verify admin authorization at application level
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Unauthorized: Authentication required');
      }

      const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin');
      if (adminCheckError || !isAdmin) {
        console.warn('Unauthorized role update attempt:', {
          attemptedBy: currentUser.user.id,
          targetUser: userId,
          attemptedRole: role,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Unauthorized: Admin access required');
      }

      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        throw error;
      }

      // Log successful role change
      console.info('User role updated:', {
        adminId: currentUser.user.id,
        targetUserId: userId,
        newRole: role,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Update user role error:', error);
      throw error;
    }
  }

  /**
   * Get user skills
   */
  async getUserSkills(userId: string): Promise<UserSkill[]> {
    try {
      const { data, error } = await supabase
        .from('user_skills')
        .select(
          `
          id,
          user_id,
          skill_id,
          proficiency_level,
          created_at,
          skills:skill_id (
            id,
            name,
            category,
            description
          )
        `,
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return SafeMapper.mapArray(
        data,
        (item: UserSkillRow & { skills: any }) => ({
          ...item,
          skill: item.skills,
        }),
        ApiResponseValidator.validateUserSkillItem,
      );
    } catch (error) {
      console.error('Error fetching user skills:', error);
      return [];
    }
  }

  /**
   * Add user skill
   */
  async addUserSkill(
    userId: string,
    skillId: string,
    proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert',
  ): Promise<UserSkill | null> {
    try {
      const { data, error } = await supabase
        .from('user_skills')
        .insert({
          user_id: userId,
          skill_id: skillId,
          proficiency_level: proficiencyLevel,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding user skill:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Add user skill error:', error);
      throw error;
    }
  }

  /**
   * Remove user skill
   */
  async removeUserSkill(userId: string, skillId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_skills')
        .delete()
        .eq('user_id', userId)
        .eq('skill_id', skillId);

      if (error) {
        console.error('Error removing user skill:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Remove user skill error:', error);
      throw error;
    }
  }

  /**
   * Record user activity
   */
  async recordUserActivity(
    userId: string,
    activityType: UserActivity['activity_type'],
    activityData: ActivityData,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await supabase.from('user_activities').insert({
        user_id: userId,
        activity_type: activityType,
        activity_data: activityData,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    } catch (error) {
      console.error('Error recording user activity:', error);
      // Don't throw error for activity logging failures
    }
  }

  /**
   * Get user activity log
   */
  async getUserActivity(userId: string, limit: number = 50): Promise<UserActivity[]> {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching user activity:', error);
      return [];
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagement(userId: string): Promise<UserEngagement | null> {
    try {
      const results = await Promise.allSettled([
        supabase.from('event_attendees').select('id').eq('user_id', userId),
        supabase.from('asset_views').select('id').eq('user_id', userId),
        supabase
          .from('user_activities')
          .select('created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      // Use improved error handling with detailed logging
      const eventsResult = AppErrorHandler.extractPromiseResult(results[0], 'Load User Events');
      const libraryResult = AppErrorHandler.extractPromiseResult(
        results[1],
        'Load User Library Views',
      );
      const activityResult = AppErrorHandler.extractPromiseResult(
        results[2],
        'Load User Last Activity',
      );

      // Extract data with fallbacks for failed operations
      const totalEventsAttended = eventsResult.success ? eventsResult.data?.length || 0 : 0;
      const totalLibraryViews = libraryResult.success ? libraryResult.data?.length || 0 : 0;
      const lastActivityDate =
        activityResult.success && activityResult.data?.[0]
          ? activityResult.data[0].created_at
          : null;

      // Log any errors for debugging while still providing data
      const errors = [eventsResult, libraryResult, activityResult]
        .filter((result) => !result.success)
        .map((result) => result.error);

      if (errors.length > 0) {
        console.warn(`User engagement data partially unavailable for user ${userId}:`, errors);
      }

      // Calculate engagement score (0-100) - works even with partial data
      const engagementScore = Math.min(
        100,
        totalEventsAttended * 15 + Math.min(totalLibraryViews, 10) * 4,
      );

      return {
        user_id: userId,
        total_events_attended: totalEventsAttended,
        total_library_views: totalLibraryViews,
        last_activity_date: lastActivityDate,
        engagement_score: engagementScore,
      };
    } catch (error) {
      console.error('Error fetching user engagement:', error);
      return null;
    }
  }

  /**
   * Get user statistics (admin only)
   */
  async getUserStatistics(): Promise<UserStatistics> {
    try {
      const results = await Promise.allSettled([
        supabase.from('profiles').select('role, subscription_status, created_at'),
        supabase
          .from('user_activities')
          .select('user_id, created_at')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      // Use improved error handling
      const usersResult = AppErrorHandler.extractPromiseResult(results[0], 'Load User Profiles');
      const activitiesResult = AppErrorHandler.extractPromiseResult(
        results[1],
        'Load User Activities',
      );

      let totalUsers = 0;
      let newUsersThisMonth = 0;
      const usersByRole: Record<string, number> = {};

      if (usersResult.success && usersResult.data) {
        const users = usersResult.data || [];
        totalUsers = users.length;

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        newUsersThisMonth = users.filter(
          (user) => new Date(user.created_at) > thirtyDaysAgo,
        ).length;

        users.forEach((user) => {
          usersByRole[user.role] = (usersByRole[user.role] || 0) + 1;
        });
      } else if (usersResult.error) {
        console.error('Failed to load user profiles for statistics:', usersResult.error);
      }

      let activeUsers = 0;
      if (activitiesResult.success && activitiesResult.data) {
        const activities = activitiesResult.data || [];
        const uniqueUsers = new Set(activities.map((a) => a.user_id));
        activeUsers = uniqueUsers.size;
      } else if (activitiesResult.error) {
        console.error('Failed to load user activities for statistics:', activitiesResult.error);
      }

      return {
        totalUsers,
        newUsersThisMonth,
        activeUsers,
        usersByRole,
        averageSessionDuration: await this.getAverageSessionDuration(),
      };
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      return {
        totalUsers: 0,
        newUsersThisMonth: 0,
        activeUsers: 0,
        usersByRole: {},
        averageSessionDuration: 0,
      };
    }
  }

  /**
   * Search users (admin only)
   * SECURITY: Uses profiles table only - no direct auth.users access
   * SECURITY: Sanitized search input to prevent SQL injection
   */
  async searchUsers(query: string, limit: number = 10): Promise<UserListItem[]> {
    try {
      // CRITICAL SECURITY FIX: Sanitize search query to prevent SQL injection
      const sanitizationResult = sanitizeSearchQuery(query);
      if (!sanitizationResult.isValid) {
        console.warn('Invalid search query blocked:', {
          originalQuery: query,
          error: sanitizationResult.error,
          timestamp: new Date().toISOString(),
        });
        throw new Error(`Invalid search query: ${sanitizationResult.error}`);
      }

      const sanitizedQuery = sanitizationResult.sanitizedValue;

      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          id,
          first_name,
          last_name,
          email,
          role,
          subscription_status,
          created_at
        `,
        )
        .or(`first_name.ilike.%${sanitizedQuery}%,last_name.ilike.%${sanitizedQuery}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const users: UserListItem[] = SafeMapper.mapArray(
        data,
        (item: ProfileRow) => ({
          id: item.id,
          email: item.email || '',
          first_name: item.first_name,
          last_name: item.last_name,
          role: item.role,
          subscription_status: item.subscription_status,
          created_at: item.created_at,
        }),
        ApiResponseValidator.validateUserListItem,
      );

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Delete user (admin only) - soft delete by updating role
   * SECURITY: Application-level authorization check added
   */
  async deactivateUser(userId: string): Promise<boolean> {
    try {
      // CRITICAL SECURITY FIX: Verify admin authorization at application level
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Unauthorized: Authentication required');
      }

      const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin');
      if (adminCheckError || !isAdmin) {
        console.warn('Unauthorized user deactivation attempt:', {
          attemptedBy: currentUser.user.id,
          targetUser: userId,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Unauthorized: Admin access required');
      }

      // Prevent self-deactivation
      if (currentUser.user.id === userId) {
        console.warn('Admin attempted self-deactivation:', {
          adminId: currentUser.user.id,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Cannot deactivate your own account');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: 'user', subscription_status: 'free' })
        .eq('id', userId);

      if (error) {
        console.error('Error deactivating user:', error);
        throw error;
      }

      // Log successful deactivation
      console.info('User deactivated:', {
        adminId: currentUser.user.id,
        deactivatedUserId: userId,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Deactivate user error:', error);
      throw error;
    }
  }

  /**
   * Get average session duration for analytics
   */
  private async getAverageSessionDuration(): Promise<number> {
    try {
      // Session tracking temporarily disabled - return 0 for now
      return 0;
    } catch (error) {
      console.error('Failed to get average session duration:', error);
      return 0;
    }
  }
}
