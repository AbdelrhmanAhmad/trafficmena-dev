# Solution Document Mapping for codex/legacy-members-fixes

Quick reference showing which solution documents apply to each major change in the branch.

## Branch Changes vs Solution Documents

### 1. Subscription Grants (Single + Bulk CSV)
**Files Changed**: `server/src/routes/api/subscriptionsGrants.ts`, `subscriptionsGrantsBulk.ts`, `subscriptionsGrantsCsv.ts`

**Applies**:
- [Drizzle Transaction Atomicity](../solutions/database-issues/drizzle-transaction-atomicity.md) - Uses `db.transaction()` to create grant + expire old subscription atomically
- [Database Safety Patterns](../solutions/database-safety-patterns.md) - Multi-table operations wrapped in transaction
- [Payment Gateway Lessons Learned](../solutions/feature-implementations/payment-gateway-lessons-learned.md) - Idempotency pattern using conditional updates
- [Payment Gateway MVP Compound Analysis](../solutions/payment-gateway/payment-gateway-mvp-compound-analysis.md) - Atomicity, idempotency, security constraints

**Key Implementation**:
```typescript
return db.transaction(async (tx) => {
  // Expire any active subscription
  await tx.update(subscriptions).set({ status: 'expired' }).where(...)
  // Create new grant subscription
  const [sub] = await tx.insert(subscriptions).values({...}).returning()
  return sub
})
```

---

### 2. Series Access Grants (Single + Bulk CSV)
**Files Changed**: `server/src/routes/api/seriesGrants.ts`, `seriesGrantsBulk.ts`, `seriesGrantsCsv.ts`

**Applies**:
- [Drizzle Transaction Atomicity](../solutions/database-issues/drizzle-transaction-atomicity.md) - Multi-user bulk grants wrapped in transaction
- [Database Safety Patterns](../solutions/database-safety-patterns.md) - Consistency with CHECK constraints
- [Pre-Launch Security Hardening](../solutions/security-issues/pre-launch-security-hardening.md) - UUID validation, rate limiting
- [Track Booking Grants Event Access](../solutions/feature-implementations/track-booking-grants-event-access.md) - Transitive access model (grant → access to content)
- [Like Pattern SQL Injection](../solutions/security-issues/like-pattern-sql-injection.md) - Search input escaped with `escapeLikePattern()`

**Key Implementation**:
```typescript
// Validate series ID
const idParsed = uuidPathParamSchema.safeParse(c.req.param('id'))
if (!idParsed.success) return c.json({error...}, 400)

// Safe search
const safeSearch = escapeLikePattern(search)
.where(ilike(users.email, `%${safeSearch}%`))

// Atomic bulk grant
await db.transaction(async (tx) => {
  for (const userId of userIds) {
    await tx.insert(seriesAccessGrants).values({...})
  }
})
```

---

### 3. JSON Payload Size Limiting
**Files Changed**: `server/src/routes/api/jsonPayload.ts` (new)

**Applies**:
- [Pre-Launch Security Hardening](../solutions/security-issues/pre-launch-security-hardening.md) - Defense in depth, input validation patterns

**Key Implementation**:
```typescript
// Streaming reader with byte counter
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

---

### 4. User ID-Based Rate Limiting
**Files Changed**: `server/src/routes/api/utils.ts` (updated), `tests/unit/rate-limit-keying.test.ts` (new)

**Applies**:
- [Pre-Launch Security Hardening](../solutions/security-issues/pre-launch-security-hardening.md) - Security constraint: rate limit keyed by user, not IP
- [Bug-First Testing Workflow](../solutions/development-practices/bug-first-testing-workflow.md) - Test confirms bypass prevention

**Key Implementation**:
```typescript
// Key by user ID, not IP
const key = `subscriptions:grant:${userId}`
const limited = consumeRateLimit(c, key, { limit: 30, windowMs: 60_000 })

// Test: rotating forwarded-for doesn't bypass
const first = await app.request('/limited', {
  headers: { 'x-forwarded-for': '198.51.100.10' }
})
const second = await app.request('/limited', {
  headers: { 'x-forwarded-for': '198.51.100.11' } // Different IP
})
assert.equal(second.status, 429) // Still rate limited
```

---

### 5. Database Migration with CHECK Constraints
**Files Changed**: `server/drizzle/0014_add_subscription_check_constraints.sql` (new)

**Applies**:
- [Database Safety Patterns](../solutions/database-safety-patterns.md) - State machine pattern with constraints
- [Event Cancellation System](../solutions/feature-implementations/event-cancellation-system.md) - Revocation state consistency

**Key Implementation**:
```sql
-- Normalize invalid rows BEFORE enforcing constraint
UPDATE "subscriptions"
SET "subscription_status" = 'expired', "revoked_at" = now()
WHERE "subscription_status" = 'active' AND "revoked_at" IS NOT NULL

