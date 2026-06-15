---
status: pending
priority: p1
issue_id: "037"
tags: [code-review, analytics, privacy, auth, react-query]
dependencies: []
---

# Scope Analytics Caches To The Authenticated User

## Problem Statement

The new shell-level analytics tracker reads `useCurrentUser()` and `useCurrentSubscription()` from globally keyed React Query caches. Because sign-out does not clear those caches, a second user signing in in the same tab can inherit the previous account's profile, subscription, and purchase metadata in `global_variables`.

This is a cross-session privacy leak and a data-integrity bug in the most sensitive tracking payload in the app.

## Findings

- `useCurrentUser()` uses a single `['current-user']` cache key with a 5 minute `staleTime`, independent of user identity.
- `useCurrentSubscription()` uses a single `['current-subscription']` cache key with a 60 second `staleTime`, also independent of user identity.
- `useAuth().signOut()` only calls the auth layer; it does not invalidate either query cache.
- `usePageTracking()` pushes `email`, `phone`, `first_name`, `last_name`, `subscription_status`, and `total_purchases` from those cached values.
- On a same-tab sign-out followed by sign-in as another user, the next tracked route can combine the new auth session with the previous user's cached profile/subscription data.

## Proposed Solutions

### Option 1: Make user-specific query keys auth-scoped

**Approach:** Include the authenticated user id in the query keys for current-user and current-subscription, and reset tracking state when the auth user changes.

**Pros:**
- Eliminates cross-user cache reuse at the root.
- Keeps cache semantics explicit and easy to reason about.

**Cons:**
- Requires touching shared hooks and every consumer that assumes global keys.

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 2: Explicitly clear sensitive caches on sign-out and sign-in transitions

**Approach:** Invalidate or remove current-user/current-subscription queries during auth boundary changes, and rehydrate analytics only after fresh data resolves.

**Pros:**
- Smaller change surface than rewriting keys.
- Can be applied quickly as a containment fix.

**Cons:**
- Easier to regress later because correctness depends on lifecycle discipline.

**Effort:** 1-2 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/app/hooks/useCurrentUser.ts:9-18`
- `src/app/hooks/useSubscriptions.ts:37-42`
- `src/shared/context/AuthContext.tsx:29-40`
- `src/lib/analytics/usePageTracking.ts:18-49`

## Resources

- `src/app/hooks/useCurrentUser.ts`
- `src/app/hooks/useSubscriptions.ts`
- `src/shared/context/AuthContext.tsx`
- `src/lib/analytics/usePageTracking.ts`
- `docs/branch-learnings/QUICK_REFERENCE.md:176`

## Acceptance Criteria

- [ ] Current-user and current-subscription cache entries cannot leak between different authenticated users in the same tab.
- [ ] Signing out clears or isolates all analytics-dependent user caches.
- [ ] `global_variables` never includes profile/subscription data from a previous session.
- [ ] A regression test or reproducible verification flow covers sign-out then sign-in-as-different-user behavior.

## Work Log

### 2026-04-15 - Review Discovery

**By:** Codex

**Actions:**
- Reviewed the new shell-level analytics tracker and auth/query hooks.
- Confirmed that the relevant React Query caches are keyed globally and not invalidated on sign-out.
- Cross-checked the issue with subagent review results.

**Learnings:**
- This is both an analytics correctness issue and a real privacy boundary issue.
- The risk is amplified because `global_variables` includes PII fields on every tracked route.

