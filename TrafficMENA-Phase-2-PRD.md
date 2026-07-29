# TrafficMENA Phase 2 — Product Requirements Document

| Field | Value |
| :---- | :---- |
| Document type | Product Requirements Document (PRD) |
| Version | 3.3 — final owner-decision iteration; supersedes "TrafficMENA Phase 2 Requirements" v2.0 |
| Date | 2026-07-29 |
| Owner | TrafficMENA (Hosny Abdelrahman) |
| Audience | External software agency implementing Phase 2 |
| Status | Draft for agency review |

---

## 1. Executive Summary

TrafficMENA Hub is a digital marketing education platform for the MENA region. Its current product loop is: Signup → Browse Events/Tracks → Register/Pay → Access Library. The owner reports that the platform is live and processes real customer payments; this operating context cannot be verified from the source tree.

Phase 2 extends the existing events, tracks, series, library, and subscription platform into a broader multi-product education business, in one release program with a strict order of work:

1. **Foundation:** reconcile the agency codebase with production `main`, then begin security remediation. W0 gates all Phase 2 development; W1 gates launch.
2. **Revenue and platform integrity:** migrate the payment gateway from Fawaterk to Geidea; add product visibility toggles; ship two conversion fixes (Add to Calendar, authentication return-redirect).
3. **Experience (in this priority order):** migrate the current experience to TanStack Start first, complete the full UX/UI redesign on the new stack, then deliver Arabic bilingual parity.
4. **New product surfaces:** Expert Profiles, Activity Hub, Email + WhatsApp notifications, and SEO management.

Timeline and internal slicing are the agency's to propose. The **gate order and the TanStack Start → Redesign → Arabic sequence are not negotiable.**

---

## 2. Ground Truth (read before planning anything)

The first subsection is verified from this repository as of 2026-07-29. The second contains owner-provided or external facts that W0 must validate. This distinction prevents assumptions about the agency fork from being treated as source-code evidence.

### 2.1 Repository-observed baseline

1. **Current integration base:** local `main` is at commit `cbd30ce` (2026-07-15). D1 makes this branch the required Phase 2 base.
2. **Recent `main` changes must survive reconciliation.** The repository history verifies the Resend migration (2026-06-30), ticket-type and ticket-aware fulfillment work (2026-06-26), OTP verification-limit changes (2026-06-28), Fawaterk v3 migration (2026-07-03), and atomic backfill when sessions are added to booked tracks (2026-07-14). W0 must compare the agency fork against these changes rather than assuming it already contains them.
3. **The current repository does not contain Masterclass or Digital Product entities.** `server/src/db/schema/index.ts` has no table or enum entry for either. `payment_item_type` and the checkout validators currently support only `event`, `track`, and `subscription`. W0 must therefore port the agency entities and extend every affected flow before W2, W3, W6, W8, W10, W11, or W12 can rely on them.
4. **Current platform settings are limited.** `platform_settings` currently stores `inviteOnlySignup`, `eventMode`, `annualSubscriptionPriceCents`, `subscriberDiscountPercent`, `updatedAt`, and `updatedBy`. None of the three W3 toggles exists.
5. **Events do not link speakers to entities.** The `events` table stores `guestExperts` in the `guest_experts` JSONB column. W9 introduces the durable expert entity and association.
6. **Payments are Fawaterk-specific today.** The repository uses Fawaterk API v3 OAuth client credentials and transaction intents, HMAC-verifies gateway webhooks, preserves a 72-hour reservation window, verifies payments by polling, and fulfills through database transactions. Provider-specific identifiers are stored on `payments`; there is no provider-neutral gateway record. The existing event “refund approval” endpoint changes local registration status only, and the refund webhook is log-only—it does not call a gateway refund API.
7. **Resend is present but is not yet a general notification system.** `server/src/services/email.ts` sends OTP, email-change, and invitation messages. There is no current event/track confirmation-email service, campaign composer, preference model, delivery table, or WhatsApp provider.
8. **Current frontend route baseline (`src/App.tsx`):**

   | Access | Current routes |
   | :---- | :---- |
   | Unguarded/public | `/`, `/about`, `/contact`, `/library`, `/community`, `/invite-only`, `/signin`, `/meetups`, `/meetups/:id`, `/tracks/:id`, `/payment/success`, `/payment/failed`, `/payment/pending`, `/thank-you`, `/invitation/:token`, `/signup/*`, `/privacy`, `/refund-policy`, `/terms`, and the not-found route |
   | Authenticated member | `/dashboard`, `/dashboard/profile`, `/profile/edit`, `/dashboard/meetups`, `/dashboard/library`, `/dashboard/library/:id`, `/dashboard/library/tracks/:id`, `/dashboard/library/series/:id`, `/dashboard/calculators`, `/dashboard/calculators/:slug`, `/thank-you-event/:id`, `/thank-you-track/:id` |
   | Owner/Admin only today | `/subscribe`, `/dashboard/subscribe` |
   | Staff administration | `/admin` and the settings, users, library, event, track, invitation, and promo-code routes beneath it |

   `/community` and `/library` are currently public “coming soon” pages. `/community` does not yet contain the D7 login/signup marketing CTA.
