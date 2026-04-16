---
status: pending
priority: p2
issue_id: "048"
tags: [code-review, auth, analytics, react, race-condition]
dependencies: []
---

# Prevent Auth Session Races After OTP Verification

## Problem Statement

`AuthProvider` now exposes both `verifyOtp()` and `refreshSession()`, but the background `loadSession()` request started on mount is still unsynchronized. A stale `/auth/session` response can arrive after OTP verification and overwrite the authenticated user with `null` or older session data.

That creates a user-facing auth race and also corrupts the auth-scoped analytics context that now depends on `user`, `/users/me`, and `/subscriptions/current`.

## Findings

- `AuthProvider` calls `loadSession()` immediately on mount via `useEffect`.
- `loadSession()` always calls `setUser(resolvedUser)` when its request completes, regardless of whether a newer auth action has already succeeded.
- `verifyOtp()` also calls `setUser(resolvedUser)` directly.
- The sign-in flow calls `refreshSession()` after verification, but the signup completion path does not.
- A slower pre-login session request can therefore overwrite a newer verified user, causing transient or persistent guest state after a successful OTP flow.

## Proposed Solutions

### Option 1: Ignore stale auth/session responses

**Approach:** Add request versioning or an incrementing sequence id so only the latest `loadSession()` result is allowed to call `setUser()`.

**Pros:**
- Fixes the race at the root.
- Keeps the existing API shape intact.

**Cons:**
- Requires careful handling of loading state so older requests do not also clobber it.

**Effort:** 2-3 hours

**Risk:** Medium

---

### Option 2: Abort superseded session requests

**Approach:** Use an `AbortController` for `loadSession()` and cancel any in-flight request before starting a newer auth state transition.

**Pros:**
- Prevents stale work from completing at all.
- Makes the intended ownership of auth state more explicit.

**Cons:**
- Slightly more wiring in the auth provider and fetch layer.

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/app/auth/AuthContext.tsx:39-90`
- `src/pages/SignIn.tsx:97-109`
- `src/pages/signup/CheckEmail.tsx:70-91`

## Resources

- `src/app/auth/AuthContext.tsx`
- `src/pages/SignIn.tsx`
- `src/pages/signup/CheckEmail.tsx`

## Acceptance Criteria

- [ ] A stale `/auth/session` response cannot overwrite a newer OTP-authenticated user.
- [ ] Sign-in and sign-up OTP flows keep a stable authenticated user once verification succeeds.
- [ ] Auth-scoped analytics no longer observe guest/user snapbacks caused by session races.
- [ ] A regression test or reproducible verification flow covers mount-time session loading racing with OTP verification.

## Work Log

### 2026-04-15 - Review Discovery

**By:** Codex

**Actions:**
- Traced `loadSession()`, `verifyOtp()`, and the sign-in/sign-up completion flows.
- Verified that the provider has no sequencing or cancellation for concurrent session requests.
- Correlated the race with the new auth-scoped analytics instrumentation.

**Learnings:**
- The change set improved analytics identity capture, but it also made auth state races more damaging.
- Signup is especially exposed because it does not force a follow-up session refresh after OTP verification.
