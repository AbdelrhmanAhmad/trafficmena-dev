-- Create a security definer function to check if current user is admin
-- This prevents RLS recursion issues
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add admin policies for meetup_attendees table
CREATE POLICY "Admins can view all meetup attendees"
ON public.meetup_attendees
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can manage all meetup attendees"
ON public.meetup_attendees
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());