-- Superseded by 20240901000000_initial_schema.sql which already drops onboarding columns
-- and aligns helper functions. This file is retained as a no-op to keep migration history.
DO $$
BEGIN
  RAISE NOTICE 'Skipping legacy onboarding cleanup (handled by consolidated baseline).';
END $$;
