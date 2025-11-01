# WARP.md

This repository now runs entirely on the Hono + Better Auth + Drizzle stack. All Supabase-era code and archive directories have been removed, so any historical references you encounter in older tickets or documents are informational only. Use this guide (together with `AGENTS.md`) when collaborating on the TrafficMENA Hub MVP.

---

## Platform Snapshot

- **Frontend:** React 18.3, TypeScript 5.5, Vite 5, Shadcn/Radix UI, Tailwind 3.4, TanStack Query 5, TipTap 3  
- **Backend:** Hono (Node 20) with Better Auth email OTP, Drizzle ORM + PostgreSQL 17.6, Plunk for email delivery  
- **Deployment Target:** Single Hetzner VPS (Ubuntu 22.04) using systemd + Caddy (see `warp-reviewed-plan.md`)  
- **Local Tooling:** Project-scoped Postgres scripts in `local/postgres/bin`, Ultracite (Biome) for lint/format, path alias `@/`

Core user loop remains: **Signup → Browse Events → Register → Access Library**. Everything else is secondary for the MVP.

---

## Active Feature Modules

| Module | Status | Notes |
| --- | --- | --- |
| Events | ✅ Complete | CRUD surfaced via dashboard, public pages query `/api/events` |
| Invitations | ✅ Complete | Single + CSV flows powered by `/api/invitations`; monitor daily cap feedback |
| Knowledge Library | 🔄 60% | Listing/reading live; create/delete API stubs return friendly errors |
| Users | 📋 80% | Service layer complete; UI polish and onboarding telemetry still pending |
| Admin Dashboard | 📋 70% | CRUD flows available; analytics cards hidden until replacement metrics ship |
| Security | ✅ | OTP rate limiting, audit trails, CSP, sanitisation all in place |

Removed for MVP scope: products/commerce and subscriptions.

---

## Service Boundaries

- **Frontend data access:** Use the helpers in `src/app/api/*` (`fetchJson`, typed fetchers). Do not reintroduce Supabase clients.  
- **Auth & Sessions:** Better Auth handles session cookies via `/api/auth/otp/*`. OTP send/verify must continue to call the API with `credentials: 'include'`.  
- **Database:** All schema changes flow through Drizzle SQL migrations in `server/migrations` (generated via Drizzle Kit).  
- **Uploads:** `POST /api/uploads` proxies files (<=20 MB) to BunnyCDN using credentials from `server/.env` (legacy `/api/uploads/image` remains as an alias).

---

## Local Development Checklist

```bash
npm install                     # Install frontend dependencies
npm --prefix server install     # Install API dependencies
npm run db:start                # Start local Postgres (project scope)
npm --prefix server run db:migrate   # Apply Drizzle migrations
npm run dev                     # Frontend dev server (Vite)
npm --prefix server run dev     # API dev server (tsx + dotenv)
```

Useful scripts:
- `npm run db:reset` — recreate the local Postgres instance with a clean schema  
- `npm --prefix server run build` — type-check & compile the API  
- `npm run lint` / `npm run format` — Ultracite lint + format

---

## Environment Variables

Use `server/.env.example` as the canonical reference. Key values:

```bash
PGHOST=127.0.0.1
PGPORT=5433
PGUSER=trafficmena_app
PGPASSWORD=your_local_password
PGDATABASE=trafficmena_dev
BETTER_AUTH_SECRET=generate_a_32_char_secret
BETTER_AUTH_ISSUER=http://localhost:3001
CORS_ORIGIN=http://localhost:5173
PLUNK_API_KEY=your_plunk_key
BUNNY_STORAGE_ZONE=trafficmena
BUNNY_STORAGE_ACCESS_KEY=storage_password
BUNNY_STORAGE_CDN_URL=https://trafficmena.b-cdn.net
```

Frontend currently reads API URLs from `/api` (same origin). Add `VITE_API_BASE` only if you deploy the SPA on a different domain.

---

## Security & Observability To‑Dos

1. Add a Playwright or Cypress smoke test that covers OTP login → event registration → library access.  
2. Wire structured request/error logging on the Hono server (pino + log rotation).  
3. Decide on lightweight dashboard metrics (`/api/admin/metrics`) or permanently remove the cards.  
4. Rotate any secrets that previously relied on the placeholder Better Auth secret.

---

## Cleanup Guidance

- Legacy Supabase folders (`archive/**`, `supabase/**`, `src/shared/integrations/supabase/**`) can be deleted after validating this document and `AGENTS.md`. No runtime paths depend on them.  
- Generated artefacts (`dist/**`, `server/dist/**`, `local/postgres/logs/**`, `server/server.log`) may be removed and regenerated as needed.  
- Keep documentation under `docs/` and the MVP status files (`AGENTS.md`, `INVESTIGATION-RESULTS.md`, `MVP-CRITICAL-ASSESSMENT.md`, `MVP-FIX-PLAN.md`, `warp-reviewed-plan.md`) in sync with future changes.

---

## Quick Reference

- API routes registered in `server/src/routes/api/index.ts`  
- Frontend data hooks under `src/app/api/` and `src/features/**/hooks`  
- Admin runbook: `docs/admin-content-workflow.md`  
- Deployment plan: `warp-reviewed-plan.md`

If you encounter an instruction that references Supabase CLI commands, `archive/legacy`, or `supabase/migrations`, treat it as historical and remove/replace it with the Drizzle workflow.*** End Patch