9. **Signup redirect behavior is partial, not generic.** The six-step signup/OTP flow under `src/pages/signup` uses three separate local-storage contexts for subscription, event, and track journeys. `getPostSignupRedirectUrl()` applies a fixed subscription → event → track → dashboard priority after OTP verification. It does not preserve an arbitrary internal deep link as one safe return destination. `SignIn.tsx` can consume a pathname supplied in location state, but the route guards imported by `src/App.tsx` redirect without supplying that state; search parameters and hashes are not preserved.
10. **Existing branch assets:**

   | Branch | Verified state against `main` | What is actually present | Direction |
   | :---- | :---- | :---- | :---- |
   | `arabic-rtl-localization` | One commit ahead; 142 commits behind. Tip commit `4f08cd9`, 2026-05-21. Diff from its merge base: 283 files, about 25,430 insertions and 6,957 deletions. | i18next + react-i18next, locale manager, en/ar catalogs with 3,728 matching leaf keys per language across `common`, `errors`, `legal`, and `nav`, a client-side locale SEO component, localized fields for events/tracks/series/library assets, and locale tests/smoke checks. | Port selected behavior and catalogs; do not merge the branch wholesale. Revalidate every catalog entry and adapt client-side routing/SEO work to the W6 TanStack Start architecture. |
   | `activity-feed` | One commit ahead; 142 commits behind. Tip commit `8eaf718`, 2026-02-09. Diff from its merge base: 43 files, about 3,053 insertions and 797 deletions. | A 1,137-line Activity Feed implementation plan plus early localization scaffolding. Its diff contains no feed schema, API routes, or feed UI implementation. The plan also conflicts with D7, D8, D14, and current out-of-scope decisions. | Historical planning reference only; it is not a prototype and is not an implementation base. |

11. **Current stack:** React 18 SPA + React Router + Vite on the frontend; Hono on Node for the API; Drizzle ORM + PostgreSQL; Better Auth with the email-OTP plugin; Tailwind CSS + shadcn/Radix components; TanStack Query; TipTap + DOMPurify; BunnyCDN uploads; Resend email; and Fawaterk v3. TanStack Start is not a direct dependency today.

### 2.2 Owner-provided and external premises

1. The owner designates `main` as the production source of truth and reports that it serves live users and payments.
2. The owner reports that the external agency fork contains Masterclasses, certificates, recordings, and Digital Products. This repository cannot verify the fork's contents, quality, data model, migration history, or test coverage; W0 must inventory them.
3. The owner plans the first Masterclass for early 2027.
4. Geidea capability statements in W2 come from the vendor documentation reviewed by the owner: hosted checkout, Egypt payment methods, refunds, and webhooks. The agency must confirm merchant-account enablement and the current production contract during W2 planning.
5. The security findings are recorded in `trafficmena-threat-model.md`, which the owner will share privately. This PRD intentionally does not reproduce them.

---

## 3. Decision Log (settled — do not re-open)

| # | Decision |
| :-- | :---- |
| D1 | Production `main` is the base. The agency ports its features (Masterclasses, certificates, recordings, Digital Products) **onto** current `main`; not the reverse. |
| D2 | **Geidea** (docs.geidea.net) replaces Fawaterk entirely for new payments. TrafficMENA accepts losing Fawry/Aman/Masary cash-kiosk methods. Existing in-flight Fawaterk payments are honored and reconciled before Fawaterk is decommissioned. |
| D3 | Email + WhatsApp notification system **is in scope**, including transactional triggers. Email uses the existing **Resend** integration. Both channels are mandatory: users cannot disable any message category, and announcement email has no unsubscribe control. Missing or invalid contact details are skipped and logged. |
| D4 | Experience priority order: **TanStack Start migration → Redesign → Arabic localization.** The migration preserves the reconciled current UI and routes; the from-scratch redesign lands on the new stack. |
| D5 | Visual redesign scope: all public pages and the full member dashboard, redesigned from scratch by the agency. The existing admin shell gets **minor visual tweaks only**; Phase 2 still adds the admin functions required by D10 and W9–W12. |
| D6 | Arabic scope: full bilingual parity (en/ar) for public pages and member dashboard. Admin-managed content is authored in both languages; machine-translation or fallback-only content does not satisfy parity. This applies to events, tracks, series, library assets, Masterclasses, Digital Products, and expert profiles. User-generated Activity Hub posts remain single-language and render bidi-safely with `dir="auto"`. **Admin dashboard remains English-only.** |
| D7 | Activity Hub is **authenticated-only**, lives in the member dashboard at `/dashboard/community`. The public `/community` page becomes a marketing page promoting the community with a login/signup CTA. |
| D8 | Activity Hub channel permission model: (a) staff-post channels (e.g. Announcements — only Owner/Admin/Manager post); (b) entitlement-gated channels visible only to buyers of a specific Track or Masterclass, where all members can post; (c) open channels visible to all authenticated users, where all members (users and experts) can post. Owner/Admin/Manager can manage channels, moderate posts, and send announcements. |
| D9 | Expert Profiles can exist for **non-user guest speakers**. Admin-managed at launch. Admin may assign a profile to one platform user; only that assignee can self-edit that profile. Publication and assignment remain admin-controlled. |
| D10 | Visibility toggles: Digital Products and Masterclasses ship **hidden by default** (first Masterclass launches early 2027). Once the first item of a type is published, hiding that section is no longer allowed (server-enforced). The Subscriptions toggle is a purchase-availability control and stays admin-adjustable at all times. |
| D11 | Add to Calendar appears on-site (event pages + thank-you pages) **and** in confirmation emails. Online-event calendar entries link to the TrafficMENA event page, never the raw meeting link. |
| D12 | Authentication return-redirect is generalized for both signup and sign-in: the complete safe internal destination—including path, query, and fragment—survives the signup wizard + OTP verification and protected-route redirects. |
| D13 | SEO management is an **admin capability**: editable slug, meta title, and meta description for every public content page—events, expert profiles, tracks, and future Masterclass/Digital Product pages. Open Graph share images, an XML sitemap, and schema.org Event structured data are also in scope. |
| D14 | Activity Hub post bodies and free-form announcement bodies use the **existing TipTap editor** with DOMPurify sanitization. Announcement templates remain available but are optional. |
| D15 | **Archive and delete are separate actions.** Archive hides content and remains available. When authorized staff delete an Activity Hub post, Activity Hub channel, or Expert Profile, the record is permanently erased and cannot be restored; deleting a channel also permanently deletes every post in that channel. Notification delivery logs are system records, not staff-deletable content, and retain their logging role. |
| D16 | Scheduled announcements are **in scope**. The announcement composer supports immediate sending or scheduling for a future date/time, and staff can cancel a scheduled announcement before its send time. |

