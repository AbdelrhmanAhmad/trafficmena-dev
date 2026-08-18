---
title: Hide Unavailable Track Ticket Options - Plan
type: feat
date: 2026-08-18
artifact_contract: js-ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: js-ce-plan-bootstrap
execution: code
---

# Hide Unavailable Track Ticket Options - Plan

## Goal Capsule

- **Objective:** The public track buying page shows exactly the ticket variants enabled in the admin Ticket Types toggles — never the greyed "Not available now" rows. When only one variant is enabled, it renders already selected: the page reflects the configured ticket type, it does not guess.
- **Authority:** Owner decisions (2026-08-18 review debate): selection mirrors admin config, stays selected before the booking window opens; smallest diff wins; no screen-reader live-region work; no derived-selection rewrite.
- **Stop conditions:** Surface instead of guessing if `TrackTicketSelector` gains a second caller, or if preselection conflicts with pending-payment resume beyond the R3 rule.
- **Execution profile:** Small single-session diff, two dependency-ordered units.

## Product Contract

### Summary

Render only admin-enabled ticket variants; preselect the variant when it is the only one enabled; keep the price visible while suppressing requests the server would reject while booking is closed. Remove the dead show-disabled path.

### Problem Frame

`getAllTicketTypes` returns all three variants so the selector can grey unsold ones as "Not available now". On tracks selling one variant (the production common case) this adds two dead rows and forces a tap on the only real option. The variants are admin-configured facts (the Ticket Types toggles), not guesses — the page should simply reflect them.

### Requirements

