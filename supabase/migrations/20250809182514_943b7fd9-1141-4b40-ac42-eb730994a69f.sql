-- Simplify profiles RLS policies to eliminate potential access loopholes
-- Drop all existing policies to start clean

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile enhanced" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile enhanced" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only authenticated users can access profiles" ON public.profiles;

-- Create simplified, secure policies with clear access rules

-- 1. Explicitly deny ALL anonymous access
CREATE POLICY "Block all anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- 2. Allow users to view only their own profile
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = id 
  AND auth.uid() IS NOT NULL 
  AND auth.email() IS NOT NULL
);

-- 3. Allow users to update only their own profile
CREATE POLICY "Users can update own profile only" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = id 
  AND auth.uid() IS NOT NULL 
  AND auth.email() IS NOT NULL
)
WITH CHECK (
  auth.uid() = id 
  AND auth.uid() IS NOT NULL 
  AND auth.email() IS NOT NULL
);

-- 4. Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  is_admin() 
  AND auth.uid() IS NOT NULL 
  AND auth.email() IS NOT NULL
);

-- 5. Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  is_admin() 
  AND auth.uid() IS NOT NULL 
  AND auth.email() IS NOT NULL
)
WITH CHECK (
  is_admin() 
  AND auth.uid() IS NOT NULL 
  AND auth.email() IS NOT NULL
);

-- 6. Prevent any direct INSERT operations (profiles created via trigger only)
CREATE POLICY "No direct profile creation" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (false);

-- 7. Prevent any DELETE operations (profiles deleted via cascade only)
CREATE POLICY "No profile deletion" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (false);