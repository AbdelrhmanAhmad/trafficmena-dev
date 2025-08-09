-- TM-MIG-03: Update handle_new_user to store new graph-ready fields
BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    phone_number,
    role,
    job_title,
    email,
    type,
    experience_level,
    primary_goal,
    primary_challenge
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone_number',
    NEW.raw_user_meta_data ->> 'role', -- optional, may be null
    NEW.raw_user_meta_data ->> 'job_title', -- legacy, will be null for new flow
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'type', 'learner'),
    NEW.raw_user_meta_data ->> 'experience_level',
    NEW.raw_user_meta_data ->> 'primary_goal',
    NEW.raw_user_meta_data ->> 'primary_challenge'
  );
  RETURN NEW;
END;
$function$;

COMMIT;