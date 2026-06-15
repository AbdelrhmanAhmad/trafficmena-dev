# Payment Gateway Security Patterns Reference

This document synthesizes the security patterns implemented in the TrafficMENA payment gateway integration with Fawaterk. Use this as a reference for future payment features and security reviews.

---

## 1. Authentication & Authorization Patterns

### Session-Based Authentication

All authenticated endpoints use Better Auth session validation via `getSessionFromRequest()`:

```typescript
// Pattern: Session validation at route entry
const session = await getSessionFromRequest(c);
if (!session?.user?.id) {
  return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
}
```

**Key Points:**
- Session cookies managed automatically by Better Auth
- Frontend must include `credentials: 'include'` in fetch calls
- Session contains `user.id` for ownership verification

### User Ownership Verification

Critical security pattern: Always verify the current user owns the resource they're accessing.

```typescript
// Pattern: Ownership verification via compound WHERE clause
const [payment] = await db
  .select()
  .from(payments)
  .where(and(
    eq(payments.id, paymentId),
    eq(payments.userId, session.user.id)  // Ownership check
  ));

if (!payment) {
  return c.json({ error: { code: 'NOT_FOUND', message: 'Payment not found' } }, 404);
}
```

**Applied To:**
- `GET /payments/:id` - Payment status lookup
- `POST /payments/verify` - Payment verification polling
- Price preview endpoints

**Anti-Pattern to Avoid:**
```typescript
// WRONG: No ownership check - allows users to view any payment
const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
```

### Role-Based Access Control (RBAC)

Role hierarchy: `owner > admin > manager > expert > user`

```typescript
// Pattern: Role checks for admin-only operations
import { requireAdmin, requireManager } from '../../utils/session.js';

// In route handler
await requireAdmin(c);  // Throws 403 if not admin+
```

**Payment Gateway Usage:**
- Standard users can checkout, verify their payments
- No admin endpoints in payment flow currently
- Future: Admin refund endpoints should use `requireAdmin()`

---

## 2. Data Integrity Patterns

### HMAC Signature Verification

Webhooks from Fawaterk use HMAC-SHA256 signatures for authenticity verification.

```typescript
// Location: server/src/services/fawaterk.ts

export function verifyFawaterkWebhook(body: {
  invoice_id: number;
  invoice_key: string;
  payment_method: string;
  hashKey: string;
}): boolean {
  // Build query string in exact order per Fawaterk docs
  const queryParam = `InvoiceId=${body.invoice_id}&InvoiceKey=${body.invoice_key}&PaymentMethod=${body.payment_method}`;

  // Use API Key as HMAC secret (per Fawaterk documentation)
  const expectedHash = crypto
    .createHmac('sha256', env.FAWATERK_API_KEY)
    .update(queryParam)
    .digest('hex');

  // SECURITY: Timing-safe comparison - see next section
  // ...
}
```

**Key Points:**
- HMAC uses API key as secret (per Fawaterk documentation)
- Query string order matters - must match Fawaterk's format exactly
- Always verify before processing webhook

### Timing-Safe Comparison

Prevents timing attacks on cryptographic comparisons:

```typescript
import { timingSafeEqual } from 'node:crypto';

// Pattern: Timing-safe hash comparison
try {
  const receivedBuffer = Buffer.from(body.hashKey, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  // Length check first (timing-safe comparison requires equal lengths)
  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
} catch {
  // Invalid hex string or other error
  return false;
}
```

**Why This Matters:**
- Regular `===` comparison leaks timing information
- Attackers can deduce correct characters by measuring response time
- `timingSafeEqual` takes constant time regardless of where mismatch occurs

### Invoice Key Verification (Defense in Depth)

Beyond HMAC, also verify the invoice key matches our stored value:

```typescript
// Pattern: Secondary verification after HMAC
const [payment] = await db.select().from(payments)
  .where(eq(payments.fawaterkInvoiceId, webhookData.invoice_id));

// SECURITY: Verify invoice key matches stored value
if (payment.fawaterkInvoiceKey !== webhookData.invoice_key) {
  console.error('[payments/webhook] Invoice key mismatch');
  return c.json({ error: { code: 'INVALID_INVOICE_KEY' } }, 401);
}
```

