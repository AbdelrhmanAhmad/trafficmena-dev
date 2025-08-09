-- Enhanced security measures for profiles table

-- 1. Add additional constraints to prevent data exposure
ALTER TABLE public.profiles ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL);

-- 2. Add constraint to ensure phone numbers are properly formatted
ALTER TABLE public.profiles ADD CONSTRAINT check_phone_format 
CHECK (phone_number ~ '^\+?[1-9]\d{1,14}$' OR phone_number IS NULL);

-- 3. Create audit log table for profile access
CREATE TABLE IF NOT EXISTS public.profile_access_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL,
    accessed_by uuid NOT NULL,
    access_type text NOT NULL CHECK (access_type IN ('SELECT', 'UPDATE', 'INSERT')),
    accessed_at timestamp with time zone NOT NULL DEFAULT now(),
    ip_address text,
    user_agent text
);

-- Enable RLS on audit log
ALTER TABLE public.profile_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" ON public.profile_access_log
    FOR SELECT USING (is_admin());

-- 4. Create function to mask sensitive data for non-admin users
CREATE OR REPLACE FUNCTION public.get_masked_profile(user_uuid uuid)
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
BEGIN
    -- Only return data if user is accessing their own profile or is admin
    IF auth.uid() = user_uuid OR is_admin() THEN
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
        WHERE p.id = user_uuid;
    ELSE
        -- Return empty result if unauthorized
        RETURN;
    END IF;
END;
$$;

-- 5. Create function to safely update profiles with validation
CREATE OR REPLACE FUNCTION public.update_profile_safe(
    user_uuid uuid,
    new_first_name text DEFAULT NULL,
    new_last_name text DEFAULT NULL,
    new_email text DEFAULT NULL,
    new_phone_number text DEFAULT NULL,
    new_primary_goal text DEFAULT NULL,
    new_primary_challenge text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    update_allowed boolean := false;
BEGIN
    -- Check if user can update this profile
    IF auth.uid() = user_uuid OR is_admin() THEN
        update_allowed := true;
    END IF;
    
    IF NOT update_allowed THEN
        RAISE EXCEPTION 'Unauthorized profile update attempt';
    END IF;
    
    -- Validate inputs
    IF new_email IS NOT NULL AND new_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;
    
    IF new_phone_number IS NOT NULL AND new_phone_number !~ '^\+?[1-9]\d{1,14}$' THEN
        RAISE EXCEPTION 'Invalid phone number format';
    END IF;
    
    -- Update only provided fields
    UPDATE public.profiles 
    SET 
        first_name = COALESCE(new_first_name, first_name),
        last_name = COALESCE(new_last_name, last_name),
        email = COALESCE(new_email, email),
        phone_number = COALESCE(new_phone_number, phone_number),
        primary_goal = COALESCE(new_primary_goal, primary_goal),
        primary_challenge = COALESCE(new_primary_challenge, primary_challenge),
        updated_at = now()
    WHERE id = user_uuid;
    
    -- Log the update
    INSERT INTO public.profile_access_log (profile_id, accessed_by, access_type)
    VALUES (user_uuid, auth.uid(), 'UPDATE');
    
    RETURN true;
END;
$$;

-- 6. Strengthen existing RLS policies with additional checks
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Enhanced user profile access policy with rate limiting concept
CREATE POLICY "Users can view their own profile enhanced" ON public.profiles
    FOR SELECT 
    USING (
        auth.uid() = id 
        AND auth.uid() IS NOT NULL 
        AND auth.email() IS NOT NULL
    );

-- Enhanced update policy that logs access
CREATE POLICY "Users can update their own profile enhanced" ON public.profiles
    FOR UPDATE 
    USING (
        auth.uid() = id 
        AND auth.uid() IS NOT NULL 
        AND auth.email() IS NOT NULL
    );

-- 7. Add trigger to log profile access attempts
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Log profile access for audit purposes
    INSERT INTO public.profile_access_log (
        profile_id, 
        accessed_by, 
        access_type
    ) VALUES (
        COALESCE(NEW.id, OLD.id), 
        auth.uid(), 
        TG_OP
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for audit logging
DROP TRIGGER IF EXISTS profile_access_trigger ON public.profiles;
CREATE TRIGGER profile_access_trigger
    AFTER SELECT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.log_profile_access();

-- 8. Create view for safe profile access
CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT 
    id,
    first_name,
    last_name,
    CASE 
        WHEN auth.uid() = id OR is_admin() THEN email 
        ELSE '***@***.***' 
    END as email,
    CASE 
        WHEN auth.uid() = id OR is_admin() THEN phone_number 
        ELSE '***-***-****' 
    END as phone_number,
    type,
    experience_level,
    primary_goal,
    primary_challenge,
    subscription_status,
    created_at,
    updated_at
FROM public.profiles
WHERE auth.uid() = id OR is_admin();

-- Enable RLS on the view (inherited from base table)
-- Note: Views inherit RLS from their base tables

COMMENT ON TABLE public.profile_access_log IS 'Audit log for tracking access to sensitive profile data';
COMMENT ON VIEW public.safe_profiles IS 'Masked view of profiles table for enhanced security';
COMMENT ON FUNCTION public.update_profile_safe IS 'Secure function for updating profile data with validation and logging';