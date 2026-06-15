---
status: pending
priority: p2
issue_id: "029"
tags: [code-review, architecture, conventions]
dependencies: []
---

# Missing Feature Index Export for Subscribe Module

## Problem Statement

The `src/features/subscribe/` module lacks a root `index.ts` barrel export file. This breaks consistency with other feature modules (events, library, tracks, series) and forces consumers to import directly from internal paths.

**Why it matters:** Inconsistent import patterns across codebase, potential for breaking changes if internal structure changes.

## Findings

**Source:** Architecture Strategist agent

### Current State
- `src/features/subscribe/components/index.ts` exists (good)
- `src/features/subscribe/content.ts` exists (good)
- `src/features/subscribe/index.ts` is **MISSING**

### Current Import Pattern (fragile)
```typescript
import { ComparisonTable } from '@/features/subscribe/components';
import { HERO_BENEFITS } from '@/features/subscribe/content';
```

### Expected Import Pattern (robust)
```typescript
import { ComparisonTable, HERO_BENEFITS } from '@/features/subscribe';
```

## Proposed Solutions

### Option A: Create feature barrel export (Recommended)
**Pros:** Consistent with codebase patterns, cleaner imports
**Cons:** None
**Effort:** Small (5 minutes)
**Risk:** Very Low

Create `src/features/subscribe/index.ts`:
```typescript
// Components
export * from './components';

// Content/Data
export * from './content';
```

## Recommended Action

[To be filled during triage]

## Technical Details

**Affected files:**
- `src/features/subscribe/index.ts` (new file)

**Database changes:** None

## Acceptance Criteria

- [ ] `src/features/subscribe/index.ts` exists
- [ ] All components exportable from feature root
- [ ] All content constants exportable from feature root
- [ ] Existing imports continue to work
- [ ] Lint passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from code review | Architecture pattern violation |

## Resources

- PR branch: `feat/subscribe-page-redesign`
- Pattern reference: `src/features/events/index.ts`
