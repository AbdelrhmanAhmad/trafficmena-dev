-- Superseded by 20240901000000_initial_schema.sql
-- This migration is kept as a no-op so historical migration chains remain intact.
DO $$
BEGIN
  RAISE NOTICE 'Skipping legacy critical infrastructure fix (handled by consolidated baseline).';
END $$;
