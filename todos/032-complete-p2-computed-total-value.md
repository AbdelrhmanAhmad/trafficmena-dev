---
status: pending
priority: p2
issue_id: "032"
tags: [code-review, correctness, dry]
dependencies: []
---

# TOTAL_VALUE Should Be Computed, Not Hardcoded

## Problem Statement

The `TOTAL_VALUE` constant is hardcoded as `9900` but should be computed from `VALUE_MATH_ITEMS` to prevent desync if items are added/modified.

**Why it matters:** If VALUE_MATH_ITEMS changes, TOTAL_VALUE could become incorrect, showing wrong totals to users.

## Findings

**Source:** Simplicity Review agent

### Location
- **File:** `src/features/subscribe/content.ts`
- **Lines:** ~766-767

```typescript
export const TOTAL_VALUE = 9900;  // Hardcoded
```

### VALUE_MATH_ITEMS
The items that should sum to TOTAL_VALUE:
```typescript
export const VALUE_MATH_ITEMS = [
  { label: 'Content Marketing Track', value: 3000 },
  { label: 'Performance Marketing Track', value: 3500 },
  // ... more items
];
```

## Proposed Solutions

### Option A: Compute from items (Recommended)
**Pros:** Always correct, auto-updates when items change
**Cons:** Tiny runtime cost (negligible)
**Effort:** Small (5 minutes)
**Risk:** Very Low

```typescript
export const VALUE_MATH_ITEMS = [
  { label: 'Content Marketing Track', value: 3000 },
  { label: 'Performance Marketing Track', value: 3500 },
  // ... more items
];

export const TOTAL_VALUE = VALUE_MATH_ITEMS.reduce(
  (sum, item) => sum + item.value,
  0
);
```

## Recommended Action

[To be filled during triage]

## Technical Details

**Affected files:**
- `src/features/subscribe/content.ts`

**Database changes:** None

## Acceptance Criteria

- [ ] TOTAL_VALUE computed from VALUE_MATH_ITEMS
- [ ] Total displays correctly in ValueMathSection
- [ ] Value matches sum of individual items
- [ ] Lint passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from code review | Hardcoded derived value |

## Resources

- PR branch: `feat/subscribe-page-redesign`
