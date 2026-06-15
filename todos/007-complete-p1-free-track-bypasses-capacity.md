---
status: pending
priority: p1
issue_id: "007"
tags: [code-review, security, data-integrity, payment-gateway]
dependencies: []
---

# Free Track Booking Bypasses Event Capacity Checks

## Problem Statement

When a track is free (amountCents === 0), the code loops through all track events and inserts attendee records using `onConflictDoNothing()`. Unlike the paid track flow (which uses an atomic SQL CTE with capacity validation), this flow:
- Does NOT check if events are at capacity
- Does NOT validate that all events can accept the user
- Silently skips registration on conflict without informing the user

**Impact:** Events can be overbooked when tracks are offered for free. Users could be registered for some events in a track but not others without any error.

## Findings

**Agent:** data-integrity-guardian
**Severity:** HIGH (P1)

**Location:** `server/src/routes/api/payments.ts` lines 641-651

```typescript
for (const { eventId } of trackEventsList) {
  await tx
    .insert(eventAttendees)
    .values({
      eventId,
      userId,
      paidAt: new Date(),
      pricePaidCents: 0,
      paymentId: payment.id,
    })
    .onConflictDoNothing();  // <-- Silently ignores, no capacity check
}
```

The paid track flow (lines 368-427) uses an atomic CTE that:
1. Checks booking window for each event
2. Validates capacity for each event
3. Fails atomically if any event can't accept user

## Proposed Solutions

### Solution A: Use Same CTE Pattern (Recommended)
**Pros:** Consistent behavior, atomic, capacity-safe
**Cons:** More complex, requires SQL changes
**Effort:** Medium
**Risk:** Low

### Solution B: Add Pre-validation Loop
**Pros:** Simpler to understand
**Cons:** Non-atomic (TOCTOU race), more DB queries
**Effort:** Low
**Risk:** Medium (race condition)

## Recommended Action

Use Solution A - port the CTE pattern from paid flow to free flow. Set `pricePaidCents = 0` in the CTE.

## Technical Details

**Affected Files:**
- `server/src/routes/api/payments.ts`

**Database Changes:** None required

## Acceptance Criteria

- [ ] Free track booking checks event capacity before registration
- [ ] Free track booking respects booking window
- [ ] If any event in track is full, entire booking fails with clear error
- [ ] Test: Free track with full event returns error
- [ ] Test: Free track with open events succeeds

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from security review | Found by data-integrity-guardian agent |

## Resources

- PR: feat/payment-gateway-mvp branch
- Review: docs/payment-gateway-security-review.md
