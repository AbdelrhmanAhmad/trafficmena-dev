---
status: addressed
priority: p3
issue_id: "004"
tags: [code-review, validation, performance]
dependencies: []
---

# Missing Input Length Validation on Search Parameter

## Problem Statement

The search parameter in the tracks list endpoint has no maximum length constraint, which could allow extremely long search strings that impact database performance.

**Why it matters:** Very long search strings could cause memory issues or slow database queries.

## Findings

### From Security Sentinel

**Location:** `/server/src/routes/api/tracks.ts` (lines 21-25)

```typescript
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().optional(),  // No .max() constraint
});
```

## Proposed Solutions

### Option A: Add Max Length (Recommended)
**Pros:** Simple, prevents abuse
**Cons:** None
**Effort:** Tiny (5 min)
**Risk:** None

```typescript
search: z.string().max(200).optional(),
```

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:**
- `/server/src/routes/api/tracks.ts`

## Acceptance Criteria

- [ ] Search parameter has maximum length of 200 characters
- [ ] Validation error returned for longer inputs

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-02 | Created | Identified during security review |
