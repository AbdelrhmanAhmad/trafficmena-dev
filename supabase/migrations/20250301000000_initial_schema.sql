-- Legacy baseline migration replaced by 20240901000000_initial_schema.sql
-- Left intentionally blank to prevent duplicate object creation when applying migrations in order.
DO $$
BEGIN
  RAISE NOTICE 'Skipping legacy baseline migration (schema provided by 20240901000000_initial_schema.sql).';
END $$;
