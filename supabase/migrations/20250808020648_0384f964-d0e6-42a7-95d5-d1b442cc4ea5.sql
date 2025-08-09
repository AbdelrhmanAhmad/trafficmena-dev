-- Migration: 0001_fk_integrity.sql
-- Purpose: Enforce FK integrity for meetups and related tables; enable admin deletes on meetups

-- 1) Clean up orphaned references before adding FKs
UPDATE public.library_assets la
SET meetup_id = NULL
WHERE la.meetup_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.meetups m WHERE m.id = la.meetup_id
  );

DELETE FROM public.meetup_attendees ma
WHERE NOT EXISTS (
  SELECT 1 FROM public.meetups m WHERE m.id = ma.meetup_id
);

-- 2) Helpful indexes on child FK columns
CREATE INDEX IF NOT EXISTS idx_meetup_attendees_meetup_id
  ON public.meetup_attendees(meetup_id);

CREATE INDEX IF NOT EXISTS idx_library_assets_meetup_id
  ON public.library_assets(meetup_id);

-- 3) Add foreign key constraints
ALTER TABLE public.meetup_attendees
  ADD CONSTRAINT fk_meetup_attendees_meetup
  FOREIGN KEY (meetup_id)
  REFERENCES public.meetups(id)
  ON DELETE CASCADE;

ALTER TABLE public.library_assets
  ADD CONSTRAINT fk_library_assets_meetup
  FOREIGN KEY (meetup_id)
  REFERENCES public.meetups(id)
  ON DELETE SET NULL;

-- 4) RLS: allow admins to delete meetups so cascades can occur
-- (RLS already enabled on meetups.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'meetups' AND policyname = 'Only admins can delete meetups'
  ) THEN
    CREATE POLICY "Only admins can delete meetups"
    ON public.meetups
    FOR DELETE
    USING (public.is_admin());
  END IF;
END $$;