---
status: pending
priority: p2
issue_id: "044"
tags: [code-review, analytics, tracks, signup]
dependencies: []
---

# Cover The Free Track Auto-Booking Path In Analytics

## Problem Statement

The new `track_booking` analytics event is only emitted in `useTrackBooking()`, but the post-signup free-track flow auto-books through `useBookTrack()` instead. That means a real conversion path bypasses the new tracking entirely.

## Findings

- `useTrackBooking()` emits `trackTrackBooking()` on successful booking.
- `ThankYouTrack.tsx` auto-books free tracks after signup via `useBookTrack()`.
- `useBookTrack()` does not emit any analytics event.
- The approved model says `track_booking` should fire whenever a free track booking succeeds.

## Proposed Solutions

### Option 1: Share one analytics-aware booking success handler

**Approach:** Move free-track booking analytics into a common helper used by both `useTrackBooking()` and `useBookTrack()`.

**Pros:**
- Prevents path-specific drift.
- Keeps the event definition in one place.

**Cons:**
- Requires harmonizing the two hook implementations.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Emit on the server after track booking insert

**Approach:** Make `track_booking` durable at the booking write boundary and treat client events as optional.

**Pros:**
- Covers every booking path automatically.
- Aligns with the approved tracking model.

**Cons:**
- Larger change and likely tied to later server-side measurement work.

**Effort:** 3-5 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/features/tracks/hooks/useTrackBooking.ts:18-34`
- `src/features/tracks/hooks/useTracks.ts:221-249`
- `src/pages/ThankYouTrack.tsx:45-52`

## Resources

- `docs/events-tracking-data-model.md:567-606`
- `docs/solutions/feature-implementations/track-booking-grants-event-access.md:18`

## Acceptance Criteria

- [ ] Every successful free-track booking path emits exactly one `track_booking` event.
- [ ] Post-signup auto-booking is covered.
- [ ] Duplicate booking states do not produce duplicate analytics.

## Work Log

### 2026-04-15 - Review Discovery

**By:** Codex

**Actions:**
- Compared the two client track-booking hooks.
- Verified that the thank-you auto-book path bypasses the only new analytics call site.

**Learnings:**
- The current implementation instruments a hook, not the actual business event boundary.

