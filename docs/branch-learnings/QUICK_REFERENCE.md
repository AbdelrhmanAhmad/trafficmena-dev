# Quick Reference: codex/legacy-members-fixes

**TL;DR**: Branch implements grants + rate limiting + migrations following 9 documented patterns. All patterns correctly implemented. Ready for merge pending 4 minor gap reviews.

---

## 30-Second Overview

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Database Safety** | ✓ PASS | `db.transaction()` wraps all multi-table ops |
| **Security** | ✓ PASS | UUID validation, rate limiting (user ID), LIKE escaping, payload limits |
| **Testing** | ✓ PASS | `rate-limit-keying.test.ts`, `json-body-parser.test.ts` |
| **Concurrency** | ✓ PASS | Rate limit prevents IP bypass, test confirms |
| **Migrations** | ✓ PASS | Idempotent DO blocks, constraint validation separate |

---

## What Changed

```
Core Feature Changes:
  - subscriptionsGrants.ts       (grant single user)
  - subscriptionGrants.ts (bulk CSV)
  - seriesGrants.ts              (grant single user)
  - seriesGrantsBulk.ts          (grant bulk CSV)
  - jsonPayload.ts               (NEW - payload size limit)
  - rate-limit-keying.test.ts    (NEW - verify no bypass)
  - json-body-parser.test.ts     (NEW - JSON parsing)

Migrations:
  - 0014_add_subscription_check_constraints.sql

Frontend:
  - SeriesAccessManager.tsx      (debounced search + pagination)
```

---

## Pattern Reference Card

### 1. Atomic Transactions
```typescript
return db.transaction(async (tx) => {
  await tx.update(...).where(...)
  const [result] = await tx.insert(...).returning()
  return result
})
```
**Use when**: 2+ tables, parent ID passed to child, bulk operations
**Source**: drizzle-transaction-atomicity.md

### 2. Rate Limit by User (not IP)
```typescript
const limited = consumeRateLimit(c, `subscriptions:grant:${userId}`, {
  limit: 30,
  windowMs: 60_000
})
if (limited) return limited
```
**Use when**: Preventing abuse per user/resource
**Source**: pre-launch-security-hardening.md

### 3. Payload Size Limit (streaming)
```typescript
const reader = request.body.getReader()
let totalBytes = 0
while (true) {
  const { done, value } = await reader.read()
  totalBytes += value.byteLength
  if (totalBytes > MAX_JSON_PAYLOAD_BYTES) {
    await reader.cancel()
    return payloadTooLargeError()
  }
}
```
**Use when**: Large file uploads or bulk CSV
**Source**: jsonPayload.ts

### 4. Migration Safety
```sql
-- Step 1: Normalize invalid rows
UPDATE table SET field = value WHERE condition

-- Step 2: Add constraint idempotently
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'name') THEN
    ALTER TABLE ... ADD CONSTRAINT ... NOT VALID
  END IF
END $$

-- Step 3: Validate separately
ALTER TABLE ... VALIDATE CONSTRAINT name
```
**Use when**: Adding strict constraints to tables with history
**Source**: 0014_add_subscription_check_constraints.sql

### 5. UUID Validation
```typescript
const idParsed = uuidParamSchema.safeParse(c.req.param('id'))
if (!idParsed.success) {
  return c.json({error: {code: 'INVALID_PARAM', message: '...'}}, 400)
}
const id = idParsed.data
```
**Use when**: Route params go to database
**Source**: pre-launch-security-hardening.md

### 6. LIKE Search Safety
```typescript
import { escapeLikePattern } from './utils.js'

const search = z.string().trim().max(120).optional()
const escaped = escapeLikePattern(userInput)
.where(ilike(users.email, `%${escaped}%`))
```
**Use when**: User input in SQL LIKE clauses
**Source**: like-pattern-sql-injection.md

### 7. Debounced Search (Frontend)
```typescript
const [debouncedSearch, setDebouncedSearch] = useState('')

const handleSearch = (value) => {
  clearTimeout(timeoutRef.current)
  timeoutRef.current = setTimeout(() => setDebouncedSearch(value), 300)
}

useQuery({
  queryKey: ['search', debouncedSearch],
  queryFn: () => fetchResults(debouncedSearch)
})
```
**Use when**: Real-time search with API calls
**Source**: SeriesAccessManager.tsx