**Rationale:**
- HMAC could theoretically be brute-forced (unlikely but possible)
- Invoice key is stored per-payment, provides additional verification
- Attacker would need both valid HMAC AND correct invoice key

### Atomic Transactions

All payment processing uses database transactions to ensure atomicity:

```typescript
// Pattern: Transaction for multi-step operations
return db.transaction(async (tx) => {
  // Step 1: Atomic lock and status update
  const [updated] = await tx
    .update(payments)
    .set({ status: 'paid', paidAt: new Date() })
    .where(and(
      eq(payments.id, paymentId),
      eq(payments.status, 'pending')  // Only update if still pending
    ))
    .returning();

  if (!updated) {
    // Race condition: already processed or doesn't exist
    const [existing] = await tx.select().from(payments).where(eq(payments.id, paymentId));
    if (existing?.status === 'paid') {
      return { alreadyProcessed: true };  // Idempotent response
    }
    throw new Error('Payment not found or invalid state');
  }

  // Step 2: Fulfill the purchase (insert attendee records, etc.)
  // If this fails, entire transaction rolls back - payment stays pending

  return { success: true };
});
```

**Key Points:**
- Use `FOR UPDATE` locks on capacity-limited resources
- Check-and-update in single query prevents race conditions
- Rollback on failure keeps payment pending for retry

### Idempotent Payment Processing

Webhooks may arrive multiple times - processing must be idempotent:

```typescript
// Pattern: Idempotent processing with status check
if (payment.status === 'paid') {
  return c.json({ data: { status: 'paid', alreadyProcessed: true } });
}

if (payment.status !== 'pending') {
  return c.json({ data: { status: payment.status } });  // expired, failed, etc.
}

// Only process pending payments
const result = await processSuccessfulPayment(payment.id);
```

---

## 3. Rate Limiting Patterns

### Token Bucket Implementation

In-memory rate limiter with per-key buckets:

```typescript
// Location: server/src/services/rateLimiter.ts

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  consume(key: string, rule: RateLimitRule) {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    // New bucket if expired or doesn't exist
    if (!bucket || bucket.expiresAt <= now) {
      this.buckets.set(key, { count: 1, expiresAt: now + rule.windowMs });
      return { allowed: true, remaining: rule.limit - 1, resetAt: now + rule.windowMs };
    }

    // Check if limit exceeded
    if (bucket.count >= rule.limit) {
      return { allowed: false, remaining: 0, resetAt: bucket.expiresAt };
    }

    bucket.count += 1;
    return { allowed: true, remaining: rule.limit - bucket.count, resetAt: bucket.expiresAt };
  }
}
```

### Per-Endpoint Rate Limits

Different limits for different operations based on risk and expected usage:

```typescript
// Location: server/src/routes/api/payments.ts

// High-risk: Checkout creates payment records and calls external API
const CHECKOUT_RATE_LIMIT = { limit: 5, windowMs: 60_000 };  // 5/minute

// Medium-risk: Verification polls external API
const VERIFY_RATE_LIMIT = { limit: 30, windowMs: 60_000 };   // 30/minute

// Low-risk: Method fetch is read-only
const METHODS_RATE_LIMIT = { limit: 60, windowMs: 60_000 };  // 60/minute

// Special: Webhook from payment provider
const WEBHOOK_RATE_LIMIT = { limit: 100, windowMs: 60_000 }; // 100/minute per IP
```

### Rate Limit Key Strategies

**User-based limiting (authenticated endpoints):**
```typescript
const { allowed, resetAt } = paymentRateLimiter.consume(
  `checkout:${session.user.id}`,  // Key includes user ID
  CHECKOUT_RATE_LIMIT
);
```

