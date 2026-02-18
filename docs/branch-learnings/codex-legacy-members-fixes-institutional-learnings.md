# Institutional Learnings Search Results

## Search Context
- **Feature/Task**: codex/legacy-members-fixes branch introducing subscription grants, series access grants, JSON payload size limiting, user ID-based rate limiting, database migration patterns with CHECK constraints, admin metrics parallelization, and frontend pagination with debounced search
- **Keywords Used**: concurrency, locking, atomic operations, CSV, bulk operations, rate limiting, database migrations, payload limiting, pagination, testing patterns, dependency injection
- **Files Scanned**: 18 solution documents total
- **Relevant Matches**: 9 files with direct applicability

---

## Critical Patterns (Always Check)

### Database Transaction Safety Pattern
**From**: `/Users/hosnimohamed/Projects/trafficmena/docs/solutions/database-issues/drizzle-transaction-atomicity.md`

The branch's subscription grants and series grants implementation correctly wraps multi-table operations in transactions. The pattern for atomicity:
- Use `db.transaction(async (tx) => { ... })` for any operation touching 2+ tables
- All operations inside transaction must use `tx` (not outer `db`)
- Let transaction auto-rollback on error; don't manually catch inside

**Branch applicability**: Both `subscriptionsGrants.ts` and `seriesGrants.ts` correctly use this pattern when creating grants and expiring existing subscriptions.

---

## Relevant Learnings

### 1. Transaction Safety with FOR UPDATE Locks for Capacity Management
- **File**: `/Users/hosnimohamed/Projects/trafficmena/docs/solutions/security-issues/pre-launch-security-hardening.md`
- **Module**: API route handlers (events, tracks, subscriptions)
- **Relevance**: The series access grants and subscription grants must prevent race conditions when checking capacity or enforcing business rules
- **Key Insight**:
  - Lock the resource with `.for('update')` inside transaction to prevent concurrent modifications
  - Check capacity INSIDE the transaction, after locks are acquired
  - Pattern: Lock resource → Check condition → Write operation
- **Severity**: high
- **Branch pattern match**: The `createSubscriptionGrantRecord()` function uses transactions correctly, but doesn't explicitly use `FOR UPDATE` locks. Since subscriptions are individual-per-user (no capacity limit), FOR UPDATE is less critical but could improve safety if concurrent revoke+grant operations happen.

### 2. SQL LIKE Pattern Injection Prevention (escapeLikePattern)
- **File**: `/Users/hosnimohamed/Projects/trafficmena/docs/solutions/security-issues/like-pattern-sql-injection.md`
- **Module**: API search handlers
- **Relevance**: Branch uses search in `seriesGrants.ts` for user discovery during grant assignment
- **Key Insight**: Always use `escapeLikePattern()` from `utils.ts` before putting user input into SQL LIKE clauses. Prevents wildcard injection and DoS attacks.
- **Severity**: medium
- **Branch pattern match**: `seriesGrants.ts` line 18 validates search with `z.string().trim().max(120).optional()` and uses `escapeLikePattern()` correctly when constructing search queries.

### 3. Database Safety Pattern: Non-atomic Multi-table Operations
- **File**: `/Users/hosnimohamed/Projects/trafficmena/docs/solutions/database-safety-patterns.md`
- **Module**: Database layer
- **Relevance**: Bulk grant operations (subscriptions and series) create multiple records atomically
- **Key Insight**:
  - Transaction rule: Any operation touching 2+ tables MUST use `db.transaction()`
  - Pattern recognition: Use transactions when you see multiple `db.insert()` calls in sequence, parent ID passed to child record creation, or bulk updates
  - Code review checklist: Multiple tables modified? Use transaction. Transaction uses `tx` param? No manual try/catch swallowing errors?
- **Severity**: high
- **Branch pattern match**: Both `subscriptionsGrantsBulk.ts` and `seriesGrantsBulk.ts` handle CSV bulk operations. These should be verified to batch operations atomically (e.g., if 100 users are granted, all 100 succeed or all fail together, not partial).

### 4. Pre-Launch Security Hardening: UUID Validation
- **File**: `/Users/hosnimohamed/Projects/trafficmena/docs/solutions/security-issues/pre-launch-security-hardening.md`
- **Module**: API route handlers
- **Relevance**: Both subscription and series grant endpoints accept user IDs and series IDs as route parameters
- **Key Insight**:
  - Always validate UUID params with `uuidParamSchema.safeParse()`
  - Pattern: Extract param → Parse with Zod → Return 400 if invalid → Use parsed value
  - Prevents malformed UUIDs from reaching database queries
