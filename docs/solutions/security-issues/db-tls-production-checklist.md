---
module: security
tags: [database, tls, infrastructure, tm-010]
problem_type: best_practice
---

# TM-010 — Database TLS in production

## Code gate (enforced)

`server/src/config/env.ts` fails fast in production when `DB_SSL` is not `true`.

## Infrastructure checklist (owner / DevOps)

1. Set `DB_SSL=true` in production `server/.env`.
2. Ensure Postgres accepts SSL connections (provider dashboard or `postgresql.conf`).
3. Configure CA verification:
   - Preferred: mount provider CA bundle and set `NODE_EXTRA_CA_CERTS=/path/to/ca.pem`, then update `server/src/db/client.ts` to use `rejectUnauthorized: true` when a CA is available.
   - Current default when `DB_SSL=true`: `rejectUnauthorized: false` (encrypted transport, weaker MITM resistance).
4. Verify from the app host: `psql "$DATABASE_URL?sslmode=require"` or provider health check.
5. Rotate credentials separately under TM-001 owner action if history exposure is a concern.

## Staging

Staging may use `DB_SSL=false` for local/project Postgres. Do not use `NODE_ENV=test` as a staging marker — use `FAWATERK_ENV=staging` for payment sandbox.
