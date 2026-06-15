# Payment Gateway MVP - Lessons Learned

**Date:** 2026-01-18
**Branch:** `feat/payment-gateway-mvp`
**Duration:** ~4 days (commit history: c4f5f84 -> 4bb8422)
**Gateway Provider:** Fawaterk (Egyptian payment gateway)

---

## Executive Summary

The payment gateway MVP implementation revealed critical lessons about:
1. **Atomicity in distributed systems** - Payment fulfillment must handle partial failures gracefully
2. **Capacity reservation** - Pre-checkout holds are essential for paid capacity-limited items
3. **Non-redirect payment methods** - Cash-based methods (Fawry, Aman, Masary) require code display, not redirect
4. **Auth-gating queries** - Subscription checks must not 401 on public pages

---

## Critical Issues Found and Fixed

### Issue 1: Payment Fulfillment Atomicity

**Problem:** Original implementation marked payment as `failed` inside the transaction, then threw outside. If fulfillment failed but status update succeeded, we'd have `status='failed'` with no way to retry.

**Root Cause:** Misunderstanding of transaction boundaries and error propagation.

**Fix Applied:**
```typescript
async function processSuccessfulPayment(paymentId: string) {
  try {
    return await db.transaction(async (tx) => {
      // All fulfillment logic inside tx
      // Only mark paid AFTER successful fulfillment
      await tx.update(payments).set({ status: 'paid', paidAt }).where(eq(payments.id, paymentId));
      return { success: true };
    });
  } catch (error) {
    // Mark failed OUTSIDE tx to ensure it persists even if tx rolled back
    await db.update(payments).set({ status: 'failed' })
      .where(and(eq(payments.id, paymentId), eq(payments.status, 'pending')));
    throw error;
  }
}
```

**Lesson:** In payment systems, the failure state must persist independently of the transaction that caused the failure. Use conditional updates (`status='pending'`) to prevent race conditions.

---

### Issue 2: Non-Redirect Payment Methods

**Problem:** Frontend only handled `redirectUrl`, ignoring `fawryCode`, `amanCode`, `masaryCode`, `meezaReference` for cash-based payments.

**Root Cause:** Assumed all payments redirect to gateway. Fawry/Aman/Masary generate reference codes users pay at physical locations.

**Fix Applied:**
```typescript
// Backend: Return all payment method codes
return c.json({
  data: {
    paymentId,
    invoiceId: invoiceResult.invoiceId,
    redirectUrl: invoiceResult.paymentData.redirectTo,
    fawryCode: invoiceResult.paymentData.fawryCode,
    meezaReference: invoiceResult.paymentData.meezaReference,
    amanCode: invoiceResult.paymentData.amanCode,
    masaryCode: invoiceResult.paymentData.masaryCode,
  },
});

// Frontend: Display appropriate UI based on response
if (result.fawryCode) {
  setPaymentCode(result.fawryCode);
  setShowCodeInstructions(true);
} else if (result.redirectUrl) {
  window.location.href = result.redirectUrl;
}
```

**Lesson:** Research all payment methods your gateway supports before implementation. MENA region heavily uses cash-based payments.

---

### Issue 3: useCurrentSubscription Auth-Gating

**Problem:** Subscription check hook returned 401 on public pages (e.g., EventDetail), breaking unauthenticated browsing.

**Root Cause:** Hook always called API, even when user not logged in.

**Fix Applied:**
```typescript
// Use React Query's `enabled` option to gate the query
const { data: subscription } = useQuery({
  queryKey: ['subscription', 'current'],
  queryFn: fetchCurrentSubscription,
  enabled: !!user, // Only run when user is authenticated
});
```

**Lesson:** API hooks for user-specific data must be auth-gated at the query level, not rely on backend 401s.

---

### Issue 4: forceNewCode for Refreshing Payment Codes

**Problem:** Users with expired Fawry codes had no way to get fresh codes. System returned "pending payment exists" error.

**Root Cause:** Duplicate payment prevention blocked legitimate code refresh requests.

