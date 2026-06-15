---
status: pending
priority: p1
issue_id: "008"
tags: [code-review, security, data-integrity, payment-gateway, race-condition]
dependencies: []
---

# Race Condition Between Payment Expiration and Confirmation

## Problem Statement

A timing race exists between `expireStalePendingPayments()` and `processSuccessfulPayment()`:

1. User creates payment at T0
2. At T0+24h-1s, user is completing checkout on Fawaterk
3. At T0+24h, expiration runs and marks payment `'expired'`
4. Webhook arrives 1 second later trying to mark payment `'paid'`
5. Payment is rejected because status is 'expired', not 'pending'

**Impact:** User has paid at the gateway level, but the system rejects the confirmation. Money is collected but no fulfillment occurs. Requires manual intervention.

## Findings

**Agent:** data-integrity-guardian
**Severity:** HIGH (P1)

**Location:**
- `expireStalePendingPayments()` lines 61-77
- `processSuccessfulPayment()` lines 233-479

```typescript
// processSuccessfulPayment line 241-242
const [updated] = await tx
  .update(payments)
  .set({ status: 'paid', paidAt: new Date() })
  .where(and(eq(payments.id, paymentId), eq(payments.status, 'pending')))
  .returning();

// Line 247-251
if (!updated) {
  const [existing] = await tx.select().from(payments).where(eq(payments.id, paymentId));
  if (existing?.status === 'paid') {
    return { alreadyProcessed: true };
  }
  throw new Error('Payment not found or invalid state');  // <-- User loses money
}
```

## Proposed Solutions

### Solution A: Extend Expiry Window to 48-72 hours (Recommended)
**Pros:** Simple fix, low risk
**Cons:** Stale payments visible longer
**Effort:** Low (change one constant)
**Risk:** Very Low

### Solution B: Allow expired -> paid transition
**Pros:** Recovers legitimate payments
**Cons:** More complex logic, potential for abuse
**Effort:** Medium
**Risk:** Medium

### Solution C: Reconciliation Job
**Pros:** Complete solution for edge cases
**Cons:** Complex, requires Fawaterk API polling
**Effort:** High
**Risk:** Low

## Recommended Action

Solution A (immediate): Change `PENDING_PAYMENT_EXPIRY_MS` from 24h to 72h.
Solution C (later): Implement reconciliation job for long-term robustness.

## Technical Details

**Affected Files:**
- `server/src/routes/api/payments.ts` (constant change)

**Database Changes:** None

## Acceptance Criteria

- [ ] Increase expiry window to 72 hours minimum
- [ ] Document the expiry window in code comments
- [ ] Test: Payment completed at 24h+1s still succeeds
- [ ] Consider: Add logging when payment is close to expiry threshold

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from security review | Race condition identified by data-integrity-guardian |

## Resources

- PR: feat/payment-gateway-mvp branch
