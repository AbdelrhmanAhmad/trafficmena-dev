---
module: security
tags: [deployment, staging, migration-0033, tm-022, tm-010]
problem_type: best_practice
---

# Phase 2 security branch — staging/production deploy prerequisites

Branch: `phase2/security`

## Before merging to main

1. Review deferred owner items (TM-001 credentials/history).
2. Confirm Activity Hub is not launched until TM-006 server-side sanitization ships.

## Required env changes (production API)

| Variable | Requirement |
|----------|-------------|
| `NODE_ENV` | `production` on live API hosts (not `test` on staging VPS) |
| `DB_SSL` | **`true`** — server refuses boot when `NODE_ENV=production` and `DB_SSL` is not true |
| `TRUST_PROXY` | **`true`** when API sits behind nginx/Cloudflare and should honor `CF-Connecting-IP` / `X-Forwarded-For` |
| `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, Fawaterk v3 creds | Already enforced fail-fast in production |

### Staging impact

- If staging VPS runs `NODE_ENV=production` **without** `DB_SSL=true`, the next deploy of `phase2/security` will **fail at startup** until `DB_SSL=true` is set.
- Staging with `NODE_ENV=development` (or unset) is unaffected by the DB_SSL gate.
- Recommended: set staging to `NODE_ENV=production`, `DB_SSL=true`, `TRUST_PROXY=true` when behind reverse proxy, and use `FAWATERK_ENV=staging` for payment sandbox.

## Migration 0033 — email change current verification

File: `server/drizzle/0033_email_change_current_verification.sql`

**Must be applied before** running code that depends on `current_email_verified_at` (TM-022 two-phase email change).

### Deploy order

1. **DB backup** (staging/prod)
2. **Apply migration 0033** (`npm --prefix server run db:migrate` on target environment)
3. **Deploy application code** from `phase2/security` (or post-merge main)
4. **Restart API** (PM2/systemd)
5. **Smoke tests**
   - OTP login
   - Email change: current-email OTP → new-email OTP
   - Invitation accept/activate (no privileged auto-session)

Migration 0033 is additive (`current_email_verified_at` column). Old code ignores the column; new code requires it for the updated email-change flow.

## Post-deploy checks

- `GET /api/health` → `{ ok: true }`
- `GET /db/health` → `{ ok: true }` or generic `{ ok: false, error: "database_unavailable" }` (no raw PG text)
- Server runtime `npm audit --omit=dev` → 0 (from TM-015)
