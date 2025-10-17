-- TrafficMENA Hub consolidated baseline schema (supersedes prior scattered migrations)
-- Ensures a clean reset can be applied in any environment without manual SQL patches.

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMERATIONS (create only if missing to preserve existing values)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typtype = 'e'
  ) THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'user');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_type' AND typtype = 'e'
  ) THEN
    CREATE TYPE public.user_type AS ENUM ('learner', 'expert');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'event_type' AND typtype = 'e'
  ) THEN
    CREATE TYPE public.event_type AS ENUM ('Event', 'Meetup', 'Mastermind', 'Retreat');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'invitation_status' AND typtype = 'e'
  ) THEN
    CREATE TYPE public.invitation_status AS ENUM ('pending', 'sent', 'accepted', 'expired', 'failed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'invitation_source' AND typtype = 'e'
  ) THEN
    CREATE TYPE public.invitation_source AS ENUM ('single', 'csv');
  END IF;
END $$;

-- ============================================================================
-- UTILITY & ROLE FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('manager', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_expert()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND user_type = 'expert'
  );
$$;

-- ============================================================================
-- TABLES & TRIGGERS (idempotent definitions)
-- ============================================================================
-- Profiles -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  phone_number TEXT,
  role public.user_role NOT NULL DEFAULT 'user',
  user_type public.user_type NOT NULL DEFAULT 'learner',
  experience_level TEXT,
  primary_goal TEXT,
  primary_challenge TEXT,
  subscription_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS user_type public.user_type NOT NULL DEFAULT 'learner',
  ADD COLUMN IF NOT EXISTS experience_level TEXT,
  ADD COLUMN IF NOT EXISTS primary_goal TEXT,
  ADD COLUMN IF NOT EXISTS primary_challenge TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS onboarding_completed,
  DROP COLUMN IF EXISTS bio,
  DROP COLUMN IF EXISTS company,
  DROP COLUMN IF EXISTS job_role,
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS industry,
  DROP COLUMN IF EXISTS years_experience,
  DROP COLUMN IF EXISTS linkedin_url,
  DROP COLUMN IF EXISTS twitter_url,
  DROP COLUMN IF EXISTS facebook_url,
  DROP COLUMN IF EXISTS instagram_url,
  DROP COLUMN IF EXISTS skills_completed,
  DROP COLUMN IF EXISTS social_completed;

ALTER TABLE public.profiles
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Events ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_description TEXT,
  date TIMESTAMPTZ NOT NULL,
  location TEXT,
  max_attendees INTEGER,
  meeting_link TEXT,
  image_url TEXT,
  tags TEXT[],
  event_type public.event_type NOT NULL DEFAULT 'Event',
  guest_experts JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_description TEXT,
  ADD COLUMN IF NOT EXISTS guest_experts JSONB,
  ADD COLUMN IF NOT EXISTS event_type public.event_type NOT NULL DEFAULT 'Event',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
DROP TRIGGER IF EXISTS trg_events_updated_at ON public.events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Event attendees ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON public.event_attendees(user_id);

-- Library assets -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.library_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_type TEXT NOT NULL,
  file_url TEXT,
  video_url TEXT,
  document_url TEXT,
  embed_url TEXT,
  embed_type TEXT,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.library_assets
  ADD COLUMN IF NOT EXISTS embed_type TEXT,
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_library_assets_event ON public.library_assets(event_id);
DROP TRIGGER IF EXISTS trg_library_assets_updated_at ON public.library_assets;
CREATE TRIGGER trg_library_assets_updated_at
  BEFORE UPDATE ON public.library_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Skills ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_skills_updated_at ON public.skills;
CREATE TRIGGER trg_skills_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- User skills ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_skills (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, skill_id)
);

ALTER TABLE public.user_skills
  ADD COLUMN IF NOT EXISTS proficiency_level TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Invitations ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  token TEXT NOT NULL UNIQUE,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  source public.invitation_source NOT NULL DEFAULT 'single',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  custom_message TEXT,
  expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS source public.invitation_source NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS custom_message TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
DROP TRIGGER IF EXISTS trg_invitations_updated_at ON public.invitations;
CREATE TRIGGER trg_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- User activities ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON public.user_activities(activity_type);

