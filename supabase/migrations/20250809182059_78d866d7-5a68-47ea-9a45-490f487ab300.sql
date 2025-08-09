-- Add explicit policy to deny anonymous access to profiles table
-- This ensures that only authenticated users can access profile data

CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Add explicit policy to only allow authenticated users basic access
-- This creates a clear security boundary
CREATE POLICY "Only authenticated users can access profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Users can only see their own profiles OR admin can see all
  (auth.uid() = id AND auth.uid() IS NOT NULL AND auth.email() IS NOT NULL) 
  OR is_admin()
);