**IP-based limiting (webhooks, public endpoints):**
```typescript
const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
  || c.req.header('x-real-ip')
  || 'unknown';

const { allowed, resetAt } = paymentRateLimiter.consume(
  `webhook:${clientIp}`,  // Key includes IP
  WEBHOOK_RATE_LIMIT
);
```

### Rate Limit Response Pattern

```typescript
if (!allowed) {
  c.header('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)));
  return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, 429);
}
```

### Scaling Limitation

The in-memory rate limiter has a documented single-instance limitation:

```
IMPORTANT: SINGLE-INSTANCE LIMITATION
This rate limiter stores state in local memory and is NOT shared across
server instances. Before horizontal scaling:

1. Migrate to Redis-backed rate limiting (e.g., rate-limiter-flexible)
2. Or use a load balancer with sticky sessions

Current behavior with multiple instances:
- Rate limit: 5 requests/minute per user
- With 3 instances: Effective limit becomes 15 requests/minute
```

---

## 4. Input Validation Patterns

### Zod Schema Validation

All request payloads validated with Zod before processing:

```typescript
// Pattern: Schema definition with specific constraints
const checkoutSchema = z.object({
  itemType: z.enum(['event', 'track', 'subscription']),
  itemId: z.string().uuid().optional(),
  paymentMethodId: z.number().int().positive(),
});

// Pattern: Validation with early return
const result = checkoutSchema.safeParse(body);
if (!result.success) {
  return c.json({ error: { code: 'INVALID_INPUT', message: result.error.message } }, 400);
}

const { itemType, itemId, paymentMethodId } = result.data;  // Type-safe access
```

### Webhook Schema with Security Constraints

```typescript
const webhookSchema = z.object({
  invoice_id: z.number().int().positive(),     // Must be positive integer
  invoice_key: z.string().min(1).max(255),     // Bounded string
  payment_method: z.string().min(1).max(100),  // Bounded string
  hashKey: z.string().regex(/^[a-f0-9]{64}$/i), // Must be 64-char hex (SHA256)
});
```

**Key Constraints:**
- `positive()` prevents zero/negative invoice IDs
- `min(1).max(255)` prevents empty strings and unbounded memory
- `regex(/^[a-f0-9]{64}$/i)` enforces exact SHA256 hex format

### External API Response Validation

Validate responses from external APIs (Fawaterk) to catch format changes:

```typescript
// Location: server/src/services/fawaterk.ts

const paymentMethodSchema = z.object({
  paymentId: z.number(),
  name_en: z.string(),
  name_ar: z.string(),
  redirect: z.string(),
  logo: z.string().optional(),
});

// Usage in API call
const result = await response.json();
const parsed = z.array(paymentMethodSchema).safeParse(result.data);
if (!parsed.success) {
  console.error('[fawaterk] Invalid response:', parsed.error.format());
  throw new Error('Invalid payment methods response from gateway');
}
return parsed.data;
```

**Benefits:**
- Early detection of API changes
- Clear error messages for debugging
- Type safety throughout the codebase

---

## 5. Defense in Depth Layers

The payment gateway implements multiple overlapping security layers:

### Layer 1: Rate Limiting (DoS Protection)
**Protects Against:** Resource exhaustion, brute force attacks
**Mechanism:** Token bucket per user/IP with endpoint-specific limits
**Failure Mode:** Returns 429 with Retry-After header

### Layer 2: Session Authentication
**Protects Against:** Unauthorized access
**Mechanism:** Better Auth session cookies, validated on every request
**Failure Mode:** Returns 401 Unauthorized

### Layer 3: Input Validation (Zod)
**Protects Against:** Injection, malformed data, resource exhaustion
**Mechanism:** Schema validation before any processing
**Failure Mode:** Returns 400 Bad Request with validation errors

