---
status: pending
priority: p3
issue_id: "033"
tags: [code-review, security, quality]
dependencies: []
---

# External Unsplash Images in Testimonials

## Problem Statement

Testimonial profile images are loaded from external Unsplash URLs. This creates a third-party dependency and minor privacy tracking concern.

**Why it matters:**
- Service availability risk (Unsplash could be down)
- User tracking by third party
- Slower loading due to external DNS lookup

## Findings

**Source:** Security Sentinel agent

### Location
- **File:** `src/pages/SubscribeLanding.tsx` (lines 27-51)
- **File:** `src/pages/dashboard/Subscribe.tsx` (lines 43-67)

```typescript
const TESTIMONIALS = [
  {
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop',
    // ...
  },
];
```

## Proposed Solutions

### Option A: Host on BunnyCDN (Recommended for production)
**Pros:** Full control, faster loading, no third-party tracking
**Cons:** Requires downloading and uploading images
**Effort:** Medium (30 minutes)
**Risk:** Very Low

1. Download the 4 Unsplash images
2. Upload to BunnyCDN storage
3. Update URLs to use `trafficmena.b-cdn.net`

### Option B: Keep as-is for MVP
**Pros:** No work needed
**Cons:** Third-party dependency remains
**Effort:** None
**Risk:** Low (acceptable for MVP)

## Recommended Action

[To be filled during triage]

## Technical Details

**Affected files:**
- TESTIMONIALS data (wherever it ends up after deduplication)

**Database changes:** None

## Acceptance Criteria

- [ ] Images load reliably
- [ ] No external third-party image requests (if Option A)
- [ ] Images display correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from code review | Third-party dependency noted |

## Resources

- PR branch: `feat/subscribe-page-redesign`
- BunnyCDN storage zone: configured in environment
