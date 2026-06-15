---
status: pending
priority: p2
issue_id: "020"
tags: [code-review, performance, database, index]
dependencies: []
---

# P2: Missing Composite Index for Payment Expiration Job

## Problem Statement

The payment expiration background job queries by `(status, createdAt)` but only a single-column index on `status` exists. This causes inefficient query execution as payment volume grows.

**Impact:** O(n) scan on pending payments instead of O(log n) index lookup.

## Findings

**Location:** `server/src/jobs/paymentExpiration.ts` lines 15-28

```typescript
await db.update(payments)
  .set({ status: 'expired' })
  .where(and(
    eq(payments.status, 'pending'),
    lte(payments.createdAt, expiryThreshold)
  ));
```

Current index in migration 0015:
```sql
CREATE INDEX payments_status_idx ON payments (status);
```

Missing: Composite index for the expiration query pattern.

## Proposed Solutions

### Solution 1: Add Composite Partial Index (Recommended)
**Pros:** Optimal for this query pattern
**Cons:** Requires migration
**Effort:** 15 minutes
**Risk:** Low

```sql
CREATE INDEX payments_pending_created_at_idx
ON payments (created_at)
WHERE status = 'pending';
```

### Solution 2: Add Full Composite Index
**Pros:** More general purpose
**Cons:** Larger index size
**Effort:** 15 minutes
**Risk:** Low

```sql
CREATE INDEX payments_status_created_at_idx
ON payments (status, created_at);
```

## Recommended Action

Implement Solution 1 in next migration.

## Technical Details

**Affected Files:**
- New migration file: `server/drizzle/0018_payment_expiration_index.sql`

## Acceptance Criteria

- [ ] Composite index created for expiration query
- [ ] Migration applied successfully
- [ ] Query plan shows index scan (not seq scan)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-01-16 | Created from code review | Background jobs need optimized indexes |

## Resources

- Performance Oracle review finding