### Layer 4: Ownership Verification
**Protects Against:** Horizontal privilege escalation
**Mechanism:** WHERE clause includes user ID
**Failure Mode:** Returns 404 (hides existence of other users' resources)

### Layer 5: HMAC Signature Verification (Webhooks)
**Protects Against:** Webhook forgery, unauthorized payment confirmation
**Mechanism:** HMAC-SHA256 with timing-safe comparison
**Failure Mode:** Returns 401 Invalid Signature

### Layer 6: Invoice Key Verification (Defense in Depth)
**Protects Against:** Replay attacks with old signatures
**Mechanism:** Stored invoice key must match webhook payload
**Failure Mode:** Returns 401 Invalid Invoice Key

### Layer 7: Atomic Transactions
**Protects Against:** Race conditions, partial fulfillment
**Mechanism:** Database transactions with row-level locks
**Failure Mode:** Transaction rollback, idempotent retry

### Layer 8: Circuit Breaker
**Protects Against:** Cascading failures from external API
**Mechanism:** Opens after 5 failures, 30s cooldown
**Failure Mode:** Immediate "service unavailable" response

---

## 6. Circuit Breaker Pattern

Prevents cascading failures when Fawaterk API is unavailable:

```typescript
// State machine: closed -> open -> half-open -> closed
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 30_000; // 30 seconds

type CircuitState = 'closed' | 'open' | 'half-open';
let circuitState: CircuitState = 'closed';
let consecutiveFailures = 0;
let circuitOpenedAt = 0;

async function fetchWithCircuitBreaker(url, options, timeoutMs) {
  // Check if circuit is open
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

    // Reset on successful response
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

    // Open circuit after threshold failures, or immediately if in half-open state
    const shouldOpen = circuitState === 'half-open' || consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD;

    if (shouldOpen) {
      circuitState = 'open';
      circuitOpenedAt = Date.now();
      console.error('[fawaterk] Circuit breaker: OPEN after', consecutiveFailures, 'failures');
    }

    throw error;
  }
}
```

**Benefits:**
- Fails fast when external API is down
- Prevents connection pool exhaustion
- Auto-recovery when API comes back

---

## 7. Database Security Patterns

### Unique Constraints for Business Rules

Prevent double-booking and duplicate payments at the database level:

```typescript
// Prevent duplicate pending payments for same item
uniquePendingPayment: uniqueIndex('payments_unique_pending')
  .on(table.userId, table.itemType, table.itemId)
  .where(sql`status = 'pending'`),

// Prevent multiple pending subscriptions
uniquePendingSubscription: uniqueIndex('payments_unique_pending_subscription')
  .on(table.userId)
  .where(sql`status = 'pending' AND item_type = 'subscription'`),

// Prevent duplicate event registrations
uniqueEventUser: uniqueIndex('event_attendees_event_user_unique')
  .on(table.eventId, table.userId),

// Prevent duplicate track bookings
uniqueTrackUser: uniqueIndex('track_bookings_track_user_unique')
  .on(table.trackId, table.userId),
```

### Audit Trail via Payment References

All fulfillment records link back to the payment for auditing:

```typescript
// Event attendees
paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),

// Track bookings
paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),

// Subscriptions
paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
```

**Benefits:**
- Full audit trail: payment -> fulfillment
- Supports refund processing
- Reconciliation between payments and resources

### Row-Level Locking for Capacity

```typescript
// Lock track and events for atomic capacity check
const [track] = await tx
  .select({ ... })
  .from(tracks)
  .where(eq(tracks.id, itemId))
  .for('update')  // Row-level lock
  .limit(1);

// Atomic CTE for track booking with capacity validation
const atomicResult = await tx.execute(sql`
  WITH locked_events AS (
    SELECT e.id, e.max_attendees
    FROM track_events te
    JOIN events e ON e.id = te.event_id
    WHERE te.track_id = ${trackId}
    FOR UPDATE  -- Lock all track events
  ),
  ...
`);
```

---

## 8. Error Handling Patterns

### Consistent Error Response Format

```typescript
// Standard error response structure
return c.json({
  error: {
    code: 'ERROR_CODE',      // Machine-readable code
    message: 'Human message'  // User-friendly message
  }
}, statusCode);

// Custom ApiError class for business logic errors
throw new ApiError('EVENT_FULL', 'Event capacity reached.', 409);
```

### Error Code Categories

| Code Pattern | Usage |
|-------------|-------|
| `UNAUTHORIZED` | Session invalid or missing |
| `NOT_FOUND` | Resource doesn't exist (or user doesn't own it) |
| `INVALID_INPUT` | Zod validation failed |
| `RATE_LIMITED` | Too many requests |
| `ALREADY_*` | Duplicate operation (ALREADY_SUBSCRIBED, ALREADY_REGISTERED) |
| `*_FULL` | Capacity reached (EVENT_FULL, TRACK_FULL) |
| `BOOKING_*` | Booking window issues (BOOKING_NOT_OPEN, BOOKING_PERIOD_CLOSED) |
| `PAYMENT_ERROR` | Generic payment failure |
| `PROCESSING_FAILED` | Fulfillment failed after payment |

