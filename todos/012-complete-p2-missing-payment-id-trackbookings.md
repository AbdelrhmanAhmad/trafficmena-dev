---
status: pending
priority: p2
issue_id: "012"
tags: [code-review, data-integrity, audit, payment-gateway]
dependencies: []
---

# Missing payment_id on track_bookings Table

## Problem Statement

While `event_attendees` and `subscriptions` have `payment_id` references, `track_bookings` does not. This creates an auditing gap - you cannot directly trace which payment created a track booking.

## Findings

**Agent:** data-integrity-guardian
**Severity:** MEDIUM (P2)

**Location:** `server/src/db/schema/index.ts` lines 185-207

```typescript
export const trackBookings = pgTable('track_bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackId: uuid('track_id')...,
  userId: uuid('user_id')...,
  bookedAt: timestamp('booked_at')...,
  paidAt: timestamp('paid_at')...,
  pricePaidCents: integer('price_paid_cents'),
  // NO payment_id!
});
```

**Impact:**
- Difficult to process refunds for track bookings
- Cannot audit which payment created a booking
- Reconciliation between payments and bookings is complex

## Proposed Solutions

### Solution A: Add payment_id Column (Recommended)
**Pros:** Complete audit trail, consistent with other tables
**Cons:** Requires migration
**Effort:** Low
**Risk:** Low

```sql
ALTER TABLE "track_bookings"
ADD COLUMN "payment_id" uuid REFERENCES payments(id) ON DELETE SET NULL;
```

```typescript
// In schema
paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
```

## Recommended Action

Add migration for payment_id column on track_bookings.

## Technical Details

**Affected Files:**
- `server/src/db/schema/index.ts`
- New migration file: `0017_track_bookings_payment_id.sql`
- `server/src/routes/api/payments.ts` (update booking inserts)

## Acceptance Criteria

- [ ] Add `payment_id` column to `track_bookings` table
- [ ] Update track booking insert to include payment_id
- [ ] FK constraint with ON DELETE SET NULL
- [ ] Test: Track booking shows linked payment

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from security review | Identified by data-integrity-guardian |

## Resources

- Similar pattern: `event_attendees.payment_id`
