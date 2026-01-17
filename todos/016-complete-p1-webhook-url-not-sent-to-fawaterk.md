---
status: pending
priority: p1
issue_id: "016"
tags: [code-review, payment-gateway, configuration, reliability]
dependencies: []
---

# P1: Webhook URL Not Sent to Fawaterk

## Problem Statement

The payment checkout sends redirect URLs to Fawaterk but does not include the webhook URL. This means webhook delivery relies on manual configuration in the Fawaterk dashboard, which is fragile and error-prone.

**Impact:** If Fawaterk dashboard config is missing or incorrect, webhooks won't be delivered, causing payment confirmation failures.

## Findings

**Location:** `server/src/routes/api/payments.ts` lines 739-742

```typescript
redirectionUrls: {
  successUrl: `${env.APP_BASE_URL}/payment/success`,
  failUrl: `${env.APP_BASE_URL}/payment/failed`,
  pendingUrl: `${env.APP_BASE_URL}/payment/pending`,
  // webhookUrl is MISSING
},
```

## Proposed Solutions

### Solution 1: Add webhookUrl to Redirect URLs (Recommended)
**Pros:** Explicit, self-documenting, no manual config needed
**Cons:** Requires new env var for API base URL
**Effort:** 15 minutes
**Risk:** Low

1. Add `API_BASE_URL` to env config
2. Include webhook URL in payment requests

```typescript
redirectionUrls: {
  successUrl: `${env.APP_BASE_URL}/payment/success`,
  failUrl: `${env.APP_BASE_URL}/payment/failed`,
  pendingUrl: `${env.APP_BASE_URL}/payment/pending`,
  webhookUrl: `${env.API_BASE_URL}/api/payments/webhook`,
},
```

### Solution 2: Document Manual Configuration
**Pros:** No code changes
**Cons:** Error-prone, requires manual dashboard setup per environment
**Effort:** 5 minutes
**Risk:** Medium - human error in config

## Recommended Action

Implement Solution 1. Add to deployment checklist.

## Technical Details

**Affected Files:**
- `server/src/config/env.ts` - Add API_BASE_URL
- `server/src/routes/api/payments.ts` - Include webhookUrl
- `docs/DEPLOYMENT_CHECKLIST_PAYMENT_GATEWAY.md` - Document env var

## Acceptance Criteria

- [ ] API_BASE_URL env var added with validation
- [ ] webhookUrl included in Fawaterk payment requests
- [ ] Deployment checklist updated

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-01-16 | Created from code review | Explicit > implicit for payment config |

## Resources

- Architecture Strategist review finding
