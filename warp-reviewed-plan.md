# TrafficMENA — Warp Reviewed Plan (Single-VPS Migration Recap)

**Date:** 17 October 2025  
**Owner:** Engineering (MVP)

---

## 0) Executive Summary

The migration from Supabase to a single-vendor stack (Hono + Better Auth + Drizzle/PostgreSQL 17.6) is complete:

- Local development uses the project-scoped Postgres instance with helper scripts (`db:start`, `db:reset`, etc.).  
- Drizzle migrations define the canonical schema; the Hono server exposes `/api/auth/otp/*`, `/api/events`, `/api/library`, `/api/users/me`.  
- The React SPA now speaks exclusively to those endpoints. Supabase clients, services, and the SDK have been removed, with legacy code archived for reference.  
- Invitations now support create/list (single + CSV) plus acceptance, and the bulk importer handles quoted/custom-message rows without generating phantom invites; admin CRUD decisions, dashboard metrics, and QA coverage remain the primary blockers to launch.

Architecture decisions stand: single Hetzner VPS (Ubuntu 22.04 + systemd + Caddy), Better Auth OTP, Plunk for email, and Hetzner block storage for library assets.

---

## 1) Ground Truth

- **Invitations RLS:** Historical Supabase policies were secure; `/api/invitations` now enforces auth via Hono middleware.  
- **Database baseline:** Drizzle migrations provide the clean start; Supabase migration drift now lives in `archive/legacy`.  
- **Navigation issues:** Resolved alongside the SPA rewrite.  
- **Library query gaps:** Addressed via `fetchLibraryAssets`; admin create/delete intentionally disabled pending endpoints.  
- **Email sending:** Invitation service uses the Plunk server client; acceptance currently marks invites and pre-fills onboarding.

---

## 2) Target Architecture (unchanged)

- **OS/Infra:** Hetzner VPS, Ubuntu 22.04 LTS, systemd-managed Hono server, Caddy for TLS + reverse proxy.  
- **Domains:** `app.trafficmena.com` (SPA), `api.trafficmena.com` (API), `staging.trafficmena.com` (pre-prod).  
- **Database:** PostgreSQL 17.6 with roles `trafficmena_admin` (migrations) and `trafficmena_app` (runtime).  
- **Auth:** Better Auth email OTP with rate limiting; Plunk handles email delivery from the server.  
- **Storage:** Hetzner block storage mounted at `/mnt/trafficmena-files/library` (max 50 MB per asset).

---

## 3) Current Backlog (MVP Scope)

1. **Invitations Activation Visibility**  
   - ✅ Invitation routes condensed (single + CSV); acceptance still exposes activation timestamps in the admin list.  
   - ✅ Bulk CSV parser hardened (quoted fields, headers, email validation) so custom messages do not create invalid rows.  
   - Keep CSV/bulk import documented as deferred scope with manual fallback instructions; monitor daily limit feedback post-launch.

2. **Admin CRUD Decision Matrix**  
   - Determine whether MVP must support event/library create/edit/delete.  
   - If yes, expose Hono endpoints and reconnect existing forms.  
   - If no, hide actions and document manual steps.

3. **Dashboard Metrics**  
   - Implement `/api/admin/metrics` returning simple counts, or remove the metric grid to avoid dead UI.

4. **Observability & QA**  
   - Add request/error logging (pino + rotation) on the Hono server.  
   - Ship a Playwright/Cypress smoke test for OTP login → event registration → library access.

5. **Deployment Runbook**  
   - Finalise systemd unit, Caddy config, environment variables, backup/restore procedures; capture in `DEPLOYMENT.md`.

---

## 4) Completed Work (Reference)

- Local Postgres + helper scripts, README-local-db.  
- Drizzle ORM configuration, migrations 0000–0002.  
- Better Auth OTP integration, Plunk server email verification.  
- Hono API endpoints for auth/events/library/users.  
- React SPA rewired to new API; Supabase dependency removed; legacy code archived under `archive/legacy`.

---

## 5) Launch Checklist Snapshot

| Area | Status |
| --- | --- |
| API stack | ✅ Hono deployed locally with healthy endpoints |
| Frontend integration | ✅ SPA uses `src/app/api` client |
| Supabase removal | ✅ SDK + services archived/removed |
| Invitations | ⚠️ Acceptance provisions users + logs activity; need onboarding completion signal |
| Admin CRUD | 🚧 Await scope decision + implementation |
| Dashboard metrics | 🚧 Provide replacement or remove |
| QA/Monitoring | 🚧 Smoke test + logging pending |

---

## 6) Communication Plan

- Daily stand-ups track invitation/API work until done.  
- Update this plan and AGENTS.md upon scope decisions.  
- Share deployment checklist with operations once invitations and admin decisions land.

---

**Next Milestone:** Surface invitation activation in admin, then re-evaluate production readiness alongside CRUD decision.
