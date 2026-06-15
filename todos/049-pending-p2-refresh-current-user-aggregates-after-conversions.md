---
status: pending
priority: p2
issue_id: "049"
tags: [code-review, analytics, react-query, data-quality, payments]
dependencies: []
---

# Refresh Current-User Aggregates After Conversions

## Problem Statement

`/users/me` now powers `global_variables` fields like `total_purchases`, `total_registrations`, `total_revenue`, and `customer_type`, but the conversion mutations that change those values do not invalidate the `current-user` query. Because `useCurrentUser()` caches for five minutes, page-level analytics can stay stale immediately after checkout, registration, cancellation, or booking.

This undercuts the main reason those new aggregates were added in the first place.

## Findings

- `useCurrentUser()` reads `/users/me` with a 5-minute `staleTime`.
- `usePageTracking()` consumes the `useCurrentUser()` aggregates on every tracked route.
- `useCreateCheckout()` and `useVerifyPayment()` invalidate subscription-related caches, but not `current-user`.
- Event booking/cancellation and track booking mutations invalidate event/track caches, but not `current-user`.
- As a result, successful conversions can leave `global_variables` reporting the old totals and customer type until a hard reload or cache expiry.

## Proposed Solutions

### Option 1: Invalidate `current-user` on all successful conversion mutations

**Approach:** Invalidate the base `current-user` query key whenever a mutation changes purchases, registrations, or revenue-related counters.

**Pros:**
- Minimal change surface.
- Keeps `/users/me` as the single source of truth.

**Cons:**
- Requires discipline across all mutation handlers that affect those aggregates.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Optimistically patch the affected aggregates in cache

**Approach:** Update the current-user cache directly inside mutation success handlers, with invalidation as a fallback.

**Pros:**
- Avoids waiting for a refetch.
- Keeps the tracked counters consistent immediately after the mutation resolves.

**Cons:**
- More bookkeeping and more room for drift if mutation semantics change.

**Effort:** 3-5 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/app/hooks/useCurrentUser.ts:11-21`
- `src/lib/analytics/usePageTracking.ts:18-44`
- `src/app/hooks/usePayments.ts:34-60`
- `src/features/events/hooks/useEventBooking.ts:19-89`
- `src/features/tracks/hooks/useTrackBooking.ts:8-24`
- `src/features/tracks/hooks/useTracks.ts:222-247`

## Resources

- `src/app/hooks/useCurrentUser.ts`
- `src/lib/analytics/usePageTracking.ts`
- `src/app/hooks/usePayments.ts`
- `src/features/events/hooks/useEventBooking.ts`
- `src/features/tracks/hooks/useTrackBooking.ts`
- `src/features/tracks/hooks/useTracks.ts`

## Acceptance Criteria

- [ ] Paid checkouts refresh `current-user` before the next tracked route depends on its aggregates.
- [ ] Free event registrations, event cancellations, and free track bookings also refresh `current-user`.
- [ ] `global_variables.customer_type`, `total_purchases`, `total_registrations`, and `total_revenue` reflect the just-completed action without a hard reload.
- [ ] Regression coverage or a manual verification flow proves the counters update immediately after each conversion path.

## Work Log

### 2026-04-15 - Review Discovery

**By:** Codex

**Actions:**
- Traced the new `/users/me` aggregates into `usePageTracking()`.
- Reviewed the payment, event-booking, and track-booking mutation invalidation behavior.
- Confirmed that `current-user` is never refreshed by the successful conversion paths that now change its data.

**Learnings:**
- The query-key scoping fix prevents cross-user leakage, but freshness is still unresolved after same-user mutations.
- This is a second-order analytics bug introduced by moving more reporting state into `/users/me` without updating mutation invalidation.
