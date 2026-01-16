# Payment Gateway MVP: Lessons Learned

**Date:** January 16, 2026
**Branch:** `feat/payment-gateway-mvp`
**Duration:** Multi-week implementation with iterative security reviews
**Total Issues Identified:** 21 (4 P0, 8 P1, 6 P2, 3 P3)

---

## Executive Summary

The payment gateway MVP implementation revealed important patterns about building financial systems. This document captures what worked, what required iteration, common pitfalls we avoided, and guidance for future payment-related features.

**Key Insight:** Payment systems amplify every architectural decision. Small oversights in data integrity, API contracts, or security become critical when real money is involved.

---

## 1. What We Got Right First Time

### 1.1 Server-Side Price Calculation

**Pattern:** All price calculations happen on the server, never trusting client input.

```typescript
// Correct: Server calculates price based on item ID
const { amountCents, breakdown } = await calculatePrice(userId, itemType, itemId);
```

**Why it worked:**
- First-principles thinking: "The client can lie about anything"
- Price manipulation is impossible since client only sends item IDs
- Discount logic lives in one authoritative place

**Lesson:** Never let the client tell you what they owe.

---

### 1.2 Atomic Race Condition Prevention

**Pattern:** Used SQL CTEs (Common Table Expressions) for atomic capacity checking and booking.

```sql
WITH capacity_check AS (
  SELECT e.id, e.capacity, COUNT(ea.id) as current
  FROM events e LEFT JOIN event_attendees ea ON ...
  WHERE e.id = $1
),
new_attendee AS (
  INSERT INTO event_attendees (event_id, user_id, ...)
  SELECT $1, $2, ...
  WHERE (SELECT current FROM capacity_check) < (SELECT capacity FROM capacity_check)
  RETURNING *
)
SELECT * FROM new_attendee;
```

**Why it worked:**
- Database-level atomicity eliminates TOCTOU (Time-Of-Check-Time-Of-Use) races
- Pattern borrowed from existing track booking implementation
- Single round-trip to database

**Lesson:** Let the database enforce invariants, not application code.

---

### 1.3 Idempotent Payment Processing

**Pattern:** Single atomic UPDATE with status condition prevents double-processing.

```typescript
const [updated] = await tx
  .update(payments)
  .set({ status: 'paid', paidAt: new Date() })
  .where(and(
    eq(payments.id, paymentId),
    eq(payments.status, 'pending')  // Only update if still pending
  ))
  .returning();

if (!updated) {
  const [existing] = await tx.select().from(payments).where(eq(payments.id, paymentId));
  if (existing?.status === 'paid') {
    return { alreadyProcessed: true };  // Idempotent success
  }
  throw new Error('Payment not found or invalid state');
}
```

**Why it worked:**
- Webhooks can be delivered multiple times
- Network failures can cause retry loops
- This pattern handles all scenarios gracefully

**Lesson:** Design every state transition to be safely repeatable.

---

### 1.4 Partial Unique Indexes for Pending Payment Limits

**Pattern:** Database-enforced constraint on pending payments per user/item.

```sql
CREATE UNIQUE INDEX payments_pending_user_item_unique
ON payments (user_id, item_type, item_id)
WHERE status = 'pending';
```

**Why it worked:**
- Prevents duplicate pending payments without application-level locking
- Allows multiple paid/failed payments for same item (history)
- Self-documenting constraint

**Lesson:** Push business rules to the database when possible.

---

### 1.5 RBAC Enforcement on All Endpoints

**Pattern:** Consistent use of `requireManager()` and `requireAdmin()` guards.

**Why it worked:**
- Followed existing codebase patterns
- Guards throw early with clear error messages
- No endpoint accidentally left unprotected

**Lesson:** Copy proven security patterns from the existing codebase.

---

## 2. What Required Iteration

### 2.1 API Response Format Mismatch (Critical Bug)

**Initial State:** Subscription endpoints returned raw objects while client expected `{ data: ... }` wrapper.

