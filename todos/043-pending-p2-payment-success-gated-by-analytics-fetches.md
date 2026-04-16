---
status: pending
priority: p2
issue_id: "043"
tags: [code-review, payments, analytics, ux, reliability]
dependencies: []
---

# Decouple Payment Success Navigation From Analytics Fetch Dependencies

## Problem Statement

After payment verification succeeds, the success page now waits for `paymentData` and `currentUserData` before emitting analytics and navigating to the dedicated thank-you page. If either query is slow or fails, the user can get stranded on `/payment/success` and the conversion event is never emitted.

That turns an analytics dependency into a user-facing dead end.

## Findings

- `PaymentSuccessPage` verifies payment from `invoice_id`.
- The success effect returns early until both `paymentData` and `currentUserData` are present.
- The thank-you redirect happens inside that same gated effect.
- The established product pattern is to route successful purchases to dedicated thank-you pages promptly.

## Proposed Solutions

### Option 1: Navigate independently of analytics enrichment

**Approach:** Redirect immediately after verification confirms `paid`, and let analytics enrichment happen opportunistically or elsewhere.

**Pros:**
- Restores user flow reliability.
- Prevents analytics from blocking fulfillment UX.

**Cons:**
- Requires a separate durable place to finish enrichment if the page unmounts quickly.

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Pass the required metadata through the success URL or verification response

**Approach:** Make the success route self-sufficient so it does not need extra queries before redirecting.

**Pros:**
- Keeps analytics and redirect in one place.
- Avoids extra round trips on the success page.

**Cons:**
- Requires contract changes and careful handling of URL/query payloads.

**Effort:** 3-4 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/pages/payment/success.tsx:24-99`

## Resources

- `docs/solutions/feature-implementations/thank-you-page-pattern.md:19`
- `docs/solutions/feature-implementations/thank-you-page-pattern.md:165`

## Acceptance Criteria

- [ ] A verified paid payment always reaches the correct thank-you destination even if enrichment queries fail.
- [ ] Analytics emission no longer blocks the user-facing success flow.
- [ ] The success path has a defined fallback if enrichment data is unavailable.

## Work Log

### 2026-04-15 - Review Discovery

**By:** Codex

**Actions:**
- Traced the payment success effect order.
- Compared the current behavior with the existing thank-you page pattern in repo docs.

**Learnings:**
- The current code prioritizes analytics completeness over fulfillment UX, which is the wrong trade-off for this route.

