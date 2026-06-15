---
status: addressed
priority: p2
issue_id: "003"
tags: [code-review, security, performance, concurrency, tracks]
dependencies: []
---

# Potential Race Condition in Track Booking Capacity Check

## Problem Statement

The track booking logic uses transactions and `FOR UPDATE` locks on the track row, but the capacity check and booking insertion are not fully atomic. There's a small window between checking `currentBookings` count and inserting the track booking where concurrent requests could exceed the `maxTrackBookings` limit.

**Why it matters:** Under high concurrent load, more bookings than `maxTrackBookings` could theoretically be created.

## Findings

### From Security Sentinel & Performance Oracle

**Location:** `/server/src/routes/api/tracks.ts` (lines 1109-1239)

Current flow:
```typescript
// Line 1152-1158: Check current bookings
const [{ count: currentBookings }] = await tx
  .select({ count: count(trackBookings.id) })
  .from(trackBookings)
  .where(eq(trackBookings.trackId, trackId));
if (track.maxTrackBookings !== null && Number(currentBookings) >= track.maxTrackBookings) {
  throw new ApiError('TRACK_FULL', 'Track booking limit reached.', 409);
}

// ... atomic SQL for event attendees (lines 1163-1204) ...

// Line 1231: Insert track booking (not atomic with capacity check)
await tx.insert(trackBookings).values({ trackId, userId });
```

**Projected Impact:**
| Concurrent Users | Risk Level |
|-----------------|------------|
| 10 | Very Low |
| 100 | Low |
| 1000+ | Medium |

## Proposed Solutions

### Option A: Include Count Check in Atomic CTE (Recommended)
**Pros:** Fully atomic, no race condition possible
**Cons:** More complex SQL
**Effort:** Medium (2-3 hours)
**Risk:** Low

```sql
WITH booking_check AS (
  SELECT COUNT(*) as current_count FROM track_bookings WHERE track_id = $1
),
new_booking AS (
  INSERT INTO track_bookings (track_id, user_id)
  SELECT $1, $2
  WHERE (SELECT current_count FROM booking_check) < $3
  RETURNING id
)
SELECT * FROM new_booking;
```

### Option B: Use SELECT FOR UPDATE on Count Query
**Pros:** Simpler change
**Cons:** Increased lock contention
**Effort:** Small (30 min)
**Risk:** Low

### Option C: Add Database-Level Trigger
**Pros:** Enforced at database level
**Cons:** Logic split between app and DB
**Effort:** Medium (2 hours)
**Risk:** Medium

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:**
- `/server/src/routes/api/tracks.ts` - Track booking endpoint

**Components:** Track booking system

**Database changes:** Potentially add constraint or trigger

## Acceptance Criteria

- [ ] Booking capacity check and insert are atomic
- [ ] Concurrent bookings cannot exceed maxTrackBookings
- [ ] Appropriate error returned when capacity reached
- [ ] Performance not significantly degraded

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-02 | Created | Identified during security/performance review |

## Resources

- **Current implementation:** Lines 1109-1239 in tracks.ts
- **Atomic CTE pattern:** Already used for event registration in same file