### Secure Error Messages

```typescript
// GOOD: Generic error for security-sensitive failures
if (!payment) {
  return c.json({ error: { code: 'NOT_FOUND', message: 'Payment not found' } }, 404);
}

// BAD: Leaks existence information
if (!payment) {
  return c.json({ error: { code: 'NOT_AUTHORIZED', message: 'You do not own this payment' } }, 403);
}
```

---

## 9. Security Checklist for New Payment Features

When adding new payment-related features, verify:

### Authentication & Authorization
- [ ] Session validation at route entry
- [ ] User ownership verification for all user-specific resources
- [ ] Role checks for admin operations

### Input Validation
- [ ] Zod schema for request body
- [ ] UUID validation for ID parameters
- [ ] Positive integer validation for amounts/IDs
- [ ] String length limits to prevent resource exhaustion

### Rate Limiting
- [ ] Rate limit applied to new endpoints
- [ ] Appropriate limit based on operation risk
- [ ] User-based key for authenticated endpoints
- [ ] IP-based key for public/webhook endpoints

### Data Integrity
- [ ] Database transaction for multi-step operations
- [ ] Row-level locks for capacity checks
- [ ] Unique constraints to prevent duplicates
- [ ] Payment ID reference for audit trail

### External API Integration
- [ ] Response validation with Zod
- [ ] Timeout configuration
- [ ] Circuit breaker integration
- [ ] Error logging with redacted secrets

### Webhook Security (if applicable)
- [ ] HMAC signature verification
- [ ] Timing-safe comparison
- [ ] Secondary verification (invoice key)
- [ ] Idempotent processing
- [ ] IP-based rate limiting

---

## 10. Security Fixes History

Completed security improvements documented in todos/007-021:

| Issue | Priority | Fix |
|-------|----------|-----|
| 007 | P1 | Free track booking now uses atomic CTE with capacity checks |
| 008 | P1 | Payment expiration moved to background job with extended window |
| 009 | P1 | Circuit breaker added for Fawaterk API |
| 010 | P2 | In-memory rate limiter limitation documented |
| 011 | P2 | Webhook schema strengthened (positive int, hex format) |
| 012 | P2 | payment_id added to track_bookings for audit trail |
| 013 | P2 | Zod validation added for Fawaterk API responses |
| 014 | P3 | Payment expiration moved to background job |
| 015 | P1 | Invoice key verification added to webhook handler |
| 016 | P1 | Webhook URL now sent to Fawaterk in payment request |
| 017 | P2 | IP-based rate limiting added to webhook endpoint |
| 018 | P2 | Rate limiting added to public subscriptions info endpoint |
| 019 | P2 | N+1 query fix with parallel fetches in calculatePrice |
| 020 | P2 | Composite index added for payment expiration queries |
| 021 | P2 | Rate limiter scaling limitation documented |

---

## References

- `/server/src/services/fawaterk.ts` - Fawaterk API client with circuit breaker
- `/server/src/routes/api/payments.ts` - Payment endpoints with full security implementation
- `/server/src/services/rateLimiter.ts` - In-memory rate limiter
- `/server/src/db/schema/index.ts` - Database schema with constraints
- `/todos/007-021*.md` - Security fix documentation
