-- Comprehensive RLS policies for profile_access_log table to prevent unauthorized access

-- 1. Explicitly deny all anonymous access to audit logs
CREATE POLICY "Deny all anonymous access to audit logs" 
ON public.profile_access_log 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- 2. Only allow system functions to insert audit logs (no direct user inserts)
CREATE POLICY "System only can insert audit logs" 
ON public.profile_access_log 
FOR INSERT 
TO authenticated
WITH CHECK (false); -- This prevents any authenticated user from inserting directly

-- 3. Prevent any user updates to audit logs (maintain integrity)
CREATE POLICY "No user updates to audit logs" 
ON public.profile_access_log 
FOR UPDATE 
TO authenticated
USING (false)
WITH CHECK (false);

-- 4. Prevent any user deletions of audit logs (maintain integrity)
CREATE POLICY "No user deletions of audit logs" 
ON public.profile_access_log 
FOR DELETE 
TO authenticated
USING (false);

-- 5. Update the existing SELECT policy to be more explicit and secure
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.profile_access_log;

CREATE POLICY "Only verified admins can view audit logs" 
ON public.profile_access_log 
FOR SELECT 
TO authenticated
USING (
  -- Only allow access if user is authenticated AND is admin
  auth.uid() IS NOT NULL 
  AND auth.email() IS NOT NULL 
  AND is_admin()
);