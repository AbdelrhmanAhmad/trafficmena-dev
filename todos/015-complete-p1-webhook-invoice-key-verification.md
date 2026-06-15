---
status: pending
priority: p1
issue_id: "015"
tags: [code-review, security, payment-gateway, defense-in-depth]
dependencies: []
---

# P1: Webhook Missing Invoice Key Verification

## Problem Statement

The webhook endpoint verifies HMAC signature correctly but does not verify that the `invoice_key` in the webhook payload matches the stored `fawaterkInvoiceKey` in the database. This is a defense-in-depth gap.

**Impact:** An attacker who obtains or guesses a valid invoice_id could potentially craft a webhook with a different invoice_key (though HMAC would still need to be valid).

## Findings

**Location:** `server/src/routes/api/payments.ts` lines 967-971

```typescript
// Current: Only checks invoice_id, not invoice_key
const [payment] = await db
  .select()
  .from(payments)
  .where(eq(payments.fawaterkInvoiceId, webhookData.invoice_id));
```

The `webhookData.invoice_key` is parsed but never verified against `payment.fawaterkInvoiceKey`.

## Proposed Solutions

### Solution 1: Add Invoice Key Verification (Recommended)
**Pros:** Simple fix, adds defense-in-depth
**Cons:** None
**Effort:** 5 minutes
**Risk:** None

```typescript
// After fetching payment, add:
if (payment.fawaterkInvoiceKey !== webhookData.invoice_key) {
  console.error('[payments/webhook] Invoice key mismatch');
  return c.json({ error: { code: 'INVALID_INVOICE_KEY' } }, 401);
}
```

## Recommended Action

Implement Solution 1 before production deployment.

## Technical Details

**Affected Files:**
- `server/src/routes/api/payments.ts`

## Acceptance Criteria

- [ ] Invoice key is verified against stored value
- [ ] Mismatch returns 401 with appropriate error code
- [ ] Error is logged for monitoring

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-01-16 | Created from code review | Defense-in-depth for webhook security |

## Resources

- Security Sentinel review finding P1-1
