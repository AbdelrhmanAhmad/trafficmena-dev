---
status: pending
priority: p2
issue_id: "013"
tags: [code-review, security, validation, external-api]
dependencies: []
---

# Fawaterk API Responses Type-Asserted Without Validation

## Problem Statement

Fawaterk API responses are type-asserted without runtime validation:

```typescript
return result.data as PaymentMethod[];
return result.data as InvoiceData;
```

If Fawaterk changes their API response format, the application could behave unexpectedly or crash with confusing errors.

## Findings

**Agent:** pattern-recognition-specialist
**Severity:** MEDIUM (P2)

**Location:** `server/src/services/fawaterk.ts` lines 100, 168

## Proposed Solutions

### Solution A: Add Zod Schemas for API Responses (Recommended)
**Pros:** Runtime validation, clear error on API changes
**Cons:** Slightly more code
**Effort:** Low
**Risk:** Very Low

```typescript
const paymentMethodSchema = z.object({
  paymentId: z.number(),
  name_en: z.string(),
  name_ar: z.string(),
  redirect: z.string(),
  logo: z.string().optional(),
});

const result = await response.json();
const parsed = z.array(paymentMethodSchema).safeParse(result.data);
if (!parsed.success) {
  throw new Error('Invalid Fawaterk API response format');
}
return parsed.data;
```

## Recommended Action

Implement Solution A for all external API responses.

## Technical Details

**Affected Files:**
- `server/src/services/fawaterk.ts`

## Acceptance Criteria

- [ ] Add Zod schema for PaymentMethod response
- [ ] Add Zod schema for InvoiceData response
- [ ] Validate responses before type assertion
- [ ] Log validation errors for debugging
- [ ] Test: Mock invalid response triggers validation error

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from security review | Identified by pattern-recognition-specialist |

## Resources

- Zod documentation: https://zod.dev
