-- Setup script to create the first admin user
-- Run this after creating a user account through the normal registration process

-- Step 1: First, create a user account through your app's normal registration
-- Step 2: Find the user ID and update their profile to admin role

-- Example: Update a specific user to admin (replace with actual user ID)
-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE email = 'your-admin-email@example.com';

-- Or if you know the user ID:
-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE id = 'your-user-uuid-here';

-- Check current users who could be made admin:
SELECT 
    id, 
    email, 
    first_name, 
    last_name, 
    role,
    created_at 
FROM profiles 
ORDER BY created_at;

-- After running this query, copy the ID of the user you want to make admin
-- Then run: UPDATE profiles SET role = 'admin' WHERE id = 'USER_ID_HERE';