-- Add constraint with idempotent check
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_no_active_revoked') THEN
    ALTER TABLE "subscriptions" ADD CONSTRAINT subscriptions_no_active_revoked
      CHECK (NOT ("subscription_status" = 'active' AND "revoked_at" IS NOT NULL))
      NOT VALID
  END IF
END $$

-- Separate validation step
ALTER TABLE "subscriptions" VALIDATE CONSTRAINT subscriptions_no_active_revoked
```

---

### 6. Frontend Pagination with Debounced Search
**Files Changed**: `src/features/series/components/SeriesAccessManager.tsx` (updated)

**Applies**:
- [Pre-Launch Security Hardening](../solutions/security-issues/pre-launch-security-hardening.md) - Input validation, LIKE injection prevention
- [Bug-First Testing Workflow](../solutions/development-practices/bug-first-testing-workflow.md) - Testing patterns

**Key Implementation**:
```typescript
const [debouncedSearch, setDebouncedSearch] = useState('')

// Debounce search with setTimeout
const handleSearch = (value) => {
  clearTimeout(searchTimeoutRef.current)
  searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(value), 300)
}

// Reset to page 1 on search change
const { data: users } = useQuery({
  queryKey: ['series-users', debouncedSearch],
  queryFn: () => fetchUsersAdmin({ page: 1, search: debouncedSearch })
})
```

---

### 7. Dependency Injection for Testability
**Files Changed**: `server/src/routes/api/subscriptionsGrants.ts` (refactored)

**Applies**:
- [Bug-First Testing Workflow](../solutions/development-practices/bug-first-testing-workflow.md) - Testable architecture

**Key Implementation**:
```typescript
// Routes accept services as parameters instead of importing globals
export function registerSubscriptionGrantRoutes(app: Hono, deps?: {
  db?: typeof db
  notificationService?: typeof defaultNotificationService
}) {
  const { db: useDb, notificationService } = {
    db,
    ...deps
  }

  // Tests can pass mock implementations
  return app.post('/grants', async (c) => {
    const result = await createSubscriptionGrantRecord({
      db: useDb,
      payload: {...}
    })
  })
}
```

---

### 8. Admin Metrics Parallelization
**Files Referenced**: `server/src/routes/api/metrics.ts` (implied changes)

**Applies**:
- [Bug-First Testing Workflow](../solutions/development-practices/bug-first-testing-workflow.md) - Concurrent operations testing

**Pattern**: Use `Promise.all()` for independent queries, keep transaction boundaries clear.

---

## Solution Document Cross-Reference

| Document | Branch Usage | Severity |
|----------|--------------|----------|
| drizzle-transaction-atomicity.md | Subscriptions + series grants | HIGH |
| database-safety-patterns.md | Bulk operations, migrations, constraints | HIGH |
| pre-launch-security-hardening.md | UUID validation, rate limiting, search, payload limit | HIGH |
| like-pattern-sql-injection.md | Series grants user search | MEDIUM |
| payment-gateway-lessons-learned.md | Grant idempotency pattern | HIGH |
| payment-gateway-mvp-compound-analysis.md | Atomicity + consistency fundamentals | HIGH |
| track-booking-grants-event-access.md | Transitive access model | MEDIUM |
| event-cancellation-system.md | Revocation state machine | MEDIUM |
| bug-first-testing-workflow.md | Test files: rate limit, JSON payload | HIGH |

---

## Checklist for Code Review

### Database Changes
- [ ] All multi-table operations use `db.transaction()`
- [ ] Transaction uses `tx` context (not `db`)
- [ ] Migration includes data normalization before constraints
- [ ] CHECK constraints use idempotent `DO $$...$$` pattern
- [ ] Constraint validation is separate from creation

### Security Changes
- [ ] UUID route params validated with `uuidParamSchema`
- [ ] Search input escaped with `escapeLikePattern()`
- [ ] Rate limiting keyed by user ID (from session)
- [ ] JSON payload size limited to 1MB with streaming reader
- [ ] CSRF protection on all state-changing endpoints

### Testing Changes
- [ ] Tests confirm concurrency behavior (rate limit bypass prevention)
- [ ] Tests verify error cases (malformed JSON, oversized payload)
- [ ] Tests use Node's built-in `test` runner
- [ ] Tests can be run with `npm run test:unit`

### Frontend Changes
- [ ] Search input is debounced (300ms+ delay)
- [ ] Query re-runs on debounced search change
- [ ] Pagination resets to page 1 on search change
- [ ] Uses TanStack Query for cache management (not optimistic updates)

---

## Reference Files Location

All solution documents are located in:
```
/Users/hosnimohamed/Projects/trafficmena/docs/solutions/
```

Categories:
- `database-issues/` - Database safety patterns
- `security-issues/` - Input validation, rate limiting, injection prevention
- `feature-implementations/` - Feature design patterns
- `payment-gateway/` - Payment system lessons
- `development-practices/` - Testing, workflow patterns
