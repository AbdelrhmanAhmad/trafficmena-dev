# Payment Gateway MVP - Compound Knowledge Base

---
category: payment-gateway
tags: [payments, fawaterk, reservations, security, mvp]
created: 2025-01-18
status: production-ready
---

## Executive Summary

This document captures all learnings from the payment gateway MVP implementation. It serves as a reference for:
- Future payment system enhancements
- Onboarding new developers
- Similar integrations in other projects

**Key Achievement**: Implemented a reservation-based payment system with capacity holds, integrated with the Fawaterk payment gateway. The live payment methods depend on the Fawaterk account configuration — current accounts expose **Card (Visa/Mastercard), Fawry, and MobileWallets**; the code also handles Aman/Masary/Meeza reference codes when those are enabled.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Security Patterns](#2-security-patterns)
3. [Data Integrity Patterns](#3-data-integrity-patterns)
4. [Performance Patterns](#4-performance-patterns)
5. [Critical Issues & Fixes](#5-critical-issues--fixes)
6. [MVP Decisions](#6-mvp-decisions)
7. [First Principles Applied](#7-first-principles-applied)
8. [Scaling Considerations](#8-scaling-considerations)

---

## 1. Architecture Overview

### Flow Diagram

```
User Request
     │
     ▼
┌─────────────────┐
│  Rate Limiter   │──→ 429 Too Many Requests
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Session Check   │──→ 401 Unauthorized
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Existing Pending│──→ Return existing (or expire if forceNewCode)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Price Calculation│──→ Free items bypass payment
│ + Discount      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ FOR UPDATE Lock │──→ Lock event/track row
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Capacity Check  │──→ 409 EVENT_FULL/TRACK_FULL
│ (attendees +    │
│  reservations)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Payment  │
│ + Reservation   │──→ Atomic transaction
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fawaterk API    │──→ Circuit breaker protection
│ invoiceInitPay  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return Payment  │──→ redirectUrl or payment codes
│ Details         │
└─────────────────┘
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `server/src/routes/api/payments.ts` | Core payment routes | ~1500 |
| `server/src/services/fawaterk.ts` | Fawaterk API client | ~270 |
| `server/src/services/rateLimiter.ts` | In-memory rate limiting | ~80 |
| `server/src/jobs/paymentExpiration.ts` | Background cleanup | ~50 |
| `server/src/db/schema/index.ts` | Payment tables schema | N/A |

---

## 2. Security Patterns

### 2.1 HMAC Webhook Verification

```typescript
// ALWAYS use timing-safe comparison for HMAC
import { timingSafeEqual } from 'node:crypto';

export function verifyFawaterkWebhook(body): boolean {
  const queryParam = `InvoiceId=${body.invoice_id}&InvoiceKey=${body.invoice_key}&PaymentMethod=${body.payment_method}`;

  const expectedHash = crypto
    .createHmac('sha256', env.FAWATERK_API_KEY)
    .update(queryParam)
    .digest('hex');

  // Length check BEFORE timing-safe comparison
  const receivedBuffer = Buffer.from(body.hashKey, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}
```

**Why timing-safe**: Regular `===` leaks timing information about which byte differs, enabling iterative signature guessing.

### 2.2 Defense in Depth (Invoice Key)

```typescript
// Even with valid HMAC, verify invoice key matches stored value
if (payment.fawaterkInvoiceKey !== webhookData.invoice_key) {
  return c.json({ error: { code: 'INVALID_INVOICE_KEY' } }, 401);
}
```

**Why both checks**: HMAC verifies sender authenticity; invoice key ensures the payment record matches.

### 2.3 Rate Limiting by Context

```typescript
const CHECKOUT_RATE_LIMIT = { limit: 5, windowMs: 60_000 };   // Per user
const VERIFY_RATE_LIMIT = { limit: 30, windowMs: 60_000 };    // Per user
const WEBHOOK_RATE_LIMIT = { limit: 100, windowMs: 60_000 };  // Per IP
```

**Why different limits**: Checkout is expensive (creates invoice); verification is cheap (database lookup only).

### 2.4 No Reservation Data Exposure

```typescript
// NEVER expose reservation counts or lists
// Only return error codes, not capacity details
if (attendeeCount + reservationCount >= event.maxAttendees) {
  throw new ApiError('EVENT_FULL', 'Event capacity reached.', 409);
  // NOT: { remainingSeats: 0, reservations: 5 }
}
```

---

## 3. Data Integrity Patterns

### 3.1 Transaction Atomicity with FOR UPDATE

```typescript
const result = await db.transaction(async (tx) => {
  // Lock the payment row first
  const [payment] = await tx
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .for('update')  // Prevents concurrent processing
    .limit(1);

  if (payment.status === 'paid') {
    return { alreadyProcessed: true };  // Idempotent
  }

  // ... fulfillment logic ...

  await tx.update(payments)
    .set({ status: 'paid', paidAt })
    .where(eq(payments.id, paymentId));
});
```

### 3.2 Partial Unique Index for Idempotency

```typescript
// Schema definition
uniquePendingPayment: uniqueIndex('payments_unique_pending')
  .on(table.userId, table.itemType, table.itemId)
  .where(sql`status = 'pending'`),
```

**Why partial**: Only pending payments need uniqueness; completed payments should allow rebooking.

### 3.3 Atomic CTE for Multi-Event Booking

```sql
WITH locked_events AS (
  SELECT e.id, e.max_attendees
  FROM track_events te
  JOIN events e ON e.id = te.event_id
  WHERE te.track_id = $trackId
  FOR UPDATE  -- Lock ALL events in track
),
inserted_attendees AS (
  INSERT INTO event_attendees (...)
  SELECT ... FROM to_insert
  RETURNING event_id
),
inserted_booking AS (
  INSERT INTO track_bookings (...)
  WHERE /* all conditions pass */
  ON CONFLICT DO UPDATE  -- Idempotent upsert
  RETURNING id
)
SELECT ...  -- Return diagnostic counts
```

**Why CTE**: Single atomic query prevents race conditions between capacity check and insert.

### 3.4 Reservation Lifecycle

```
CREATE (checkout) ──→ DELETE (fulfill) ──→ [done]
        │
        └──→ DELETE (expire job, 72h) ──→ [cleanup]
        │
        └──→ DELETE (invoice failure) ──→ [rollback]
```

---

## 4. Performance Patterns

### 4.1 Parallel Query Execution

```typescript
// Independent queries run concurrently
const [subscriptionResult, settingsResult] = await Promise.all([
  db.select().from(subscriptions).where(...),
  db.select().from(platformSettings).limit(1),
]);
```

**Savings**: ~20-40ms per checkout (network round-trip time).

### 4.2 Indexed Capacity Queries

```sql
-- Partial index for expiration job
CREATE INDEX "payments_pending_expiry_idx"
ON "payments" ("created_at")
WHERE status = 'pending';

-- Composite index for subscription lookup
CREATE INDEX "subscriptions_active_lookup_idx"
ON "subscriptions" ("user_id", "subscription_status", "ends_at");
```

### 4.3 Circuit Breaker for External API

```typescript
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 30_000;

// States: closed → open (after 5 failures) → half-open (after 30s) → closed
```

**Why**: Prevents cascade failures when Fawaterk is down; gives user immediate feedback instead of timeout.

---

## 5. Critical Issues & Fixes

### 5.1 Payment Fulfillment Atomicity

**Problem**: Error thrown inside transaction rolled back `status='failed'`, leaving payment in `pending`.

**Fix**:
```typescript
try {
  // ... fulfillment logic ...
  await tx.update(payments).set({ status: 'paid' }).where(...);
  return { success: true };
} catch (error) {
  // Set failed INSIDE transaction so it commits even on error
  await tx.update(payments).set({ status: 'failed' }).where(...);
  return { error };  // Return, don't throw
}
// Throw OUTSIDE transaction
if ('error' in result) throw result.error;
```

### 5.2 Non-Redirect Payment Methods + Mobile Wallet

**Problem**: Frontend only handled `redirectUrl`, ignoring the reference codes (`fawryCode`, `amanCode`, `masaryCode`, `meezaReference`/`meezaQrCode`) cash methods return.

**Fix**: The backend returns every code field; the frontend routes the user to `/payment/pending`, whose page renders whichever code/QR is present. Offline methods (Fawry/Aman/Masary/Meeza/MobileWallet) are additionally *force-redirected* — checkout sets `redirectOption: true` (`forceRedirect`) so Fawaterk returns a hosted `redirectTo` and the SPA does `window.location = redirectUrl`.

```typescript
// Backend returns every possible instrument; the pending page shows the relevant one
return c.json({ data: {
  redirectUrl: invoiceResult.paymentData.redirectTo,
  fawryCode, amanCode, masaryCode, meezaReference, meezaQrCode,
} });
```

**Mobile Wallet (Fawaterk `paymentId 4`, `redirect:false`)** requires an **Egyptian phone in local `01…` format**. Fawaterk's wallet endpoint rejects E.164 `+20…` (verified HTTP 422 on staging). Profiles store canonical E.164, so checkout converts at the gateway boundary via `toFawaterkLocalPhone()` and rejects non-`+20` numbers for wallet (`PHONE_NOT_EGYPTIAN`) — see `server/src/routes/api/users-phone.ts`. Caveat: forcing `redirectOption` masks Fawaterk's own 422 validation; the native (non-redirect) wallet flow returns `meezaReference`/QR directly.

### 5.3 Subscription Query on Public Pages

**Problem**: `useCurrentSubscription()` returned 401 on unauthenticated pages.

**Fix**: Auth-gate the query:
```typescript
export function useCurrentSubscription(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CURRENT_SUBSCRIPTION_KEY,
    queryFn: fetchCurrentSubscription,
    enabled: options?.enabled ?? true,  // Caller passes !!user
  });
}
```

### 5.4 forceNewCode for Expired Codes

**Problem**: Users with expired payment codes couldn't checkout again.

**Fix**: Add `forceNewCode` parameter:
```typescript
if (existingPending && forceNewCode) {
  await db.update(payments).set({ status: 'expired' }).where(pendingWhere);
  await db.delete(eventReservations).where(...);
  // Continue to create new payment
}
```

---

## 6. MVP Decisions

### Deferred to Post-MVP

| Item | Reason |
|------|--------|
| Polymorphic FK for `payments.item_id` | Single column simpler; orphan risk acceptable |
| DB-level state machine | Application enforcement sufficient |
| Down migrations | Manual refunds via Fawaterk dashboard |
| Unique active subscription constraint | Race unlikely with pending uniqueness |

### Why Reservation System

**Without reservations**:
1. User A checks out for last seat
2. User B checks out for last seat (sees 1 remaining)
3. User A pays first → registered
4. User B pays → "paid but full" = support ticket

**With reservations**:
1. User A checks out → seat reserved, 0 remaining shown
2. User B checks out → sees EVENT_FULL immediately
3. No "paid but full" scenario possible

---

## 7. First Principles Applied

The irreducible core of a payment system is four steps: **Initiate** (capture intent → `POST /payments/checkout`) → **Execute** (collect money → Fawaterk) → **Confirm** (verify receipt → webhook + `getInvoiceData()` polling) → **Fulfill** (deliver value → atomic fulfillment). The principles below protect those four steps.

| Principle | Implementation |
|-----------|----------------|
| Don't sell seats you can't deliver | Reservation system with capacity holds |
| One user action = one invoice | Partial unique index on pending payments |
| State should reflect reality | Never mark `paid` before fulfillment succeeds |
| No data exposure to clients | Server-side only reservations, error codes only |
| Fail fast, recover gracefully | Circuit breaker + timeout + rate limiting |

---

## 8. Scaling Considerations

### Current Limits

| Component | Limit | Bottleneck |
|-----------|-------|------------|
| Rate limiter | Single instance | In-memory Map |
| Circuit breaker | Single instance | Module-level state |
| Background job | setInterval | No persistence |

### Migration Path

1. **Rate Limiter → Redis**:
```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';
```

2. **Background Job → Job Queue**:
```typescript
import PgBoss from 'pg-boss';
const boss = new PgBoss(connectionString);
await boss.schedule('expire-payments', '0 * * * *', {});
```

3. **Circuit Breaker → Shared State**:
```typescript
// Store circuit state in Redis with TTL
await redis.set('fawaterk:circuit', 'open', 'EX', 30);
```

---

## Quick Reference

### Endpoints

| Method | Path | Auth | Rate Limit |
|--------|------|------|------------|
| GET | /payments/methods | Session | 60/min |
| POST | /payments/checkout | Session | 5/min |
| POST | /payments/verify | Session | 30/min |
| POST | /payments/webhook | HMAC | 100/min/IP |
| GET | /payments/:id | Session | - |
| GET | /payments/price-preview | Session | - |

### Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| UNAUTHORIZED | 401 | No session or invalid session |
| INVALID_SIGNATURE | 401 | HMAC webhook verification failed |
| PAYMENT_REQUIRED | 402 | Paid item requires the checkout flow |
| PHONE_REQUIRED | 400 | Mobile wallet needs a phone on the profile |
| PHONE_NOT_EGYPTIAN | 400 | Mobile wallet requires an Egyptian (+20) number |
| NOT_FOUND | 404 | Item or payment not found |
| ALREADY_REGISTERED | 400 | Already registered for event |
| ALREADY_BOOKED | 400 | Already booked track |
| ALREADY_SUBSCRIBED | 400 | Active subscription exists |
| EVENT_FULL | 409 | Event capacity reached |
| TRACK_FULL | 409 | Track booking limit reached |
| PENDING_PAYMENT | 409 | Existing pending payment (use `forceNewCode`) |
| RESERVATION_EXPIRED | 409 | Payment code expired, request new |
| RATE_LIMITED | 429 | Too many requests |
| PAYMENT_ERROR / PROCESSING_FAILED | 500 | Fawaterk API or fulfillment failure |

---

## Implementation Checklist (Future Payment Features)

**Pre-implementation**
- [ ] Research all payment methods the gateway supports — and each method's quirks (e.g. mobile-wallet phone format)
- [ ] Identify async/code methods vs redirects
- [ ] Define capacity requirements (limited vs unlimited)
- [ ] Plan payment-expiration windows

**During implementation**
- [ ] Atomic transactions for fulfillment; failure state persists outside the rolled-back tx
- [ ] Rate limiting on all payment endpoints; circuit breaker for the external API
- [ ] Idempotent checkout (partial unique index on pending)
- [ ] Auth-gate user-specific queries; `FOR UPDATE` locks on capacity checks

**Testing**
- [ ] Concurrent checkout stress test; webhook signature verification
- [ ] Payment-expiration job; free-item flow; subscription discount
- [ ] Code/redirect display per method (Fawry, MobileWallet, …)

## Changelog

- **2025-01-18**: Initial compound documentation created
- Covers: Security, Data Integrity, Performance, Architecture patterns
- Source: feat/payment-gateway-mvp branch
- **2026-06-27**: Consolidated the payment-gateway learnings — absorbed `payment-gateway-lessons-learned.md` (implementation checklist, fuller error-code table) and `payment-gateway-mvp-compound-analysis.md` (irreducible-core framing) into this canonical doc; refreshed the non-redirect → `/payment/pending` flow and documented the Mobile Wallet (Fawaterk) `01…` phone-format requirement.
