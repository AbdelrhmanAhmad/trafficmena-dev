---
status: pending
priority: p2
issue_id: "017"
tags: [code-review, security, payment-gateway, rate-limiting]
dependencies: []
---

# P2: Rate Limiting Not Applied to Webhook Endpoint

## Problem Statement

The webhook endpoint `/payments/webhook` has no rate limiting applied. While HMAC verification prevents unauthorized access, an attacker could potentially DoS the webhook processing by flooding it with requests (even invalid ones).

**Impact:** Resource exhaustion from repeated webhook processing attempts.

## Findings

**Location:** `server/src/routes/api/payments.ts` line 951

The webhook handler processes all incoming requests before rejecting invalid signatures, consuming CPU for HMAC verification.

## Proposed Solutions

### Solution 1: IP-Based Rate Limiting (Recommended)
**Pros:** Prevents DoS while allowing legitimate Fawaterk traffic
**Cons:** Requires identifying Fawaterk IP ranges for whitelist
**Effort:** 30 minutes
**Risk:** Low

```typescript
const WEBHOOK_RATE_LIMIT = { limit: 100, windowMs: 60_000 }; // 100/minute per IP
```

### Solution 2: Fawaterk IP Whitelist
**Pros:** Only allows Fawaterk servers
**Cons:** Fawaterk IPs may change, requires maintenance
**Effort:** 1 hour
**Risk:** Medium - IP changes could break webhooks

## Recommended Action

Implement Solution 1 before horizontal scaling.

## Technical Details

**Affected Files:**
- `server/src/routes/api/payments.ts`

## Acceptance Criteria

- [ ] Rate limiting applied to webhook endpoint
- [ ] Legitimate Fawaterk traffic not blocked
- [ ] Rate limit exceeded returns 429

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-01-16 | Created from code review | Even authenticated endpoints need DoS protection |

## Resources

- Security Sentinel review finding P2-1