-- Asset views ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.library_assets(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_duration INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_asset_views_user_id ON public.asset_views(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_views_asset_id ON public.asset_views(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_views_viewed_at ON public.asset_views(viewed_at);

-- ============================================================================
-- ROW LEVEL SECURITY & POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_views ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (is_admin());
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Events
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
DROP POLICY IF EXISTS "Managers can manage events" ON public.events;
DROP POLICY IF EXISTS "Managers can update events" ON public.events;
DROP POLICY IF EXISTS "Managers can delete events" ON public.events;
CREATE POLICY "Anyone can view events"
  ON public.events
  FOR SELECT
  USING (TRUE);
CREATE POLICY "Managers can manage events"
  ON public.events
  FOR INSERT
  WITH CHECK (is_manager());
CREATE POLICY "Managers can update events"
  ON public.events
  FOR UPDATE
  USING (is_manager())
  WITH CHECK (is_manager());
CREATE POLICY "Managers can delete events"
  ON public.events
  FOR DELETE
  USING (is_manager());

-- Event attendees
DROP POLICY IF EXISTS "Users can view own registrations" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can register for events" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can cancel their registrations" ON public.event_attendees;
CREATE POLICY "Users can view own registrations"
  ON public.event_attendees
  FOR SELECT
  USING (auth.uid() = user_id OR is_manager());
CREATE POLICY "Users can register for events"
  ON public.event_attendees
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel their registrations"
  ON public.event_attendees
  FOR DELETE
  USING (auth.uid() = user_id OR is_manager());

-- Library assets
DROP POLICY IF EXISTS "Anyone can view library assets" ON public.library_assets;
DROP POLICY IF EXISTS "Managers can manage library assets" ON public.library_assets;
DROP POLICY IF EXISTS "Managers can update library assets" ON public.library_assets;
DROP POLICY IF EXISTS "Managers can delete library assets" ON public.library_assets;
CREATE POLICY "Anyone can view library assets"
  ON public.library_assets
  FOR SELECT
  USING (TRUE);
CREATE POLICY "Managers can manage library assets"
  ON public.library_assets
  FOR INSERT
  WITH CHECK (is_manager());
CREATE POLICY "Managers can update library assets"
  ON public.library_assets
  FOR UPDATE
  USING (is_manager())
  WITH CHECK (is_manager());
CREATE POLICY "Managers can delete library assets"
  ON public.library_assets
  FOR DELETE
  USING (is_manager());

-- Skills
DROP POLICY IF EXISTS "Managers can manage skills" ON public.skills;
DROP POLICY IF EXISTS "Users can view skills" ON public.skills;
CREATE POLICY "Managers can manage skills"
  ON public.skills
  FOR ALL
  USING (is_manager())
  WITH CHECK (is_manager());
CREATE POLICY "Users can view skills"
  ON public.skills
  FOR SELECT
  USING (TRUE);

-- User skills
DROP POLICY IF EXISTS "Users can view own skills" ON public.user_skills;
DROP POLICY IF EXISTS "Users can manage own skills" ON public.user_skills;
DROP POLICY IF EXISTS "Users can update own skills" ON public.user_skills;
DROP POLICY IF EXISTS "Users can delete own skills" ON public.user_skills;
CREATE POLICY "Users can view own skills"
  ON public.user_skills
  FOR SELECT
  USING (auth.uid() = user_id OR is_manager());
CREATE POLICY "Users can manage own skills"
  ON public.user_skills
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own skills"
  ON public.user_skills
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own skills"
  ON public.user_skills
  FOR DELETE
  USING (auth.uid() = user_id OR is_manager());

-- Invitations
DROP POLICY IF EXISTS "Managers can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Creators can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Managers can view invitations" ON public.invitations;
CREATE POLICY "Managers can manage invitations"
  ON public.invitations
  FOR ALL
  USING (is_manager())
  WITH CHECK (is_manager());
CREATE POLICY "Creators can view invitations"
  ON public.invitations
  FOR SELECT
  USING (created_by = auth.uid());
CREATE POLICY "Managers can view invitations"
  ON public.invitations
  FOR SELECT
  USING (is_manager());

-- User activities
DROP POLICY IF EXISTS "Users can view own activities" ON public.user_activities;
DROP POLICY IF EXISTS "System can log user activities" ON public.user_activities;
CREATE POLICY "Users can view own activities"
  ON public.user_activities
  FOR SELECT
  USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "System can log user activities"
  ON public.user_activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Asset views
DROP POLICY IF EXISTS "Users can view own asset views" ON public.asset_views;
DROP POLICY IF EXISTS "Users can log their own views" ON public.asset_views;
CREATE POLICY "Users can view own asset views"
  ON public.asset_views
  FOR SELECT
  USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can log their own views"
  ON public.asset_views
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- APPLICATION FUNCTIONS (idempotent definitions)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.change_user_role(target_user_id uuid, new_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF new_role NOT IN ('admin', 'manager', 'user') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  UPDATE public.profiles
  SET role = new_role::public.user_role,
      updated_at = NOW()
  WHERE id = target_user_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.change_user_type(target_user_id uuid, new_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF new_type NOT IN ('learner', 'expert') THEN
    RAISE EXCEPTION 'Invalid type: %', new_type;
  END IF;

  UPDATE public.profiles
  SET user_type = new_type::public.user_type,
      updated_at = NOW()
  WHERE id = target_user_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_safe_profile_data(target_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone_number text,
  role text,
  user_type text,
  experience_level text,
  primary_goal text,
  primary_challenge text,
  subscription_status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  query_user_id uuid;
  show_sensitive BOOLEAN;
BEGIN
  query_user_id := COALESCE(target_user_id, auth.uid());
  show_sensitive := auth.uid() = query_user_id OR is_admin();

  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    CASE WHEN show_sensitive THEN p.email ELSE '***@***.***' END,
    CASE WHEN show_sensitive THEN p.phone_number ELSE '***-***-****' END,
    p.role::text,
    p.user_type::text,
    p.experience_level,
    p.primary_goal,
    p.primary_challenge,
    p.subscription_status,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = query_user_id;
END;
$$;

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
BEGIN
  IF auth.uid() <> user_uuid AND NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized profile update';
  END IF;

  IF new_email IS NOT NULL AND new_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  IF new_phone_number IS NOT NULL AND new_phone_number !~ '^\+?[0-9]{7,15}$' THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;

  UPDATE public.profiles
  SET
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    email = COALESCE(new_email, email),
    phone_number = COALESCE(new_phone_number, phone_number),
    primary_goal = COALESCE(new_primary_goal, primary_goal),
    primary_challenge = COALESCE(new_primary_challenge, primary_challenge),
    updated_at = NOW()
  WHERE id = user_uuid;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invitation_row public.invitations%ROWTYPE;
BEGIN
  SELECT *
  INTO invitation_row
  FROM public.invitations
  WHERE token = invitation_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invitation not found');
  END IF;

  IF invitation_row.expires_at IS NOT NULL AND invitation_row.expires_at < NOW() THEN
    UPDATE public.invitations
    SET status = 'expired', updated_at = NOW()
    WHERE id = invitation_row.id;

    RETURN jsonb_build_object('success', FALSE, 'error', 'Invitation expired');
  END IF;

  IF invitation_row.status = 'accepted' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invitation already accepted');
  END IF;

  UPDATE public.invitations
  SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
  WHERE id = invitation_row.id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  temp_count INT;
  deleted_counts jsonb := jsonb_build_object();
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Administrators cannot delete themselves';
  END IF;

  DELETE FROM public.user_skills WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('user_skills', temp_count);

  DELETE FROM public.event_attendees WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('event_attendees', temp_count);

  DELETE FROM public.invitations WHERE created_by = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('invitations', temp_count);

  DELETE FROM public.user_activities WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('user_activities', temp_count);

  DELETE FROM public.asset_views WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('asset_views', temp_count);

  DELETE FROM public.profiles WHERE id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('profiles', temp_count);

  RETURN jsonb_build_object('success', TRUE, 'deleted', deleted_counts);
END;
$$;

-- ============================================================================
-- PROFILE CREATION TRIGGER & BACKFILL
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    phone_number,
    role,
    user_type,
    experience_level,
    primary_goal,
    primary_challenge,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'phone_number',
    'user'::public.user_role,
    'learner'::public.user_type,
    NEW.raw_user_meta_data->>'experience_level',
    NEW.raw_user_meta_data->>'primary_goal',
    NEW.raw_user_meta_data->>'primary_challenge',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (
  id,
  email,
  role,
  user_type,
  created_at,
  updated_at
)
SELECT
  au.id,
  au.email,
  'user'::public.user_role,
  'learner'::public.user_type,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Ensure at least one admin exists (first profile becomes admin)
DO $$
BEGIN
  UPDATE public.profiles
  SET role = 'admin'::public.user_role
  WHERE id = (
    SELECT id
    FROM public.profiles
    ORDER BY created_at ASC
    LIMIT 1
  );
END $$;

-- ============================================================================
-- STORAGE POLICIES FOR LIBRARY FILES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('library-files', 'library-files', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can read library files" ON storage.objects;
DROP POLICY IF EXISTS "Managers can upload library files" ON storage.objects;
DROP POLICY IF EXISTS "Managers can update library files" ON storage.objects;
DROP POLICY IF EXISTS "Managers can delete library files" ON storage.objects;

CREATE POLICY "Anyone can read library files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'library-files');

CREATE POLICY "Managers can upload library files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'library-files'
    AND is_manager()
  );

CREATE POLICY "Managers can update library files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'library-files'
    AND is_manager()
  )
  WITH CHECK (
    bucket_id = 'library-files'
    AND is_manager()
  );

CREATE POLICY "Managers can delete library files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'library-files'
    AND is_manager()
  );

-- ============================================================================
-- FINAL VERIFICATION NOTICE (non-blocking)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TrafficMENA Hub baseline schema applied successfully.';
END $$;
