---
status: pending
priority: p2
issue_id: "010"
tags: [code-review, architecture, scaling, payment-gateway]
dependencies: []
---

# In-Memory Rate Limiter Fails at Horizontal Scale

## Problem Statement

The current `InMemoryRateLimiter` stores rate limit buckets in a local Map. With multiple server instances, each instance maintains its own bucket map, effectively multiplying the rate limit.

**Example:**
- Rate limit: 5 checkouts/minute
- With 3 server instances: user could do 15 checkouts/minute

## Findings

**Agents:** architecture-strategist, pattern-recognition-specialist
**Severity:** HIGH (P2) - Critical when scaling horizontally

**Location:** `server/src/services/rateLimiter.ts`

```typescript
export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  // Rate limits NOT shared across instances
}
```

**Additional Issues:**
- Rate limits reset on server restart
- Memory grows with unique keys (no size limit)

## Proposed Solutions

### Solution A: Document Single-Instance Limitation (MVP)
**Pros:** No code changes needed
**Cons:** Must remember to upgrade before scaling
**Effort:** Very Low
**Risk:** Low (if documented)

### Solution B: Redis-Backed Rate Limiting
**Pros:** Production-ready, horizontal scaling works
**Cons:** New infrastructure dependency (Redis)
**Effort:** Medium
**Risk:** Low

Use `rate-limiter-flexible` with Redis adapter:
```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'payment',
  points: 5,
  duration: 60,
});
```

## Recommended Action

Solution A for MVP launch (single instance). Plan Solution B before horizontal scaling.

## Technical Details

**Affected Files:**
- `server/src/services/rateLimiter.ts`
- Add Redis connection if Solution B

## Acceptance Criteria

For Solution A (MVP):
- [ ] Add comment documenting single-instance limitation
- [ ] Add to deployment checklist: "Upgrade rate limiter before scaling"

For Solution B (pre-scale):
- [ ] Migrate to Redis-backed rate limiter
- [ ] Verify rate limits work across multiple instances
- [ ] Add Redis connection health check

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from security review | Identified by architecture-strategist and pattern-recognition-specialist |

## Resources

- Library: https://github.com/animir/node-rate-limiter-flexible
