---
status: pending
priority: p2
issue_id: "011"
tags: [code-review, security, validation, payment-gateway]
dependencies: []
---

# Weak Webhook Schema Validation

## Problem Statement

The webhook Zod schema allows values that could cause issues:
- `invoice_id`: Allows negative/zero (should be positive integer)
- `invoice_key`: No length/format validation
- `payment_method`: No enum constraint
- `hashKey`: No hex format validation (should be 64-char hex for SHA256)

## Findings

**Agent:** pattern-recognition-specialist
**Severity:** MEDIUM (P2)

**Location:** `server/src/routes/api/payments.ts` lines 45-50

```typescript
const webhookSchema = z.object({
  invoice_id: z.number(),           // ISSUE: allows negative/zero
  invoice_key: z.string(),          // ISSUE: no length/format validation
  payment_method: z.string(),       // ISSUE: no enum constraint
  hashKey: z.string(),              // ISSUE: no hex format validation
});
```

## Proposed Solutions

### Solution A: Strengthen Validation (Recommended)
**Pros:** Defense in depth, catches malformed payloads early
**Cons:** Could reject edge cases if Fawaterk changes format
**Effort:** Low
**Risk:** Low

```typescript
const webhookSchema = z.object({
  invoice_id: z.number().int().positive(),
  invoice_key: z.string().min(1).max(255),
  payment_method: z.string().min(1).max(100),
  hashKey: z.string().regex(/^[a-f0-9]{64}$/i), // SHA256 hex
});
```

## Recommended Action

Implement Solution A with the stricter validation.

## Technical Details

**Affected Files:**
- `server/src/routes/api/payments.ts`

## Acceptance Criteria

- [ ] `invoice_id` must be positive integer
- [ ] `invoice_key` has reasonable length bounds
- [ ] `hashKey` validates as 64-character hex string
- [ ] Test: Invalid payloads rejected with 400 error
- [ ] Test: Valid Fawaterk webhook still works

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from security review | Identified by pattern-recognition-specialist |

## Resources

- SHA256 produces 64-character hex output
