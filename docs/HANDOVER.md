# TrafficMENA Hub — Tech Lead Handover

A synthesis of the C4 architecture documentation (`docs/c4/`) condensed into the context a senior full-stack engineer needs to own this codebase. Source of truth is the C4 body; cross-references are included where deeper detail lives.

---

## 1. Executive Summary

TrafficMENA Hub is a production digital-marketing education platform for the MENA region. It lets practitioners discover expert-led events, buy bundled course tracks, consume a premium knowledge library, and access 23 standalone marketing/finance calculators. Operations staff manage the full content catalog, invitations, promo codes, grants, and platform settings from a protected admin console.

The product loop is narrow and well-defined: **Signup → Browse Events/Tracks → Register/Pay → Access Library**. Commerce runs through Fawaterk (Fawry, Meeza, Aman, Masary, Mobile Wallet), authentication is email OTP only, and the same codebase serves public visitors, authenticated learners, subject-matter experts, content managers, admins, and platform owners through a five-tier RBAC.

The stack is deliberately minimal:

| Layer | Technology |
|---|---|
| Browser SPA | React 18, Vite 7, React Router 6, TanStack Query 5, Tailwind 3, shadcn/ui, Radix, TipTap 3 |
| API service | Node.js 20, Hono 4, Better Auth 1, Drizzle ORM, Zod |
| Database | PostgreSQL 17 (UUID primary keys, Drizzle-managed migrations) |
| External services | Fawaterk, Plunk, BunnyCDN, Cloudflare Turnstile, Google Tag Manager |

Top-level documents to read alongside this file: [c4-context.md](./c4/c4-context.md), [c4-container.md](./c4/c4-container.md), [c4-component.md](./c4/c4-component.md).

---

## 2. System Context

### 2.1 Personas

| Persona | Type | Primary use |
|---|---|---|
| **Learner** | Human | Attends events, books tracks, consumes library, sees premium gate if not entitled. |
| **Expert** | Human | Co-hosts events and contributes educational assets. |
| **Content Manager** | Human (staff) | CRUD for events, tracks, series, library, promo codes; manages attendees and manual track enrollments; can read subscription settings. |
| **Administrator** | Human (staff) | Everything Content Manager can do, plus user management, invitation campaigns, dashboard metrics, cancellation approvals, platform settings, subscription and series grants. |
| **Platform Owner** | Human (staff) | Full system control including owner-level accounts. |
| **Fawaterk** | Programmatic | Posts HMAC-verified webhooks when invoice state changes. |
| **Plunk** | Programmatic | Receives API calls to deliver OTP and invitation emails. |
| **BunnyCDN** | Programmatic | Receives uploaded files and serves media directly to browsers. |
| **Google Tag Manager** | Programmatic | Receives `dataLayer` pushes from the SPA; no server-side coupling. |

### 2.2 External Systems and Purpose

- **PostgreSQL** — single source of truth for all platform state (users, content, commerce, operations). Accessed only by the API service via Drizzle ORM.
- **Fawaterk** — payment gateway for invoice creation, status polling, and inbound HMAC-verified webhooks. Supports five payment methods; configurable between `staging` and `live`.
- **Plunk** — transactional email for OTP codes and invitation messages.
- **BunnyCDN** — object storage plus CDN. API uploads files (max 20 MB), browsers load media directly from CDN URLs returned in API responses.
- **Cloudflare Turnstile** — optional bot-protection CAPTCHA used on OTP request endpoints during high-traffic windows; browser issues a token, server validates server-side.
- **Google Tag Manager** — container ID `GTM-5DMGVFZS`, bootstrapped by the self-hosted `public/gtm-bootstrap.js`. All analytics events leave the platform only through the learner's browser; the server never calls GTM or third-party analytics providers.

### 2.3 Core User Journeys (canonical)