```typescript
// Server returned:
return c.json({ annualSubscriptionPriceCents: 300000 });

// Client expected:
const response = await fetchJson<{ data: {...} }>(...);
return response.data;  // undefined!
```

**Root Cause:**
- Plan document said "Keep { data: ... } wrapper" but implementation missed it
- Different team members had different mental models
- No contract tests between frontend and backend

**How We Fixed It:**
- Standardized on raw object responses (simpler, matches REST conventions)
- Updated all client fetch functions to not expect wrapper
- Added field name alignment (`priceEgp` vs `priceCents`)

**Lesson:** Define API contracts explicitly before implementation. Consider contract testing.

---

### 2.2 Free Track Booking Missing Capacity Checks (P1)

**Initial State:** Free tracks bypassed all event capacity validation.

```typescript
// Original: Just insert, hope for the best
for (const { eventId } of trackEventsList) {
  await tx.insert(eventAttendees).values({...}).onConflictDoNothing();
}
```

**Root Cause:**
- Paid flow was built first with full validation
- Free flow was added later as "simpler case"
- Assumption that free = no constraints was wrong

**How We Fixed It:**
- Ported CTE pattern from paid flow to free flow
- Set `pricePaidCents = 0` in atomic insert
- Same validation, different price

**Lesson:** "Simpler" code paths often skip critical business rules. Apply same rigor everywhere.

---

### 2.3 Payment Expiration Race Condition (P1)

**Initial State:** 24-hour expiry could race with legitimate late payments.

```
T0+24h-1s: User completing checkout on Fawaterk
T0+24h:    Expiration job marks payment 'expired'
T0+24h+1s: Webhook arrives, payment rejected
Result:    User paid but got nothing
```

**Root Cause:**
- Expiry window (24h) matched Fawaterk's typical flow duration
- No margin for edge cases
- Binary state transition (pending -> expired) with no recovery

**How We Fixed It:**
- Extended expiry window to 72 hours
- Added logging for near-expiry webhooks
- Documented need for reconciliation job (future work)

**Lesson:** Time-based state transitions need buffer zones. Edge cases in payments cost real money.

---

### 2.4 Missing Invoice Key Verification (P1)

**Initial State:** Webhook verified HMAC but not invoice_key against database.

```typescript
// Only checked invoice_id
const [payment] = await db.select().from(payments)
  .where(eq(payments.fawaterkInvoiceId, webhookData.invoice_id));
// Never verified: webhookData.invoice_key === payment.fawaterkInvoiceKey
```

**Root Cause:**
- invoice_key was parsed but validation was forgotten
- HMAC gave false sense of security
- Defense-in-depth not applied

**How We Fixed It:**
- Added explicit invoice_key comparison
- Return 401 on mismatch with logging
- 5-minute fix with significant security improvement

**Lesson:** Every piece of signed data should be verified, not just the signature.

---

### 2.5 No Circuit Breaker for External API (P1)

**Initial State:** Fawaterk API failures hung requests for 10 seconds each.

```typescript
// Original: No failure tracking
async function fetchWithTimeout(url, options, timeoutMs = 10_000) {
  // Every request waits full timeout if Fawaterk is down
}
```

**Root Cause:**
- MVP mindset led to "just add timeout"
- Didn't consider cascading failure scenarios
- External service assumed always available

**How We Fixed It:**
- Implemented simple state-based circuit breaker
- 5 consecutive failures opens circuit
- 30s cooldown before retry
- Immediate fail-fast when circuit is open

**Lesson:** External dependencies need failure isolation. Circuit breaker is minimal viable resilience.

---

### 2.6 Webhook URL Not Sent to Fawaterk (P1)

**Initial State:** Relied on manual Fawaterk dashboard configuration.

```typescript
redirectionUrls: {
  successUrl: `${env.APP_BASE_URL}/payment/success`,
  failUrl: `${env.APP_BASE_URL}/payment/failed`,
  pendingUrl: `${env.APP_BASE_URL}/payment/pending`,
  // webhookUrl was MISSING
},
```

