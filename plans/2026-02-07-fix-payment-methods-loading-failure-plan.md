---
title: "fix: Payment Methods Loading Failure - Deep Investigation & Fix"
type: fix
date: 2026-02-07
severity: high
affects: all-users-intermittently
deepened: 2026-02-07
agents_used: 12
---

# fix: Payment Methods Loading Failure - "Unable to load payment methods"

## Enhancement Summary

**Deepened on:** 2026-02-07
**Agents used:** 12 (Performance Oracle, Architecture Strategist, Security Sentinel, Code Simplicity, Frontend Races, Kieran Node.js, Pattern Recognition, Modern Node.js, Best Practices, Framework Docs, Learnings, Kieran TypeScript)

### Key Improvements from Research
1. **Single-flight pattern** to prevent cache stampede on TTL expiry (found by 5/12 agents)
2. **Fixed retry button** -- use `refetch()` instead of `queryClient.invalidateQueries()` to avoid missing import and hardcoded query key (found by 4/12 agents)
3. **Stale error flash fix** -- prevent cached error from briefly showing on dialog reopen (found by Frontend Races reviewer)
4. **Narrowed stale-while-error** -- only serve stale for retriable errors, not validation/auth failures (found by 3/12 agents)

### Issues Found in Original Plan
- Retry button code would cause ReferenceError (`queryClient` not imported)
- Cache stampede vulnerability on TTL expiry (concurrent requests all hit Fawaterak)
- Stale-while-error too broad (masks validation and auth errors)
- String-based error categorization is fragile

---

## Overview

Multiple production users intermittently see **"Unable to load payment methods. Please try again later."** when opening the payment dialog. This has been happening on and off since launch. The issue prevents users from completing purchases.

Screenshot shows the error in the `PaymentCheckoutDialog` for a 500.00 EGP track purchase.

## Problem Statement

### What Users See
- Payment dialog opens
- "Select payment method" section shows: **"Unable to load payment methods. Please try again later."** (red error box)
- Pay button is disabled (no method selected)
- Issue is intermittent - works sometimes, fails other times

### The Error Chain (First Principles Analysis)

```
User opens dialog
  → PaymentMethodSelector renders (src/shared/components/payment/PaymentMethodSelector.tsx:22)
  → usePaymentMethods() hook fires (src/app/hooks/usePayments.ts:24-31)
  → fetchPaymentMethods() called (src/app/api/payments.ts:82-87)
  → GET /api/payments/methods (server/src/routes/api/payments.ts:777-803)
  → getPaymentMethods() (server/src/services/fawaterk.ts:225-250)
  → GET https://app.fawaterk.com/api/v2/getPaymentmethods
```

### Error Display Trigger (PaymentMethodSelector.tsx:41)

```typescript
if (error || !methods?.length) {
  // Shows "Unable to load payment methods" error
}
```

This triggers on **two distinct conditions**:
1. `error` is truthy - TanStack Query caught an exception (HTTP error, network error, timeout)
2. `!methods?.length` - Methods array is empty, null, or undefined

---

## Root Cause Analysis (First Principles)

### Probable Root Causes (ordered by likelihood given symptoms)

Given the evidence: **intermittent**, **some users affected**, **since launch**, **no config changes**:

#### RC1: Fawaterak API Intermittent Slowness / Timeouts (HIGH probability)
- **Evidence**: Our code has a 10-second timeout (`API_TIMEOUT_MS = 10_000` in `fawaterk.ts:6`)
- **Mechanism**: When Fawaterak API is slow (>10s response), the request aborts. After 5 consecutive timeouts, the circuit breaker opens for 30 seconds, blocking ALL users during that window.
- **Why intermittent**: Fawaterak API performance varies; Egyptian internet infrastructure can be slow; peak hours cause congestion.
- **Why "since launch"**: This is inherent to external API dependency.
- **Circuit breaker cascade**: One slow period → 5 timeouts → circuit OPEN → 30s of ALL users seeing error → circuit half-open → one test request → if still slow, circuit re-opens.