1. **New User Signup** — invitation email → acceptance → multi-step wizard → activation → dashboard. Alternate open-OTP path exists but is toggleable from platform settings.
2. **Event Registration** — browse → detail → register (free) or checkout (paid) → Fawaterk → HMAC webhook → atomic fulfillment → success page.
3. **Track Booking** — track detail → `POST /api/tracks/:id/book` → 72-hour capacity hold + Fawaterk invoice → webhook → CTE-based atomic fulfillment across all constituent events.
4. **Library Access** — learner hits premium asset → access resolves as `subscriber OR track-booking holder OR series-grant holder OR staff OR non-premium`. Without access, the shared `PremiumContentGate` surface renders. The public subscription purchase flow is currently hidden behind owner/admin role gates; admins provision access via single/revoke/bulk-CSV grants.
5. **Admin Content Management** — create events/tracks/series/library assets (with TipTap editor and BunnyCDN uploads), build tracks by attaching events, manage promo codes, issue grants, manually enroll users in tracks with an off-platform reference, and monitor the admin metrics overview.
6. **Analytics Tracking** (cross-cutting) — GTM bootstrap on first paint, typed events pushed to `window.dataLayer` from `src/lib/analytics/`, enriched purchase payload read from the paid-payment response and pushed as a single `purchase` event.

Detailed walkthroughs are in [c4-context.md §User Journeys](./c4/c4-context.md).

---

## 3. Container Architecture

The system is a three-container topology with no Docker or IaC in-repo — deployment is described via runtime scripts and environment expectations.

```
[ Visitor / Learner / Staff browser ]
          │ HTTPS
          ▼
┌──────────────────────────────┐     ┌───────────────────────────────┐
│  TrafficMENA Web Application │ ◄──►│  TrafficMENA API Service      │
│  React 18 SPA (static build) │ API │  Node.js 20 + Hono (long-run) │
└──────────────────────────────┘     └───────────────────────────────┘
          │                                  │
          │ direct HTTPS                     │ SQL (Drizzle, pg pool)
          ▼                                  ▼
       BunnyCDN media                   PostgreSQL 17
       GTM (dataLayer)                  (managed in prod, local in dev)
                                             │
                                             ├─► Fawaterk (invoice + HMAC webhook)
                                             ├─► Plunk     (OTP + invitation emails)
                                             ├─► BunnyCDN  (file upload)
                                             └─► Turnstile (CAPTCHA validation)
```

### 3.1 TrafficMENA Web Application

Pure static SPA. `npm run build` produces `dist/`. In development, Vite serves on `http://localhost:8080` and proxies `/api` → `http://localhost:3001`. Delivers three experience layers:

- **Public / Visitor** — marketing pages, event listings, signin/OTP flow.
- **Member / Learner** — dashboard, event detail + registration, track detail + booking, library, series, payment result pages.
- **Staff** — protected `/admin/*` tree for content CRUD, user management, invitations, promo codes, manual track enrollment, subscription/series grants, metrics, and settings.

All API traffic flows through `src/app/api/client.ts::fetchJson()`, which auto-attaches the CSRF header from the `better-auth.csrf-token` cookie and sets `credentials: 'include'`. TanStack Query keys are session-scoped via `src/app/queryKeys.ts` — caches are isolated per account and cleared across logout/switch. GTM is bootstrapped from `public/gtm-bootstrap.js`; analytics modules in `src/lib/analytics/` are the only surface that writes to `window.dataLayer`.

### 3.2 TrafficMENA API Service

Long-running Hono process. Compiled with `npm --prefix server run build` → `server/dist/`, started with `node dist/index.js`, listens on `3001`. Zod validates the environment at startup. Responsibilities:

- **Security envelope** — CSP (with GTM hardening), HSTS (prod only), CORS allowlist, CSRF middleware on every `/api/*` route, 20 MB request cap, request timing, structured error envelope.
- **Authentication** — Better Auth with OTP plugin + invite-session plugin. OTP delivery via Plunk. Rate limits: normal 3/10 min and 10/day; event mode 15/10 min and 50/day. Turnstile optional.
- **Authorization** — five-level RBAC, enforced per-endpoint via `requireAdmin()` and `requireManager()` helpers (`server/src/routes/api/utils.ts`).
- **Domain APIs** — events, tracks, series, library, uploads, settings, admin metrics, payments, promo codes, subscriptions, subscription/series grants, manual track enrollments, skills, invitations.
- **Background jobs** — payment expiration and reconciliation, started at boot.

### 3.3 TrafficMENA PostgreSQL Database

Drizzle-managed schema, UUID primary keys, SSL required in production (`DB_SSL=true`). Local dev uses project-scoped scripts under `local/postgres/bin/` on port `5433` — no Docker. Migrations run via `npm --prefix server run db:migrate`.

See [c4-container.md](./c4/c4-container.md) for the full endpoint catalog, env vars, and infrastructure notes.

---

## 4. Frontend Architecture

The SPA decomposes into five sub-components (see [c4-component.md](./c4/c4-component.md)):

