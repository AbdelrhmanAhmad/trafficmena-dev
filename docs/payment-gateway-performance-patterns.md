# Payment Gateway Performance Patterns

This document captures the performance patterns implemented in the payment gateway. Use these patterns as a reference for other high-throughput features.

---

## 1. Query Optimization Patterns

### 1.1 Parallel Query Execution with Promise.all

**Problem:** Sequential database queries create latency bottlenecks under concurrent load.

**Solution:** Execute independent queries in parallel using `Promise.all()`.

**Location:** `server/src/routes/api/payments.ts` lines 196-214, 236-251, 320-326

```typescript
// BEFORE: Sequential queries (6 round-trips)
const [subscription] = await db.select().from(subscriptions).where(...);
const [settings] = await db.select().from(platformSettings).limit(1);
const [event] = await db.select().from(events).where(...);

// AFTER: Parallel queries (2 round-trips)
const [subscriptionResult, settingsResult] = await Promise.all([
  db.select().from(subscriptions).where(
    and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.status, 'active'),
      gte(subscriptions.endsAt, new Date()),
    ),
  ),
  db.select().from(platformSettings).limit(1),
]);
```

**When to use:**
- Queries are completely independent (no data dependencies)
- Queries operate on different tables or different rows
- Order of execution doesn't matter

**Performance gain:** 50-70% latency reduction for multi-query operations.

---

### 1.2 Atomic Operations with CTE (Common Table Expressions)

**Problem:** Multi-step operations require multiple round-trips and manual transaction coordination.

**Solution:** Use a single CTE query to perform all operations atomically.

**Location:** `server/src/routes/api/payments.ts` lines 85-170 (`executeAtomicTrackBooking`)

```typescript
// Single atomic CTE for track booking with capacity validation
const atomicResult = await tx.execute(sql`
  WITH track_booking_check AS (
    SELECT COUNT(*) AS current_count FROM track_bookings WHERE track_id = ${trackId}
  ),
  locked_events AS (
    SELECT e.id, e.max_attendees
    FROM track_events te
    JOIN events e ON e.id = te.event_id
    WHERE te.track_id = ${trackId}
    FOR UPDATE
  ),
  existing AS (
    SELECT event_id
    FROM event_attendees
    WHERE user_id = ${userId}
      AND event_id IN (SELECT id FROM locked_events)
  ),
  attendee_counts AS (
    SELECT event_id, COUNT(*) AS attendee_count
    FROM event_attendees
    WHERE event_id IN (SELECT id FROM locked_events)
    GROUP BY event_id
  ),
  eligible AS (
    SELECT le.id AS event_id
    FROM locked_events le
    LEFT JOIN attendee_counts ac ON ac.event_id = le.id
    WHERE COALESCE(ac.attendee_count, 0) < le.max_attendees
  ),
  to_insert AS (
    SELECT event_id
    FROM eligible
    WHERE event_id NOT IN (SELECT event_id FROM existing)
  ),
  inserted_attendees AS (
    INSERT INTO event_attendees (event_id, user_id, paid_at, price_paid_cents, payment_id)
    SELECT event_id, ${userId}, ${paidAt}, ${pricePaidCents}, ${paymentId}
    FROM to_insert
    RETURNING event_id
  ),
  inserted_booking AS (
    INSERT INTO track_bookings (track_id, user_id, paid_at, price_paid_cents, payment_id)
    SELECT ${trackId}, ${userId}, ${paidAt}, ${pricePaidCents}, ${paymentId}
    WHERE (SELECT current_count FROM track_booking_check) < ${maxTrackBookings ?? 2147483647}
      AND (SELECT COUNT(*) FROM locked_events) > 0
    ON CONFLICT (track_id, user_id) DO UPDATE
      SET paid_at = EXCLUDED.paid_at,
          price_paid_cents = EXCLUDED.price_paid_cents,
          payment_id = EXCLUDED.payment_id
    RETURNING id
  )
  SELECT
    (SELECT COUNT(*) FROM locked_events) AS total_events,
    (SELECT COUNT(*) FROM existing) AS existing_count,
    (SELECT COUNT(*) FROM inserted_attendees) AS inserted_count,
    (SELECT COUNT(*) FROM locked_events WHERE max_attendees IS NULL) AS null_capacity_count,
    (SELECT current_count FROM track_booking_check) AS current_bookings,
    (SELECT COUNT(*) FROM inserted_booking) AS booking_inserted
