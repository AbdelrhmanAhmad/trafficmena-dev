---
status: wontfix
priority: p3
issue_id: "006"
tags: [code-review, performance, frontend, react]
dependencies: []
---

# Missing useMemo for Filter and Transform Operations

## Problem Statement

The DashboardLibrary component filters and transforms data on every render without memoization, causing unnecessary recalculations.

**Why it matters:** With many library items, this could cause noticeable UI lag during typing in search.

## Findings

### From Performance Oracle

**Location:** `/src/pages/DashboardLibrary.tsx` (lines 22-43)

```typescript
// Runs on every render, even when data hasn't changed
const filteredAssets = assetsData?.items?.filter(
  (item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase()),
) || [];

// Also runs on every render
const transformedItems = filteredAssets.map((item) => ({
  id: item.id,
  title: item.title,
  // ... 10 more fields
}));
```

**Additional issue:** No debounce on search input means filter runs on every keystroke.

## Proposed Solutions

### Option A: Add useMemo and Debounce (Recommended)
**Pros:** Better performance, smoother UX
**Cons:** Slight complexity increase
**Effort:** Small (30 min)
**Risk:** None

```typescript
const [debouncedSearch] = useDebouncedValue(searchQuery, 300);

const filteredAssets = useMemo(() => {
  if (!debouncedSearch || !assetsData?.items) return assetsData?.items ?? [];
  const search = debouncedSearch.toLowerCase();
  return assetsData.items.filter(
    (item) =>
      item.title.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search)
  );
}, [debouncedSearch, assetsData?.items]);

const transformedItems = useMemo(() =>
  filteredAssets.map((item) => ({
    id: item.id,
    title: item.title,
    // ...
  })),
  [filteredAssets]
);
```

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:**
- `/src/pages/DashboardLibrary.tsx`

## Acceptance Criteria

- [ ] Filter operation is memoized with useMemo
- [ ] Transform operation is memoized with useMemo
- [ ] Search input has debounce (optional but recommended)
- [ ] UI remains responsive during typing

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-02 | Created | Identified during performance review |