#### RC2: Circuit Breaker Staying Open Too Aggressively (MEDIUM probability)
- **Evidence**: Circuit breaker opens after just 5 failures (`CIRCUIT_FAILURE_THRESHOLD = 5` in `fawaterk.ts:9`)
- **Mechanism**: Even a brief Fawaterak hiccup (5 consecutive slow requests) blocks ALL payment method requests for 30 seconds. In half-open state, one failed request re-opens the circuit.
- **Why this matters**: The `/payments/methods` endpoint is called by EVERY user who opens a payment dialog. Under load, 5 concurrent users hitting a slow Fawaterak API can trip the circuit breaker, causing a cascade.

#### RC3: No Caching of Payment Methods (HIGH probability - amplifier)
- **Evidence**: The Fawaterak docs explicitly say: _"You can call it once and store the information at your end, then use that information in the next call."_
- **Current code**: Every `GET /payments/methods` request calls Fawaterak API live. No server-side cache.
- **Frontend cache**: TanStack Query caches for 5 minutes per user (`staleTime: 5 * 60 * 1000`), but this is per-browser session. Every new user or page refresh hits the backend, which hits Fawaterak.
- **Impact**: This amplifies RC1/RC2 because every single dialog open generates an external API call, multiplying timeout/failure risk.

#### RC4: TanStack Query Retry + Error State Interaction (LOW-MEDIUM probability)
- **Evidence**: Default TanStack Query retries 3 times with exponential backoff. During retries, `isLoading` remains true. If all 3 retries fail, `error` becomes truthy.
- **Mechanism**: User waits through loading spinner, then sees error after all retries fail. But if they close and reopen the dialog, TanStack Query uses cached error state for `staleTime` (5 min).
- **Impact**: Once a user hits the error, reopening the dialog may show the cached error immediately without retrying, making the issue feel persistent.

> **Research Insight (Frontend Races Reviewer):** The cached error flash is a real UX issue. When a user closes and reopens the dialog, TanStack Query's status is `'error'` (not `'pending'`), so `isLoading` is false. The component briefly shows the error before the background refetch completes. Fix: check `isLoading || (isFetching && error)` to show spinner during retry.

#### RC5: Non-OK Fawaterak API Response (LOW probability)
- **Evidence**: `fawaterk.ts:238-240` throws on non-OK response
- **Mechanism**: If Fawaterak returns 401 (expired key), 403, 429 (their rate limit), or 5xx, we throw an error
- **Why low**: Config hasn't changed, so 401/403 unlikely. Their rate limiting could cause 429 but would be more consistent.

---

## The Fix

### Phase 1: Backend - Server-Side Cache with Single-Flight (Critical Fix)

This is the **primary fix** based on:
1. Fawaterak's own recommendation to cache payment methods
2. Payment methods rarely change (new methods require Fawaterak dashboard changes)
3. Eliminates the cascading timeout/circuit breaker issue for this endpoint

#### 1.1 Add Server-Side Payment Methods Cache

