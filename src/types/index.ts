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

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone_number: string | null;
  role: string | null;
  subscription_status: string | null;
  experience_level?: string | null;
  primary_goal?: string | null;
  primary_challenge?: string | null;
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
  status: string;
  role?: string;
}