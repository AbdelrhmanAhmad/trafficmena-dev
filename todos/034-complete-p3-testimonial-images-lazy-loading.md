---
status: pending
priority: p3
issue_id: "034"
tags: [code-review, performance]
dependencies: []
---

# Add loading="lazy" to Testimonial Images

## Problem Statement

Testimonial images in SubscribeLanding.tsx don't have explicit lazy loading attributes, while dashboard/Subscribe.tsx does. This inconsistency could affect page load performance.

**Why it matters:** Testimonials are below the fold; images should load lazily to improve initial page load.

## Findings

**Source:** Performance Oracle agent

### Location
- **File:** `src/pages/SubscribeLanding.tsx`
- **Issue:** Missing `loading="lazy"` on testimonial images

### Comparison
- `dashboard/Subscribe.tsx` line 268 uses `loading="lazy"` (correct)
- `SubscribeLanding.tsx` does not

## Proposed Solutions

### Option A: Add lazy loading attributes (Recommended)
**Pros:** Better FCP, consistent with other page
**Cons:** None
**Effort:** Small (2 minutes)
**Risk:** Very Low

```tsx
<img
  src={testimonial.image}
  alt={testimonial.name}
  loading="lazy"
  decoding="async"
  className="..."
/>
```

## Recommended Action

[To be filled during triage]

## Technical Details

**Affected files:**
- `src/pages/SubscribeLanding.tsx` (or wherever TestimonialsSection ends up)

**Database changes:** None

## Acceptance Criteria

- [ ] All testimonial images have loading="lazy"
- [ ] Images load correctly on scroll
- [ ] Lint passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from code review | Image loading optimization |

## Resources

- PR branch: `feat/subscribe-page-redesign`