### 4.1 Web Experience Platform — the shell

Owns the SPA bootstrap, route tree, providers (QueryClient, Auth, Theme, Toasts), shared UI primitives (shadcn/Radix), TipTap editor tooling, the shared `PremiumContentGate`, the auth-scoped query-key factory, and the typed analytics layer.

Key interfaces:

- `fetchJson<T>(input, init?)` and `getCsrfHeaders()` in `src/app/api/client.ts`.
- `ApiError(message, status, code?, extra?)` for normalized error handling.
- `src/app/queryKeys.ts::authScopedKey(session, …parts)` — the canonical way to namespace cached data by session identity.
- `src/lib/analytics/` — `gtm.pushToDataLayer`, `events.*`, `helpers.*`, `signup.*`, `contentDiscovery.*`, `calendar.*`, `libraryContent.*`, `profile.*`, `paymentFlow.*`, `usePageTracking`. Every analytics call routes through the single `pushToDataLayer` function, which is wrapped in try/catch so instrumentation never breaks the UI.

See [c4-component-web-experience-platform.md](./c4/components/c4-component-web-experience-platform.md) and [c4-code-src-lib-analytics.md](./c4/code/c4-code-src-lib-analytics.md).

### 4.2 Learning Experiences UI

Learner-facing feature modules for events, tracks, library, and series. Exposes hook families (`useEvents`, `useEventBooking`, `useTracks`, `useTrackBooking`, `useTrackAttendees`, `useLibrary`, `useSeries`, `useSeriesGrants`). The track-booking path feeds `src/features/tracks/trackBookingAnalytics.ts` so free auto-bookings and paid bookings emit identical dataLayer shapes. Premium library assets and premium series render `PremiumContentGate` when the viewer lacks access.

### 4.3 Membership and Checkout UI

Shared payment widgets (`PaymentCheckoutDialog`, `PaymentMethodSelector`, `PromoCodeInput`, `PriceDisplayCard`) used by paid event and track journeys, plus the payment result screens (`/payment/success|failed|pending`). The success screen reads enriched purchase analytics from the paid-payment response and pushes a single `purchase` event to the dataLayer.

The subscription landing surface (`/subscribe`, `/dashboard/subscribe`) is currently gated behind `owner`/`admin` roles via `AdminProtectedRoute` in `src/App.tsx`. The landing components are preserved but the learner-facing purchase flow is hidden; subscriptions are provisioned via admin grants. Re-opening the surface is a routing change, not a components change.

### 4.4 Admin Operations Console

Protected `/admin/*` route tree. Owns staff-facing forms, grant managers, and the operations widgets:

- `AdminEventForm`, `TrackForm`, `SeriesForm`, `LibraryAssetForm`, `SubscriptionSettingsCard`
- `TrackManualEnrollmentManager` (`src/features/tracks/components/`) + `useTrackEnrollmentManagement` hook + `manualEnrollmentAmount` utility
- `SubscriptionGrantManager` (single + revoke + bulk CSV)
- `SeriesAccessManager` / `SeriesGrantManager` (single + revoke + bulk CSV)

### 4.5 Calculators Experience

Twenty-plus self-contained calculators (ROAS, MER, CAC, LTV, and more) plus shared feedback/clipboard helpers. No API dependency at runtime. Instrumentation hooks in `src/features/calculators/analytics.tsx` and `analytics-shared.ts` push calculator usage events through the shared dataLayer layer.

---

## 5. Backend Architecture

The API service decomposes into five components, all mounted behind the secure middleware stack.

### 5.1 API Runtime and Platform Security

Hono bootstrap. Owns `createApp()`, `registerHealthRoutes`, `registerApiRoutes`, the middleware stack (CSP, CORS, HSTS, CSRF, timing, 20 MB payload limit), and the structured error envelope (`{ "error": { "code": "...", "message": "..." } }`).

CSP is explicitly hardened for GTM: `script-src` permits `googletagmanager.com` and `tagmanager.google.com`; `connect-src` includes `*.google-analytics.com` and `*.analytics.google.com`; `frame-src` permits `www.googletagmanager.com`. The `public/gtm-bootstrap.js` file is self-hosted so `unsafe-inline` is not required. A regression test (`tests/unit/gtm-csp-hardening.test.ts`) locks this in.

Health endpoints: `GET /`, `GET /health`, `GET /api/health`, `GET /db/health`.