---

## 4. Workstreams

Ordered by execution. W0 and W1 are gates.

---

### W0 — Codebase Reconciliation (GATE)

**Problem this solves:** Phase 2 cannot be safely built while production fixes and agency features live in divergent histories. The result would be regressions, duplicated migrations, and features that cannot be deployed together.

**Required outcome:** one tested codebase based on current `main`, with the accepted agency features ported onto it before any other Phase 2 implementation starts.

**Requirements**
1. Inventory the agency repository's complete delta against current `main`, including Masterclasses, certificates, recordings, Digital Products, migrations, routes, permissions, tests, and operational configuration. The repository-observed absence of these entities means no completeness assumption is allowed.
2. Agree with the owner which inventoried agency features are accepted for the reconciled base, then port those features onto current `main`. They must use `main`'s current Resend, Better Auth, Fawaterk v3, payment, schema, and security conventions until the later workstreams intentionally change them.
3. All Phase 2 branches are cut from the reconciled base. The agency's old fork is retired.
4. No regression to live production flows: event registration, track booking, payments, OTP login, library access, subscriptions.

**Acceptance criteria**
- The reconciled codebase passes the existing test suite plus new tests covering the ported features.
- A full manual pass of the production core loop (signup → browse → pay → access) succeeds on the reconciled base in staging.
- Masterclasses, certificates, recordings, and Digital Products function on the reconciled base.

---

### W1 — Security Remediation (GATE)

**Problem this solves:** adding payments, public content, community posting, and outbound messaging compounds any unresolved security weakness.

**Required outcome:** every issue documented in the privately shared threat model is fixed and independently retested before Phase 2 launches.

**Requirements**
1. The agency receives `trafficmena-threat-model.md` (shared privately by the owner; deliberately not committed to the repository) and must resolve **every issue listed in it**.
2. Fixes land early in Phase 2, not at the end; new Phase 2 code must not reintroduce any listed issue class.
3. A re-verification pass confirms each item closed (retest, not just code review).

**Acceptance criteria**
- Every threat-model item has a documented fix and a passed retest.
- Owner sign-off on the remediation report.

---

### W2 — Payment Gateway Migration: Fawaterk → Geidea

**Problem this solves:** TrafficMENA has selected Geidea as its future payment provider, but changing a live gateway can lose payments, double-fulfill orders, or strand reservations if the existing business rules and in-flight Fawaterk transactions are not preserved.

**Required outcome:** Geidea processes new purchases while TrafficMENA retains its pricing, reservation, fulfillment, reconciliation, and payment-record behavior. Current provider-specific code is not a clean gateway adapter; the agency chooses the smallest maintainable refactor that preserves these invariants.

**Business behavior to preserve:** subscriber discounts, promo codes, 72-hour capacity holds, atomic fulfillment, the application payment UUID as the primary correlation key, payment records, verification/reconciliation, and the payment-expiration job.

**Requirements**
1. Integrate **Geidea Checkout (hosted payment page)** — not the direct card API, which requires PCI DSS compliance we do not want to take on.
2. Support Geidea's Egypt payment methods: cards (Visa/Mastercard), Apple Pay / Google Pay, Meeza, and BNPL options (ValU, Souhoola) where commercially enabled on our merchant account. Fawry/Aman/Masary cash-kiosk methods are knowingly discontinued.
3. After W0, support every accepted purchasable type: events, tracks, subscriptions, Masterclasses, and Digital Products. Do not assume the current three-value payment enum already covers the ported products.
4. Webhook/callback handling must verify Geidea signatures, process duplicate/replayed deliveries idempotently, retain an auditable provider result, and re-check the payment with Geidea before fulfillment where the provider contract requires it.
5. Preserve a browser verification path equivalent to today's poll/verify flow so a delayed webhook does not strand the thank-you journey, regardless of whether W2 lands before or after W6.
6. Cut over without orphaning existing payments: retain Fawaterk webhook and verification handling until every in-flight Fawaterk payment has settled or expired; retain enough provider provenance to route each payment correctly; and reconcile all pending records before decommissioning Fawaterk. After cutover, no new payment is initiated through Fawaterk.
7. Keep all credentials server-side, validate required production configuration at startup, and never expose secrets in frontend code or logs.
8. Connect the existing event cancellation/refund approval flow to Geidea's full-refund API. Today that approval only changes local registration status. Phase 2 must not report a refund as complete until Geidea confirms it, and failures must remain visible and retryable without duplicating a refund.