**Root Cause:**
- Fawaterk docs weren't clear on where to set webhook
- Dashboard config "worked" during development
- Per-transaction webhook URL is more reliable

**How We Fixed It:**
- Added `API_BASE_URL` environment variable
- Include webhook URL in every payment request
- Dashboard config now serves as fallback only

**Lesson:** Explicit > implicit. Never rely on out-of-band configuration for critical flows.

---

### 2.7 Weak Webhook Schema Validation (P2)

**Initial State:** Zod schema allowed invalid values through.

```typescript
const webhookSchema = z.object({
  invoice_id: z.number(),           // Allowed negative/zero
  invoice_key: z.string(),          // No length bounds
  hashKey: z.string(),              // No hex format check
});
```

**Root Cause:**
- Schema copied from docs without tightening
- "It works" masked validation gaps
- Defense-in-depth not applied to inputs

**How We Fixed It:**
```typescript
const webhookSchema = z.object({
  invoice_id: z.number().int().positive(),
  invoice_key: z.string().min(1).max(255),
  hashKey: z.string().regex(/^[a-f0-9]{64}$/i),
});
```

**Lesson:** Zod schemas should be as strict as the business domain allows.

---

### 2.8 Missing payment_id on track_bookings (P2)

**Initial State:** No way to trace which payment created a track booking.

```typescript
// event_attendees and subscriptions had payment_id
// track_bookings did NOT
```

**Root Cause:**
- track_bookings predated payment system
- Incremental addition missed updating all related tables
- No audit checklist for schema changes

**How We Fixed It:**
- Added `payment_id` column with FK constraint
- ON DELETE SET NULL preserves bookings if payment deleted
- Updated booking inserts to include payment_id

**Lesson:** When adding a cross-cutting concern, audit ALL related tables systematically.

---

## 3. Common Pitfalls Avoided

### 3.1 Race Conditions

**Avoided By:**
- SQL CTEs for atomic operations
- `FOR UPDATE` locks where needed
- Single-update idempotency pattern

**What We Didn't Do:**
- Check capacity in one query, insert in another (TOCTOU)
- Rely on application-level locking
- Assume sequential execution in concurrent environment

---

### 3.2 Double Processing

**Avoided By:**
- `WHERE status = 'pending'` in update query
- Returning early if already processed
- Partial unique indexes preventing duplicate pending payments

**What We Didn't Do:**
- Update status first, then check if already done
- Use optimistic locking without conflict handling
- Ignore the possibility of duplicate webhooks

---

### 3.3 SQL Injection

**Avoided By:**
- Drizzle ORM parameterizes all queries
- UUID validation on path parameters
- Zod schemas reject malformed input

**What We Didn't Do:**
- String concatenation for SQL
- Trust client-provided IDs without validation
- Skip input validation because "it's just internal"

---

### 3.4 Timing Attacks

**Avoided By:**
- `crypto.timingSafeEqual()` for HMAC comparison
- Buffer-based comparison, not string comparison
- Length check before comparison

**What We Didn't Do:**
- Use `===` for cryptographic secrets
- Assume timing attacks are theoretical
- Skip this because "we have HMAC"

---

### 3.5 Information Disclosure

**Avoided By:**
- Generic error messages to clients
- Detailed errors only in server logs
- API key never sent to frontend

**What We Didn't Do:**
- Return raw Zod validation errors
- Include stack traces in production
- Log sensitive data (OTP codes, session tokens)

---

## 4. Future Guidance

### 4.1 Pre-Implementation Checklist

Before building any payment feature:

- [ ] **Define API contracts explicitly** - Use TypeScript interfaces shared between frontend/backend or OpenAPI spec
- [ ] **Identify all state transitions** - Draw state machine for payment/subscription lifecycle
- [ ] **List all concurrent scenarios** - What if two users book the last spot simultaneously?
- [ ] **Audit related tables** - What else needs payment_id, timestamps, status columns?
- [ ] **Check external service resilience** - Timeout, circuit breaker, retry strategy
- [ ] **Plan for reconciliation** - How do you fix if something goes wrong?

