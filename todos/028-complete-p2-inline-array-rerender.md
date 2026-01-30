---
status: pending
priority: p2
issue_id: "028"
tags: [code-review, performance, react]
dependencies: []
---

# Inline Array Causing Re-renders in Index.tsx

## Problem Statement

The "What You Get FREE" section in Index.tsx defines an array inline within JSX. This array is recreated on every component render, creating new object references and preventing React's reconciliation optimization.

**Why it matters:** Creates unnecessary garbage collection pressure and can trigger child component re-renders even when data hasn't changed.

## Findings

**Source:** Performance Oracle agent

### Location
- **File:** `src/pages/Index.tsx`
- **Lines:** 356-371
- **Issue:** Inline array definition inside JSX map

```tsx
<div className="mt-10 grid ...">
  {[
    { icon: BookOpen, title: 'E-commerce Business Track', desc: '7 expert sessions' },
    { icon: Sparkles, title: 'AI for Marketers Track', desc: '5 practical sessions' },
    // ... more items
  ].map((item) => (
    <div key={item.title}>...</div>
  ))}
</div>
```

## Proposed Solutions

### Option A: Move to module-level constant (Recommended)
**Pros:** Array created once at module load, no re-renders
**Cons:** None
**Effort:** Small (5 minutes)
**Risk:** Very Low

```typescript
// At top of file, outside component
const FREE_FEATURES = [
  { icon: BookOpen, title: 'E-commerce Business Track', desc: '7 expert sessions' },
  { icon: Sparkles, title: 'AI for Marketers Track', desc: '5 practical sessions' },
  { icon: MessageCircle, title: 'Monthly Q&A Session', desc: 'Direct expert access' },
  { icon: Calculator, title: '23 Marketing Calculators', desc: 'ROAS, MER, CAC & more' },
  { icon: Library, title: 'Premium Content Access', desc: 'After 6+ months' },
  { icon: Users2, title: 'Community Access', desc: '1,200+ marketers' },
];

// Then in JSX:
{FREE_FEATURES.map((item) => (
  <div key={item.title}>...</div>
))}
```

### Option B: Move to content.ts
**Pros:** Centralized content management
**Cons:** May be overkill for homepage-specific content
**Effort:** Small (10 minutes)
**Risk:** Very Low

## Recommended Action

[To be filled during triage]

## Technical Details

**Affected files:**
- `src/pages/Index.tsx`

**Database changes:** None

## Acceptance Criteria

- [ ] FREE_FEATURES array defined outside component function
- [ ] No inline array creation in JSX
- [ ] Homepage renders correctly
- [ ] Lint passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from code review | Performance pattern violation |

## Resources

- PR branch: `feat/subscribe-page-redesign`
- React docs on avoiding re-renders