### 5.2 Identity, Invitations, and Member Operations API

Route files: `auth.ts`, `users.ts`, `users-list.ts`, `users-phone.ts`, `skills.ts`, `invitations.ts`, `invitations-list.ts`, plus `server/src/auth/` Better Auth configuration and the `inviteSession` plugin.

Endpoint groups:

| Group | Notable endpoints |
|---|---|
| Auth | `POST /api/auth/otp/request` (rate-limited; optional Turnstile), `POST /api/auth/otp/verify`, `GET /api/auth/session`, `POST /api/auth/logout` |
| Users | `GET /api/users` (manager+, paginated), `GET/PUT /api/users/me`, `PUT/DELETE /api/users/{id}` (admin+) |
| Skills | `GET /api/skills`, `POST /api/skills` (admin), `GET/POST/DELETE /api/user/skills[/:skillId]` |
| Invitations | `GET /api/invitations`, `GET /api/invitations/stats`, `POST /api/invitations/single`, `POST /api/invitations/bulk` (daily limit `INVITATION_DAILY_LIMIT`), `POST /api/invitations/accept`, `POST /api/invitations/activate` |

External dependencies: Plunk (OTP + invitations), Cloudflare Turnstile (CAPTCHA validation).

### 5.3 Learning Content and Delivery API

Route files: `events.ts`, `tracks.ts`, `series.ts`, `seriesGrants.ts`, `seriesGrantsBulk.ts`, `seriesGrantsCsv.ts`, `seriesAccess.ts`, `library.ts`, `uploads.ts`, `settings.ts`, `adminMetrics.ts`, `adminMetricsUtils.ts`, `trackSeriesPublishing.ts`.

Endpoint groups (all CSRF-protected for mutations):

| Group | Notable endpoints |
|---|---|
| Events | Public list/detail, manager+ CRUD, admin delete, manager+ attendees list, user register/cancel, admin cancellation-request review (approve/reject) |
| Tracks | Public list/detail (`/api/tracks/public`, `/api/tracks/{id}/public`), manager CRUD, admin delete, attach/detach events, reorder events, `POST /api/tracks/{id}/book` for users |
| Series | CRUD parallel to tracks, asset list/add/remove/reorder, manager-level series grants with bulk CSV |
| Library | List with subscription access control, detail, manager create, admin delete |
| Settings | `GET /api/settings/public`, `GET/PATCH /api/admin/settings/general` (admin) |
| Uploads | `POST /api/uploads` (≤20 MB), `POST /api/uploads/image` — stored in BunnyCDN, CDN URLs returned |
| Admin metrics | `GET /api/admin/metrics/overview` (admin) — consolidated users, subscriptions, paid-sales counters |

Access resolution for library/series is centralized in `seriesAccess.ts` via `resolveSeriesAccess` and `resolveSeriesAssetAccess`. Access is true if the viewer is staff, subscriber, has a track booking, has a series grant, or the series/asset is not premium and the asset is either public, has no linked event, or its linked event is owned by the viewer.

### 5.4 Payments, Pricing, and Revenue Operations API

Route files: `payments.ts`, `paymentAnalytics.ts`, `paymentAnalyticsHelpers.ts`, `promoCodes.ts`, `subscriptions.ts`, `subscriptionShared.ts`, `subscriptionsGrants.ts`, `subscriptionsGrantsBulk.ts`, `subscriptionsGrantsCsv.ts`, `subscriptionsGrantUtils.ts`, `trackEnrollments.ts`, `trackBookingShared.ts`, `trackPaidStatus.ts`, `jsonPayload.ts`.

Endpoint groups:

| Group | Notable endpoints |
|---|---|
| Payments | `GET /api/payments/methods`, `POST /api/payments/checkout` (rate-limited), `POST /api/payments/verify`, `GET /api/payments/price-preview`, `GET /api/payments/{id}` (paid responses enriched with verified purchase analytics), `POST /api/payments/webhook`, `POST /api/payments/webhook_json` (HMAC-verified, public) |
| Promo codes | Manager+ CRUD with soft-delete, usage counts, time windows |
| Subscriptions | `GET /api/subscriptions/current`, `GET /api/subscriptions/settings` (manager), `PUT /api/subscriptions/settings` (admin), `GET /api/subscriptions/info` (public, 60/min IP-limited) |
| Subscription grants | `POST /api/subscriptions/grants`, `/grants/revoke`, `/grants/bulk` (admin) |
| Series grants | `GET/POST/.../revoke /api/series/{id}/grants`, `POST /api/series/grants/bulk` |
| Manual track enrollment | `POST /api/tracks/{id}/manual-enrollments` (manager+, rate-limited 40/min per actor), `POST /api/tracks/{id}/enrollments/{userId}/revoke` — both reuse the CTE-based atomic booking transaction via `trackBookingShared.ts` |

