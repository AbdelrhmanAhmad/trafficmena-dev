# Payment Gateway Security Review

**Date:** 2026-01-16
**Branch:** `feat/payment-gateway-mvp`
**Reviewed by:** Multi-agent analysis (5 specialized agents) + manual first-principles review
**Risk Level:** HIGH - Payment system handling real money

---

## Executive Summary

After comprehensive multi-agent security analysis and first-principles review, I've identified **4 CRITICAL issues that block production deployment** and 6 HIGH priority issues requiring fixes before launch.

**Verdict: DO NOT DEPLOY TO PRODUCTION** until P0 issues are resolved.

---

## Status Update (2026-01-16)

The following items have been addressed in this branch:
- Webhook endpoint implemented (`/payments/webhook` + `/payments/webhook_json`) with timing-safe HMAC verification.
- Payment endpoints have rate limiting; Fawaterk API calls use timeouts and circuit breaker protection.
- Fulfillment now marks payments paid only after success, and persists failures as `failed`.
- Pending payments expire via background job.

---

## P0 - CRITICAL (Blocks Production)

### 1. Timing Attack Vulnerability in Webhook HMAC Verification

**File:** `server/src/services/fawaterk.ts:174`

```typescript
// VULNERABLE: Simple string comparison allows timing attacks
return body.hashKey === expectedHash;
```

**Risk:** Attackers can forge webhook signatures using timing attack analysis.

**Fix:**
```typescript
import { timingSafeEqual } from 'node:crypto';

const hashBuffer = Buffer.from(body.hashKey, 'hex');
const expectedBuffer = Buffer.from(expectedHash, 'hex');
if (hashBuffer.length !== expectedBuffer.length) return false;
return timingSafeEqual(hashBuffer, expectedBuffer);
```

**Effort:** 15 minutes

---

### 2. No Webhook Endpoint Implemented

**Issue:** `verifyFawaterkWebhook()` exists but is never called. No route handles webhooks.

**Impact:**
- Payment verification relies solely on client-side polling
- If user closes browser mid-payment, payment is lost
- No server-to-server confirmation from Fawaterk

**Fix:** Implement `POST /payments/webhook` endpoint using `verifyFawaterkWebhook()`.

**Effort:** 2-4 hours

---

### 3. No Rate Limiting on Payment Endpoints

**Issue:** `InMemoryRateLimiter` exists for OTP but payment endpoints have zero rate limiting.

**Impact:**
- Attackers can spam checkout requests creating unlimited invoices
- DoS attack on Fawaterk API
- Resource exhaustion

**Fix:** Add rate limiting (5 checkouts/minute per user).

**Effort:** 1 hour

---

### 4. No Timeout on External API Calls

**File:** `server/src/services/fawaterk.ts`

**Issue:** All `fetch()` calls have no timeout.

**Impact:**
- Requests hang indefinitely if Fawaterk is slow
- Connection pool exhaustion
- Cascading failures

**Fix:** Add `AbortController` with 10-second timeout.

**Effort:** 30 minutes

---

## P1 - HIGH (Fix Before Production)

### 5. Payment Status Update Outside Transaction

**File:** `server/src/routes/api/payments.ts:191-209`

Payment is marked 'paid' before fulfillment transaction. If transaction fails, user is charged but gets nothing.

**Fix:** Wrap status update inside the fulfillment transaction.

---

### 6. Fawaterk API Key Optional in Production

**File:** `server/src/config/env.ts:39`

Should fail-fast in production if API key is missing.

---

### 7. Missing FK Constraint on event_attendees.payment_id

**File:** `server/drizzle/0015_payment_gateway.sql:33`

No FK constraint risks orphaned payment references.

---

### 8. Missing Check Constraint for Positive Amounts

Payments table allows negative amounts. Add `CHECK (amount_cents >= 0)`.

---

### 9. Free Track Booking Doesn't Register for Events

When track is free, only `trackBookings` record is created. User not registered for any track events.

---

### 10. Pending Payments Never Expire

No mechanism to expire stale pending payments. User can get permanently blocked from retrying.

---

## P2 - MEDIUM (Can Fix Post-Launch)

| # | Issue | Impact |
|---|-------|--------|
| 11 | Missing composite index for subscription lookup | Query performance |
| 12 | Error responses leak Zod validation details | Information disclosure |
| 13 | No audit trail for payment status changes | Reconciliation difficulty |
| 14 | God functions (152 + 245 lines) | Maintainability |
| 15 | Sequential DB queries (6 per checkout) | Latency |
| 16 | Payment methods not cached | Unnecessary API calls |

---

## Security Positives

| Aspect | Status |
|--------|--------|
| Server-side price calculation | Excellent |
| IDOR protection | Excellent |
| Atomic race prevention | Excellent |
| Partial unique indexes | Excellent |
| API key not exposed to frontend | Good |
| UUID validation | Good |
| Zod input validation | Good |
| Session-based auth | Good |

---

## Remediation Summary

| Priority | Count | Effort | Status |
|----------|-------|--------|--------|
| P0 CRITICAL | 4 | 4-6 hours | Blocks production |
| P1 HIGH | 6 | 4-6 hours | Should fix before launch |
| P2 MEDIUM | 6 | 3-4 hours | Can launch, fix soon |

**Total effort for P0+P1:** 8-12 hours

---

## Files Reviewed

- `server/src/routes/api/payments.ts` (829 lines)
- `server/src/routes/api/subscriptions.ts` (136 lines)
- `server/src/services/fawaterk.ts` (176 lines)
- `server/drizzle/0015_payment_gateway.sql` (48 lines)
- `server/src/config/env.ts`
- `src/app/api/payments.ts`
- `src/app/hooks/usePayments.ts`

---

## Agents Used

1. **security-sentinel** - Comprehensive security audit
2. **architecture-strategist** - Architecture patterns and concerns
3. **data-integrity-guardian** - Database constraints and transactions
4. **pattern-recognition-specialist** - Code patterns and anti-patterns
5. **performance-oracle** - Performance and scalability analysis
