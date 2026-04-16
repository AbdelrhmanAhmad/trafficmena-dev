---
status: pending
priority: p2
issue_id: "042"
tags: [code-review, analytics, auth, signin]
dependencies: []
---

# Fix Login Funnel Event Timing And Failure Semantics

## Problem Statement

The login funnel events are wired to the wrong lifecycle moments. `login_start` fires only after the OTP request succeeds, and the `login` failure event can be produced by a post-verification session refresh failure rather than an actual OTP failure.

This distorts the signin funnel and makes it harder to understand auth drop-off.

## Findings

- The approved model says `login_start` should fire when the user submits email to request an OTP.
- `SignIn.tsx` fires `trackLoginStart()` only after `requestOtp()` resolves successfully.
- `trackLogin({ status: 'failure' })` is emitted from the shared `catch`, which also covers `refreshSession()` failures after `verifyOtp()` succeeds.

## Proposed Solutions

### Option 1: Emit intent before the request and split failure modes

**Approach:** Fire `login_start` immediately on submit, and distinguish OTP verification failures from post-login session bootstrapping failures.

**Pros:**
- Matches the documented funnel semantics.
- Improves analytics truthfulness without a large refactor.

**Cons:**
- Requires a small amount of extra control-flow branching.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Introduce explicit auth event states

**Approach:** Model signin as a tiny state machine so each stage emits its own event from a single source of truth.

**Pros:**
- Easier to extend later.
- Reduces accidental mislabeling.

**Cons:**
- More code than the immediate problem strictly requires.

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/pages/SignIn.tsx:53-101`
- `src/lib/analytics/events.ts:8-36`

## Resources

- `docs/events-tracking-data-model.md:157-215`

## Acceptance Criteria

- [ ] `login_start` fires on OTP request submission, not only on success.
- [ ] Failed OTP sends are visible in analytics.
- [ ] `login` failure is reserved for actual login/verification failure, not unrelated session refresh issues.

## Work Log

### 2026-04-15 - Review Discovery

**By:** Codex

**Actions:**
- Reviewed the sign-in submit and verify handlers.
- Compared current event timing with the documented login event triggers.

**Learnings:**
- The implementation captures activity, but not at the lifecycle boundaries the funnel report assumes.

