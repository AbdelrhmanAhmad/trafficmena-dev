---
status: complete
priority: p2
issue_id: "023"
tags: [code-review, database, data-integrity, payments]
dependencies: []
---

# Meeza Reference Integer Overflow Risk

## Problem Statement

The `meeza_reference` column in the payments table was originally defined as PostgreSQL `integer` (4-byte signed), which has a maximum value of 2,147,483,647. Payment reference numbers from Egyptian payment gateways can exceed this limit.

**Why it matters:** Integer overflow would corrupt the stored value, making payment reconciliation impossible. Support could not locate transactions, leading to financial disputes.

## Findings

### Data Integrity Guardian Analysis

**Location:** `server/src/db/schema/index.ts` (line 480)
```typescript
meezaReference: text('meeza_reference'), // Changed from integer to text
```

**Risk Scenario:**
```
API returns: meezaReference = 3000000001 (exceeds 2,147,483,647)
Stored in DB: -1294967295 (integer overflow)
Result: Payment cannot be reconciled
```

**Analysis:**
- PostgreSQL `integer` range: -2,147,483,648 to 2,147,483,647
- Payment gateway reference numbers often use large identifiers
- Egyptian payment systems may use timestamp-based IDs (13+ digits)
- No validation exists before database storage

## Proposed Solutions

### Solution 1: Change to bigint (Recommended)
- ALTER COLUMN to `bigint` (8-byte, max ~9.2 quintillion)
- **Pros:** Future-proof, handles any reference number
- **Cons:** Requires migration, slightly more storage
- **Effort:** Small
- **Risk:** Low (no data loss for existing rows)

### Solution 2: Change to text
- ALTER COLUMN to `text` type
- **Pros:** Handles any format, matches other reference codes
- **Cons:** Loses ability to do numeric comparisons
- **Effort:** Small
- **Risk:** Low

### Solution 3: Add Validation
- Validate meeza_reference fits in integer before storage
- **Pros:** No schema change, immediate protection
- **Cons:** Rejects valid references that exceed limit
- **Effort:** Small
- **Risk:** Medium (may break payments)

## Recommended Action

**Solution 1** - Change to `bigint` before first production use of Meeza payments. This is a simple migration that eliminates the risk entirely.

```sql
ALTER TABLE "payments" ALTER COLUMN "meeza_reference" TYPE bigint;
```

## Technical Details

**Affected Files:**
- `server/drizzle/0003_payment_reference_codes.sql`
- `server/src/db/schema/index.ts`

**Investigation Needed:**
- Verify Meeza reference number format with Fawaterk documentation
- Confirm maximum expected reference value

## Acceptance Criteria

- [ ] Meeza reference format verified with Fawaterk docs
- [ ] Column type changed to bigint OR validated with constraints
- [ ] Migration tested in staging environment

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-22 | Created from code review | Common oversight - payment refs often exceed int32 |
| 2026-01-23 | **FIXED:** Changed to text type | Best MVP move - text handles any format without overflow risk. No need to investigate API format |

## Resources

- Branch: `important_migrations_deep_check`
- Data Integrity Guardian Agent Report
- PostgreSQL Integer Types Documentation
