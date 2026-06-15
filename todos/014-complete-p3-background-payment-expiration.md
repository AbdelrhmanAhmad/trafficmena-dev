---
status: pending
priority: p3
issue_id: "014"
tags: [code-review, architecture, performance]
dependencies: ["008"]
---

# Move Payment Expiration to Background Job

## Problem Statement

Currently `expireStalePendingPayments()` runs on every checkout request. This adds latency to every checkout even when no stale payments exist.

If a user abandons checkout, their pending payment only expires when they next attempt checkout. A background job would be more reliable.

## Findings

**Agents:** architecture-strategist, performance-oracle
**Severity:** LOW (P3) - Enhancement

**Location:** `server/src/routes/api/payments.ts` line 563

```typescript
// P1-10: Expire stale pending payments to prevent accumulation
await expireStalePendingPayments(userId);
```

## Proposed Solutions

### Solution A: Hourly Cron Job (Recommended)
**Pros:** Predictable, removes latency from checkout
**Cons:** Requires cron setup
**Effort:** Low
**Risk:** Very Low

```typescript
// Run hourly
cron.schedule('0 * * * *', async () => {
  await db
    .update(payments)
    .set({ status: 'expired' })
    .where(
      and(
        eq(payments.status, 'pending'),
        lte(payments.createdAt, new Date(Date.now() - PENDING_PAYMENT_EXPIRY_MS)),
      ),
    );
});
```

### Solution B: Keep Current + Add Background Job
**Pros:** Best of both approaches
**Cons:** Duplicate logic
**Effort:** Low
**Risk:** Very Low

## Recommended Action

After addressing P1 (issue 008), implement Solution A.

## Technical Details

**Affected Files:**
- `server/src/routes/api/payments.ts`
- `server/src/index.ts` (add cron job)

## Acceptance Criteria

- [ ] Add hourly cron job for payment expiration
- [ ] Remove per-checkout expiration call
- [ ] Log expiration count for monitoring
- [ ] Test: Stale payments expire within 1 hour of threshold

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from security review | Identified by architecture-strategist |

## Resources

- node-cron: https://github.com/node-cron/node-cron
