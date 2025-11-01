# TrafficMENA Hub – MVP Critical Assessment

**Updated:** 17 October 2025  
**Assessment Lead:** Architecture & Security Working Group  
**Decision:** Conditional GO — proceed once remaining feature gaps are closed

---

## 🎯 Executive Summary

The migration to the single-stack Hono + Better Auth + Drizzle/PostgreSQL architecture is effectively complete:

- The React SPA now consumes `/api/auth/otp/*`, `/api/events`, `/api/library`, and `/api/users/me` directly.  
- All Supabase clients, services, and hooks have been removed; the runtime now depends exclusively on the Hono API surface.  
- Library, events, admin directory, and dashboard experiences are backed by the new API layer.  
- Invitation create/list (single + CSV) APIs are live, the admin UI reflects send/accept/activation states, and we ship public acceptance + activation endpoints that provision members and trigger OTP delivery. Bulk importer now respects quoted fields/headers and validates email addresses, eliminating phantom rows from custom messages.

What remains is polish and feature completion rather than foundational wiring. Acceptance still needs to mint Better Auth users, admin creation flows are intentionally paused, and the analytics dashboard was retired for MVP scope. Once those targeted fixes ship, we can move to production hardening and launch prep.

**Launch Readiness:** 80% — unblockers are product-level gaps, not structural debt.  
**Blocking Risks:** Invitation telemetry/analytics follow-up, admin CRUD parity, and final QA coverage.  
**Security Posture:** Secrets are server-side; no Plunk keys leak to the bundle. Remaining risk is ensuring invitation endpoints enforce rate limiting and auditing when they return.

---

## ✅ Progress Since Last Assessment

| Area | Prior State | Current Status |
| --- | --- | --- |
| Frontend data layer | SPA called Supabase RPCs and client SDKs | SPA now uses `src/app/api/*` fetchers against Hono exclusively |
| Events feature | Supabase services + duplicate descriptions | Uses `/api/events`; admin views are read-only while create/edit endpoints are scoped for later |
| Library feature | Supabase hooks & mutations | Hooks call `/api/library`; admin create/edit/delete live with shared BunnyCDN upload (20 MB cap) |
| RBAC | Admin-only guard | Tiered roles (owner/admin/manager/expert/member) enforced on API + SPA; managers limited to create/update |
| Dashboard metrics | Supabase analytics service | Legacy widgets removed; awaiting lightweight replacement metrics |
| Build dependencies | Bundled `@supabase/supabase-js` | Dependency removed from `package.json` / lockfile |

---

## 🔴 Remaining MVP Gaps

| Theme | Description | Status |
| --- | --- | --- |
| Invitations | Module slimmed to single-send + CSV upload (≤500 LOC). CSV parser hardened for quoted/custom-message rows; daily limit guardrail in place—keep manual fallback guidance visible. | **Low** |
| Admin CRUD | Event and library dashboards now ship create/edit/delete flows backed by Hono. Runbook: `docs/admin-content-workflow.md`. | ✅ Done |
| Analytics | Dashboard metric cards were tied to the Supabase analytics service. Decide whether to reintroduce lightweight stats via Hono or keep the cards hidden for MVP. | **High** |
| QA & Telemetry | No automated regression tests or runtime monitoring. Need smoke tests for auth → events → library loop plus basic logging/alerting. | **High** |
| Content Authoring | Unified upload endpoint powers events/library/editor; backlog: automate Bunny cleanup when assets are deleted. | **Medium** |
| Documentation | Architecture guides must emphasise the Hono/Drizzle workflow and remove Supabase references. | **Medium** |

---

## 🛠️ Required Actions Before Launch

1. **Invitation Service (Backend + SPA)**  
   - Monitor CSV usage and daily limit feedback; adjust thresholds or messaging as operators exercise the new flow.  
   - Keep manual fallback guidance front-and-center for operators.

2. **Admin CRUD Enablement**  
   - ✅ Dashboard create/edit/delete is live. Keep the runbook current and monitor operator feedback after the first few publishes.

3. **Dashboard Metrics Plan**  
   - Either ship `/api/admin/dashboard` stats with cached aggregates or remove the metric grid from the UI to avoid dead widgets.

4. **Test & Monitoring Baseline**  
   - Add one Cypress (or Playwright) happy-path test for sign-up → register for event → view library asset.  
   - Enable server request logging + error capture (e.g., pino + simple log shipping) on the VPS deployment checklist.

5. **Documentation Refresh**  
   - Keep MVP-FIX-PLAN.md, INVESTIGATION-RESULTS.md, warp-reviewed-plan.md, and AGENTS.md aligned with the invite progress, admin decisions, and QA plan.  
   - Remove remaining Supabase-era instructions so the repository can drop the legacy directories safely.

---

## ✅ Updated Exit Criteria

The MVP is "GO" once all conditions below are satisfied:

1. Invitations can be created and emailed through the Hono API, with success/failure feedback in the admin UI.
2. Admins manage events and library assets through the dashboard (documented in `docs/admin-content-workflow.md`).
3. Dashboard metrics are either powered by API data or removed from the experience.
4. Happy-path smoke test passes against a reset database, covering OTP login, event registration, and library consumption.
5. Operations checklist is complete: build, migrations, logs, backups, environment variables, and monitoring configured for the Hetzner VPS.

---

## ⚠️ Residual Risks & Mitigations

- **Invitation Deliverability:** Now that the API is public, ensure Plunk secrets remain server-side and monitor OTP delivery issues.  
- **Invitation Analytics Drift:** Activation timestamps exist; add alerts/reporting so ops spots stalled invites quickly.  
- **Operator QA:** Hold the team to the runbook so new events/assets ship with working links and rich descriptions; adjust the forms if recurring errors appear.  
- **Performance:** `/api/events` currently fetches all attendee counts in-process. Monitor load and add pagination/caching if traffic grows.

---

**Recommendation:** Focus sprint on invitation guardrails (monitor CSV/daily-limit feedback), admin workflow decisions, and dashboard clarity. With those items addressed the MVP can move straight into staging hardening and launch rehearsal.