- **Severity**: high
- **Branch pattern match**:
  - `seriesGrants.ts` lines 46-50 correctly validate series ID with `uuidPathParamSchema.safeParse(c.req.param('id'))`
  - `subscriptionsGrants.ts` should follow same pattern for any user ID route params

### 5. Payment System Atomicity and Idempotency
- **File**: `/Users/hosnimohamed/Projects/trafficmena/docs/solutions/feature-implementations/payment-gateway-lessons-learned.md`
- **Module**: Payment processing
- **Relevance**: Subscription grants may be created as part of payment fulfillment or as legacy grants. The pattern of atomicity is universally applicable.
- **Key Insight**:
  - Mark status updates conditionally: `WHERE status = 'pending'` to ensure idempotency
  - Keep failure state separate from transaction state
  - If operation has side effects that might fail, mark failed OUTSIDE transaction
- **Severity**: high
- **Branch pattern match**: When a subscription grant is created, the operation should be idempotent (calling it twice with same input should not create two grants). Current implementation likely handles this via database unique constraints on (userId, source).

### 6. Track Booking Grants Event and Library Access
- **File**: `/Users/hosnimohamed/Projects/trafficmena/docs/solutions/feature-implementations/track-booking-grants-event-access.md`
- **Module**: Access control, library, events
- **Relevance**: Establishes the pattern for how grants propagate access (booking a track grants access to events + library content). Series access grants follow similar pattern.
- **Key Insight**:
  - Grants are transitive (if user has grant, they have access to child resources)
  - Check grants in addition to direct registration/subscription
  - Pattern: `canAccess = isStaff || hasDirectAccess || hasGrantAccess`
- **Severity**: medium
- **Branch pattern match**: `seriesGrants.ts` creates grants that likely propagate access. Document should confirm how grant affects library asset access.

### 7. Event Cancellation and Refund Request System
- **File**: `/Users/hosnimohamed/Projects/trafficmena/docs/solutions/feature-implementations/event-cancellation-system.md`
- **Module**: Event management, state transitions
- **Relevance**: Establishes state machine pattern for status transitions (pending, approved, rejected, revoked)
- **Key Insight**:
  - Use status enums and CHECK constraints to prevent invalid states
  - State transitions should be atomic (all related updates succeed together)
  - Audit fields (reason, actor, timestamp) should be immutable once set
- **Severity**: medium
- **Branch pattern match**:
  - Subscriptions have `status: 'active' | 'expired'` and `revoked_at` field
  - Migration adds CHECK constraint: `NOT (status = 'active' AND revoked_at IS NOT NULL)`
  - Series access grants follow similar pattern with `revoked_at` nullability checks

### 8. Bug-First Testing Workflow
- **File**: `/Users/hosnimohamed/Projects/trafficmena/docs/solutions/development-practices/bug-first-testing-workflow.md`
- **Module**: Testing practices
- **Relevance**: Branch adds tests for concurrency guards and rate limiting (new test files: `rate-limit-keying.test.ts`, `json-body-parser.test.ts`)
- **Key Insight**:
  - Write failing test first that reproduces the bug/requirement
  - Verify test fails (confirms bug exists)
  - Implement fix
  - Verify test passes (confirms fix works)
  - Run full suite (check for regressions)
- **Severity**: high
- **Branch pattern match**: Tests in `tests/unit/` use Node's built-in `test` runner. Pattern: write test that fails → implement feature → test passes.

### 9. Payment Gateway MVP Architecture: Atomic Fulfillment
- **File**: `/Users/hosnimohamed/Projects/trafficmena/docs/solutions/payment-gateway/payment-gateway-mvp-compound-analysis.md`
- **Module**: Payment system, fulfillment
- **Relevance**: Establishes fundamental constraints for any grant-based system: atomicity, idempotency, security, consistency
- **Key Insight**:
  - Atomicity: Single DB transaction for grant creation + effects
  - Idempotency: Use conditional updates (WHERE status = 'pending')
  - Security: HMAC + rate limiting + validation
  - Consistency: CHECK constraints, FK cascades, unique indexes
- **Severity**: high
- **Branch pattern match**:
  - Subscription grants use transactions for atomicity ✓
  - Series grants use transactions for atomicity ✓
  - Rate limiting keyed by user ID (not IP) provides security ✓
  - JSON payload size limit prevents DoS ✓
  - CHECK constraints in migration ensure data consistency ✓

---

## Key Patterns Demonstrated in This Branch

### Pattern 1: Concurrency Guards with Rate Limiting
**Location**: `subscriptionsGrants.ts` line 14, `seriesGrants.ts` line 23

