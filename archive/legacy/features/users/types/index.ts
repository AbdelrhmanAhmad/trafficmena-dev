/**
 * User Management Feature Types
 * Complete TypeScript definitions for the User Management vertical slice
 */

import type { ActivityData } from '@/types';

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  role: 'user' | 'manager' | 'admin';
  user_type?: 'learner' | 'expert';
  subscription_status: string | null;
  experience_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  primary_goal: string | null;
  primary_challenge: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

/**
 * SECURITY: Restricted user interface that doesn't expose sensitive auth.users fields
 * This interface is designed to prevent accidental exposure of sensitive authentication data
 */
export interface UserWithAuth {
  id: string;
  email: string;
  // SECURITY NOTE: Removed email_verified and last_sign_in_at to prevent auth data exposure
  // These fields should never be sent to the frontend for security reasons
  created_at: string;
  profile: UserProfile | null;
}

/**
 * SECURITY: Safe user list interface for admin views
 * Excludes sensitive auth.users fields to prevent data exposure
 */
export interface UserListItem {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'user' | 'manager' | 'admin';
  user_type?: 'learner' | 'expert' | null;
  subscription_status: string | null;
  // SECURITY NOTE: Removed last_sign_in_at to prevent auth data exposure
  // This sensitive data should not be displayed in admin interfaces
  created_at: string;
}

export interface UserFilters {
  role?: 'all' | 'user' | 'manager' | 'admin';
  search_query?: string;
  created_after?: string;
  created_before?: string;
  last_login_after?: string;
  last_login_before?: string;
}

export interface UserStatistics {
  totalUsers: number;
  newUsersThisMonth: number;
  activeUsers: number;
  usersByRole: Record<string, number>;
  averageSessionDuration: number;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  created_at: string;
  skill?: Skill;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string | null;
  created_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: 'login' | 'logout' | 'profile_update' | 'event_booking' | 'content_view';
  activity_data: ActivityData;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  primary_goal?: string;
  primary_challenge?: string;
}

export interface UserEngagement {
  user_id: string;
  total_events_attended: number;
  total_library_views: number;
  last_activity_date: string | null;
  engagement_score: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export const USER_ROLES: { value: UserProfile['role']; label: string }[] = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
];

export const ACTIVITY_TYPES: {
  value: UserActivity['activity_type'];
  label: string;
}[] = [
  { value: 'login', label: 'User Login' },
  { value: 'logout', label: 'User Logout' },
  { value: 'profile_update', label: 'Profile Update' },
  { value: 'event_booking', label: 'Event Booking' },
  { value: 'content_view', label: 'Content View' },
];
