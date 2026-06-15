---
status: pending
priority: p3
issue_id: "046"
tags: [code-review, analytics, promo-codes, frontend]
dependencies: []
---

# Reset Promo Code Tracking Dedupe After Removal

## Problem Statement

Promo-code analytics currently dedupe by the last tracked code/result pair, but that ref never resets when the user removes a code and retries it. Re-applying the same code in the same session can therefore disappear from analytics.

## Findings

- `PromoCodeInput` stores the last tracked promo result in `lastTrackedCodeRef`.
- The ref is checked before every tracking call.
- The ref is never cleared when a code is removed or when the component returns to a neutral state.

## Proposed Solutions

### Option 1: Reset dedupe state when the applied code is removed

**Approach:** Clear `lastTrackedCodeRef` whenever the promo code returns to an un-applied state.

**Pros:**
- Small, direct fix.
- Keeps the current dedupe behavior for duplicate rerenders.

**Cons:**
- Still relies on local component state discipline.

**Effort:** <1 hour

**Risk:** Low

---

### Option 2: Dedupe by request instance instead of local ref

**Approach:** Tie promo tracking to actual apply/remove actions rather than render state.

**Pros:**
- Cleaner semantics.
- Less effect-driven edge-case behavior.

**Cons:**
- Slightly more invasive than the immediate bug requires.

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/shared/components/payment/PromoCodeInput.tsx:55-86`

## Resources

- `src/shared/components/payment/PromoCodeInput.tsx`

## Acceptance Criteria

- [ ] Removing and re-applying the same promo code can be tracked again in the same session.
- [ ] Pure rerenders still do not duplicate promo tracking events.

## Work Log

### 2026-04-15 - Review Discovery

**By:** Codex

**Actions:**
- Traced the promo-code tracking effect and dedupe ref lifecycle.
- Confirmed there is no reset path for the ref.

**Learnings:**
- This is low severity, but it will quietly undercount retry behavior until fixed.