Payment analytics enrichment (`paymentAnalyticsHelpers.ts::buildVerifiedPaymentAnalytics`) is best-effort: if enrichment queries fail, the payment record still returns — verification is never blocked by analytics.

### 5.5 Persistence and Background Operations

Drizzle ORM + `node-postgres` connection pool. Owns schema (`server/src/db/schema/index.ts`), migration history (`server/drizzle/*.sql`), connection lifecycle (`db`, `connectionPool`, `closeDb()`), and background jobs:

- `startPaymentExpirationJob()` — expires stale pending payments and releases reservations.
- `startPaymentReconciliationJob()` — reconciles invoices against Fawaterk state.

Maintenance scripts under `server/scripts/`:

- `tsx reconcile-unpaid-payments.ts [--apply] [--since=<ISO>] [--limit=<n>]`
- `psql -f backfill_series_published.sql`
- `psql -f backfill_series_premium_paid_tracks.sql`
- `psql -f seed_events.sql`

### 5.6 Local Development and Regression Tooling

Project-scoped Postgres lifecycle scripts (`npm run db:start|stop|status|reset|psql`) and a Node `--test` regression suite under `tests/unit/` covering auth, invitation, grant, payment, booking, analytics, and CSP flows.

---

## 6. Data Model

The schema lives in `server/src/db/schema/index.ts`; migration SQL in `server/drizzle/`. UUID primary keys everywhere; `created_at`/`updated_at` conventions used on most tables.

Table groups:

| Group | Tables |
|---|---|
| Auth / Identity | `users`, `profiles`, `session`, `verification` (Better Auth–managed), `user_skills`, `skills` |
| Content catalog | `events`, `tracks`, `trackEvents`, `series`, `seriesAssets`, `libraryAssets` |
| Registrations & access | `eventAttendees`, `eventReservations`, `trackBookings`, `trackReservations`, `seriesGrants`, `subscriptionGrants` |
| Commerce | `payments`, `subscriptions`, `promoCodes` |
| Operations | `invitations`, `platformSettings` |

Key invariants:

- **Reservation lifecycle** — 72-hour TTL on `eventReservations` and `trackReservations` holds capacity while a payment is pending. Expiration releases the hold.
- **Atomic booking** — `trackBookingShared.ts` uses a CTE-based transaction so capacity, constituent-event grants, and downstream series access mutate as a single unit. The same write path is used by paid bookings, free auto-bookings, and manual enrollments.
- **Premium flags** — `series.is_premium` and `libraryAssets.is_premium` are resolved alongside subscription, track-booking, and series-grant state. See [c4-code-server-drizzle.md](./c4/code/c4-code-server-drizzle.md) for ordered migration history including premium flag additions and integrity-enforcement DDL.
- **Soft-deletes** — `promoCodes` uses soft-delete; most other deletes are hard.

---

## 7. Commerce and Access Flows (Deep Dive)

### 7.1 Paid Checkout

1. Frontend calls `GET /api/payments/price-preview` with item type/ID, optional promo code, and derives the effective price (subscriber discount + promo code).
2. Frontend calls `POST /api/payments/checkout` with the chosen payment method (from `GET /api/payments/methods`).
3. Server creates a capacity reservation (72-hour TTL) and a Fawaterk hosted invoice, persists a `payments` row in `pending` state, and returns the invoice URL.
4. User completes payment on the Fawaterk-hosted flow.
5. Fawaterk delivers an HMAC-verified webhook (`/api/payments/webhook` form-encoded or `/api/payments/webhook_json`). The server verifies the signature, resolves invoice state, and fulfills atomically:
   - Event: insert `eventAttendees`, release reservation.
   - Track: CTE-based transaction grants all constituent events, release reservations.
   - Subscription: insert `subscriptions` row with `endsAt = now + 1 year`.
