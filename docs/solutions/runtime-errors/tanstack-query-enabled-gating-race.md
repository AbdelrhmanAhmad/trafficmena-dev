---
title: Dependent queries must gate on loaded data and never retry deterministic 4xx
category: runtime-errors
tags: [tanstack-query, react, payments, api, frontend]
severity: medium
components: [frontend, payments]
symptoms:
  - A query fires before its parent data loads and 400s (e.g. TICKET_TYPE_REQUIRED)
  - A permissive `enabled` gate reads true while the parent item is still undefined
  - Deterministic 4xx get retried 3× (global retry default), 4× the failed requests
  - High failure ratio on an endpoint that never blocks the user, masking real regressions
root_cause: An `enabled` condition evaluated permissive while the dependency was undefined, and the global retry:3 default amplified each deterministic 4xx into 4 identical requests.
resolution_date: 2026-07-06
related:
  - ../feature-implementations/track-details-view-admin.md
  - ../payment-gateway/payment-gateway-compound-knowledge.md
---

# TanStack Query: gate dependent queries, never retry deterministic 4xx

## Problem

Since 2026-07-03 the price-preview endpoint logged **458 failed vs 306 successful** calls — ~60% of
its traffic failing by design (one track page produced 338 identical `400`s). Purchases were never
blocked, but the noise masked any real regression on the payments surface.

Two independent defects combined:

1. **Firing before the parent loaded.** The `enabled` gate read permissive while the parent item was
   still `undefined`. On the track page, `usesTicketTypes` is derived from the (not-yet-loaded)
   track, so it read `false`, so the preview fired **without a `ticketType`** →
   `TICKET_TYPE_REQUIRED` (400). On the event page, `!event?.trackInfo` was `true` while `event` was
   `undefined`, so a track-bound event fired → `INDIVIDUAL_BOOKING_DISABLED` (400). Enrolled users
   added a permanent failure class (`ALREADY_BOOKED` / `ALREADY_REGISTERED`) on every revisit.
2. **Retrying determinism.** The global `retry: 3` default (`src/App.tsx`) turned every one of these
   deterministic 400s — which a retry can never resolve — into **4** identical failing requests.

## The two rules

### 1. Gate on loaded data with a pure predicate

An `enabled` condition must read **false while the dependency is undefined**. Follow the house
`enabled: Boolean(dependency)` convention, and extract the decision into a **pure, React-free
predicate** so it is unit-testable under `node --test`:

- `src/features/tracks/utils/trackPricePreviewGate.ts` — false until the track loads; false when
  `user_has_booked`; on ticketed tracks, false until a ticket type is chosen (then fires **with** it).
- `src/features/events/utils/eventPricePreviewGate.ts` — false until the event loads; false when
  `attending`; false for a track-bound event until single-booking opens.

Gating on `…Loaded` **alone** killed the storm — the other conditions are correctness, not volume.

### 2. Suppress retries for the whole 4xx class

Add a `retry` predicate that never retries a deterministic client error, keyed on **status class,
not a code list** (the endpoint throws ~nine 4xx codes and the list will drift):

`src/app/api/pricePreviewRetry.ts` — `error instanceof ApiError && status >= 400 && status < 500 →
false`; otherwise `failureCount < cap` (mirrors the numeric `retry: 3`). Wired once into the shared
`usePricePreview` hook, so **every** call site (both detail pages, `PriceBadge`, the checkout dialog)
inherits it.

## Hazard to pin: keep `isLoading`, not `isPending`

A **disabled** (gated-off) query reports `isPending` **forever** — so a consumer that spins on
`isPending` shows an infinite spinner in the gated window. Keep `isLoading` for gated-query
consumers (e.g. `PromoCodeInput`). Do not "modernize" these to `isPending`.

## Server side is correct — do not touch it

`TICKET_TYPE_REQUIRED`, `INDIVIDUAL_BOOKING_DISABLED`, `ALREADY_BOOKED`, … are deliberate contract
responses (`server/src/routes/api/payments.ts`). The defect was purely the client's firing order and
retry policy.
