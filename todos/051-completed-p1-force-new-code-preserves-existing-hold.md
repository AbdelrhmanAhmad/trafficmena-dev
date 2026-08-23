---
status: completed
priority: p1
issue_id: "051"
tags: [code-review, payments, reservations, reliability, data-integrity]
dependencies: []
---

# Preserve Existing Holds During Replacement Checkout

## Problem Statement

`forceNewCode` replacement checkout still expires the existing pending payment and deletes its reservations before the new invoice is durable. A validation or gateway failure after that point can leave the buyer without the old valid invoice/seat hold and without a replacement.

## Findings

- `server/src/routes/api/payments.ts:1349` now calculates price before expiring the old hold, which fixes the specific missing-ticket-type destructive path.
- `server/src/routes/api/payments.ts:1388` still marks all matching pending payments `expired`, then `server/src/routes/api/payments.ts:1396` and `server/src/routes/api/payments.ts:1399` delete event/track reservations.
- Later steps can still fail after the old hold is gone: payment method lookup, mobile-wallet phone validation, local capacity reservation, payment insert, and `invoiceInitPay`.
- This violates the payment-system invariant from the review source: a failed replacement request must not destroy the currently usable pending invoice/reservation.

## Proposed Solutions

### Option 1: Reissue Against The Existing Payment

**Approach:** For same item/user/ticket replacements, keep the same pending payment and reservations, call Fawaterk for a fresh invoice/code, then update invoice fields on that payment.

**Pros:**
- Minimal reservation churn.
- Avoids unique-pending conflicts.
- Best fit for "request new code" when price/ticket has not changed.

**Cons:**
- Needs confirmation that Fawaterk accepts a new invoice for the same local payment id.
- If method or price changes, extra validation is needed before overwriting invoice metadata.

**Effort:** Medium

**Risk:** Medium

---

### Option 2: Two-Phase Replacement

**Approach:** Validate all local request requirements first, create the new payment/hold and expire the old one in a single transaction, and only delete the old reservation after the new invoice is successfully attached. On gateway failure, restore or preserve the old hold.

**Pros:**
- Handles ticket/method changes cleanly.
- Keeps local state explicit.

**Cons:**
- More moving parts around the partial unique pending-payment index.
- May need an intermediate status or careful transaction ordering.

**Effort:** Medium/Large

**Risk:** Medium

## Recommended Action

Implemented Option 2. Replacement checkout now validates method/phone before expiring any current
hold, excludes the replaced hold from capacity counts inside the replacement transaction, preserves
old reservations until the new invoice is durable, and restores the old pending payment if gateway
invoice creation fails.

## Technical Details

**Affected files:**
- `server/src/routes/api/payments.ts`
- `tests/unit/ticket-checkout.test.ts`

**Related components:**
- Payment checkout
- Event and track reservations
- Fawaterk invoice creation

## Resources

- Source review: `docs/reviews/2026-06-26-004-ticket-types-comparative-review.md`
- Known pattern: `docs/solutions/payment-gateway/payment-gateway-compound-knowledge.md`
- Known pattern: `docs/solutions/database-issues/drizzle-transaction-atomicity.md`

## Acceptance Criteria

- [x] A failed replacement checkout preserves the previous pending payment and active reservations.
- [x] Failure cases include invalid method, missing mobile-wallet phone, capacity failure, and Fawaterk invoice failure.
- [x] Regression tests prove the old hold survives when replacement creation fails.
- [x] Successful replacement still leaves only one active pending invoice/hold for the item.

## Work Log

### 2026-06-26 - Review Discovery

**By:** Codex

**Actions:**
- Reviewed remediation delta from `fc2a342f2d658d9ca074ecba9e053fb27730906a`.
- Confirmed price validation moved before expiration.
- Found remaining post-expiration failure paths before a replacement invoice is durable.

**Learnings:**
- The missing-ticket-type path is now safe, but the broader replacement invariant is not fully enforced.

### 2026-06-26 - Fixed

**By:** Codex

**Actions:**
- Added replacement helpers in `server/src/routes/api/payments.ts` to expire, restore, and delete
  replaced holds only at the safe points.
- Moved payment method and mobile-wallet phone validation ahead of replacement expiration.
- Kept old reservations in capacity math by excluding only the replaced payment id while the new
  hold is created.
- Added `tests/unit/payment-replacement-safety.test.ts` and updated checkout safety guards.

**Verification:**
- `npm run test:unit`
- `npm --prefix server run build`
- `npm run lint`
- `npm run build`
