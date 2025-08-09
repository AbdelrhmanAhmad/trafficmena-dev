-- Check if meetups table exists, then rename to events
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meetups') THEN
        ALTER TABLE public.meetups RENAME TO events;
    END IF;
END $$;

-- Add event_type column if it doesn't exist (enum already exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_type') THEN
        ALTER TABLE public.events 
        ADD COLUMN event_type public.event_type NOT NULL DEFAULT 'Meetup'::public.event_type;
    END IF;
END $$;

-- Add additional event fields if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'host_name') THEN
        ALTER TABLE public.events 
        ADD COLUMN host_name text,
        ADD COLUMN host_bio text,
        ADD COLUMN host_image_url text,
        ADD COLUMN what_youll_learn text[],
        ADD COLUMN agenda text[],
        ADD COLUMN prerequisites text,
        ADD COLUMN meeting_link text,
        ADD COLUMN image_url text,
        ADD COLUMN tags text[];
    END IF;
END $$;

-- Rename meetup_attendees to event_attendees if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meetup_attendees') THEN
        ALTER TABLE public.meetup_attendees RENAME TO event_attendees;
        ALTER TABLE public.event_attendees RENAME COLUMN meetup_id TO event_id;
    END IF;
END $$;