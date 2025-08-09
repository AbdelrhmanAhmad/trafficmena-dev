-- Fix Critical Bug #1: Add foreign key constraint for user_skills table
-- This prevents orphaned user_skills records and ensures data integrity

-- Add foreign key constraint to user_skills table referencing auth.users
-- This will ensure user_skills records are automatically deleted when users are deleted
ALTER TABLE public.user_skills 
ADD CONSTRAINT fk_user_skills_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) 
ON DELETE CASCADE;