**Acceptance criteria**
- A user can pay for an event, a track, a subscription, a Masterclass, and a Digital Product through Geidea in staging and production.
- Webhook replay/duplicate delivery does not double-fulfill (idempotency proven by test).
- Reservation TTL, promo codes, and subscriber discounts behave identically to today.
- In-flight Fawaterk payments during cutover are honored end-to-end.
- After reconciliation and decommissioning, all new payment attempts use Geidea and no Fawaterk cash-kiosk option remains.
- An approved event refund is confirmed by Geidea and recorded locally exactly once; a provider failure does not falsely mark the refund complete.

---

### W3 — Product Visibility Toggles

**Problem this solves:** empty or not-yet-launched product lines confuse customers and create dead purchase journeys, while disabling subscriptions must not remove benefits from people who already paid.

**Required outcome:** Owner/Admin can control customer-facing availability for Subscriptions, Digital Products, and Masterclasses without creating a published-but-hidden product state or removing existing entitlements.

**Requirements**
1. Three independent toggles in platform settings (Admin/Owner only): Subscriptions, Digital Products, Masterclasses.
2. When a toggle is OFF, that product line is absent from public/member navigation, discovery, cards, purchase pages, and public detail routes; the backend **rejects checkout attempts** for that item type. Authorized staff can still manage draft content in the admin area.
3. Launch guardrail (Digital Products & Masterclasses only): while no item has ever been published, the toggle is adjustable. Publishing the first item and leaving the toggle OFF must be impossible. From that first publication onward, the server permanently rejects turning visibility OFF and the admin UI explains why.
4. Subscriptions toggle semantics: OFF hides all subscribe CTAs/pages and blocks subscription checkout; **existing active subscribers keep their benefits and access**, and admin subscription grants continue to work regardless of the toggle.
5. When Subscriptions is ON, the intended customer purchase surfaces replace the temporary Owner/Admin-only route guards currently applied to `/subscribe` and `/dashboard/subscribe`.
6. Defaults at Phase 2 launch: Digital Products = hidden; Masterclasses = hidden; Subscriptions preserves the availability state in effect immediately before the migration rather than assuming ON or OFF.

**Acceptance criteria**
- With a toggle OFF, a customer cannot discover, deep-link to, or check out that product line; authorized staff can still manage its drafts.
- Publishing the first Masterclass or Digital Product cannot coexist with an OFF toggle, and the product line cannot later be hidden (verified by API tests).
- An active subscriber retains access while the Subscriptions toggle is OFF.

---

### W4 — Add to Calendar

**Problem this solves:** registration does not place the session into the attendee's daily calendar, so the event is easy to forget or schedule over.

**Required outcome:** a registered attendee can add every included online or offline event from the site and from the registration confirmation email.

**Requirements**
1. Placement: event detail page (for registered users), registration thank-you pages, and registration confirmation emails.
2. Support the three mainstream targets with two artifacts: a **Google Calendar link** and a downloadable **.ics file** (covers Apple Calendar and Outlook).
3. Calendar entry contents: event title, description, date/time exported from the stored instant with correct `Africa/Cairo` behavior, and location. Offline entries use the venue. Online entries link to the TrafficMENA event page and **never** embed the raw meeting link.
4. Track bookings: the track thank-you page and confirmation email expose the same calendar action for every session included in the buyer's ticket. The agency may choose separate entries or a multi-event `.ics` file.
5. There is no current registration-confirmation email service. The email placement in D11 is therefore delivery work, not a template-only edit: W4 must either land with the W11 email foundation or include the minimum confirmation-email capability needed by D11.
6. Explicit non-goal: no live calendar sync. Rescheduling does not update an already-imported calendar item; W11 owns the attendee change notification.

**Acceptance criteria**
- A registered user can add any event to Google/Apple/Outlook calendars from web and from the confirmation email, with correct local time.
- An online event links to its TrafficMENA event page; the generated calendar artifact does not contain the raw meeting link.

---

### W5 — Authentication Return-Redirect

**Problem this solves:** the current signup flow stores three product-specific contexts and applies fixed redirect precedence, while the primary protected-route guards redirect to sign-in without supplying the origin. Both paths can lose acquisition, purchase, or task context.

**Required outcome:** after signup or sign-in, a user returns to the exact safe internal destination that initiated authentication, including its path, query, and fragment.

