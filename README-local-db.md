# Local Postgres (Project-Scoped)

This repository uses a project-scoped PostgreSQL 17 instance for local development (no Docker).
Everything lives under `local/postgres/` and is ignored by git.

Data and logs
- Data directory: `local/postgres/data`
- Logs directory: `local/postgres/logs`
- Main log file: `local/postgres/logs/server.log`

Managing the database
- Start: `npm run db:start`
- Stop: `npm run db:stop`
- Status: `npm run db:status`
- PSQL (as app user): `npm run db:psql`
- Reset DB (prompts): `npm run db:reset`
- Health check: `npm run db:health`

Applying migrations
- From the repo root: ensure `server/.env` is configured, then run `npm --prefix server run db:migrate`.
- Run pending migrations before starting a newer API build that depends on schema changes.
- For the manual track enrollment rollout, see `docs/runbooks/track-enrollment-0015-migration.md`.

Connection details (local dev)
- Host: `127.0.0.1`
- Port: `5433`
- SSL: disabled
- App user: `trafficmena_app`
- Admin user: `trafficmena_admin`
- App database: `trafficmena_dev`

Environment variables (server/.env)
- Example is in `server/.env.example` (does not contain secrets)
- Create `server/.env` with your local values (already generated on this machine)
- Required vars:
  - PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE, PGSSLMODE
  - DATABASE_URL (postgres URL matching the above)

Troubleshooting
- Server won’t start, locale error: we run with `LC_ALL=C`. If you start manually, export `LC_ALL=C`.
- Can’t connect over TCP: check `pg_hba.conf` and ensure 127.0.0.1:5433 is `md5` and you’re using the right password.
- See detailed logs in `local/postgres/logs/server.log`.

Notes
- This local instance is isolated to this repository and should not interfere with other projects.
- Do not commit `.env` files. `.env.example` documents required variables.