`);
```

**Benefits:**
- Single database round-trip for complex multi-table operations
- All-or-nothing atomicity guaranteed by CTE
- Row locking happens within the same query
- Returns diagnostic counts for validation

**When to use:**
- Multi-table inserts with validation
- Capacity checking and reservation
- Operations requiring row-level locks

---

## 2. External API Resilience

### 2.1 Timeout Handling with AbortController

**Problem:** External API calls can hang indefinitely, blocking server resources.

**Solution:** Use `AbortController` with explicit timeout cleanup.

**Location:** `server/src/services/fawaterk.ts` lines 18-32

```typescript
const API_TIMEOUT_MS = 10_000; // 10 seconds

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = API_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId); // Always cleanup timer
  }
}
```

**Key points:**
- 10-second timeout balances user experience vs. payment completion
- `finally` block ensures timer cleanup prevents memory leaks
- AbortController allows graceful request cancellation

---

### 2.2 Circuit Breaker Pattern

**Problem:** Repeated failures to external services cause cascading latency.

**Solution:** Track consecutive failures and temporarily block requests.

**Location:** `server/src/services/fawaterk.ts` lines 8-78

```typescript
// Configuration
const CIRCUIT_FAILURE_THRESHOLD = 5;   // Failures before opening
const CIRCUIT_COOLDOWN_MS = 30_000;    // 30 seconds cooldown

// State (module-level singleton)
type CircuitState = 'closed' | 'open' | 'half-open';
let circuitState: CircuitState = 'closed';
let consecutiveFailures = 0;
let circuitOpenedAt = 0;

async function fetchWithCircuitBreaker(
  url: string,
  options: RequestInit,
  timeoutMs = API_TIMEOUT_MS,
): Promise<Response> {
  // OPEN: Fail fast without making request
  if (circuitState === 'open') {
    if (Date.now() - circuitOpenedAt > CIRCUIT_COOLDOWN_MS) {
      circuitState = 'half-open';
      console.log('[fawaterk] Circuit breaker: half-open, attempting request');
    } else {
      throw new Error('Payment service temporarily unavailable. Please try again later.');
    }
  }

  try {
    const response = await fetchWithTimeout(url, options, timeoutMs);

    // RESET on success
    if (response.ok) {
      if (circuitState === 'half-open') {
        console.log('[fawaterk] Circuit breaker: closed after successful request');
      }
      consecutiveFailures = 0;
      circuitState = 'closed';
    }

    return response;
  } catch (error) {
    consecutiveFailures++;

    // OPEN circuit after threshold or immediately in half-open
    const shouldOpen =
      circuitState === 'half-open' || consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD;

    if (shouldOpen) {
      circuitState = 'open';
      circuitOpenedAt = Date.now();
      console.error('[fawaterk] Circuit breaker: OPEN after', consecutiveFailures, 'failures');
    }

    throw error;
  }
}
```

**State machine:**
```
  [CLOSED] --5 failures--> [OPEN] --30s cooldown--> [HALF-OPEN]
     ^                                                   |
     |                                                   |
     +------ 1 success <--------------------------------+
                                |
                          1 failure -> [OPEN]
```

**Benefits:**
- Prevents resource exhaustion during outages
- Fast-fail for users (no 10s wait on every request)
- Self-healing after cooldown period
- Observability via console logs

---

## 3. Database Indexing Strategy

### 3.1 Existing Indexes (Migration 0015)