---

### 4.2 Implementation Checklist

During implementation:

- [ ] **Server-side price calculation** - Client only sends IDs
- [ ] **Atomic state transitions** - Use CTEs or transactions with conditional updates
- [ ] **Idempotent operations** - Every webhook/retry should be safe to repeat
- [ ] **Strict input validation** - Zod schemas as tight as domain allows
- [ ] **Defense in depth** - Verify everything, even if already signed
- [ ] **Timing-safe comparisons** - For all secret/signature checks
- [ ] **Circuit breakers** - For all external API calls
- [ ] **Rate limiting** - On all public and payment endpoints

---

### 4.3 Security Review Checklist

Before deploying any payment code:

- [ ] **No client-provided prices** - Ever
- [ ] **Webhook signature verification** - With timing-safe comparison
- [ ] **All path parameters validated** - UUIDs, integers, etc.
- [ ] **Rate limits in place** - Per-user and per-IP
- [ ] **Secrets not logged** - Check all console.log/error statements
- [ ] **API keys required in production** - Fail-fast on missing config
- [ ] **FK constraints on payment references** - Database-enforced integrity
- [ ] **Positive amount constraints** - CHECK (amount_cents >= 0)

---

### 4.4 Red Flags to Watch For

Stop and reconsider if you see:

1. **"It's simpler without validation"** - No, it's dangerous without validation
2. **"The client will send the right data"** - Never trust the client
3. **"We can add security later"** - Security is harder to retrofit
4. **"This code path won't be hit often"** - That's exactly when bugs hide
5. **"Let's use string comparison for this hash"** - Timing attack waiting to happen
6. **"One endpoint doesn't need rate limiting"** - Attackers find the weak point
7. **"The external API is always up"** - Famous last words
8. **"We'll fix the race condition if it happens"** - It will happen at scale

---

### 4.5 Testing Strategy for Payment Features

**Unit Tests:**
- Price calculation with all discount scenarios
- Webhook signature verification (valid, invalid, timing attack resistant)
- State transition logic in isolation

**Integration Tests:**
- Full checkout flow with mocked Fawaterk
- Webhook processing with various payload states
- Concurrent booking scenarios

**Manual Testing Checklist:**
- [ ] Successful payment end-to-end
- [ ] Failed payment handling
- [ ] Pending payment (Fawry/wallet) flow
- [ ] Duplicate webhook handling
- [ ] Expired payment recovery
- [ ] Rate limit behavior
- [ ] Circuit breaker activation

---

## 5. Summary Metrics

| Category | Count | Key Learning |
|----------|-------|--------------|
| Got Right First Time | 5 patterns | Trust the database, not the client |
| Required Iteration | 8 issues | API contracts need explicit definition |
| Pitfalls Avoided | 5 categories | Defense in depth saves debugging time |
| P0 Critical | 4 | Block deployment until fixed |
| P1 High | 8 | Fix before production |
| P2 Medium | 6 | Fix soon after launch |
| P3 Low | 3 | Nice to have |

**Total Estimated Fix Effort:** 12-16 hours for P0+P1

---

## 6. Key Takeaways

1. **Payment code is different** - Every bug has monetary consequences. Apply more rigor than "normal" features.

2. **API contracts matter more** - Frontend/backend mismatches that cause UI glitches elsewhere cause lost revenue in payments.

3. **Database constraints > application checks** - Unique indexes, FK constraints, and CHECK constraints catch what code misses.

4. **Defense in depth is not paranoia** - Verify signatures AND payload contents AND database state.

5. **Plan for failure** - External services fail. Webhooks repeat. Users abandon flows. Design for all of it.

6. **Time-based logic needs buffers** - If something expires in 24h, Fawaterk might take 24h+1s. Add margin.

7. **Document explicitly** - "Keep the wrapper" in a plan doc isn't explicit enough. Show the actual JSON structure.

---

*This document should be reviewed when building any future payment, billing, or financial features.*
