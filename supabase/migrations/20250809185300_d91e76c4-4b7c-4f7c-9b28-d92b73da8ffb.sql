-- Step 1: Create event_type enum
CREATE TYPE public.event_type AS ENUM ('Meetup', 'Event', 'Mastermind', 'Retreat');

-- Step 2: Rename meetups table to events
ALTER TABLE public.meetups RENAME TO events;

-- Step 3: Add event_type column with default value
ALTER TABLE public.events 
ADD COLUMN event_type public.event_type NOT NULL DEFAULT 'Meetup'::public.event_type;

-- Step 4: Add additional event fields for enhanced functionality
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

-- Step 5: Rename meetup_attendees to event_attendees if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'meetup_attendees') THEN
        ALTER TABLE public.meetup_attendees RENAME TO event_attendees;
        ALTER TABLE public.event_attendees RENAME COLUMN meetup_id TO event_id;
    END IF;
END $$;

-- Step 6: Update library_assets to reference events instead of meetups
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'library_assets' AND column_name = 'meetup_id') THEN
        ALTER TABLE public.library_assets RENAME COLUMN meetup_id TO event_id;
    END IF;
END $$;