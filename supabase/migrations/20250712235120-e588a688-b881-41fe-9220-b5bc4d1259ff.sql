-- Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN email text;

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone_number, role, job_title, email)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone_number',
    new.raw_user_meta_data ->> 'role',
    new.raw_user_meta_data ->> 'job_title',
    new.email
  );
  RETURN new;
END;
$$;

-- Update existing profiles with email from auth.users
UPDATE public.profiles 
SET email = auth_users.email 
FROM auth.users auth_users 
WHERE profiles.id = auth_users.id;