**Fix Applied:**
```typescript
const checkoutSchema = z.object({
  itemType: z.enum(['event', 'track', 'subscription']),
  itemId: z.string().uuid().optional(),
  paymentMethodId: z.number().int().positive(),
  forceNewCode: z.boolean().optional(), // NEW: Allow explicit code refresh
});

// In checkout handler:
if (existingPending && !forceNewCode) {
  return c.json({ error: { code: 'PENDING_PAYMENT', ... } }, 409);
}

if (forceNewCode) {
  // Expire existing pending payments and create new one
  await db.update(payments).set({ status: 'expired' }).where(pendingWhere);
}
```

**Lesson:** Payment UX must account for code expiration and user re-attempts.

---

## MVP Decisions and Trade-offs

### Deferred: Polymorphic Foreign Key

**What:** Using a single `item_id` column for events, tracks, and subscriptions instead of separate FK columns.

**Why Deferred:** Adds complexity for no immediate benefit. Can add `event_id`, `track_id` columns later if needed for reporting.

**Trade-off Accepted:** Slightly harder to write JOIN queries, but cleaner schema for MVP.

---

### Deferred: Database State Machine

**What:** Formal state machine constraints for payment status transitions (pending->paid, pending->failed, pending->expired).

**Why Deferred:** PostgreSQL CHECK constraints can't reference other rows. Would need triggers or application-level enforcement.

**Trade-off Accepted:** Application code handles valid transitions. Risk is minimal with current codebase.

---

### Deferred: Rollback Scripts

**What:** Scripts to reverse incorrectly fulfilled payments.

**Why Deferred:** MVP focuses on preventing incorrect fulfillment, not reversing it. Manual refunds handled via Fawaterk dashboard.

**Trade-off Accepted:** Support team handles rare edge cases manually.

---

### Why Reservation System Was Necessary

**Problem:** Without reservations, two users could:
1. User A starts checkout for last seat
2. User B starts checkout for last seat
3. Both get invoices
4. Both pay via Fawry (asynchronous)
5. Webhook processes both - oversold event

**Solution:** Capacity reservations with 72h TTL:
- Checkout creates reservation before Fawaterk invoice
- Capacity check includes active reservations
- Reservation expires if not paid within 72h
- Fulfillment validates reservation still exists

**Key Design Decisions:**
- 72h TTL matches Fawry payment window (prevents race between expiration and webhook)
- FOR UPDATE locking during reservation creation
- Reservations cleaned up on fulfillment, expiration, or failure
- Server-side only - no public endpoints expose reservation data

---

### Trade-offs Accepted

| Decision | Trade-off | Reasoning |
|----------|-----------|-----------|
| 72h TTL | Seats held longer than ideal | Matches Fawry payment window; prevents race conditions |
| Manual refunds | No automated refund flow | Fawaterk dashboard handles refunds; low volume expected |
| In-memory rate limiter | Doesn't scale horizontally | Single server MVP; documented for future Redis migration |
| Polling + Webhook | Redundant verification | Belt-and-suspenders reliability |

---

## Code Review Findings

### Security Sentinel Findings

| # | Finding | Severity | Resolution |
|---|---------|----------|------------|
| 007 | Free track booking bypasses capacity | P1 | Unified atomic CTE for paid and free flows |
| 008 | 24h expiry races with 72h Fawry window | P1 | Extended expiry to 72h |
| 009 | No circuit breaker for Fawaterk API | P1 | Added circuit breaker (5 failures, 30s cooldown) |
| 015 | Webhook missing invoice key check | P1 | Added `payment.fawaterkInvoiceKey !== webhookData.invoice_key` |
| 016 | Webhook URL not sent to Fawaterk | P1 | Added `API_BASE_URL` env var, included in invoice request |

### Data Integrity Findings

| # | Finding | Severity | Resolution |
|---|---------|----------|------------|
| 001 | Event registration missing allowIndividualBooking check | P2 | Added flag check before date validation |
| 003 | Race condition in track booking capacity | P2 | Atomic CTE with booking count in WHERE clause |
| 012 | Missing payment_id on track_bookings | P2 | Added column for audit trail |

### Architecture Findings