```typescript
// server/src/services/fawaterk.ts

// In-memory cache for payment methods (per Fawaterak docs: "call it once and store")
// SINGLE-INSTANCE: Same limitation as InMemoryRateLimiter. Migrate to Redis if scaling horizontally.
let methodsCache: { data: PaymentMethod[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Single-flight: prevent cache stampede when TTL expires
let refreshPromise: Promise<PaymentMethod[]> | null = null;

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  // Return cached data if still fresh
  if (methodsCache && Date.now() - methodsCache.timestamp < CACHE_TTL_MS) {
    return methodsCache.data;
  }

  // Single-flight: if a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = fetchPaymentMethodsFromGateway()
    .finally(() => { refreshPromise = null; });

  try {
    return await refreshPromise;
  } catch (error) {
    // STALE-WHILE-ERROR: Return stale cache for retriable errors only
    const isRetriable = error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('temporarily unavailable'));

    if (isRetriable && methodsCache) {
      console.warn('[fawaterk] getPaymentMethods failed, returning stale cache', {
        cacheAge: Math.round((Date.now() - methodsCache.timestamp) / 1000),
        error: error instanceof Error ? error.message : String(error),
      });
      return methodsCache.data;
    }
    throw error;
  }
}

async function fetchPaymentMethodsFromGateway(): Promise<PaymentMethod[]> {
  if (!env.FAWATERK_API_KEY) {
    throw new Error('FAWATERK_API_KEY not configured');
  }

  const response = await fetchWithCircuitBreaker(`${getBaseUrl()}/getPaymentmethods`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.FAWATERK_API_KEY}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Fawaterk getPaymentMethods failed: ${response.status} ${detail}`);
  }

  const result = await response.json();
  const parsed = z.array(paymentMethodSchema).safeParse(result.data);
  if (!parsed.success) {
    console.error('[fawaterk] Invalid getPaymentMethods response:', parsed.error.format());
    throw new Error('Invalid payment methods response from gateway');
  }

  // Update cache on success
  methodsCache = { data: parsed.data, timestamp: Date.now() };
  return parsed.data;
}
```

**Key design decisions:**
- **10-minute TTL**: Payment methods don't change during a session. Fawaterak says "call once and store."
- **Stale-while-error (retriable only)**: If Fawaterak is slow or circuit is open, serve stale cache. But validation/auth errors propagate immediately -- they indicate configuration problems, not transient failures.
- **Single-flight**: When cache expires, only ONE request goes to Fawaterak. All concurrent requests wait for that single promise. Prevents stampede that could trip the circuit breaker.
- **Object cache**: Wraps `data` + `timestamp` in a single object for atomic updates (style preference, consistent with Pattern Recognition review).
- **In-memory**: Single-instance MVP, same pattern as rate limiter (`rateLimiter.ts:14-27`). No Redis needed yet.
- **Extracted `fetchPaymentMethodsFromGateway()`**: Separates cache logic from API call logic for clarity.

> **Research Insight (Security Sentinel):** Zod validation happens BEFORE caching, so only validated data is stored. Cache poisoning risk is LOW. Stale cache bypassing checkout validation is MEDIUM risk but bounded by 10-min TTL and Fawaterak's own `invoiceInitPay` validation.

> **Research Insight (Best Practices Researcher):** For true latency optimization, upgrade to stale-while-revalidate (return stale immediately, background refresh) in the future. Current blocking-on-stale is acceptable for MVP -- the cache miss only affects the first user after TTL expiry.

#### 1.2 Enhanced Error Logging (Simplified)

```typescript
// server/src/routes/api/payments.ts - GET /payments/methods catch block
// Log circuit breaker state alongside the error for diagnostics
console.error('[payments/methods] Error:', {
  message: error instanceof Error ? error.message : String(error),
  isTimeout: error instanceof Error && error.name === 'AbortError',
  circuitBreaker: getCircuitBreakerState(),
  timestamp: new Date().toISOString(),
});
```

> **Research Insight (Architecture Strategist):** Skip the admin diagnostics endpoint. Log circuit breaker state inline with the error instead. If live inspection is needed later, the endpoint can be added in minutes.

#### 1.3 Circuit Breaker State Export

```typescript
// server/src/services/fawaterk.ts - Export for diagnostics logging
export function getCircuitBreakerState() {
  return {
    state: circuitState,
    consecutiveFailures,
    circuitOpenedAt: circuitOpenedAt ? new Date(circuitOpenedAt).toISOString() : null,
  };
}
```

### Phase 2: Frontend - UX Improvements

#### 2.1 Fix PaymentMethodSelector Error/Retry Handling

```typescript
// src/shared/components/payment/PaymentMethodSelector.tsx

// Destructure refetch from the hook (already available from useQuery)
const { data: methods, isLoading, isFetching, error, refetch } = usePaymentMethods({ enabled });

// Show spinner during initial load OR during retry after error
if (isLoading || (isFetching && error)) {
  return <LoadingSpinner />;
}

// Error state with retry button
if (error) {
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
      <p>Unable to load payment methods. Please try again later.</p>
      <button
        type="button"
        onClick={() => refetch()}
        className="mt-2 text-xs underline hover:no-underline"
      >
        Try again
      </button>
    </div>
  );
}