6. `GET /api/payments/{id}` or `POST /api/payments/verify` returns the paid record, enriched with `itemName`, `itemCategory`, `paymentMethod`, `promoCode`, `originalAmountCents`, `discountAppliedCents`, and a customer-type classification (new vs. returning, subscription vs. non-subscription). The frontend pushes this as the GA4-shaped `purchase` dataLayer event.
7. The background `startPaymentExpirationJob` periodically expires stale `pending` payments and releases reservations.

### 7.2 Subscriber Economics

- Annual subscription price is configurable via `platformSettings.annualSubscriptionPriceCents`.
- Subscriber discount percent (1–99, default 20) applies to offline events and track bundles.
- Online events are free for active subscribers.
- Public benefits listing is served by `GET /api/subscriptions/info`, rate-limited to 60 req/min per IP.
- The learner-facing purchase surface (`/subscribe`, `/dashboard/subscribe`) is currently gated behind `owner`/`admin`. Subscription access is provisioned through admin grants.

### 7.3 Access Grants

Three grant surfaces complement paid flows for cases where staff need to provision access outside of a purchase:

- **Subscription grants** — `POST /api/subscriptions/grants`, `/grants/revoke`, `/grants/bulk` (admin+). Single, revoke, or CSV bulk ingestion with per-row results.
- **Series grants** — `POST /api/series/{id}/grants`, `.../revoke`, `POST /api/series/grants/bulk` (manager+). Per-series access records for premium series.
- **Manual track enrollment** — `POST /api/tracks/{id}/manual-enrollments` + `/enrollments/{userId}/revoke` (manager+, 40 req/min per actor). Records a reason + external reference + optional `amountPaidCents`; uses the same atomic booking write path as paid bookings so all downstream access is consistent.

### 7.4 Refunds

`DELETE /api/events/{id}/register` opens a cancellation request. Admins review via `GET /api/events/{id}/cancellation-requests` and resolve via `.../approve` or `.../reject`. Refund execution itself is tracked in the payments record; Fawaterk settlement is handled manually per the operational runbook.

---

## 8. Authentication, Authorization, and Security Envelope

### 8.1 Authentication

- Better Auth 1.x with the OTP plugin and a custom `inviteSession` plugin (`server/src/auth/plugins/`).
- OTP delivery via Plunk. Session cookies are set on `POST /api/auth/otp/verify`, valid 7 days, updated every 24 hours.
- Rate limits:
  - Normal mode: 3 OTPs/10 min, 10 OTPs/day per email or IP.
  - Event mode: 15 OTPs/10 min, 50 OTPs/day — toggled via `platformSettings`.
- Turnstile optional per environment (`TURNSTILE_SECRET_KEY`). When enabled, the frontend submits a token and the server validates it server-side during OTP request.
- Invite-only mode is a toggle: when enabled, open OTP signup is rejected and only invitation-accept flows can create members.

### 8.2 Authorization (RBAC)

Role hierarchy (ascending):

```
user < expert < manager < admin < owner
 0       1        2        3       4
```

Enforcement helpers in `server/src/routes/api/utils.ts`:

- `requireAdmin(c)` — returns `{ response }` 403/401 or the authenticated user context.
- `requireManager(c)` — same pattern for manager+.
- `escapeLikePattern(input)` — sanitizer for all `LIKE` searches.

Role is stored on `profiles.role`, normalized to lowercase. The frontend mirrors the RBAC via `src/shared/hooks/custom/useRolePermissions.ts` for UI gating; guards are not trusted — every backend endpoint re-checks.

### 8.3 Security Envelope

- **CSRF** — middleware applied to all `/api/*` routes. The browser client (`src/app/api/client.ts`) auto-extracts the token from the `better-auth.csrf-token` cookie and sends it as `x-csrf-token`. Webhooks are exempt (HMAC-verified instead).
- **CSP** — tightly scoped; GTM origins are explicitly whitelisted. `unsafe-inline` is not used for scripts; the GTM bootstrap is self-hosted.
- **CORS** — allowlist driven by `CORS_ORIGIN` (comma-separated).
- **HSTS** — enabled in production.
- **Payload limits** — 20 MB cap enforced by `MAX_JSON_PAYLOAD_BYTES` and the uploads route.
- **Validation** — Zod at every API boundary.
- **Sanitization** — DOMPurify for user-generated HTML stored for later rendering.
- **Secrets** — `BETTER_AUTH_SECRET` (≥32 chars), `INVITE_SESSION_SECRET` (≥16 chars in production), `FAWATERK_API_KEY`, `PLUNK_API_KEY`, `BUNNY_STORAGE_ACCESS_KEY`, `TURNSTILE_SECRET_KEY` — all server-side only, Zod-validated on startup.
- **Rate limiting** — `server/src/services/rateLimiter.ts` is in-memory. Per-endpoint limits include OTP, payment checkout, public subscription info (60/min per IP), and manual track enrollment (40/min per actor). The store is instance-local — multi-instance production deployments would require a shared store.

