---
status: pending
priority: p2
issue_id: "039"
tags: [code-review, analytics, payments, backend, data-quality]
dependencies: []
---

# Fix Purchase Customer Type And First Purchase Classification

## Problem Statement

The new analytics flow derives purchase segmentation from `totalPaidPurchases`, but the backend count excludes subscription payments and the client reads that count after payment verification. As implemented, `global_variables`, `purchase`, `first_purchase`, and `subscribe` can all classify customers incorrectly.

This breaks one of the highest-value analytics dimensions in the approved data model.

## Findings

- `/api/users/me` counts only paid non-subscription payments.
- The approved analytics model says `global_variables` and `subscribe` must count all prior paid payments, and `subscribe` must exclude only the current payment.
- `payment/pending` and `payment/success` pass `currentUserData.totalPaidPurchases` into `getCustomerTypeForPurchase()` after the payment is already marked paid.
- Depending on cache state, a first purchase can be treated as returning, and subscribed users can still look like `free`.

## Proposed Solutions

### Option 1: Expose dedicated analytics counters from the backend

**Approach:** Return separate fields for `priorPaidPurchasesAnyType` and `priorPaidPurchasesNonSubscription`, with clear semantics for each event family.

**Pros:**
- Matches the approved data model cleanly.
- Removes guesswork from the client.

**Cons:**
- Expands the API contract.

**Effort:** 3-5 hours

**Risk:** Medium

---

### Option 2: Derive prior counts in payment verification responses

**Approach:** Attach the correct prior-purchase counts to payment verification/payment fetch responses and use those values directly in purchase/subscribe tracking.

**Pros:**
- Keeps purchase attribution close to the payment lifecycle.
- Avoids overloading `/users/me`.

**Cons:**
- Still leaves `global_variables` needing a separate count source.

**Effort:** 3-4 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `server/src/routes/api/users.ts:252-267`
- `src/lib/analytics/helpers.ts:37-44`
- `src/pages/payment/pending.tsx:149-203`
- `src/pages/payment/success.tsx:42-99`

## Resources

- `docs/events-tracking-data-model.md:747-759`
- `docs/events-tracking-data-model.md:845-860`
- `docs/events-tracking-data-model.md:954-969`
- `docs/events-tracking-data-model.md:1326-1343`

## Acceptance Criteria

- [ ] `purchase` uses prior non-subscription paid purchases and fires `first_purchase` only when that prior count is zero.
- [ ] `subscribe` uses prior paid purchases across all payment types, excluding the current payment.
- [ ] `global_variables.customer_type` is derived from all prior paid payments, not a non-subscription-only subset.
- [ ] The client no longer depends on stale `/users/me` cache state to classify purchases.

## Work Log

### 2026-04-15 - Review Discovery

**By:** Codex

**Actions:**
- Compared the implementation against the approved tracking data model.
- Reviewed both client purchase effects and the new `/users/me` aggregation logic.

**Learnings:**
- The bug is partly semantic and partly timing-related.
- The current single `totalPaidPurchases` field cannot satisfy every analytics use case correctly.

