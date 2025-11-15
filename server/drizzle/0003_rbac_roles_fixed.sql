-- RBAC Roles Migration - Fixed Version
-- This migration completes the RBAC implementation by ensuring all roles exist
-- and setting the correct default value for new profiles

-- Note: The enum already has all required values (owner, admin, manager, expert, user)
-- This migration ensures the profiles table has the correct default value

-- Set the default role to 'user' for new profiles
ALTER TABLE "public"."profiles" ALTER COLUMN "role" SET DEFAULT 'user';
