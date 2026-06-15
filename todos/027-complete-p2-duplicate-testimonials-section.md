---
status: pending
priority: p2
issue_id: "027"
tags: [code-review, dry, architecture, components]
dependencies: ["026"]
---

# Duplicate TestimonialsSection Component

## Problem Statement

The `TestimonialsSection` component (rendering testimonial cards in a grid) is duplicated nearly identically between two pages. This violates DRY principles and creates maintenance burden.

**Why it matters:** Any styling or layout changes must be made in two places. Bug fixes could be applied to one but not the other.

## Findings

**Source:** Architecture Strategist agent

### Location 1
- **File:** `src/pages/SubscribeLanding.tsx`
- **Lines:** 168-215
- **Component:** `TestimonialsSection` (internal function component)

### Location 2
- **File:** `src/pages/dashboard/Subscribe.tsx`
- **Lines:** 234-281
- **Component:** `TestimonialsSection` (internal function component)

**Similarity:** ~100% identical structure and styling

## Proposed Solutions

### Option A: Extract to subscribe feature module (Recommended)
**Pros:** Follows feature folder pattern, reusable, single source of truth
**Cons:** Slightly more work than just deduplicating data
**Effort:** Medium (30 minutes)
**Risk:** Low

Create `src/features/subscribe/components/TestimonialsSection.tsx`:
```typescript
import { TESTIMONIALS } from '../content';

export function TestimonialsSection() {
  return (
    <section className="...">
      {TESTIMONIALS.map((testimonial) => (
        // ... card rendering
      ))}
    </section>
  );
}
```

Export from barrel file and import in both pages.

### Option B: Keep inline but share via shared/components
**Pros:** More generic location if testimonials used outside subscribe
**Cons:** Doesn't follow feature organization pattern
**Effort:** Medium (30 minutes)
**Risk:** Low

## Recommended Action

[To be filled during triage]

## Technical Details

**Affected files:**
- `src/features/subscribe/components/TestimonialsSection.tsx` (new)
- `src/features/subscribe/components/index.ts` (add export)
- `src/pages/SubscribeLanding.tsx` (remove internal component, import)
- `src/pages/dashboard/Subscribe.tsx` (remove internal component, import)

**Database changes:** None

## Acceptance Criteria

- [ ] TestimonialsSection exists in exactly one location
- [ ] Both pages import and use the shared component
- [ ] Testimonials render identically in both pages
- [ ] Component is exported from subscribe feature barrel
- [ ] Lint passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from code review | DRY violation for component |

## Resources

- PR branch: `feat/subscribe-page-redesign`
- Depends on: 026 (TESTIMONIALS data extraction)