**Requirements**
1. Preserve the origin path, query string, and fragment through the **entire** signup flow: all wizard steps and the OTP email-verification step.
2. Preserve the same complete destination when an unauthenticated visitor is redirected from a protected route to sign-in, and consume it after successful sign-in.
3. Apply one generic return-destination mechanism to both paths. It must cover the public acquisition links named in D12—track pages, event pages, and the subscription page—and protected member routes, rather than extending the current product-specific local-storage helpers.
4. Only internal platform destinations are accepted (no open-redirect vulnerability).
5. After returning, the user lands on the origin page; auto-resuming a checkout is **not** required in this phase.

**Acceptance criteria**
- From `/tracks/:id`, a brand-new user completes the full signup (including OTP) and lands back on that exact track URL. The same behavior applies to `/meetups/:id` and, after W3 exposes it, `/subscribe`; query parameters and fragments are preserved.
- An unauthenticated visitor opens a protected member URL with query parameters and a fragment, signs in, and returns to that exact internal destination.
- A crafted external `returnTo` value is rejected.

---

### W6 — TanStack Start Migration (Experience priority 1)

**Problem this solves:** the current Vite SPA does not deliver public page content and metadata as server-rendered HTML, which limits the crawlable delivery required by W12.

**Required outcome:** migrate the reconciled current frontend from React Router + Vite to **TanStack Start** with route, UI, and behavior parity, while server-rendering public content pages. This work preserves the current experience; the redesign follows in W7.

**Requirements**
1. Full route parity: every URL in the Section 2.1 baseline and every accepted customer/admin route added during W0 keeps working directly or through an intentional redirect, with the same UI behavior and the same or stronger access control.
2. Selective SSR: every public marketing or content page present on the reconciled base—including home, events, tracks, subscription, Masterclass, and Digital Product pages—returns meaningful server-rendered HTML. Authenticated dashboard areas may remain client-rendered.
3. Preserve intact: Better Auth session behavior, CSRF protection, TanStack Query data layer, and the API contract with the Hono backend.
4. The current SPA document receives its CSP from `index.html`, while Hono applies security headers to API responses. W6 must deliver an equivalent or stronger policy on server-rendered documents and preserve the API policy.
5. W6 starts after W0 acceptance. It is a parity migration of the reconciled current UI, not a redesign. Only adjustments required to preserve behavior on TanStack Start belong in W6; W7 owns the new experience.
6. Measure a current-SPA performance baseline before migration so the no-regression acceptance criterion is testable.

**Acceptance criteria**
- All existing user flows pass end-to-end on the migrated app (signup, login, browse, pay, library, admin).
- Every reconciled route has behavior and visual parity with its pre-migration version, apart from owner-approved migration necessities.
- Public pages render meaningful HTML server-side (verifiable with JavaScript disabled / curl).
- No regression in Core Web Vitals versus the current SPA baseline.

---

### W7 — UX & UI Redesign (Experience priority 2)

**Problem this solves:** the current public and member experiences were built incrementally and do not provide the coherent product experience required for the broader Phase 2 offer.

**Required outcome:** an owner-approved, from-scratch visual and UX redesign across every public and member route, implemented on the W6 TanStack Start foundation while preserving business behavior and the existing component foundation.

**Requirements**
1. Scope: every unguarded/public and authenticated-member route in the Section 2.1 baseline, plus the customer/member routes added by W0 and Phase 2. Admin-wide visual redesign is excluded.
2. Public/member design deliverables must also cover the new Expert Profile pages, Activity Hub, and Masterclass/Digital Product listing and detail pages. Their product behavior is implemented in the owning workstreams, using the approved designs. Notification administration and the announcement composer follow the limited admin treatment in requirement 5.
3. The design system must be **RTL-ready from day one**: mirrored layout behavior, Arabic typography, and components that tolerate longer translated text. W8 must not require a second structural redesign.
4. Keep the existing UI stack (Tailwind CSS + shadcn primitives). New visual identity, same component foundation.
5. New Phase 2 admin functions still require usable admin screens, but they reuse the existing admin shell and visual language with only the minor visual adjustments allowed by D5.
6. Delivery gates: W6 migration acceptance → design direction → owner approval → high-fidelity designs for each area → owner approval → implementation. No redesigned screen is implemented before its design is approved, and W7 acceptance is complete before W8 localization begins.

**Acceptance criteria**
- An owner-approved screen inventory maps every current and Phase 2 public/member route to a design; there are no omitted payment, thank-you, signup, legal, empty, error, or not-found states.
- The redesigned public/member experience is implemented on TanStack Start, matches the approved designs, passes responsive checks, and introduces no accessibility regressions.
- New-surface designs are approved and ready for their owning workstreams; the admin shell has not been redesigned beyond D5.

---

### W8 — Arabic Localization (Experience priority 3)

**Problem this solves:** the platform cannot serve Arabic-first users if navigation, transactional journeys, content, or layout remain English-only.

**Required outcome:** full English/Arabic parity across every public and member surface in the Phase 2 release, with correct RTL behavior. The admin area remains English-only.

