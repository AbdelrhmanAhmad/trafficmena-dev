-- Add additional fields to meetups table for comprehensive meetup details
ALTER TABLE public.meetups 
ADD COLUMN IF NOT EXISTS host_name TEXT,
ADD COLUMN IF NOT EXISTS host_bio TEXT,
ADD COLUMN IF NOT EXISTS host_image_url TEXT,
ADD COLUMN IF NOT EXISTS what_youll_learn TEXT[],
ADD COLUMN IF NOT EXISTS agenda TEXT[],
ADD COLUMN IF NOT EXISTS prerequisites TEXT,
ADD COLUMN IF NOT EXISTS meeting_link TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[];