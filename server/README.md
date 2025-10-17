# TrafficMENA Server (Hono + Better Auth skeleton)

This directory contains a minimal Hono server scaffold to support the migration away from Supabase. It exposes placeholder endpoints for mailer operations and a health check.

## Commands

- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`

## Endpoints

- `GET /health` → `{ ok: true }`
- `POST /api/mailer/send-invitation` → 501 Not Implemented (server-side Plunk integration to be added)
- `POST /api/mailer/create-contact` → 501 Not Implemented

## Database setup

1) Create database and roles (example)

```sql
-- As postgres superuser locally, or your managed admin role
CREATE DATABASE trafficmena;
CREATE ROLE trafficmena_admin LOGIN PASSWORD 'CHANGEME';
CREATE ROLE trafficmena_app LOGIN PASSWORD 'CHANGEME';
GRANT ALL PRIVILEGES ON DATABASE trafficmena TO trafficmena_admin;
```

2) Apply initial schema

```bash
psql "$DATABASE_URL" -f migrations/001_init.sql
```

3) Configure server environment

- DATABASE_URL=postgresql://trafficmena_admin:CHANGEME@localhost:5432/trafficmena
- DB_SSL=false (or true with proper settings on managed DB)

---

## Next steps

- Implement server-side Plunk integration using environment variables (server-only).
- Add Better Auth (email OTP) handlers for:
  - `POST /auth/otp/request`
  - `POST /auth/otp/verify`
  - `GET /auth/session`
  - `POST /auth/logout`
- Connect to PostgreSQL 17.6 and wire minimal models for users/profiles.
- Add rate limiting and CSRF protection on state-changing routes.