- R1. The selector renders only variants enabled in admin (non-null price); "Not available now" rows never render. A track with no enabled variants keeps today's behavior (legacy single-price, no selector).
- R2. When exactly one variant is enabled and the viewer can still buy (booking state `available` — not booked, no pending payment), that variant renders already selected — including before the booking window opens. A paid lone variant shows the price card; a free lone variant just shows selected (no price card or promo at 0 EGP, unchanged).
- R3. A stored `pending_ticket_type` (unpaid checkout resume) takes precedence over the lone-variant preselection, as it does over manual selection today.
- R4. Preselection must not fire requests the server deterministically rejects: while booking is not possible (window not open, ended, not configured, or sold out — the page's existing `canBook` check), the price preview stays off, the promo input is disabled with the booking-status message, and the post-signup `?checkout=1` auto-open does not fire.
- R5. The dead show-disabled path is removed: the selector's disabled rendering branch, `getAllTicketTypes` and the `TicketOption` type, the show-full-menu comments, and the unit test asserting disabled variants stay visible.

### Scope Boundaries

- Admin screens untouched — `AdminTrackDetail` already uses the enabled-only helper.
- Booking-window logic untouched. On a window-closed track the lone variant shows selected with its price and the button stays "Booking Closed"; only the doomed requests are suppressed (R4).
- Multi-variant tracks unchanged: the buyer picks; the page never chooses among several enabled variants.
- Server-side ticket entitlement (`server/src/routes/api/ticketAccess.ts`) untouched.
- No screen-reader live-region announcement for preselection; no synchronous derived-selection rewrite — the one-frame session-list settle after data load is accepted.

## Planning Contract

### Key Technical Decisions

- **Filter at the data layer, not in the component.** `TrackDetail` passes the enabled-only list (the `getEnabledTicketTypes` shape) and the selector's prop type narrows to enabled variants. With the page as the single caller, `getAllTicketTypes` and `TicketOption` are deleted rather than left as an unused tolerant path.
- **Preselection lives in the existing selection-normalization effect** in `TrackDetail`, via a small pure resolver in `ticketTypes.ts`: valid pending resume, else a still-valid current selection, else the lone enabled variant when booking state is `available`, else null. Pure so `node --test` covers the precedence — this repo's runner cannot render components, and the only alternative pattern is brittle source-string assertion.
- **The no-doomed-request invariant lives in the existing preview gate.** `getTrackPricePreviewGate` (pure, tested) gains a booking-open input fed from the page's existing `canBook` memo, so the preview stays off while the server would reject it — it throws `BOOKING_NOT_OPEN` / `BOOKING_PERIOD_CLOSED` / `BOOKING_NOT_CONFIGURED` before pricing (`server/src/routes/api/payments.ts`). The gate is the established, tested home for "when may the preview fire" per `docs/solutions/runtime-errors/tanstack-query-enabled-gating-race.md`. The same `canBook` value disables the promo input (with the booking-status message) and guards the `?checkout=1` auto-open effect.

External research skipped: the change contracts an existing, well-tested local pattern.

## Implementation Units

### U1. Render only enabled variants and strip the show-disabled path

- **Goal:** The selector receives and renders enabled variants only; the disabled rendering path and its helper are gone.
- **Requirements:** R1, R5
- **Dependencies:** none
- **Files:** `src/features/tracks/pages/TrackDetail.tsx`, `src/features/tracks/components/TrackTicketSelector.tsx`, `src/features/tracks/ticketTypes.ts`, `tests/unit/track-ticket-types-ui.test.ts`
- **Approach:** Drop the `allTickets` memo and pass the existing `enabledTickets` list; narrow the selector's `options` prop to the enabled shape; remove the disabled branch (aria-disabled, greyed styles, "Not available now" label, nullable-price handling); delete `getAllTicketTypes` and `TicketOption`; rewrite the docstrings that document showing disabled variants as deliberate.
- **Patterns to follow:** `getEnabledTicketTypes` already encodes the filter and canonical order; `AdminTrackDetail` shows the enabled-only consumption pattern.
- **Test scenarios:**
  - Remove the obsolete `getAllTicketTypes keeps disabled variants visible` block.
  - Keep green the existing helper coverage that already proves hiding: "omits variants with a null price" and the free-variant case (`0` cents stays enabled, labeled Free).
- **Verification:** `npm run test:unit` and `npm run lint` pass; a multi-variant track shows only its enabled variants, none greyed.

### U2. Preselect the lone enabled variant; suppress doomed requests

- **Goal:** A single-variant track renders with the configured variant selected; booked users never see resurrected purchase UI; closed-window tracks fire no deterministic 400s.
- **Requirements:** R2, R3, R4
- **Dependencies:** U1
- **Files:** `src/features/tracks/pages/TrackDetail.tsx`, `src/features/tracks/ticketTypes.ts`, `src/features/tracks/utils/trackPricePreviewGate.ts`, `tests/unit/track-ticket-types-ui.test.ts`, `tests/unit/price-preview-gating.test.ts`
- **Approach:** Extract the selection precedence into a pure resolver (KTD 2) called from the existing normalization effect; the lone-variant branch requires booking state `available`. Add a booking-open input to `getTrackPricePreviewGate` fed from the existing `canBook` memo; add `!canBook` to the promo-disabled chain using the booking-status message; early-return the `?checkout=1` auto-open effect when `!canBook`.
- **Test scenarios:**
  - Resolver, pending precedence on a multi-variant fixture: valid pending differing from the current selection → pending wins (a single-variant fixture proves nothing — the pending type would equal the lone candidate).
  - Resolver, one enabled variant + booking state `available` + no pending → that variant.
  - Resolver, one enabled variant + booking state `booked` or `pending` → no preselection (null unless pending resume applies).
  - Resolver, multiple enabled variants, no pending → current kept if still enabled, else null (never picks among several).
  - Resolver, legacy all-null track → null.
  - Resolver, single free variant (`0` cents), booking state `available` → selected.
  - Gate: booking-open false → `enabled: false` regardless of selection; booking-open true → existing behavior unchanged (signed-out, unloaded, booked, ticketless cases stay green).
- **Verification:** A single-variant open track loads with the card selected, price card and promo visible without a tap, session list filtered, recordings banner shown for `online_only`. A window-closed single-variant track shows the card selected with its price, promo disabled with the booking message, booking button "Booking Closed", and the network tab shows zero price-preview requests. An enrolled user sees no price card or promo input.

## Verification Contract

- `npm run test:unit` — helper filtering, resolver precedence, and gate tests green.
- `npm run lint` — Ultracite clean on touched files.
- Manual smoke (local seed data): open single-variant (selected, price without a tap), pre-window single-variant (selected, price visible, no requests), multi-variant (no preselection), legacy all-null (no selector), enrolled user (no purchase UI), free single-variant (selected, no price card).
- Watch the price-preview endpoint during smoke: zero deterministic 400s, per `docs/solutions/runtime-errors/tanstack-query-enabled-gating-race.md`.

## Definition of Done

- R1-R5 hold on the public track page; admin and server behavior unchanged.
- Unit tests and lint green; obsolete test block removed; resolver and gate scenarios added.
- No dead remnants: `getAllTicketTypes`, `TicketOption`, and the disabled rendering branch are gone; comments no longer describe showing disabled variants.