---

## 9. Analytics Architecture

All analytics leave the platform only through the browser. There is no outbound HTTP from the server to GTM or GA; the server's only role is to enrich paid-payment responses with purchase metadata.

### 9.1 Client-side

- **GTM bootstrap** — `index.html` loads `public/gtm-bootstrap.js` on first paint; the script initializes `GTM-5DMGVFZS` and the noscript iframe fallback.
- **Single push point** — `src/lib/analytics/gtm.ts::pushToDataLayer(data)` wraps `window.dataLayer.push` in a try/catch; every tracking call routes through it.
- **Typed event modules** — auth (`events.ts`), signup (`signup.ts`), content discovery (`contentDiscovery.ts`), calendar (`calendar.ts`), library (`libraryContent.ts`), profile (`profile.ts`), payment flow (`paymentFlow.ts`), and the shared `usePageTracking` hook mounted near the router root.
- **Helpers** — `helpers.ts` normalizes payment methods, derives page type, classifies customer type, and builds the cross-page `global_variables` snapshot pushed before each `page_view`.
- **Feature wiring** — `src/features/tracks/trackBookingAnalytics.ts` (paid and free bookings emit the same `track_booking` shape); `src/features/calculators/analytics.tsx` + `analytics-shared.ts` (calculator usage).

### 9.2 Server-side enrichment

`paymentAnalyticsHelpers.ts::buildVerifiedPaymentAnalytics` composes a GA4-compatible payload from a paid `payments` row: item name, item category, payment method, promo code, original/discounted amounts, and `priorPaidPurchases` / `priorNonSubscriptionPurchases` counters that drive the customer-type classification. `paymentAnalytics.ts::loadVerifiedPaymentAnalytics` reads item metadata from `events`, `tracks`, or defaults for subscriptions. Enrichment is best-effort.

### 9.3 Regression guarantees

- `tests/unit/analytics-helpers.test.ts` — normalization + classification.
- `tests/unit/analytics-instrumentation.test.ts` — dataLayer shape fidelity.
- `tests/unit/gtm-csp-hardening.test.ts` — self-hosted bootstrap + no `unsafe-inline`.

Source-of-truth for the event catalog lives in `docs/events-tracking-data-model.md` and the companion spreadsheet.

---

## 10. Operations and Runtime

### 10.1 Environment

