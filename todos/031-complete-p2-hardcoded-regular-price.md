---
status: pending
priority: p2
issue_id: "031"
tags: [code-review, dry, magic-numbers]
dependencies: []
---

# Hardcoded regularPrice in Multiple Components

## Problem Statement

The regular subscription price (`5000`) is hardcoded in two separate components. If pricing changes, both files must be updated manually, risking inconsistency.

**Why it matters:** Magic numbers scattered across codebase create maintenance burden and risk of divergence.

## Findings

**Source:** Pattern Recognition and Simplicity Review agents

### Location 1
- **File:** `src/features/subscribe/components/FoundingMemberPricing.tsx`
- **Line:** ~199
- **Code:** `const regularPrice = 5000;`

### Location 2
- **File:** `src/features/subscribe/components/ValueMathSection.tsx`
- **Line:** ~477
- **Code:** `const regularPrice = 5000;`

## Proposed Solutions

### Option A: Add constant to content.ts (Recommended)
**Pros:** Single source of truth, consistent with existing pattern
**Cons:** None
**Effort:** Small (5 minutes)
**Risk:** Very Low

```typescript
// In src/features/subscribe/content.ts
export const PRICING = {
  regular: 5000,
  foundingMember: 3000,  // optional: also centralize this
};
```

Then import in both components:
```typescript
import { PRICING } from '../content';
const regularPrice = PRICING.regular;
```

### Option B: Pass as prop from parent
**Pros:** More flexible
**Cons:** Adds prop drilling, overkill for static value
**Effort:** Medium (15 minutes)
**Risk:** Low

## Recommended Action

[To be filled during triage]

## Technical Details

**Affected files:**
- `src/features/subscribe/content.ts` (add constant)
- `src/features/subscribe/components/FoundingMemberPricing.tsx`
- `src/features/subscribe/components/ValueMathSection.tsx`

**Database changes:** None

## Acceptance Criteria

- [ ] regularPrice defined in exactly one location
- [ ] Both components import from shared location
- [ ] Pricing displays correctly in both components
- [ ] Lint passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from code review | Magic number duplication |

## Resources

- PR branch: `feat/subscribe-page-redesign`
