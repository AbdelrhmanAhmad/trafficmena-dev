---
status: pending
priority: p2
issue_id: "041"
tags: [code-review, analytics, signup, auth]
dependencies: []
---

# Emit Sign Up With The Actual Account Identity

## Problem Statement

The new `sign_up` event is emitted without the created user's real `user_id`, and one completion path also drops the captured name and phone fields. That means the acquisition conversion cannot be reliably joined back to the actual account record.

## Findings

- `CheckEmail.tsx` calls `trackSignUp({ userId: '', email, firstName: '', lastName: '' })`.
- `Step5.tsx` calls `trackSignUp(...)` with a blank `userId` even when invitation activation succeeds.
- The approved data model marks `user_id`, `first_name`, `last_name`, and `phone` as part of the canonical `sign_up` event payload.
- The implementation currently treats signup completion as a client-only event even though the approved model also recommends a backend-confirmed path.

## Proposed Solutions

### Option 1: Track sign-up only after the authenticated user/profile is available

**Approach:** Read the just-created session/profile data and emit `sign_up` only once the real account identity is known.

**Pros:**
- Keeps the client-side event accurate.
- Minimal architectural change.

**Cons:**
- Still depends on client-side timing and navigation order.

**Effort:** 2-3 hours

**Risk:** Medium

---

### Option 2: Move canonical sign-up emission to the backend

**Approach:** Fire the durable `sign_up` event when the profile record is confirmed created, and keep the client event only as a non-canonical fallback if needed.

**Pros:**
- Aligns with the approved tracking model.
- Survives early navigation or tab close.

**Cons:**
- Requires backend work and eventual Measurement Protocol integration.

**Effort:** 4-6 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/pages/signup/CheckEmail.tsx:67-70`
- `src/pages/signup/Step5.tsx:79-85`
- `src/lib/analytics/events.ts:38-58`

## Resources

- `docs/events-tracking-data-model.md:270-322`

## Acceptance Criteria

- [ ] `sign_up` always includes the actual created `user_id`.
- [ ] Standard and invitation-based signup flows both include the documented identity fields.
- [ ] Duplicate `sign_up` emission is prevented across the alternative signup completion paths.

## Work Log

### 2026-04-15 - Review Discovery

**By:** Codex

**Actions:**
- Reviewed both signup completion branches and the new analytics helper.
- Compared the emitted payload with the approved sign-up schema.

**Learnings:**
- The event is present, but it is not yet attributable.
- This is exactly the kind of high-value conversion event that should not rely on placeholder identity fields.