Server `.env` is validated by Zod on startup. Required variables (see `server/.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` / `DATABASE_ADMIN_URL` | Connection strings |
| `DB_SSL` | Enable SSL (prod) |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_ISSUER` | Session signing + issuer URL (must be HTTPS in prod) |
| `APP_BASE_URL`, `CORS_ORIGIN` | Frontend origin(s) |
| `PLUNK_API_KEY` | OTP + invitations |
| `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_ACCESS_KEY`, `BUNNY_STORAGE_CDN_URL` | Upload + CDN |
| `FAWATERK_API_KEY`, `FAWATERK_ENV` | Payment gateway |
| `API_BASE_URL` | Webhook callback URL (optional) |
| `TURNSTILE_SECRET_KEY` | CAPTCHA (optional) |
| `INVITE_SESSION_SECRET` | Invite plugin session signing |
| `INVITATION_DAILY_LIMIT` | Per-admin bulk invitation cap |

### 10.2 Build and Run

```bash
# Frontend
npm install
npm run dev          # Vite on :8080, proxies /api to :3001
npm run build        # static bundle to dist/

# Backend
npm --prefix server install
npm --prefix server run dev       # tsx watch, Hono on :3001
npm --prefix server run build     # tsc to server/dist/
node server/dist/index.js         # start compiled server

# Database
npm run db:start|stop|status|reset|psql    # local Postgres on :5433
npm --prefix server run db:gen             # generate migration SQL
npm --prefix server run db:migrate         # apply migrations
npm --prefix server run db:studio          # Drizzle Studio

# Tests / quality
npm run test:unit
npm run lint
npm run format
```

### 10.3 Deployment Notes

- No Docker or IaC in-repo. Deployment is inferred from the runtime scripts and the reverse-proxy expectations described in the container doc.
- SPA is served as static assets behind a reverse proxy or CDN that preserves the `/api` → API service rule.
- API service scales horizontally on HTTP traffic; the in-memory rate limiter is instance-local.
- PostgreSQL is expected to be a managed instance in production with SSL.
- Secrets never enter the browser bundle; they are server-side only.

### 10.4 Background Jobs

Started at API boot:

- `startPaymentExpirationJob()` — expires stale pending payments and releases reservations on a scheduled interval.
- `startPaymentReconciliationJob()` — reconciles local `payments` rows against Fawaterk invoice state.

### 10.5 Operational Runbooks

Referenced from the C4 body:

- `docs/admin-content-workflow.md` — admin content workflow.
- `docs/rbac-decision.md` — RBAC decision record.
- `docs/runbooks/track-enrollment-0015-migration.md` — manual-enrollment migration runbook.
- `docs/events-tracking-data-model.md` + spreadsheet — analytics event catalog.

---

## 11. Conventions and Coding Norms

### 11.1 API Response Format

Success: typed JSON payload.
Error envelope:

```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

`AppErrorHandler` helpers raise this shape consistently. Mutation responses include `MutationResult` for uniform handling on the frontend.

### 11.2 Frontend Conventions

- Path alias `@/` → `./src/`.
- Server state via TanStack Query with session-scoped keys (`src/app/queryKeys.ts`).
- Shared primitives live in `src/shared/components/ui/` (shadcn) and `src/components/tiptap-*/` (editor).
- Feature modules own their own components, hooks, pages, services, types, and utils.
- Never mock the database in integration tests — tests hit a real local PostgreSQL.

### 11.3 Backend Conventions

- Every route file exports a `registerXxxRoutes(app: Hono)` and is registered in `server/src/routes/api/index.ts`.
- RBAC via `requireAdmin` / `requireManager` — always server-side.
- Zod validates every payload; `extractJsonPayload` + `jsonPayloadErrorStatusCode` normalize parse errors.
- `escapeLikePattern` is mandatory for any SQL `LIKE` search.
- Rate-limit keys should include the actor (user ID or IP) and a namespace — see existing usage in `paymentAnalytics.ts`, `trackEnrollments.ts`, and `subscriptions.ts`.

### 11.4 Migrations

- Generated via `npm --prefix server run db:gen`, applied via `db:migrate`.
- History is the ordered SQL under `server/drizzle/*.sql`.
- Data backfills are one-off scripts under `server/scripts/` — never put backfill logic in migration SQL.

### 11.5 Tests

- Node built-in test runner (`node --test`).
- Tests live in `tests/unit/*.test.ts` with a custom TypeScript loader (`tests/node-loader.mjs`).
- Coverage emphasizes high-risk flows: auth, invitations, payments, booking, grants, premium access, analytics, CSP.

---

## 12. Reading Order for a New Tech Lead

1. [c4-context.md](./c4/c4-context.md) — system purpose, personas, journeys.
2. [c4-container.md](./c4/c4-container.md) — endpoint inventory and deployment.
3. [c4-component.md](./c4/c4-component.md) — sub-component index.
4. [c4-component-api-runtime-and-platform-security.md](./c4/components/c4-component-api-runtime-and-platform-security.md) — how the server boots.
5. [c4-component-persistence-and-background-operations.md](./c4/components/c4-component-persistence-and-background-operations.md) — data model and jobs.
6. [c4-component-payments-pricing-and-revenue-operations-api.md](./c4/components/c4-component-payments-pricing-and-revenue-operations-api.md) — the money path.
7. [c4-component-learning-content-and-delivery-api.md](./c4/components/c4-component-learning-content-and-delivery-api.md) — the catalog.
8. [c4-component-identity-invitations-and-member-operations-api.md](./c4/components/c4-component-identity-invitations-and-member-operations-api.md) — auth and onboarding.
9. [c4-component-web-experience-platform.md](./c4/components/c4-component-web-experience-platform.md) — SPA shell and analytics layer.
10. [c4-code-src-lib-analytics.md](./c4/code/c4-code-src-lib-analytics.md) — dataLayer event catalog.
11. [apis/trafficmena-api.yaml](./c4/apis/trafficmena-api.yaml) — full OpenAPI 3.1 spec.

Then sweep the feature-specific component docs and the code-level inventory under `docs/c4/code/` as needed.
