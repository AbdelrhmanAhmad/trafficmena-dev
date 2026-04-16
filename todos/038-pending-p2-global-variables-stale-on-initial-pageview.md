---
status: pending
priority: p2
issue_id: "038"
tags: [code-review, analytics, frontend, data-quality]
dependencies: []
---

# Refresh Global Variables After User Data Resolves

## Problem Statement

`global_variables` is currently emitted once per pathname and then permanently suppressed for that route. On first render, auth-adjacent data such as `currentUser` and `currentSubscription` often has not resolved yet, so the pageview is recorded with guest or empty values and never corrected.

This undermines the foundation event that every other report depends on.

## Findings

- `usePageTracking()` stores the last pathname in `prevPathRef`.
- The effect returns early whenever the pathname matches, even if `user`, `currentUser`, or `subscription` changed.
- The hook depends on `pathname`, `user`, `currentUser`, and `subscription`, but the guard only considers `pathname`.
- Logged-in users can therefore emit `customer_type = ''` or stale subscription/profile fields on the initial pageview.

## Proposed Solutions

### Option 1: Track a richer emission key

**Approach:** Gate duplicate suppression on a composite key such as `pathname + user id + subscription status + purchase count`, not pathname alone.

**Pros:**
- Preserves dedupe while allowing meaningful updates.
- Keeps the existing effect structure.

**Cons:**
- Requires careful definition of which fields should trigger a correction push.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Split route-change tracking from user-context hydration

**Approach:** Emit one pageview event for route change and a second corrective event once auth/profile/subscription state is ready.

**Pros:**
- Makes timing explicit and easier to debug.
- Avoids encoding too much logic into a single dedupe key.

**Cons:**
- Requires GTM/tagging consumers to tolerate the two-step model.

**Effort:** 2-3 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/lib/analytics/usePageTracking.ts:18-50`
- `src/App.tsx:20-23,119`

## Resources

- `src/lib/analytics/usePageTracking.ts`
- `docs/events-tracking-data-model.md:53`

## Acceptance Criteria

- [ ] A logged-in user landing directly on a page gets a `global_variables` event with resolved user context, not guest placeholders.
- [ ] Route changes still emit at most one canonical `global_variables` event per meaningful state transition.
- [ ] The implementation is resilient to async resolution order between auth, profile, and subscription queries.

## Work Log

### 2026-04-15 - Review Discovery

**By:** Codex

**Actions:**
- Traced the new `usePageTracking()` effect and its dependency model.
- Validated the issue against reviewer feedback from multiple subagents.

**Learnings:**
- The bug is not about missing dependencies; it is caused by the pathname-only dedupe guard.

