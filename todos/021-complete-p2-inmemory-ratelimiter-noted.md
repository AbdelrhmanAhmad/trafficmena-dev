---
status: pending
priority: p2
issue_id: "021"
tags: [code-review, scalability, rate-limiting, infrastructure]
dependencies: []
---

# P2: In-Memory Rate Limiter Not Suitable for Multi-Instance

## Problem Statement

The current rate limiter uses in-memory storage, which doesn't share state across multiple server instances. When horizontally scaling, rate limits can be bypassed by rotating between instances.

**Impact:** Rate limit bypass in multi-instance deployment.

## Findings

**Location:** `server/src/services/rateLimiter.ts`

The implementation is well-documented with explicit scalability warning (lines 14-27), acknowledging this limitation.

**Current behavior:**
- Memory growth: O(active_users) buckets
- Cleanup interval (5 min) prevents memory leaks
- Works correctly for single-instance MVP

## Proposed Solutions

### Solution 1: Redis-Backed Rate Limiting (Recommended for scaling)
**Pros:** Distributed state, production-ready
**Cons:** Redis dependency
**Effort:** 2-4 hours
**Risk:** Low

Use `rate-limiter-flexible` with Redis backend:
```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';
```

### Solution 2: Sticky Sessions
**Pros:** No infrastructure changes
**Cons:** Uneven load distribution
**Effort:** 1 hour
**Risk:** Medium

## Recommended Action

Keep current implementation for MVP single-instance. Implement Solution 1 before horizontal scaling.

## Technical Details

**Affected Files:**
- `server/src/services/rateLimiter.ts`

**New Dependencies:**
- `rate-limiter-flexible`
- Redis connection

## Acceptance Criteria

- [ ] Rate limiter uses distributed storage (Redis)
- [ ] Rate limits work correctly across instances
- [ ] Fallback to in-memory if Redis unavailable

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-01-16 | Created from code review | In-memory works for MVP, plan for scaling |

## Resources

- Security Sentinel review finding P2-2
- Current implementation already documents this limitation
