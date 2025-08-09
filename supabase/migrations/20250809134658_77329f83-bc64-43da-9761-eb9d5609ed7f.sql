-- TM-MIG-01: Graph-Ready MVP foundational schema (non-destructive)
-- AC1: Evolve public.profiles with new strategic columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'learner' CHECK (char_length(type) <= 50),
  ADD COLUMN IF NOT EXISTS experience_level TEXT CHECK (char_length(experience_level) <= 100),
  ADD COLUMN IF NOT EXISTS primary_goal TEXT CHECK (char_length(primary_goal) <= 255),
  ADD COLUMN IF NOT EXISTS primary_challenge TEXT CHECK (char_length(primary_challenge) <= 255);

-- AC2: Create public.skills (Skill node)
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  category TEXT CHECK (char_length(category) <= 100)
);

-- Enable RLS on skills and add policies (public read, admin manage)
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'skills' AND policyname = 'Anyone can view skills'
  ) THEN
    CREATE POLICY "Anyone can view skills"
      ON public.skills
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'skills' AND policyname = 'Only admins can insert skills'
  ) THEN
    CREATE POLICY "Only admins can insert skills"
      ON public.skills
      FOR INSERT
      WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'skills' AND policyname = 'Only admins can update skills'
  ) THEN
    CREATE POLICY "Only admins can update skills"
      ON public.skills
      FOR UPDATE
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'skills' AND policyname = 'Only admins can delete skills'
  ) THEN
    CREATE POLICY "Only admins can delete skills"
      ON public.skills
      FOR DELETE
      USING (is_admin());
  END IF;
END $$;

-- AC3: Create public.user_skills (User has Skill edge)
CREATE TABLE IF NOT EXISTS public.user_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_skills_unique UNIQUE (user_id, skill_id)
);

-- Helpful indexes for queries
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON public.user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON public.user_skills(skill_id);

-- Enable RLS on user_skills and add policies (users manage their rows, admins manage all)
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_skills' AND policyname = 'Admins can manage all user_skills'
  ) THEN
    CREATE POLICY "Admins can manage all user_skills"
      ON public.user_skills
      FOR ALL
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_skills' AND policyname = 'Users can view their own user_skills'
  ) THEN
    CREATE POLICY "Users can view their own user_skills"
      ON public.user_skills
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_skills' AND policyname = 'Users can insert their own user_skills'
  ) THEN
    CREATE POLICY "Users can insert their own user_skills"
      ON public.user_skills
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_skills' AND policyname = 'Users can update their own user_skills'
  ) THEN
    CREATE POLICY "Users can update their own user_skills"
      ON public.user_skills
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_skills' AND policyname = 'Users can delete their own user_skills'
  ) THEN
    CREATE POLICY "Users can delete their own user_skills"
      ON public.user_skills
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;