| Index | Type | Purpose |
|-------|------|---------|
| `payments_user_idx` | btree(user_id) | Filter payments by user |
| `payments_status_idx` | btree(status) | Filter by payment status |
| `payments_fawaterk_invoice_idx` | btree(fawaterk_invoice_id) | Webhook lookup by invoice |
| `payments_unique_pending` | partial unique (user_id, item_type, item_id) WHERE status='pending' | Prevent duplicate pending payments |
| `payments_unique_pending_subscription` | partial unique (user_id) WHERE status='pending' AND item_type='subscription' | One pending subscription per user |
| `subscriptions_user_idx` | btree(user_id) | Filter subscriptions by user |
| `subscriptions_status_idx` | btree(subscription_status) | Filter by status |
| `subscriptions_ends_at_idx` | btree(ends_at) | Expiration queries |

**Source:** `server/drizzle/0015_payment_gateway.sql`

---

### 3.2 Composite Indexes (Migration 0016)

| Index | Type | Purpose |
|-------|------|---------|
| `payments_created_at_idx` | btree(created_at) | Payment history pagination |
| `subscriptions_active_lookup_idx` | btree(user_id, subscription_status, ends_at) | Efficient active subscription check |

**Source:** `server/drizzle/0016_payment_gateway_security_fixes.sql`

---

### 3.3 Partial Index for Background Jobs (Migration 0018)

**Problem:** Payment expiration job scans all payments to find pending ones.

**Query pattern:**
```sql
UPDATE payments SET status = 'expired'
WHERE status = 'pending' AND created_at <= $threshold
```

**Solution:** Partial index on `created_at` WHERE `status = 'pending'`

```sql
CREATE INDEX IF NOT EXISTS "payments_pending_created_at_idx"
ON "payments" ("created_at")
WHERE status = 'pending';
```

**Source:** `server/drizzle/0018_payment_expiration_index.sql`

**Benefits:**
- Index only contains pending payments (small subset)
- Efficient range scan on `created_at`
- O(log n) lookup instead of O(n) table scan

---

### 3.4 Index Selection Guidelines

1. **Use partial indexes** for status-filtered queries (WHERE status = X)
2. **Use composite indexes** for multi-column WHERE clauses (order matters: most selective first)
3. **Avoid over-indexing** - each index adds write overhead
4. **Verify with EXPLAIN ANALYZE** before and after

```sql
-- Check if index is used
EXPLAIN ANALYZE
UPDATE payments SET status = 'expired'
WHERE status = 'pending' AND created_at <= NOW() - INTERVAL '72 hours';
```

---

## 4. Concurrency Patterns

### 4.1 Pessimistic Locking with FOR UPDATE

**Problem:** Concurrent requests can create race conditions (double-booking, overselling).

**Solution:** Lock rows during read to prevent concurrent modifications.

**Location:** `server/src/routes/api/payments.ts` lines 100, 475

```typescript
// Lock events for atomic capacity checking
const [track] = await tx
  .select({...})
  .from(tracks)
  .where(eq(tracks.id, updated.itemId))
  .for('update')  // Drizzle ORM syntax
  .limit(1);

// Raw SQL CTE version
FOR UPDATE
```

**When to use:**
- Capacity-constrained bookings
- Inventory management
- Any counter that must not oversell

---

### 4.2 Atomic Status Transitions

**Problem:** Webhooks and polling can race to process the same payment.

**Solution:** Use WHERE clause to ensure only one processor wins.

**Location:** `server/src/routes/api/payments.ts` lines 369-384

```typescript
// Only succeeds if payment is still pending
const [updated] = await tx
  .update(payments)
  .set({ status: 'paid', paidAt: new Date() })
  .where(and(
    eq(payments.id, paymentId),
    eq(payments.status, 'pending')  // Atomic guard
  ))
  .returning();

if (!updated) {
  // Either already processed or doesn't exist
  const [existing] = await tx.select().from(payments).where(eq(payments.id, paymentId));
  if (existing?.status === 'paid') {
    return { alreadyProcessed: true };
  }
  throw new Error('Payment not found or invalid state');
}
```

**Key insight:** The UPDATE with WHERE status='pending' acts as an atomic compare-and-swap.

---

### 4.3 Idempotent Webhook Processing

**Problem:** Payment gateways may send duplicate webhooks.

