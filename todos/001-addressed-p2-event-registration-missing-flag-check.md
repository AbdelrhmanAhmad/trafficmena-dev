---
status: addressed
priority: p2
issue_id: "001"
tags: [code-review, security, data-integrity, tracks]
dependencies: []
---

# Event Registration Missing allowIndividualBooking Flag Check

## Problem Statement

The event registration endpoint (`/api/events/:id/register`) checks for `singleBookingStart` and `singleBookingEnd` dates but does NOT check the new `allowIndividualBooking` flag. This creates a business logic gap where users could register for individual events even when the track owner intended to disable this feature.

**Why it matters:** A track could have `allowIndividualBooking = false` but still have booking dates set from previous configuration, allowing unintended individual event registrations.

## Findings

### From Data Integrity Guardian

**Location:** `/server/src/routes/api/events.ts` (lines 596-617)

Current code only checks dates:
```typescript
if (trackEvent) {
  if (!trackEvent.singleBookingStart || !trackEvent.singleBookingEnd) {
    throw new ApiError(
      'BOOKING_NOT_OPEN',
      'Single event booking is not enabled for this track.',
      400,
    );
  }
  // ...
}
```

The query at lines 596-604 does not select `allowIndividualBooking`:
```typescript
const [trackEvent] = await tx
  .select({
    trackId: tracks.id,
    singleBookingStart: tracks.singleBookingStart,
    singleBookingEnd: tracks.singleBookingEnd,
    // Missing: allowIndividualBooking
  })
```

## Proposed Solutions

### Option A: Add Flag Check to Event Registration (Recommended)
**Pros:** Complete fix, maintains defense in depth
**Cons:** Small code change needed
**Effort:** Small (30 min)
**Risk:** Low

```typescript
const [trackEvent] = await tx
  .select({
    trackId: tracks.id,
    singleBookingStart: tracks.singleBookingStart,
    singleBookingEnd: tracks.singleBookingEnd,
    allowIndividualBooking: tracks.allowIndividualBooking,
  })
  .from(trackEvents)
  .innerJoin(tracks, eq(tracks.id, trackEvents.trackId))
  .where(eq(trackEvents.eventId, eventId));

if (trackEvent) {
  if (!trackEvent.allowIndividualBooking) {
    throw new ApiError(
      'INDIVIDUAL_BOOKING_DISABLED',
      'Individual event booking is not available for this track.',
      400,
    );
  }
  // existing date checks...
}
```

### Option B: Clear Dates When Flag is Disabled
**Pros:** Prevents invalid state entirely
**Cons:** More invasive change, affects update logic
**Effort:** Medium (1-2 hours)
**Risk:** Medium - could affect existing tracks

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:**
- `/server/src/routes/api/events.ts` - Event registration endpoint

**Components:** Event booking system, Track booking validation

**Database changes:** None required

## Acceptance Criteria

- [ ] Event registration checks `allowIndividualBooking` flag before allowing individual bookings
- [ ] Users cannot register for individual events when flag is `false`
- [ ] Error message clearly indicates individual booking is disabled
- [ ] Existing track bookings continue to work

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-02 | Created | Identified during code review |

## Resources

- **Related PR:** feat/optional-individual-track-booking branch
- **Similar patterns:** Track booking endpoint at `/server/src/routes/api/tracks.ts`
