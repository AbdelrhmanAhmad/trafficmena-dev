-- TM-MIG-04: Cleanup legacy job_title column from profiles table
ALTER TABLE public.profiles DROP COLUMN job_title;