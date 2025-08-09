-- Fix the security definer view issue by removing the problematic view
-- and replacing it with a secure function approach

-- Remove the security definer view
DROP VIEW IF EXISTS public.safe_profiles;

-- Create a secure function instead of a view to avoid security definer issues
CREATE OR REPLACE FUNCTION public.get_safe_profile_data(target_user_id uuid DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    first_name text,
    last_name text,
    email text,
    phone_number text,
    type text,
    experience_level text,
    primary_goal text,
    primary_challenge text,
    subscription_status text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    query_user_id uuid;
BEGIN
    -- Use provided user_id or default to current user
    query_user_id := COALESCE(target_user_id, auth.uid());
    
    -- Only return data if user is accessing their own profile or is admin
    IF auth.uid() = query_user_id OR is_admin() THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.first_name,
            p.last_name,
            p.email,
            p.phone_number,
            p.type,
            p.experience_level,
            p.primary_goal,
            p.primary_challenge,
            p.subscription_status,
            p.created_at,
            p.updated_at
        FROM public.profiles p
        WHERE p.id = query_user_id;
    ELSE
        -- Return masked data for unauthorized access
        RETURN QUERY
        SELECT 
            p.id,
            p.first_name,
            p.last_name,
            '***@***.***'::text as email,
            '***-***-****'::text as phone_number,
            p.type,
            p.experience_level,
            p.primary_goal,
            p.primary_challenge,
            p.subscription_status,
            p.created_at,
            p.updated_at
        FROM public.profiles p
        WHERE p.id = query_user_id;
    END IF;
END;
$$;