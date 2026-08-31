---
module: security
tags: [dependencies, supply-chain, tm-015]
problem_type: best_practice
---

# TM-015 — Dependency remediation (phase2/security)

Targeted upgrades only; no `npm audit fix --force`. Server runtime audit goal: **0 vulnerabilities**.

## Server runtime (production)

| Package | Patched version | Notes |
|---------|-----------------|-------|
| `better-auth` | `1.6.22` | Minimum fix for GHSA-qq9h-g4jm-xgf3 (email-OTP pre-account hijacking). App uses OTP-only auth (no open email/password signup). |
| `hono` | `4.13.5` | Above vulnerable `<=4.12.33` range. |
| `@hono/node-server` | `1.19.17` | Above vulnerable `<=1.19.14` range; stayed on 1.x line. |
| `drizzle-orm` | `0.45.2` | GHSA-gpj5-g38j-94v9 SQL identifier escaping. No schema/migration changes. |
| `defu` (override) | `6.1.7` | Transitive via `better-auth`; prototype pollution fix. |

Hono 4.13+ types: `c.req.param()` is `string | undefined`. Route handlers that pass params directly to validators use non-null assertions where the route pattern guarantees the segment.

## Frontend runtime

| Package | Patched version | Notes |
|---------|-----------------|-------|
| `dompurify` | `3.4.14` | Dependency advisories through `3.4.12`. **TM-006 server-side sanitization remains deferred** before Activity Hub. |
| `react-router-dom` | `6.30.6` | Pulls `@remix-run/router@1.23.4` (fixes GHSA-2j2x-hqr9-3h42). |
| `brace-expansion` (override) | `2.1.4` | Transitive via `tailwindcss` → `glob` → `minimatch`. |

## Deferred (documented in local TM-015 report)

- **React Router 7.x** advisories (GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg): fix requires `react-router-dom@7.18.3+` — **ACCEPTED until W6 (TanStack Start)**.
- **Root dev/build toolchain** (vite, vitest, postcss, minimatch, etc.): dev-only; patch in dedicated tooling pass.
- **Root full audit** may still list server packages duplicated in frontend lock analysis context — **server `--omit=dev` audit is the production gate**.