// Empty state (separate from error -- helps support triage)
if (!methods?.length) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
      No payment methods available. Please contact support.
    </div>
  );
}
```

**Critical fixes from research:**
- **Use `refetch()`** instead of `queryClient.invalidateQueries()`. The original plan would cause a ReferenceError (`queryClient` not in scope). `refetch()` is already available from the `useQuery` return. No new imports needed, no hardcoded query key.
- **`isLoading || (isFetching && error)`** prevents the stale error flash. When user reopens dialog after an error, TanStack Query background-refetches but `status` is still `'error'`. Checking `isFetching && error` shows a spinner during retry instead of briefly flashing the error.
- **Separate error vs empty state** helps support staff triage: "API down" vs "no methods configured."

> **Research Insight (Frontend Races Reviewer):** Also disable the Pay button when methods are refetching: `disabled={!selectedMethodId || createCheckout.isPending || isFetching}` in `PaymentCheckoutDialog.tsx`.

#### 2.2 Reduce TanStack Query Retries

```typescript
// src/app/hooks/usePayments.ts
export function usePaymentMethods(options?: { enabled?: boolean }) {
  return useQuery<PaymentMethod[]>({
    queryKey: PAYMENT_METHODS_KEY,
    queryFn: fetchPaymentMethods,
    staleTime: 5 * 60 * 1000,
    retry: 1,  // Server-side cache makes retries fast; reduce wait time
    enabled: options?.enabled ?? true,
  });
}
```

> **Research Insight (Architecture Strategist):** With server-side cache in place, a frontend retry after the first failure would likely succeed immediately (server returns cached data). Reducing from default 3 retries to 1 reduces the dead-end wait before showing the error + retry button.

---

## Second-Order Thinking: Future-Proofing

### What could go wrong with the cache?

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Payment method disabled on Fawaterak | Users see disabled method for up to 10 min | 10-min TTL is short enough; `invoiceInitPay` would fail with clear error at checkout |
| New method added | Users don't see it for up to 10 min | Acceptable delay for something that happens rarely |
| Server restart | Cache lost, cold start hits API | First request after restart goes to API; acceptable |
| Memory leak from cache | Negligible - it's a small array | Single object, O(1) memory |
| Stale cache served during long outage | Methods from hours ago used | Still correct - methods don't change; checkout validates method exists |
| Cache stampede on TTL expiry | Multiple concurrent Fawaterak calls | **Fixed**: Single-flight pattern ensures only one request |
| Validation/auth error masked by stale cache | Config issues hidden | **Fixed**: Only serve stale for retriable errors (timeout, circuit open) |

> **Research Insight (Security Sentinel):** If a critical security issue requires immediately removing a payment method, the only way to flush cache is server restart. For MVP this is acceptable (10-min max window). Optional future improvement: export an `invalidatePaymentMethodsCache()` function.

### What if the real problem is the circuit breaker?

The circuit breaker is **too aggressive** for the `getPaymentMethods` use case:
- 5 failures = 30s block for ALL users
- With server-side cache, the circuit breaker matters less for this endpoint
- But it still affects `invoiceInitPay` and `getInvoiceData`
- **Future consideration**: Per-endpoint circuit breakers or higher thresholds

> **Research Insight (Architecture Strategist):** The shared circuit breaker is module-level state across ALL three Fawaterak operations. Failures from `invoiceInitPay` during checkout can open the circuit, blocking `getPaymentMethods` refresh. The cache mitigates this: when circuit is open, stale-while-error returns cached methods. This is a positive interaction.

### What about the `checkout` endpoint also calling `getPaymentMethods()`?

In `payments.ts:997`, the checkout handler ALSO calls `getPaymentMethods()` to validate the selected method:
```typescript
const methods = await getPaymentMethods();
const selectedMethod = methods.find((method) => method.paymentId === paymentMethodId);
```

**With the cache, this call will also benefit** - checkout won't fail just because Fawaterak is slow at that moment.

### Cache layering architecture

```
User opens dialog
  → TanStack Query: has data < 5 min old? → Return cached (no network call)
  → TanStack Query: data stale → GET /api/payments/methods
    → Server cache: has data < 10 min old? → Return cached (no Fawaterak call)
    → Server cache: stale → Single-flight fetch from Fawaterak API