| # | Finding | Severity | Resolution |
|---|---------|----------|------------|
| 010 | In-memory rate limiter scaling | P2 | Documented limitation; Redis migration path noted |
| 014 | Payment expiration blocks checkout | P3 | Moved to hourly background job |
| 019 | N+1 in calculatePrice | P2 | Used Promise.all for parallel queries |
| 020 | Missing composite index for expiration | P2 | Added index on (status, created_at) |

---

## First Principles Applied

### Principle 1: Don't Sell Seats You Can't Deliver

**Manifestation:** Capacity reservation system.

**Implementation:**
- Pre-checkout capacity check includes active reservations
- Reservation created atomically with FOR UPDATE lock
- Fulfillment re-validates capacity (double-check pattern)
- No public endpoints expose attendee counts or reservation data

---

### Principle 2: One User Action = One Invoice

**Manifestation:** Idempotent checkout flow.

**Implementation:**
- Unique partial index: `ON payments (user_id, item_type, item_id) WHERE status = 'pending'`
- payment.id passed as invoice_number to Fawaterk
- Duplicate 23505 errors handled gracefully, return existing payment

---

### Principle 3: State Should Reflect Reality

**Manifestation:** Status transitions match actual payment state.

**Implementation:**
- `pending`: Invoice created, awaiting payment
- `paid`: Payment confirmed, fulfillment complete
- `failed`: Fulfillment attempted but failed (permanent)
- `expired`: Payment window closed without payment

**Anti-pattern Avoided:** Never mark `paid` before fulfillment succeeds.

---

### Principle 4: No Data Exposure to Clients

**Manifestation:** Reservation system is server-side only.

**Implementation:**
- No `/reservations` endpoints
- Attendee counts not exposed (only "EVENT_FULL" error)
- Payment details filtered before response (no fawaterkInvoiceKey to client)
- Webhook signature verification server-side only

---

## Implementation Checklist for Future Payment Features

### Pre-Implementation

- [ ] Research all payment methods gateway supports
- [ ] Identify async payment methods (codes vs redirects)
- [ ] Define capacity requirements (limited vs unlimited)
- [ ] Plan for payment expiration windows

### During Implementation

- [ ] Atomic transactions for fulfillment
- [ ] Failure state persists outside transaction
- [ ] Rate limiting on all payment endpoints
- [ ] Circuit breaker for external API
- [ ] Idempotent checkout (unique constraints)
- [ ] Auth-gate user-specific queries
- [ ] FOR UPDATE locks on capacity checks

### Testing

- [ ] Concurrent checkout stress test
- [ ] Webhook signature verification
- [ ] Payment expiration job
- [ ] Free item flow
- [ ] Subscription discount application
- [ ] Code-based payment display (Fawry, etc.)

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `server/src/routes/api/payments.ts` | Payment endpoints, fulfillment logic |
| `server/src/services/fawaterk.ts` | Gateway API client, circuit breaker |
| `server/src/services/rateLimiter.ts` | In-memory sliding window rate limiter |
| `server/src/jobs/paymentExpiration.ts` | Background job for stale payment cleanup |
| `server/drizzle/0019_payment_reservations.sql` | Reservation tables migration |
| `server/src/db/schema/index.ts` | payments, subscriptions, reservations schemas |

---

## Appendix: Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| UNAUTHORIZED | 401 | No session or invalid session |
| PAYMENT_REQUIRED | 402 | Paid item requires checkout flow |
| NOT_FOUND | 404 | Item or payment not found |
| EVENT_FULL | 409 | Event capacity reached |
| TRACK_FULL | 409 | Track booking limit reached |
| PENDING_PAYMENT | 409 | Existing pending payment (use forceNewCode) |
| ALREADY_REGISTERED | 400 | Already registered for event |
| ALREADY_BOOKED | 400 | Already booked track |
| ALREADY_SUBSCRIBED | 400 | Active subscription exists |
| RESERVATION_EXPIRED | 409 | Payment code expired, request new |
| RATE_LIMITED | 429 | Too many requests |
| PROCESSING_FAILED | 500 | Fulfillment error |

---

*Document generated from git history analysis of feat/payment-gateway-mvp branch*
*Commits analyzed: c4f5f84 -> 4bb8422 (5 commits, ~3000 LOC)*
