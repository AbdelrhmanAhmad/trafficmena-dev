---
status: completed
priority: p2
issue_id: "054"
tags: [code-review, payments, operations, reliability]
dependencies: []
---

# Persist Paid-But-Unfulfilled Payment Remediation

## Problem Statement

Gateway-confirmed payments that fail local fulfillment still do not produce a durable operator-visible remediation state. The current fix logs the failure and may mark pending rows failed, but support/finance need a deterministic way to find and resolve charged users without bookings.

## Findings

- `server/src/routes/api/payments.ts:276` adds structured logging through `reportPaidFulfillmentFailure`.
- `server/src/routes/api/payments.ts:979` marks pending payments as `failed` on fulfillment errors, deletes reservations, then rethrows.
- Expired-payment recovery failures can remain `expired` because `shouldMarkFailedOnError` is only true for pending rows.
- There is no persisted failure reason, dead-letter table, admin queue, or runbook query specifically for "Fawaterk paid, local fulfillment failed".
- This leaves the original review's operator-remediation requirement only partially addressed.

## Proposed Solutions

### Option 1: MVP Dead-Letter Table

**Approach:** Add a small `payment_fulfillment_failures` table with payment id, invoice id, item info, error code/message, first/last seen, and resolved fields.

**Pros:**
- Durable and queryable.
- Clear support/finance handoff.
- Can be populated from verify, webhook, and reconciliation paths.

**Cons:**
- Requires a migration.
- Needs minimal admin/runbook follow-through.

**Effort:** Medium

**Risk:** Medium

---

### Option 2: Minimal Existing-Table State

**Approach:** Add failure metadata columns to `payments` and standardize failed/expired recovery failures into an operator-queryable state.

**Pros:**
- Fewer joins.
- Easy daily verification query.

**Cons:**
- Expands a central table.
- Still needs clear semantics for failed vs expired vs paid.

**Effort:** Medium

**Risk:** Medium

---

### Option 3: Runbook-Only Interim

**Approach:** Document exact log searches and SQL/Fawaterk comparison steps, and wire logging to production alerting.

**Pros:**
- Fastest.
- No schema change.

**Cons:**
- Weaker than durable state.
- Easy to miss if logs are unavailable or retention is short.

**Effort:** Small

**Risk:** Medium/High

## Recommended Action

Implemented Option 1. Gateway-paid/local-fulfillment failures now upsert into an operator-queryable
dead-letter table and the payment reliability runbook includes the triage and resolution queries.

## Technical Details

**Affected files:**
- `server/src/routes/api/payments.ts`
- `server/src/jobs/*` payment reconciliation code, if present
- `docs/runbooks/payment-reliability-operations.md`
- Database schema/migration if choosing Option 1 or 2

## Resources

- Source review: `docs/reviews/2026-06-26-004-ticket-types-comparative-review.md`
- Runbook: `docs/runbooks/payment-reliability-operations.md`
- Known pattern: `docs/solutions/payment-gateway/payment-gateway-compound-knowledge.md`

## Acceptance Criteria

- [x] A gateway-paid/local-fulfillment-failed case is durable and queryable by operators.
- [x] Recovery failures from both `pending` and `expired` initial states are captured.
- [x] Runbook includes exact triage queries and refund/manual-booking decision steps.
- [x] Tests simulate fulfillment failure after a paid gateway response.

## Work Log

### 2026-06-26 - Review Discovery

**By:** Codex

**Actions:**
- Reviewed `processSuccessfulPayment` failure handling and new structured logging.
- Searched docs and tests for a durable remediation workflow.

**Learnings:**
- Logging is a useful first step, but not enough for a payment trust failure where finance must reconcile charged users.

### 2026-06-26 - Fixed

**By:** Codex

**Actions:**
- Added `paymentFulfillmentFailures` to the Drizzle schema and generated migration
  `server/drizzle/0020_complete_sandman.sql`.
- Persisted paid fulfillment failures from `processSuccessfulPayment` with confirmation source,
  payment context, error details, and unresolved/resolved fields.
- Updated `docs/runbooks/payment-reliability-operations.md` with exact unresolved-failure lookup
  and resolution SQL.
- Added `tests/unit/payment-fulfillment-failure.test.ts`.

**Verification:**
- `npm run test:unit`
- `npm --prefix server run build`
- `npm run lint`
- `npm run build`
