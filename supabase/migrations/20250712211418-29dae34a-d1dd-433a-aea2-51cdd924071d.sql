-- Performance Bug Fix: Add missing indexes on foreign key columns
-- These indexes are crucial for JOIN performance and foreign key lookups

-- Index for meetup_attendees.user_id (for user-specific queries)
CREATE INDEX IF NOT EXISTS idx_meetup_attendees_user_id 
ON public.meetup_attendees(user_id);

-- Index for meetup_attendees.meetup_id (for meetup-specific queries) 
CREATE INDEX IF NOT EXISTS idx_meetup_attendees_meetup_id 
ON public.meetup_attendees(meetup_id);

-- Index for library_assets.meetup_id (for meetup-related library assets)
CREATE INDEX IF NOT EXISTS idx_library_assets_meetup_id 
ON public.library_assets(meetup_id);

-- Additional performance indexes for common query patterns
-- Index for created_at columns for chronological sorting
CREATE INDEX IF NOT EXISTS idx_meetup_attendees_registered_at 
ON public.meetup_attendees(registered_at DESC);

CREATE INDEX IF NOT EXISTS idx_library_assets_created_at 
ON public.library_assets(created_at DESC);

-- Composite index for user + date queries (common for dashboard views)
CREATE INDEX IF NOT EXISTS idx_meetup_attendees_user_date 
ON public.meetup_attendees(user_id, registered_at DESC);