**Solution:** Design handlers to be idempotent (safe to call multiple times).

**Location:** `server/src/routes/api/payments.ts` lines 1016-1022

```typescript
// Early return if already processed
if (payment.status === 'paid') {
  return c.json({ data: { status: 'paid', alreadyProcessed: true } });
}

if (payment.status !== 'pending') {
  return c.json({ data: { status: payment.status } });
}
```

**Implementation checklist:**
- Check current state before processing
- Return success for already-completed operations
- Use atomic transitions (see 4.2)
- Log duplicate attempts for monitoring

---

## 5. Rate Limiting Configuration

**Location:** `server/src/routes/api/payments.ts` lines 28-32

```typescript
const CHECKOUT_RATE_LIMIT = { limit: 5, windowMs: 60_000 };   // 5/min per user
const VERIFY_RATE_LIMIT = { limit: 30, windowMs: 60_000 };    // 30/min per user
const METHODS_RATE_LIMIT = { limit: 60, windowMs: 60_000 };   // 60/min per user
const WEBHOOK_RATE_LIMIT = { limit: 100, windowMs: 60_000 };  // 100/min per IP
```

**Rationale:**
- **Checkout:** Low limit prevents payment spam and fraud
- **Verify:** Higher limit allows polling without blocking legitimate retries
- **Methods:** Cached on frontend, high limit for edge cases
- **Webhook:** IP-based to prevent DoS, high limit for legitimate gateway traffic

---

## 6. Background Job Pattern

**Problem:** Expensive operations block request latency.

**Solution:** Move non-critical operations to background jobs.

**Location:** `server/src/jobs/paymentExpiration.ts`

```typescript
const PENDING_PAYMENT_EXPIRY_MS = 72 * 60 * 60 * 1000; // 72 hours
const EXPIRATION_JOB_INTERVAL_MS = 60 * 60 * 1000;     // 1 hour

export async function expireAllStalePendingPayments(): Promise<number> {
  const expiryThreshold = new Date(Date.now() - PENDING_PAYMENT_EXPIRY_MS);

  const result = await db
    .update(payments)
    .set({ status: 'expired' })
    .where(and(
      eq(payments.status, 'pending'),
      lte(payments.createdAt, expiryThreshold)
    ))
    .returning({ id: payments.id });

  if (result.length > 0) {
    console.log(`[payment-expiration] Expired ${result.length} stale pending payments`);
  }

  return result.length;
}

export function startPaymentExpirationJob(): void {
  // Run immediately on startup
  expireAllStalePendingPayments().catch(console.error);

  // Schedule hourly cleanup
  setInterval(async () => {
    try {
      await expireAllStalePendingPayments();
    } catch (error) {
      console.error('[payment-expiration] Failed:', error);
    }
  }, EXPIRATION_JOB_INTERVAL_MS);
}
```

**Key points:**
- Run on startup to clean stale data
- Hourly interval balances freshness vs. load
- Error handling prevents job from dying
- Observability via console logs
- Uses partial index for efficient queries (see 3.3)

---

## Summary: Pattern Selection Guide

| Scenario | Pattern |
|----------|---------|
| Multiple independent DB queries | Promise.all |
| Multi-table atomic operation | CTE with FOR UPDATE |
| External API call | Timeout + Circuit Breaker |
| Status-filtered queries | Partial index |
| Multi-column lookups | Composite index |
| Capacity-limited booking | FOR UPDATE locking |
| Concurrent status updates | WHERE status guard |
| Duplicate webhooks | Idempotent handlers |
| Expensive cleanup | Background jobs |
| Spam prevention | Rate limiting |

---

## Related Files

- `server/src/routes/api/payments.ts` - Main payment routes
- `server/src/services/fawaterk.ts` - Payment gateway client
- `server/src/jobs/paymentExpiration.ts` - Background expiration job
- `server/drizzle/0015_payment_gateway.sql` - Base schema and indexes
- `server/drizzle/0016_payment_gateway_security_fixes.sql` - FK constraints and composite indexes
- `server/drizzle/0018_payment_expiration_index.sql` - Partial index for expiration
