-- Create event_type enum
CREATE TYPE public.event_type AS ENUM ('Meetup', 'Event', 'Mastermind', 'Retreat');

-- Rename meetups table to events
ALTER TABLE public.meetups RENAME TO events;

-- Add event_type column with default value 'Meetup' for existing records
ALTER TABLE public.events ADD COLUMN event_type public.event_type NOT NULL DEFAULT 'Meetup';

-- Rename meetup_attendees table to event_attendees
ALTER TABLE public.meetup_attendees RENAME TO event_attendees;

-- Rename foreign key column in event_attendees
ALTER TABLE public.event_attendees RENAME COLUMN meetup_id TO event_id;

-- Rename foreign key column in library_assets
ALTER TABLE public.library_assets RENAME COLUMN meetup_id TO event_id;

-- Drop old RLS policies for meetups table (now events)
DROP POLICY IF EXISTS "Anyone can view meetups" ON public.events;
DROP POLICY IF EXISTS "Only admins can delete meetups" ON public.events;
DROP POLICY IF EXISTS "Only admins can insert meetups" ON public.events;
DROP POLICY IF EXISTS "Only admins can update meetups" ON public.events;

-- Create new RLS policies for events table
CREATE POLICY "Anyone can view events" ON public.events
FOR SELECT USING (true);

CREATE POLICY "Only admins can delete events" ON public.events
FOR DELETE USING (is_admin());

CREATE POLICY "Only admins can insert events" ON public.events
FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Only admins can update events" ON public.events
FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- Drop old RLS policies for meetup_attendees table (now event_attendees)
DROP POLICY IF EXISTS "Admins can manage all meetup attendees" ON public.event_attendees;
DROP POLICY IF EXISTS "Admins can view all meetup attendees" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can cancel their own registrations" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can register for meetups" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can view their own meetup registrations" ON public.event_attendees;

-- Create new RLS policies for event_attendees table
CREATE POLICY "Admins can manage all event attendees" ON public.event_attendees
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can view all event attendees" ON public.event_attendees
FOR SELECT USING (is_admin());

CREATE POLICY "Users can cancel their own registrations" ON public.event_attendees
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can register for events" ON public.event_attendees
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own event registrations" ON public.event_attendees
FOR SELECT USING (auth.uid() = user_id);