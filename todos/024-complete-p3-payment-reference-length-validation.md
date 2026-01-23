---
status: complete
priority: p3
issue_id: "024"
tags: [code-review, validation, payments, security]
dependencies: []
---

# Payment Reference Codes Missing Length Validation

## Problem Statement

Payment reference code fields (`fawry_code`, `aman_code`, `masary_code`, `meeza_qr_code`) were defined as unbounded `text` columns without length constraints. Even trusted APIs can return unexpected payloads (bugs, proxies, partial corruption).

**Why it matters:** Unbounded text fields could lead to memory exhaustion or database bloat from malformed gateway responses. Low-cost boundary checks are good MVP hygiene.

## Findings

### Security Sentinel Analysis

**Location:** `server/drizzle/0003_payment_reference_codes.sql`

```sql
ALTER TABLE "payments" ADD COLUMN "fawry_code" text;
ALTER TABLE "payments" ADD COLUMN "aman_code" text;
ALTER TABLE "payments" ADD COLUMN "masary_code" text;
ALTER TABLE "payments" ADD COLUMN "meeza_qr_code" text;
```

**Mitigating Factors:**
- Data originates from trusted Fawaterk API, not user input
- Frontend applies 1024-character limit for QR display
- Current Zod schema uses `z.string().optional()` without limits

## Proposed Solutions

### Solution 1: Add Zod Validation in Fawaterk Service (Recommended)
- Add max length constraints to response validation
```typescript
fawryCode: z.string().max(50).optional(),
amanCode: z.string().max(50).optional(),
masaryCode: z.string().max(50).optional(),
meezaQrCode: z.string().max(2048).optional(),
```
- **Pros:** Validates at API boundary, fails fast
- **Cons:** None significant
- **Effort:** Small
- **Risk:** Low

### Solution 2: Database varchar Constraints
- Change columns from `text` to `varchar(n)`
- **Pros:** Database-level protection
- **Cons:** Requires migration, less flexible
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

**Solution 1** - Add max length validation in the Fawaterk service Zod schema. This is a minimal change that provides protection at the API boundary.

## Technical Details

**Affected Files:**
- `server/src/services/fawaterk.ts`

## Acceptance Criteria

- [ ] Zod schema updated with max length constraints
- [ ] Constraints align with documented Fawaterk response formats

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-22 | Created from code review | Defense in depth even for trusted sources |
| 2026-01-23 | **FIXED:** Added Zod max lengths | `fawryCode: z.string().max(64)`, `meezaQrCode: z.string().max(2048)`, `amanCode: z.string().max(64)`, `masaryCode: z.string().max(64)` |

## Resources

- Branch: `important_migrations_deep_check`
- Security Sentinel Agent Report