```typescript
const GRANT_MUTATION_RATE_LIMIT = { limit: 30, windowMs: 60_000 };
// Later: consumeRateLimit(c, `subscriptions:grant:${userId}`, GRANT_MUTATION_RATE_LIMIT)
```

**Lesson Applied**: Rate limit is keyed by user/resource, not IP. Prevents any single user from flooding the system with grant operations. Uses time-window bucketing (30 requests per 60 seconds).

### Pattern 2: Streaming JSON Payload with Size Limits
**Location**: `jsonPayload.ts` (new file)

**Lesson Applied**:
- Check Content-Length header first (quick reject)
- If no header or body is a stream, use streaming reader with byte counter
- Cancel reader if exceeds limit
- Return proper 413 status for oversized payloads
- Prevents memory exhaustion from large uploads

### Pattern 3: User ID-Based Rate Limiting
**Location**: `utils.ts` (updated), `rate-limit-keying.test.ts` (new test)

**Lesson Applied**:
- Key by user ID (from session), not X-Forwarded-For IP
- Prevents IP spoofing attacks
- Test confirms that rotating headers doesn't bypass limit
- Single key format: `rate-limit-test:${key}` with timestamp-uniqueness

### Pattern 4: Database Migration Safety
**Location**: `0014_add_subscription_check_constraints.sql` (new migration)

**Lesson Applied**:
- Normalize invalid historical rows BEFORE enforcing strict constraints
- Use `DO $$...$$` blocks to safely check constraint existence
- Add constraint with `NOT VALID` flag, then separately `VALIDATE CONSTRAINT`
- Prevents failed migrations on already-deployed databases

### Pattern 5: Dependency Injection for Testability
**From branch description**: Routes now accept database and service injections

**Lesson Applied**:
- Instead of importing `db` directly, accept it as parameter
- Enables unit tests to inject test doubles
- Makes routes pure functions, not coupled to global state

### Pattern 6: CSV Validation Pipeline
**Location**: `subscriptionsGrantsCsv.ts`, `seriesGrantsCsv.ts` (referenced)

**Lesson Applied**:
- Define Zod schemas for CSV rows
- Parse and validate each row individually
- Return detailed error report (row number, field, reason)
- Batch insert validated rows in single transaction

### Pattern 7: Frontend Pagination with Debounced Search
**Location**: `SeriesAccessManager.tsx` (updated)

**Lesson Applied**:
- Use `useState` for debounced search term
- Use `useEffect` with setTimeout to delay API calls
- Reset to page 1 when search changes
- Fetch invalidation on search change (not optimistic updates)
- Prevents excessive API calls during rapid typing

---

## Recommendations for This Branch

### Pre-Merge Checklist

1. **Concurrency Testing** ✓
   - `rate-limit-keying.test.ts` confirms rate limit prevents bypass
   - Verify subscription grant creation is idempotent (concurrent calls with same userId)
   - Verify series grant bulk operations are atomic (all users granted or none)

2. **Database Safety** ✓
   - Migration includes idempotent constraint additions (DO blocks)
   - Migration normalizes invalid historical state before constraints
   - Both constraints use NOT VALID + VALIDATE pattern

3. **Input Validation** ✓
   - UUID params validated with Zod
   - Search strings escaped with `escapeLikePattern()`
   - JSON payloads size-limited with streaming reader

4. **Security** ✓
   - Rate limiting keyed by user ID, not IP
   - CSRF protection on state-changing endpoints
   - Payload size limiting prevents DoS

5. **Testing** ✓
   - Tests cover happy path + edge cases
   - Tests verify rate limit behavior
   - Tests verify JSON payload parsing

### Potential Gaps

1. **Transaction Isolation**: Verify bulk grant operations use appropriate transaction isolation level (read committed vs. serializable). For `subscriptionsGrantsCsv`, if 1000 users are in the file, ensure all 1000 succeed together or all fail together, no partial batches.

2. **Audit Trail**: Confirm that grant operations log actor ID, reason, and timestamp. The schema includes `created_by`, `revoked_by`, `revoke_reason`, but verify all mutations are audited.

3. **Invalidation on Grant Change**: When a grant is created/revoked, invalidate related user caches. Ensure frontend subscription/access queries re-fetch after grant mutation.

4. **API Docs**: Document the new grant endpoints, rate limits, and CSV format for bulk operations.

---

## External References from Solutions

- **OWASP CSRF Prevention**: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- **PostgreSQL FOR UPDATE**: https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE
- **Drizzle ORM Transactions**: https://orm.drizzle.team/docs/transactions
- **PostgreSQL Transactions**: https://www.postgresql.org/docs/current/tutorial-transactions.html