```

Server TTL (10 min) > frontend TTL (5 min) ensures most frontend refreshes hit server cache, not Fawaterak.

---

## Acceptance Criteria

- [ ] Server-side cache for `getPaymentMethods()` with 10-min TTL and stale-while-error fallback
- [ ] Single-flight pattern prevents cache stampede on concurrent requests
- [ ] Stale-while-error only applies to retriable errors (timeout, circuit open)
- [ ] Enhanced error logging with circuit breaker state
- [ ] Retry button in PaymentMethodSelector using `refetch()` (not `queryClient`)
- [ ] Stale error flash prevented with `isLoading || (isFetching && error)` check
- [ ] Separate error vs empty state in PaymentMethodSelector
- [ ] TanStack Query retries reduced to 1 for payment methods
- [ ] No breaking changes to existing payment flow
- [ ] All existing payment tests still pass

## Implementation Phases

### Phase 1: Backend - Server-Side Cache (Critical Fix)

**Files to modify:**
- `server/src/services/fawaterk.ts` - Add in-memory cache + single-flight + stale-while-error to `getPaymentMethods()`, export `getCircuitBreakerState()`
- `server/src/routes/api/payments.ts` - Enhanced error logging with circuit breaker state in GET `/payments/methods`

**Estimated scope:** ~50 lines changed

### Phase 2: Frontend - UX Improvements

**Files to modify:**
- `src/shared/components/payment/PaymentMethodSelector.tsx` - Add retry button with `refetch()`, separate error/empty states, fix stale error flash
- `src/app/hooks/usePayments.ts` - Reduce retry count to 1

**Estimated scope:** ~20 lines changed

---

## Files Reference

| File | Line(s) | What |
|------|---------|------|
| `src/shared/components/payment/PaymentMethodSelector.tsx` | 41 | Error display trigger |
| `src/shared/components/payment/PaymentCheckoutDialog.tsx` | 51 | Payment methods hook call |
| `src/app/hooks/usePayments.ts` | 24-31 | TanStack Query hook |
| `src/app/api/payments.ts` | 82-87 | Frontend API call |
| `server/src/routes/api/payments.ts` | 777-803 | Backend route handler |
| `server/src/services/fawaterk.ts` | 225-250 | Fawaterak API call |
| `server/src/services/fawaterk.ts` | 34-78 | Circuit breaker |
| `server/src/services/rateLimiter.ts` | 14-27 | Single-instance pattern precedent |
| `server/src/config/env.ts` | 39-40 | API key + env config |

## Security Assessment (from Security Sentinel)

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | Stale cache bypasses checkout validation for disabled methods | MEDIUM | Accept for MVP (10-min window, `invoiceInitPay` still validates) |
| 2 | Cache poisoning via corrupted API response | LOW | Mitigated by Zod validation before caching |
| 3 | Error logging info leakage | LOW | Server-side only, not exposed to client |
| 4 | Thundering herd on cache expiry | LOW | Fixed with single-flight pattern |
| 5 | Retry button abuse | LOW | Backend rate limiting (60/min) prevents abuse |

**Overall security rating: LOW-MEDIUM. Safe to implement as-is for MVP.**

## References

- Fawaterak API Docs: `https://fawaterak-api.readme.io/reference/gateway-integration`
- Fawaterak docs explicitly recommend: _"You can call it once and store the information at your end"_
- Existing compound knowledge: `docs/solutions/payment-gateway/payment-gateway-compound-knowledge.md`
- Payment gateway lessons: `docs/solutions/feature-implementations/payment-gateway-lessons-learned.md`
- RFC 5861: HTTP Cache-Control Extensions for Stale Content (stale-while-revalidate semantics)
- Singleflight pattern: Go stdlib `golang.org/x/sync/singleflight`, adapted for Node.js
