
-- Update the user profile to have admin role
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'hosnyabdelrahman1@gmail.com'
);

-- If no profile exists yet, we'll insert one (this handles the case where the user signed up but no profile was created)
INSERT INTO public.profiles (id, role)
SELECT id, 'admin'
FROM auth.users 
WHERE email = 'hosnyabdelrahman1@gmail.com'
AND id NOT IN (SELECT id FROM public.profiles);
