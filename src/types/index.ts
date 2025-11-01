// Shared TypeScript interfaces and types for better type safety

export type EventType = 'Meetup' | 'Event' | 'Mastermind' | 'Retreat';

export interface EventCore {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  max_attendees: number | null;
  image_url: string | null;
  tags: string[] | null;
  event_type: EventType;
}

export interface Event extends EventCore {
  host_name: string | null;
  host_bio: string | null;
  host_image_url: string | null;
  agenda: string[] | null;
  prerequisites: string | null;
  meeting_link: string | null;
  what_youll_learn: string[] | null;
}

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone_number: string | null;
  role: 'user' | 'expert' | 'manager' | 'admin' | 'owner' | null;
  user_type?: 'learner' | 'expert' | null;
  subscription_status?: string | null;
  primary_goal?: string | null;
  primary_challenge?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Form update data interfaces
export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  primary_goal?: string;
  primary_challenge?: string;
}

// User activity interfaces
export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  activity_data: ActivityData;
  created_at: string;
  updated_at: string;
}

export type ActivityType = 'profile_update' | 'event_registration' | 'login' | 'skill_update';

export interface ActivityData {
  event_id?: string;
  event_title?: string;
  profile_changes?: Record<string, unknown>;
  skills?: string[];
  metadata?: Record<string, unknown>;
}

export interface LibraryAsset {
  id: string;
  title: string;
  description: string | null;
  file_type: string;
  file_url: string | null;
  event_id: string | null;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
}

// Error handling types
export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
}

// Auth related types
export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

// Supabase error types
export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

// Form data interfaces
export interface EventFormData {
  title: string;
  description?: string;
  date: string;
  location?: string;
  max_attendees?: number | string;
  event_type: EventType;
  event_description?: string;
  meeting_link?: string;
  image_url?: string;
  tags?: string[];
  guest_experts?: GuestExpert[];
}

// Import GuestExpert from events.ts for consistency
export { EventWithGuestExperts, GuestExpert } from './events';

// Filter types
export interface EventFilters {
  topic: string;
  type: string;
  date?: string;
  event_type?: EventType;
}

// Legacy alias for backward compatibility
export type MeetupFilters = EventFilters;
export type MeetupCore = EventCore;

export interface UserFilters {
  search: string;
  role?: 'all' | 'user' | 'expert' | 'manager' | 'admin' | 'owner';
}