---

## Pre-Merge Checklist

```
Database & Transactions:
  ☐ All multi-table ops use db.transaction()
  ☐ Transaction uses tx context (not db)
  ☐ No manual try/catch swallowing errors inside tx
  ☐ All inserts return values with .returning()

Security:
  ☐ UUID route params validated with Zod
  ☐ Search input escaped with escapeLikePattern()
  ☐ Rate limiting keyed by user ID (not IP)
  ☐ JSON payload size limited (1MB default)
  ☐ CSRF tokens on all state-changing endpoints

Testing:
  ☐ Tests verify concurrency behavior
  ☐ Tests verify error cases (invalid JSON, oversized)
  ☐ Tests run with npm run test:unit
  ☐ No focused tests (.only) or skipped tests (.skip)

Migrations:
  ☐ Migration includes data normalization step
  ☐ Constraints use idempotent DO blocks
  ☐ VALIDATE CONSTRAINT is separate statement

Frontend:
  ☐ Search is debounced (300ms+)
  ☐ Page resets to 1 on search change
  ☐ Uses TanStack Query for cache (not optimistic)
```

---

## Gotchas & Notes

1. **Bulk Operations**: Verify all-or-nothing semantics for 1000-user CSV grants
2. **Audit Trail**: Check that all grant mutations log actor + reason + timestamp
3. **Cache Invalidation**: When grant created/revoked, ensure queries re-fetch
4. **API Docs**: New grant endpoints should be documented

---

## Related Documentation

**Read First** (if new to codebase):
- `/docs/solutions/security-issues/pre-launch-security-hardening.md`
- `/docs/solutions/database-issues/drizzle-transaction-atomicity.md`

**Reference During Review**:
- `/docs/solutions/database-safety-patterns.md`
- `/docs/solutions/security-issues/like-pattern-sql-injection.md`

**Deep Dives**:
- `/docs/solutions/payment-gateway/payment-gateway-mvp-compound-analysis.md`
- `/docs/solutions/feature-implementations/payment-gateway-lessons-learned.md`

---

## Key Files to Review

**High Priority** (core logic):
```
server/src/routes/api/subscriptionsGrants.ts    (line 55-90: transaction)
server/src/routes/api/seriesGrants.ts           (line 42-90: validation)
server/src/routes/api/jsonPayload.ts            (line 54-84: streaming)
server/drizzle/0014_*_check_constraints.sql     (migration safety)
```

**Medium Priority** (tests):
```
tests/unit/rate-limit-keying.test.ts            (bypass prevention)
tests/unit/json-body-parser.test.ts             (payload parsing)
tests/unit/subscription-grants-*.test.ts        (grant operations)
tests/unit/series-grants-*.test.ts              (grant operations)
```

**Low Priority** (complementary):
```
src/features/series/components/SeriesAccessManager.tsx (debounce)
server/src/config/requestLimits.ts               (constants)
```

---

## Quick Command Reference

```bash
# Test rate limiting
npm run test:unit -- rate-limit-keying.test.ts

# Test JSON parsing
npm run test:unit -- json-body-parser.test.ts

# Test all grant operations
npm run test:unit -- subscription-grants

# Run full test suite
npm run test:unit

# Review migrations
cat server/drizzle/0014_*.sql

# Check for CSRF issues (grep all state-changing endpoints)
grep -r "POST\|PUT\|DELETE" server/src/routes/api/ | grep -v test
```

---

## Success Criteria (for PR approval)

- [ ] All security checks pass (rate limit, validation, injection prevention)
- [ ] All tests pass (`npm run test:unit`)
- [ ] All pre-merge checklist items verified
- [ ] At least 2 reviewers sign off
- [ ] Migrations tested on staging database
- [ ] No performance regressions in metrics queries

---

**Branch Status**: Ready for review ✓
**Last Updated**: 2026-02-17
