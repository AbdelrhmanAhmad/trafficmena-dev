---
status: pending
priority: p3
issue_id: "036"
tags: [code-review, agent-native, api]
dependencies: []
---

# API Benefits Array Outdated

## Problem Statement

The `/api/subscriptions/info` endpoint returns a hardcoded benefits array that doesn't match the new benefits shown in the redesigned UI. This creates inconsistency between what agents/API consumers see vs what users see.

**Why it matters:** Agents querying the API get different (outdated) information than what's displayed to users.

## Findings

**Source:** Agent-Native Reviewer agent

### API Response (outdated)
- **File:** `server/src/routes/api/subscriptions.ts`
- **Lines:** 161-166

```typescript
benefits: [
  'Free access to all online events',
  `${getEffectiveDiscountPercent(...)}% discount on offline events`,
  `${getEffectiveDiscountPercent(...)}% discount on track bundles`,
  'Full access to the knowledge library',
],
```

### UI Display (current)
From `HERO_BENEFITS` in content.ts:
- 'Content Marketing Track (6 sessions)'
- 'Performance Marketing Track (7 sessions)'
- '2x monthly expert sessions'
- 'All future online tracks included'
- '20%+ off all offline events'

## Proposed Solutions

### Option A: Update API to match UI (Recommended)
**Pros:** Consistent information across channels
**Cons:** Breaking change for any existing API consumers
**Effort:** Medium (15 minutes)
**Risk:** Low (verify no consumers depend on current format)

### Option B: Add new endpoint for plan details
**Pros:** Non-breaking, more comprehensive
**Cons:** More work
**Effort:** Medium-Large (30 minutes)
**Risk:** Low

Add `GET /api/subscriptions/plans` that returns full plan details, track info, and marketing content.

## Recommended Action

[To be filled during triage]

## Technical Details

**Affected files:**
- `server/src/routes/api/subscriptions.ts`

**Database changes:** None

## Acceptance Criteria

- [ ] API benefits match UI benefits
- [ ] Agent can query accurate subscription info
- [ ] Existing functionality not broken
- [ ] Lint passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from code review | Agent-native gap identified |

## Resources

- PR branch: `feat/subscribe-page-redesign`
- Agent-Native Score: 8/12 capabilities accessible
