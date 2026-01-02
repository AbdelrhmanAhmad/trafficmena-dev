---
status: addressed
priority: p2
issue_id: "002"
tags: [code-review, security, validation, tracks]
dependencies: []
---

# Missing UUID Validation on Path Parameters

## Problem Statement

Most track endpoints accept `:id` path parameters but do not validate that they are valid UUIDs before using them in database queries. While Drizzle ORM uses parameterized queries (preventing SQL injection), invalid UUIDs could cause database errors or inconsistent behavior.

**Why it matters:** Invalid UUIDs passed to endpoints could cause unhandled database errors that expose implementation details in error responses.

## Findings

### From Security Sentinel

**Positive Example (correct pattern):** `/tracks/:id/attendees` endpoint (lines 619-625) correctly validates:
```typescript
const trackIdParam = c.req.param('id');
const trackIdResult = z.string().uuid('Invalid track ID format').safeParse(trackIdParam);
if (!trackIdResult.success) {
  return c.json({ error: { code: 'INVALID_ID', message: 'Invalid track ID format.' } }, 400);
}
```

**Endpoints missing this validation:**
| Endpoint | Line | Risk |
|----------|------|------|
| `GET /tracks/:id` | 500 | Medium |
| `GET /tracks/:id/public` | 284 | Medium |
| `PUT /tracks/:id` | 764 | Medium |
| `DELETE /tracks/:id` | 879 | Medium |
| `POST /tracks/:id/events` | 901 | Medium |
| `DELETE /tracks/:id/events/:eventId` | 1034-1035 | Medium (2 params) |
| `PUT /tracks/:id/events/reorder` | 1071 | Medium |
| `POST /tracks/:id/book` | 1106 | Medium |

## Proposed Solutions

### Option A: Add Validation to Each Endpoint (Recommended)
**Pros:** Explicit, follows existing pattern
**Cons:** Repetitive code
**Effort:** Small (1 hour)
**Risk:** Low

Apply the pattern from `/tracks/:id/attendees` to all endpoints.

### Option B: Create Middleware for UUID Validation
**Pros:** DRY, centralized validation
**Cons:** More complex setup
**Effort:** Medium (2 hours)
**Risk:** Low

```typescript
const validateUuidParam = (paramName: string) => async (c: Context, next: Next) => {
  const value = c.req.param(paramName);
  const result = z.string().uuid().safeParse(value);
  if (!result.success) {
    return c.json({ error: { code: 'INVALID_ID', message: `Invalid ${paramName} format.` } }, 400);
  }
  await next();
};

// Usage:
app.get('/tracks/:id', validateUuidParam('id'), async (c) => { ... });
```

### Option C: Add Validation in Route Registration
**Pros:** Enforced at router level
**Cons:** Hono-specific implementation
**Effort:** Medium (1-2 hours)
**Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:**
- `/server/src/routes/api/tracks.ts` - All track endpoints

**Components:** Track API routes

**Database changes:** None

## Acceptance Criteria

- [ ] All track endpoints validate UUID format before database queries
- [ ] Invalid UUIDs return 400 with clear error message
- [ ] No database errors exposed for malformed IDs
- [ ] Pattern is consistent across all endpoints

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-02 | Created | Identified during security review |

## Resources

- **Reference implementation:** `/tracks/:id/attendees` endpoint (lines 619-625)
