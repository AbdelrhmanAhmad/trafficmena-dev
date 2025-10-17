-- Test Infrastructure Script
-- Run this to verify all critical components are in place

-- 1. Check if profile trigger exists
SELECT
    'Profile Trigger' as component,
    EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
    ) as exists;

-- 2. Check if user_activities table exists
SELECT
    'user_activities Table' as component,
    EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'user_activities'
    ) as exists;

-- 3. Check if asset_views table exists
SELECT
    'asset_views Table' as component,
    EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'asset_views'
    ) as exists;

-- 4. Check if profiles have been backfilled
SELECT
    'Profiles Backfilled' as component,
    COUNT(*) > 0 as exists
FROM public.profiles;

-- 5. Check if at least one admin exists
SELECT
    'Admin User Exists' as component,
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE role = 'admin'
    ) as exists;

-- 6. List all admin users
SELECT
    id,
    email,
    role,
    user_type,
    created_at
FROM public.profiles
WHERE role = 'admin';

-- 7. Count profiles vs auth users (should match)
SELECT
    'Auth Users' as user_type,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT
    'Profiles' as user_type,
    COUNT(*) as count
FROM public.profiles;