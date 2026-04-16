---
status: pending
priority: p2
issue_id: "040"
tags: [code-review, analytics, payments, schema]
dependencies: []
---

# Bring Payment Event Payloads Back In Line With The Approved Data Model

## Problem Statement

The checkout and payment events do not currently match the approved analytics schema. They use `item_type` values like `event` and `track`, leave `payment_type` blank on successful purchase events, drop coupon/discount/original-value information, and can emit `value = 0` if checkout is submitted before pricing resolves.

This creates schema drift between the implementation and the reporting model GTM and downstream consumers expect.

## Findings

- `trackBeginCheckout`, `trackSelectPaymentMethod`, and `trackPurchase` accept arbitrary `itemType` strings and forward raw `event` / `track` values.
- The approved model expects `event_ticket`, `track_booking`, or `subscription`.
- `payment/pending` and `payment/success` populate `paymentType`, `coupon`, `discount`, and `originalValue` with empty or zero placeholders instead of real checkout data.
- `PaymentCheckoutDialog` can call `trackSelectPaymentMethod()` while `pricePreview` is still unresolved, producing zero-value telemetry.

## Proposed Solutions

### Option 1: Add a dedicated analytics mapping layer for payment events

**Approach:** Centralize conversion from app-level payment types and checkout state into the exact analytics payload expected by the data model.

**Pros:**
- Makes schema compliance explicit.
- Prevents every call site from re-implementing event mapping.

**Cons:**
- Requires plumbing richer checkout metadata through the purchase-confirmation path.

**Effort:** 3-5 hours

**Risk:** Medium

---

### Option 2: Expand payment APIs to return analytics-ready metadata

**Approach:** Persist and expose method name, promo code, discount amount, and original amount so success/pending pages can emit canonical payloads without reconstructing them.

**Pros:**
- Reduces client inference.
- Helps future server-side Measurement Protocol work too.

**Cons:**
- Larger backend and contract change.

**Effort:** 4-6 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/lib/analytics/events.ts:147-288`
- `src/shared/components/payment/PaymentCheckoutDialog.tsx:91-170`
- `src/pages/payment/pending.tsx:159-193`
- `src/pages/payment/success.tsx:53-87`
- `src/app/api/payments.ts:9-79`

## Resources

- `docs/events-tracking-data-model.md:620-704`
- `docs/events-tracking-data-model.md:845-905`
- `docs/events-tracking-data-model.md:954-986`

## Acceptance Criteria

- [ ] All payment-related events use the approved `item_type` vocabulary.
- [ ] `purchase` and `subscribe` include real `payment_type`, `coupon`, `discount`, and `original_value` values when available.
- [ ] Checkout analytics cannot emit zero-value payloads due to a fast click while pricing is loading.
- [ ] One verification path demonstrates that GTM consumers receive the documented payload shape.

## Work Log

### 2026-04-15 - Review Discovery

**By:** Codex

**Actions:**
- Diffed the new analytics event helpers against the published tracking contract.
- Inspected the checkout, pending, and success flows for where payment metadata is lost.

**Learnings:**
- The current implementation captures many events, but the payload semantics are not yet trustworthy enough for reporting.

