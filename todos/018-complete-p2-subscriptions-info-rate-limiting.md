---
status: pending
priority: p2
issue_id: "018"
tags: [code-review, security, rate-limiting, subscriptions]
dependencies: []
---

# P2: Public Subscriptions Info Endpoint Missing Rate Limiting

## Problem Statement

The `/subscriptions/info` endpoint is publicly accessible (no authentication required) and has no rate limiting, making it a potential target for scraping or DoS attacks.

**Impact:** Resource exhaustion from repeated requests to public endpoint.

## Findings

**Location:** `server/src/routes/api/subscriptions.ts` line 118

Endpoint returns subscription pricing and benefits without authentication. No rate limiting applied.

## Proposed Solutions

### Solution 1: Add Basic Rate Limiting (Recommended)
**Pros:** Simple protection against abuse
**Cons:** Minimal code change
**Effort:** 15 minutes
**Risk:** Low

Apply standard rate limit (e.g., 60 req/min per IP) to public endpoints.

### Solution 2: Cache Response at CDN Level
**Pros:** Offloads to infrastructure, very effective
**Cons:** Requires CDN configuration
**Effort:** 30 minutes
**Risk:** Low

## Recommended Action

Implement Solution 1 for MVP. Consider Solution 2 for scaling.

## Technical Details

**Affected Files:**
- `server/src/routes/api/subscriptions.ts`

## Acceptance Criteria

- [ ] Rate limiting applied to `/subscriptions/info`
- [ ] Rate limit exceeded returns 429
- [ ] Legitimate traffic not impacted

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-01-16 | Created from code review | Public endpoints need protection too |

## Resources

- Security Sentinel review finding P2-3
