# ⚒️ TrafficMENA Hub – MVP Fix Plan (Updated 17 Oct 2025)

**Owner:** Engineering Team  
**Goal:** Ship the MVP on the new Hono + Better Auth + Drizzle stack without Supabase dependencies.

---

## 1. Executive Snapshot

- ✅ SPA now talks exclusively to the Hono API (`/api/auth/otp/*`, `/api/events`, `/api/library`, `/api/users/me`).
- ✅ Legacy Supabase hooks/services removed; `@supabase/supabase-js` eliminated from dependencies.
- ✅ Events and library views (member + admin read scenarios) are API-driven; admin invitations screen now lists live send/accept status.
- ✅ Invitation create/list APIs (single + CSV) plus `/api/invitations/:token/(accept|activate)` ship, provisioning Better Auth users, firing OTP automatically, and reflecting activation in the admin UI. Bulk CSV importer now respects quoted fields/headers and validates emails to prevent phantom rows from custom messages.
- 🚧 Outstanding: admin CRUD parity, dashboard metrics decision, smoke-test coverage, and production logging.

**Launch Target:** Immediately after the remaining feature and QA tasks reach "done" (estimated 3–4 focused engineering days).

---

## 2. Critical Path Checklist

| Priority | Item | Owner | Notes |
| --- | --- | --- | --- |
| 🟢 | Simplify invitation flow (single + CSV) | Backend/Frontend | Single-send + CSV upload live; admin UI documents daily limit + manual fallback |
| ✅ | Admin CRUD path locked to manual seeding | Product/Eng | MVP keeps event/library creation manual; UI now points to CLI instructions below |
| 🟠 | Provide lightweight dashboard metrics or remove cards | Product/Eng | Metrics grid hidden for MVP; backlog `/api/admin/metrics` to reinstate cards |
| 🟠 | Add end-to-end smoke test (signup → register → library) | QA/Frontend | Playwright/Cypress acceptable; run in CI |
| 🟠 | Enable request/error logging on Hono server | Backend | pino + stdout rotation for Hetzner deployment |
| 🟢 | Admin CRUD workflow live | Product/Eng | Dashboard create/edit/delete shipped; runbook in `docs/admin-content-workflow.md` |
| 🟢 | Update documentation & runbooks | Eng Enablement | Sync INVESTIGATION-RESULTS, warp-reviewed-plan, AGENTS, README-local-db |

---

## 3. Execution Phases

### Phase A – Invitations (1 day)
- ✅ Invitation module trimmed to <500 lines with single send + CSV upload endpoints.
- ✅ Admin dashboard updated with simple stats, CSV instructions, and daily limit messaging.
- ✅ Bulk CSV parser hardened (quoted fields, optional headers, email validation) so custom messages no longer create invalid invite rows.
- ➡️ Monitor daily limit feedback and adjust thresholds if operators hit the guardrail.

### Phase B – Admin Workflow Decision (0.5 day)
- ✅ Decision: keep creation flows in the SPA now that the Hono endpoints are live.  
- Admins can add/edit/delete events and assets directly; fallback SQL snippets live in the runbook for emergencies.

### Operational Runbook – Events & Library (MVP)
- Primary workflow documented in `docs/admin-content-workflow.md` (prep checklist, form guidance, QA steps).
- If storage URLs or records need manual repair, retain the SQL snippets in the docs as a break-glass option.

### Phase C – Dashboard & QA (1 day)
- ✅ Metrics grid hidden (Oct 2025) to avoid stale numbers; follow-up ticket adds `/api/admin/metrics` with cached counts once data demand confirmed.  
- 🟡 Smoke test plan locked (see below); implementation pending.  
- ➡️ Add server logging & basic error boundary telemetry.

**Smoke test prep**
- Tooling: Playwright with seeded invite + library asset fixtures.  
- Flow: OTP login → accept invitation → register for an event → verify registration via `/api/events/:id` → stream linked library asset.  
- Environment: run against local Postgres using `npm run db:reset` followed by manual seeding steps from _Manual Ops_.

### Phase D – Launch Readiness (1 day)
- Run smoke test on a fresh database (`npm run db:reset && npm run dev:server`).  
- Apply latest Drizzle migrations (`npm --prefix server run db:migrate`) so the invitation activation columns (`0002_invitation_activation`) are live.  
- Prepare deployment checklist: environment variables, systemd unit, Caddy config, backup schedule.  
- Update docs (this plan, investigation, warp review, AGENTS) with the final architecture snapshot.  
- Final stakeholder review & sign-off.

---

## 4. Resolved Items (History)

- Local Postgres 17.6 cluster scripts (`db:start`, `db:reset`, etc.).
- Drizzle migrations + Better Auth OTP integration verified.
- Hono `/api/events`, `/api/library`, `/api/users/me` shipped.
- React hooks (`useEvents`, `useLibrary`, admin screens) rewired to the API.
- Supabase dependency removed; repository code now targets the Hono API exclusively.
- Admin invitations experience simplified (single invite + CSV upload); acceptance endpoint provisions members and dispatches OTP automatically.
- Invitation bulk uploader now handles quoted/custom-message rows correctly and surfaces per-line validation errors.
- Admin dashboard now surfaces lightweight stats and CSV guidance without the legacy telemetry stack.

---

## 5. Risks & Mitigations

- **Invitation deliverability:** Monitor Plunk failures (now logged) and alert on repeated bounces.  
- **Admin CRUD deferral:** If we defer create/edit, ensure operations team has SQL/Drizzle scripts and guardrails.  
- **Test debt:** Lock in smoke test now to prevent regressions once we re-enable invitation automation.  
- **Performance:** `/api/events` currently fetches 200 items max; revisit pagination for admin view after launch.

---

## 6. Communication

- Stand-ups focus on the checklist above until complete.  
- Update this plan and AGENTS.md immediately after any scope decision.  
- Record deployment steps in `README-local-db.md` / new `DEPLOYMENT.md` once produced.

---

**Next milestone:** Finish Phase A & B, then re-evaluate launch window with stakeholders.
