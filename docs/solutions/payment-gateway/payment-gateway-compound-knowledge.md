# Payment Gateway MVP - Compound Knowledge Base

> **Note (2026-07-03):** Sections 1–8 below describe the original **Fawaterk API v2** MVP (invoice
> model). The gateway was migrated to **API v3** (OAuth + transaction intents) — see
> **[v3 Migration](#v3-migration-api-v2--v3-2026-07-03)** immediately below. The v2 sections remain
> valid for the reservation/fulfillment/security patterns that carried over unchanged; where they
> reference invoice endpoints or the `InvoiceId=…` HMAC, the v3 section supersedes them.

---
category: payment-gateway
tags: [payments, fawaterk, reservations, security, mvp, v3, oauth, migration]
created: 2025-01-18
updated: 2026-07-03
status: production-ready
---

## Executive Summary

This document captures all learnings from the payment gateway MVP implementation. It serves as a reference for:
- Future payment system enhancements
- Onboarding new developers
- Similar integrations in other projects

**Key Achievement**: Implemented a reservation-based payment system with capacity holds, integrated with the Fawaterk payment gateway. The live payment methods depend on the Fawaterk account configuration — current accounts expose **Card (Visa/Mastercard), Fawry, and MobileWallets**; the code also handles Aman/Masary/Meeza reference codes when those are enabled.

---

## v3 Migration (API v2 → v3, 2026-07-03)

Hard cutover from Fawaterk v2 (invoice model) to v3 (OAuth + transaction-intent model). Plan:
`docs/plans/2026-07-03-001-fix-fawaterk-v3-migration-plan.md`.

### v3 contract summary

- **Auth:** `POST /oauth/token` (grant_type `client_credentials`, `client_id`/`client_secret` from
  Dashboard → Integrations). Bearer token cached in memory, single-flight refresh, 401 → refresh →
  retry-once. Base hosts: staging `staging.fawaterk.com`, live `app.fawaterk.com`.
- **Methods:** `GET /api/v3/getTrPaymentmethods` — field rename `payment_method_id` (was `paymentId`),
  normalized server-side so the SPA contract is unchanged.
- **Create:** `POST /api/v3/createTransaction` → `{ intent_key (uuid), url? , payment_data? }`. No
  `invoice_id`/`invoice_key`. We send `payment_method_id` (direct mode for every method),
  `pay_load:{paymentId}`, per-tx `_json` webhook URL, `due_date`, `mobileWalletNumber` for wallets.
- **Read:** `POST /api/v3/getTransactionData {intent_key}` → `{ paid, total, currency, payment_method,
  transaction_id, paid_at }`. A **string-message 422** = invalid/expired/not-found intent (treat as
  "not paid, possibly expired"); an **object-message 422** = our request is malformed (throw — must
  never masquerade as pending).
- **Webhooks** (all HMAC-SHA256 with the vendor API key = `FAWATERK_API_KEY`):
  paid/pending TR `transactionHashKey` over `TransactionId=…&TransactionKey=…&PaymentMethod=…`;
  failed `hashKey` (same TR shape); cancel `hashKey` over `referenceId=…&PaymentMethod=…`;
  refund `hashKey` over `transactionId=…&amount=…&currency=…`. `transaction_key` == our stored
  `fawaterk_intent_key`.

### Key decisions (carried into code)

- **`paymentId` (our UUID) is the sole flow key** — it exists from checkout, so every UX path works
  even in gateway crash windows. Gateway ids (`intent_key`, `transaction_id`) are internal
  correlation data. (Was the most expensive bug class in v2: SPA/server id contract drift.)
- **Direct-dispatch for every method, codes rendered in-app.** v3 forced-link responses carry no
  `payment_data`, so v2's `redirectOption` force-redirect could not carry over — reference codes now
  render on our own `/payment/pending` page.
- **Strict on `intent_key`, lenient on `payment_data`.** Once the intent exists the payment is live;
  an unrecognized `payment_data` shape degrades UX (pending page + webhook/verify), never marks the
  payment failed. Only a non-2xx / missing-`intent_key` createTransaction failure releases holds.
- **Webhook is a trigger, not a source of truth.** Every paid webhook re-verifies via
  `getTransactionData` and re-checks amount + currency before fulfilling (v2 security posture kept).
- **Due-date/TTL alignment (outcome):** `createTransaction.due_date` is passed the checkout's
  `expiresAt` (= `reservedAt + RESERVATION_TTL_MS`, 72h) — a single source, so gateway reference
  lifetime matches our pending window (v3 default is only +2 days, which would render dead codes as
  payable). Wire format sent: `Y-m-d H:i:s` in **UTC** (`formatFawaterkDueDate`) — **verify format +
  timezone on staging (AE8)**; the fallback is lowering both TTL constants (`RESERVATION_TTL_MS` +
  `PENDING_PAYMENT_EXPIRY_MS`) together to the gateway window.
- **Hard cutover, void status = `failed`.** No kill switch. `void-v2-pending-payments.ts` sets
  still-pending v2 rows (`fawaterk_invoice_id` set, `fawaterk_intent_key` null) to `failed`
  (deliberately outside every recovery scan — never resurrected) and releases reservations. Rollback
  is clean only before the void + first organic v3 checkout.
- **Cancel/failed/refund webhooks are verify-and-log-only in v1** (KTD-7): a `pending → failed`
  transition is unrecoverable by every scan and would strand money on retry-then-pay; cancel's early
  capacity release is a new gateway-driven mutation (Phase 7 evidence-gated upgrade); refunds stay
  manual. All three verify the signature unconditionally (401 on missing/invalid).
- **`FAWATERK_API_KEY` stays permanently** — under v3 it no longer authenticates API calls but is the
  HMAC secret for every webhook.

### Staging/live findings — **TBD (fill from U15/U16)**

These could not be captured at implementation time (no staging creds); record them here after the
staging gate and canary:

- **Webhook correlation (AE5):** confirm `transaction_key === fawaterk_intent_key` in a real webhook.
  _If it fails_, the `pay_load`→`paymentId` fallback (plan U10 T6) must be implemented — currently
  NOT in the code. **Result: TBD.**
- **Webhook hash format/length (AE6):** the verifier uses a general hex + length-equality guard (not
  hard-coded 64-hex). Record the observed format. **Result: TBD.**
- **`due_date` acceptance (AE8):** format + wall-clock/timezone as reflected by `getTransactionData`.
  **Result: TBD.**
- **Wallet phone (AE7):** whether v3 still 422s on E.164 vs the converted `01…` local format.
  **Result: TBD.**
- **Per-method `payment_data` shapes:** Apple Pay (live-only), Aman, Masary — undocumented in the
  spec, parsed leniently. Record actual field names to extend the parser. **Result: TBD.**
- **Fawaterk webhook retry policy** on a 404 (paid + unknown `transaction_key`) — KTD-6 assumes a
  retry bridges the persist race; if it does not, the 15-min reconciliation job is the only bridge.
  **Result: TBD.**

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
