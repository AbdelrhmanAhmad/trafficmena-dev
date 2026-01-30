---
status: pending
priority: p2
issue_id: "026"
tags: [code-review, dry, architecture]
dependencies: []
---

# Duplicate TESTIMONIALS Array

## Problem Statement

The `TESTIMONIALS` array containing testimonial data (names, quotes, images) is duplicated verbatim in two files. This violates DRY principles and creates maintenance burden - any update requires changing both files.

**Why it matters:** Content drift between files will cause inconsistent user experience. Increases bug surface area when updating testimonials.

## Findings

**Source:** Architecture Strategist, Pattern Recognition, and Simplicity Review agents all flagged this.

### Location 1
- **File:** `src/pages/SubscribeLanding.tsx`
- **Lines:** 26-52
- **Content:** 4 testimonials with name, role, company, quote, image URL

### Location 2
- **File:** `src/pages/dashboard/Subscribe.tsx`
- **Lines:** 42-68
- **Content:** Identical 4 testimonials

## Proposed Solutions

### Option A: Move to content.ts (Recommended)
**Pros:** Single source of truth, consistent with existing pattern for subscribe content
**Cons:** None
**Effort:** Small (15 minutes)
**Risk:** Low

```typescript
// In src/features/subscribe/content.ts
export const TESTIMONIALS = [
  {
    name: 'Ahmed Hassanein',
    role: 'Digital Marketing Manager',
    company: 'E-commerce Startup',
    quote: 'TrafficMENA helped me...',
    image: 'https://images.unsplash.com/...',
  },
  // ... rest
];
```

Then import in both pages:
```typescript
import { TESTIMONIALS } from '@/features/subscribe/content';
```

### Option B: Create shared constants file
**Pros:** Separates testimonials from other content
**Cons:** Creates another file to maintain
**Effort:** Small (15 minutes)
**Risk:** Low

## Recommended Action

[To be filled during triage]

## Technical Details

**Affected files:**
- `src/pages/SubscribeLanding.tsx`
- `src/pages/dashboard/Subscribe.tsx`
- `src/features/subscribe/content.ts` (add export)

**Database changes:** None

## Acceptance Criteria

- [ ] TESTIMONIALS array exists in exactly one location
- [ ] Both SubscribeLanding.tsx and Subscribe.tsx import from shared location
- [ ] Testimonials render identically in both pages
- [ ] Lint passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from code review | DRY violation identified by 3 agents |

## Resources

- PR branch: `feat/subscribe-page-redesign`
- Related: See 027 for TestimonialsSection component extraction
