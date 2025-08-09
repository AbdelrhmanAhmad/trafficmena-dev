-- Security Bug Fix: Strengthen RLS policies for meetups table
-- Only admins should be able to create and modify meetups

-- Drop the current weak policies
DROP POLICY IF EXISTS "Authenticated users can insert meetups" ON public.meetups;
DROP POLICY IF EXISTS "Authenticated users can update meetups" ON public.meetups;

-- Create secure admin-only policies
CREATE POLICY "Only admins can insert meetups" 
  ON public.meetups 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update meetups" 
  ON public.meetups 
  FOR UPDATE 
  TO authenticated 
  USING (is_admin())
  WITH CHECK (is_admin());

-- Keep the existing public SELECT policy (anyone can view meetups)
-- "Anyone can view meetups" policy already exists and is correct

COMMENT ON POLICY "Only admins can insert meetups" ON public.meetups IS 'Security policy: Only admin users can create new meetups';
COMMENT ON POLICY "Only admins can update meetups" ON public.meetups IS 'Security policy: Only admin users can modify existing meetups';