**Requirements**
1. Port reusable behavior and catalogs from `arabic-rtl-localization`; do not merge the stale branch. Treat its 3,728-key-per-language catalogs as a starting asset, not proof of coverage, and adapt its React Router/client-side locale and SEO code to the W6 TanStack Start architecture and the approved W7 redesign.
2. Full RTL layout support in Arabic. User-generated Activity Hub posts remain in the language written by the author and render mixed Arabic/English content bidi-safely with `dir="auto"`; the agency chooses the surrounding layout implementation.
3. Provide a language switcher on every localized surface and persist the user's choice. The final localized URL strategy must also satisfy W12.
4. Follow the localized-fields approach established on the branch for admin-managed content. Events, tracks, series, library assets, Masterclasses, Digital Products, and expert profiles require authored English and Arabic versions of their user-facing fields; machine-translation or fallback-only content does not meet acceptance. If an assigned expert edits a profile under D9, both language versions remain subject to this completeness rule.
5. Localized URLs, canonical metadata, and `hreflang` behavior are coordinated with W12.
6. Expert Profile and Activity Hub interface chrome, and all W0 product surfaces must be bilingual at Phase 2 launch regardless of when their backend work begins. Notification administration remains part of the English-only admin dashboard.

**Acceptance criteria**
- A user can complete the entire core loop (signup → browse → pay → access) fully in Arabic with correct RTL rendering.
- Every public/member route in the final inventory is available in both languages; no hard-coded user-visible English remains on localized surfaces (verified using the branch's coverage-test approach).
- Every published admin-managed content item in scope has authored English and Arabic values; Activity Hub posts retain their authored language and render correctly in both interface directions.
- Admin dashboard remains English and is exempt from parity checks.

---

### W9 — Expert Profiles

**Problem this solves:** speakers are currently unlinked JSON attached to events, so TrafficMENA cannot maintain a durable expert identity, show a speaker's body of work, or publish an indexable profile.

**Required outcome:** a publishable expert entity that supports guest speakers without accounts and optional, tightly controlled self-editing after assignment.

**Requirements**
1. Expert profile is its own entity, **not tied to a user account**: profiles for guest speakers who have no platform login are fully supported.
2. Minimum publishable profile: authored English and Arabic name, headline, and bio, plus published/unpublished status. Avatar (existing upload flow), expertise/tags, and social links are optional. W9 and W12 deliver the profile's slug and SEO metadata together.
3. Admin/Owner create, edit, publish, and unpublish profiles.
4. Assignment model: Admin/Owner may assign a profile to one platform user. **Only that assignee** can edit that profile's public content. Assignment, publication status, and reassignment remain Admin/Owner-only; unassigned profiles remain fully admin-managed.
5. Public pages: published profiles are visible to everyone (including logged-out visitors) at a slug URL; unpublished profiles are not reachable.
6. Linked content: a profile page lists explicitly associated events, tracks, series, Masterclasses, and library assets, showing only content that is itself published and visible to the current viewer.
7. Event linkage: new and edited events use a real association to expert profiles. Preserve existing `guestExperts` data during migration; backfill only owner-confirmed matches and produce an unmatched-data report rather than guessing identities.
8. Validate social links as safe external URLs and sanitize any rich profile content using existing project conventions.
9. Archive and delete remain separate actions. Admin/Owner can archive a profile to hide it or permanently delete it; permanent deletion erases the profile and cannot be restored.

**Acceptance criteria**
- Admin creates and publishes a guest-speaker profile with no user account; it renders publicly at its slug.
- Admin assigns a profile to a platform user; that assignee can edit its public content but cannot publish, unpublish, or reassign it; other users cannot edit it.
- An event linked to an expert shows on the expert's page only while the event is visible to the viewer.
- Existing free-form speaker data remains available unless and until it has been safely matched.
- Archiving a profile hides it without erasing it; permanently deleting it removes the record and it cannot be restored.

---

### W10 — Activity Hub

**Problem this solves:** TrafficMENA has no authenticated place for official updates, peer discussion, or buyer-specific learning communities; the current `/community` route is only a placeholder.

**Required outcome:** a dashboard community feed whose visibility and posting rules are enforced from actual authentication and purchase data.

**Requirements**
1. Location: `/dashboard/community` inside the member dashboard, **authenticated users only**. The public `/community` route becomes a marketing page that promotes the community and funnels visitors to signup/login.
2. Limit channels to the three settled D8 models:
   - **Staff-post channel:** authenticated members can view; only Owner/Admin/Manager can post.
   - **Entitlement-gated channel:** only buyers of the specified Track or Masterclass can view and post.
   - **Open channel:** every authenticated member can view and post, including users and experts.
   Selected-role, custom-role, public, and generic subscriber-only channels are not part of this model.
3. Every channel requires a cover image using the existing upload flow. New channels default to `requiresApproval = ON`; Owner/Admin/Manager may change that setting per channel. When approval is required, member posts enter pending review and remain invisible to other members until approved.
4. Posts support a title or short text, a rich-text body using the existing TipTap editor, an optional image through the current upload flow, and an optional safe link. Rich text is sanitized with DOMPurify. Authors can create, edit, save as draft, and archive their own posts where they have posting rights; staff can pin or archive posts they moderate.
5. Staff administration/moderation surface for Owner/Admin/Manager: create, edit, archive, and permanently delete channels; permanently delete posts; upload or replace the required cover image; set channel mode and approval behavior; approve/reject pending posts; and pin or archive posts.
6. Feed experience: members see only allowed channels and posts, filter by channel, and post only where permitted. Unauthorized reads and writes are rejected by the backend (403), not merely hidden in the UI.
7. Entitlement gating is enforced server-side against successful purchase records: current track bookings and the Masterclass purchase/enrollment records accepted in W0.
8. The public `/community` page must replace the current coming-soon content with the D7 marketing proposition and login/signup calls to action; it must not expose feed content.
9. Out of scope for this phase: comments, reactions/likes, direct messages, real-time updates, and user-generated channels.
10. Archive and delete are distinct. Archiving hides a channel or post without erasing it. Staff deletion permanently erases the selected post or channel; deleting a channel permanently deletes every post in that channel. Deleted records cannot be restored.

**Acceptance criteria**
- A buyer of Track X sees Track X's channel and can post in it; a non-buyer cannot see it and receives 403 on direct API access.
- Only staff can post in a staff-post channel; every authenticated member can read it.
- A newly created channel has a cover image and starts with `requiresApproval` on; a member's pending post is invisible to others until approved.
- A member can draft, edit, and archive their own post but cannot change another member's post; authorized staff can moderate it.
- A Manager can manage channels, change moderation settings, approve/reject posts, and pin/archive moderated posts.
- Staff can permanently delete a post. Permanently deleting a channel also deletes all posts in it, while archiving the same channel preserves its records.
- Logged-out visitors hitting `/community` see the promo page; `/dashboard/community` requires login.

---

### W11 — Email + WhatsApp Notifications

**Problem this solves:** TrafficMENA can send a small set of operational emails but cannot reliably notify defined audiences across the customer lifecycle or tell staff what was delivered.

**Required outcome:** authorized staff and approved system events send mandatory email and WhatsApp messages through a logged, retryable delivery process.

**Requirements**
1. **Email** extends the existing Resend transport; it does not introduce a second email provider. The agency proposes a **WhatsApp** provider with pricing and its template-approval process for owner approval before implementation. The approved option must support the settled free-form announcement requirement, reusable templates, international-number delivery (Egypt-first), delivery-status callbacks, and server-side credentials.
2. Owner-directed delivery policy: email and WhatsApp are mandatory for every applicable recipient and message category. Users have no notification preferences, cannot disable either channel, and cannot unsubscribe from announcements.
3. Phone numbers normalized to international format; recipients with missing/invalid email or phone are **skipped and logged**, never crash a send.
4. Reusable templates (subject/body/variables, active/inactive status) remain available for both channels but are not mandatory for announcements. Email templates provide HTML and plain-text output; WhatsApp templates carry their provider-approved identifiers.
5. Owner/Admin/Manager announcement composer: select audience—all users, event attendees, track buyers, Masterclass enrollees, Activity Hub channel members, or role-based—preview recipient and skipped counts for both mandatory channels, then send by email and WhatsApp. Staff may write a free-form body using the existing TipTap rich-text editor; the stored/rendered body is sanitized with DOMPurify.
6. System-triggered messages are idempotent: the same business event cannot send twice. Required trigger categories:

   | Category | Required triggers |
   | :---- | :---- |
   | Payment | Success, failed, and pending/action-required status changes |
   | Access | Event registration; track, Masterclass, or Digital Product purchase/enrollment; manual access grant |
   | Events | Confirmation (including W4 calendar actions), upcoming reminder, reschedule, cancellation, and refund-status update |
   | Learning | New recording added to owned content, Masterclass completion, and certificate issued |
   | Administration | Approved audience announcements |

7. Sends run outside the request/response critical path. Record every recipient attempt as sent, failed, or skipped with the provider result; ingest delivery callbacks where available; rate-limit staff campaigns; and allow safe retry of failed attempts without duplicate delivery.
8. Notification records and logs must avoid exposing OTPs, provider credentials, or unnecessary recipient PII. Delivery logs are system records and are not staff-deletable content.
9. Sequence: notification foundation and Resend email first; WhatsApp delivery begins after provider approval. W4 confirmation-email placement depends on the email foundation, and Geidea payment triggers depend on W2.
10. The announcement composer supports immediate send and scheduling for a future date/time. Staff can cancel a scheduled announcement before its send time; cancellation prevents delivery.

**Owner-directed email risk:** major mailbox providers' bulk-sender rules, including one-click unsubscribe requirements, may reduce announcement-email inbox placement when no unsubscribe is offered.

**Acceptance criteria**
- Owner/Admin/Manager sends a free-form TipTap-authored email and WhatsApp announcement to a targeted audience without selecting a template; delivery log shows per-recipient status, skipped users, and failures; failed sends can be retried.
- Owner/Admin/Manager schedules an announcement for a future date/time and it sends at that time; cancelling it before the send time prevents delivery.
- Each required trigger category can be demonstrated end-to-end; payment success and certificate-issued messages fire exactly once.
- No user-facing notification preference or announcement-unsubscribe control exists; applicable users receive mandatory email and WhatsApp unless their address or phone is missing/invalid, in which case that channel is skipped and logged.
- No provider credentials reachable from the frontend.

---

### W12 — SEO Management

**Problem this solves:** current public content uses ID routes and has no stored slug, meta title, or meta description, so staff cannot control how pages appear in search or social sharing; the platform also lacks a managed sitemap and Event structured data.

**Required outcome:** Admin/Owner can manage the D13 SEO fields and share imagery for each public content item, while W6 serves crawlable metadata, sitemap entries, and Event structured data without breaking old links.

**Requirements**
1. Admin-editable URL slug, meta title, and meta description for events, expert profiles, tracks, and—when launched—Masterclasses and Digital Products. Use consistent product behavior across content types; the agency decides the maintainable implementation.
2. Every in-scope public content page has Open Graph metadata and a share image. The agency may reuse an existing admin-managed content image or add a dedicated image through the existing upload flow; the final behavior must be consistent and owner-approved.
3. Slugs must be unique within the required routing scope, safely validated, and unavailable for reserved application paths.
4. Preserve links: legacy ID-based URLs redirect to the canonical slug URL; changing a published slug retains a permanent redirect from the old URL.
5. After W6, the server-rendered page outputs the stored title, description, canonical URL, and Open Graph metadata. After W8, English and Arabic versions output correct canonical and `hreflang` relationships.
6. Provide an XML sitemap containing canonical, published, customer-visible public pages only. It excludes drafts, hidden product lines, authenticated/member routes, and admin routes; after W8 it reflects the approved localized URL strategy.
7. Public event pages output valid schema.org Event structured data derived from the event record and matching the page's visible facts. It is not a free-form admin JSON field; after W8 it uses the correct localized values for the rendered page.
8. Admin field work may begin earlier, but crawlable technical delivery depends on W6 and bilingual metadata behavior depends on W8. Expert-profile SEO depends on W9; Masterclass/Digital Product SEO depends on W0.

**Acceptance criteria**
- Admin edits slug, meta title, meta description, and the applicable share image for every in-scope content type; each published public page serves the resulting canonical and Open Graph metadata in server-rendered HTML (verifiable without executing JavaScript).
- Old and previously published slug URLs redirect permanently to the current canonical URL; slug collisions and reserved paths are rejected.
- The XML sitemap contains each eligible published public page and excludes unpublished, hidden, authenticated, and admin routes.
- A published event page exposes schema.org Event structured data that agrees with the visible event title, dates, location/mode, canonical URL, and publication state.

---

## 5. Delivery Order & Dependencies

| Workstream | Earliest start | Dependency or gate |
| :---- | :---- | :---- |
| W0 Reconciliation | Kickoff | Gates every other implementation workstream. |
| W1 Security | After W0 | Starts immediately; all remediations and a final integrated retest gate launch. |
| W2 Geidea | After W0 | Preserves W0 product types; supplies W11 payment triggers. Fawaterk remains active only long enough to settle and reconcile in-flight payments. |
| W3 Toggles | After W0 | Depends on W0 Masterclass/Digital Product entities and publication rules. |
| W4 Calendar | After W0 | On-site work can proceed; email acceptance depends on W11 email foundation. Reschedule communication depends on W11. |
| W5 Authentication redirect | After W0 | Generic signup/sign-in return handling can proceed; `/subscribe` acceptance depends on W3 exposing the route. |
| W6 TanStack Start | After W0 | Experience priority 1. Migrates the reconciled current UI with route/behavior parity and enables server-rendered W12 delivery. |
| W7 Redesign | After W6 acceptance | Experience priority 2. Implements the approved from-scratch public/member experience on TanStack Start. |
| W8 Arabic parity | After W7 acceptance | Experience priority 3. Localizes the redesigned experience and requires authored bilingual admin-managed content. |
| W9 Expert Profiles | Backend after W0; user UI after W8 | Depends on W0 reconciliation and W6–W8 for public delivery; coordinates profile slug/metadata with W12. |
| W10 Activity Hub | Backend after W0; user UI after W8 | Masterclass-gated channels depend on W0 purchase records; UI depends on W6–W8. |
| W11 Notifications | Foundation after W0; user UI after W8 | Email precedes WhatsApp; WhatsApp delivery requires owner approval of the agency's provider proposal. Triggers depend on W2, W4, and the accepted W0 product lifecycle. Immediate and scheduled announcements are both in scope. |
| W12 SEO | Fields may start with owning entities; technical delivery after W6; localized acceptance after W8 | Masterclass/Digital Product fields depend on W0; Expert Profile fields land with W9; SSR, sitemap, Open Graph, and Event structured data depend on W6; redesigned presentation lands in W7; bilingual metadata depends on W8. |

Backend work may be parallelized where the table allows, but it does not weaken the fixed W6 → W7 → W8 experience sequence. The agency must propose the detailed timeline, milestones, validation environments, and release slices for owner approval before execution scheduling.

---

## 6. Out of Scope for Phase 2

- New pricing models or new subscription purchase flows (beyond the visibility toggle).
- Comments, reactions, direct messages, real-time feed updates, real-time chat, user-created channels, or a full community-reporting workflow.
- Push notifications, in-app notification inbox, marketing-automation journeys, A/B testing, advanced segmentation builders, or AI-generated notification copy.
- User-configurable notification preferences, channel opt-outs, or announcement unsubscribe controls.
- Two-way WhatsApp conversations or customer-service chat.
- Live calendar sync (updating already-added calendar entries on reschedule).
- Native mobile apps.


