-- Ensure app role can access newly created tables
-- Assumes app role name matches server/.env PGUSER (default: trafficmena_app)

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE promo_codes TO trafficmena_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO trafficmena_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO trafficmena_app;
