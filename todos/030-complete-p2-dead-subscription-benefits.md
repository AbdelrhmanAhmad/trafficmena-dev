---
status: pending
priority: p2
issue_id: "030"
tags: [code-review, dead-code, simplicity]
dependencies: []
---

# Dead SUBSCRIPTION_BENEFITS Array

## Problem Statement

The `SUBSCRIPTION_BENEFITS` array in `dashboard/Subscribe.tsx` appears to be dead code - it duplicates content from `HERO_BENEFITS` in `content.ts` and the page already imports and uses `HERO_BENEFITS`.

**Why it matters:** Dead code increases maintenance burden and causes confusion about which is the source of truth.

## Findings

**Source:** Simplicity Review agent

### Location
- **File:** `src/pages/dashboard/Subscribe.tsx`
- **Lines:** 32-38

```typescript
const SUBSCRIPTION_BENEFITS = [
  'Content Marketing Track (6 sessions)',
  'Performance Marketing Track (7 sessions)',
  '2x monthly expert sessions',
  'All future online tracks included',
  '20%+ off all offline events',
  'Exclusive playbooks & templates',  // Extra item not in HERO_BENEFITS
];
```

### Observation
The page imports `HERO_BENEFITS` from `content.ts` and uses it in the HeroSection. The local `SUBSCRIPTION_BENEFITS` appears unused or redundant.

## Proposed Solutions

### Option A: Delete the array (Recommended)
**Pros:** Removes dead code, single source of truth
**Cons:** Need to verify it's truly unused first
**Effort:** Small (2 minutes)
**Risk:** Low (verify usage first)

### Option B: Consolidate with HERO_BENEFITS
**Pros:** If the extra item is needed, add it to HERO_BENEFITS
**Cons:** May need to verify the extra item belongs
**Effort:** Small (5 minutes)
**Risk:** Low

## Recommended Action

[To be filled during triage]

## Technical Details

**Affected files:**
- `src/pages/dashboard/Subscribe.tsx`

**Database changes:** None

## Acceptance Criteria

- [ ] Verify SUBSCRIPTION_BENEFITS is truly unused
- [ ] Remove dead code OR consolidate with HERO_BENEFITS
- [ ] Page renders correctly
- [ ] Lint passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from code review | Dead code identified |

## Resources

- PR branch: `feat/subscribe-page-redesign`
