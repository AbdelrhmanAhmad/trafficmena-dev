-- Add unique constraint to prevent duplicate bookings
ALTER TABLE public.meetup_attendees 
ADD CONSTRAINT unique_user_meetup_booking 
UNIQUE (meetup_id, user_id);