---
status: pending
priority: p3
issue_id: "035"
tags: [code-review, quality, ux]
dependencies: []
---

# Misleading Mobile Scroll Note in ComparisonTable

## Problem Statement

The ComparisonTable component shows a mobile note saying "Scroll horizontally to see all columns" but the table uses a fixed grid layout that doesn't require horizontal scrolling.

**Why it matters:** Misleading instructions confuse users and reduce trust in the UI.

## Findings

**Source:** Simplicity Review agent

### Location
- **File:** `src/features/subscribe/components/ComparisonTable.tsx`
- **Lines:** 83-85

```tsx
<p className="mt-4 text-center text-xs text-neutral-400 sm:hidden">
  Scroll horizontally to see all columns
</p>
```

### Analysis
The table uses `grid-cols-[1fr_5rem_5rem]` which fits within mobile viewport. No horizontal scroll is needed or implemented.

## Proposed Solutions

### Option A: Remove the note (Recommended)
**Pros:** Removes misleading information
**Cons:** None
**Effort:** Small (1 minute)
**Risk:** Very Low

Simply delete lines 83-85.

### Option B: Add actual horizontal scroll and keep note
**Pros:** Note would be accurate
**Cons:** More work, may not improve UX
**Effort:** Medium
**Risk:** Low

## Recommended Action

[To be filled during triage]

## Technical Details

**Affected files:**
- `src/features/subscribe/components/ComparisonTable.tsx`

**Database changes:** None

## Acceptance Criteria

- [ ] Misleading note removed
- [ ] Table displays correctly on mobile
- [ ] Lint passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from code review | UX issue identified |

## Resources

- PR branch: `feat/subscribe-page-redesign`
