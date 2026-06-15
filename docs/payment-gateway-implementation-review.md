# Payment Gateway Implementation Review

**Date:** January 16, 2026
**Branch:** `feat/payment-gateway-mvp`
**Reviewer:** Code Review Analysis
**Status:** 🔴 CRITICAL ISSUES FOUND - Requires Fixes Before Merge

---

## Executive Summary

The tech lead's implementation of the payment gateway MVP addresses several important concerns from the original plan, including booking rule enforcement, atomic track processing, and pending payment handling. However, **critical bugs in the subscription settings flow** cause the settings to appear saved (toast shows success) but **fail to persist on refresh** and **show zeros on the subscribe page**.

This document provides a first-principles analysis of the implementation, identifies the root causes, and provides actionable fixes.

---

## Status Update (2026-01-16)

- API responses consistently use `{ data: ... }` and the frontend reads `response.data`.
- Subscriber discounts are enforced at 1–99% and default to 20% when unset or invalid.
- Non-redirect payment methods return reference codes and are shown on the pending page.
- Webhooks are enabled at `/api/payments/webhook_json` with HMAC verification.

Note: The subscription settings mismatch described below reflects an older snapshot and is no longer representative of the current implementation.

## 🔴 Critical Bug: Subscription Settings Not Persisting

### Symptoms Reported
1. Admin enters yearly subscription amount and discount percentage
2. Clicks "Save Settings"
3. Toast shows "Settings updated - Subscription settings have been saved"
4. On page refresh, fields are empty
5. Subscribe page shows zeros for pricing

### Root Cause Analysis

**The bug is an API contract mismatch between server and client.**

#### Server Response (What the API Actually Returns)

```typescript
// server/src/routes/api/subscriptions.ts - Lines 61-65
return c.json({
  annualSubscriptionPriceCents: settings?.annualSubscriptionPriceCents ?? null,
  subscriberDiscountPercent: settings?.subscriberDiscountPercent ?? 20,
});
```

The server returns the settings object **directly** without any wrapper.

#### Client Expectation (What the Frontend Expects)

```typescript
// src/app/api/subscriptions.ts - Lines 22-30
export async function fetchSubscriptionSettings(): Promise<SubscriptionSettings> {
  const response = await fetchJson<{ data: SubscriptionSettings }>(
    `${API_BASE}/subscriptions/settings`,
    { method: 'GET' },
  );
  return response.data;  // <-- PROBLEM: response.data is undefined!
}
```

The client expects the response to be wrapped in `{ data: ... }` and accesses `response.data`.

#### What Actually Happens

1. **PUT Request (Save)**
   - Server successfully updates the database ✅
   - Server returns `{ annualSubscriptionPriceCents: 150000, subscriberDiscountPercent: 20 }`
   - Client tries to access `response.data` → gets `undefined`
   - Mutation `onSuccess` fires (API returned 200) → toast shows success ✅
   - `queryClient.setQueryData()` stores `undefined` in cache

2. **GET Request (Load/Refresh)**
   - Server returns `{ annualSubscriptionPriceCents: 150000, subscriberDiscountPercent: 20 }`
   - Client tries to access `response.data` → gets `undefined`
   - Form receives `undefined` → shows default empty values

**The data IS saved correctly in the database, but the client cannot read it back.**

---

## 🔴 Critical Bug: Subscribe Page Shows Zero Prices

### Root Cause

Same API contract mismatch, plus additional field name mismatches:

```typescript
// src/app/api/subscriptions.ts - Lines 54-72
export async function fetchSubscriptionInfo(): Promise<SubscriptionInfo> {
  const response = await fetchJson<{
    data: {
      priceFormatted: string | null;
      priceCents: number | null;     // <-- expects priceCents
      discountPercent: number;
      benefits: string[];
      durationDays: number;          // <-- expects durationDays
    };
  }>(`${API_BASE}/subscriptions/info`, { method: 'GET' });

  return {
    priceEgp: response.data.priceCents === null ? null : response.data.priceCents / 100,
    discountPercent: response.data.discountPercent,
    benefits: response.data.benefits,
  };
}
```

```typescript
// server/src/routes/api/subscriptions.ts - Lines 113-124
return c.json({
  priceEgp: settings?.annualSubscriptionPriceCents      // <-- sends priceEgp, not priceCents
    ? settings.annualSubscriptionPriceCents / 100
    : null,
  discountPercent: settings?.subscriberDiscountPercent ?? 20,
  benefits: [...],
  // durationDays is NOT sent
});
```

**Issues:**
1. No `{ data: ... }` wrapper (same as settings)
2. Server sends `priceEgp`, client expects `priceCents`
3. Server doesn't send `durationDays`, client expects it
4. Client tries to divide `response.data.priceCents` by 100, but server already sent `priceEgp` (already divided)

This would cause a runtime error when accessing `response.data.priceCents` on `undefined`.

---

## 🟡 High Priority: Zod Schema Rejects Null Values

### Issue

```typescript
// server/src/routes/api/subscriptions.ts - Lines 9-12
const updateSettingsSchema = z.object({
  annualSubscriptionPriceCents: z.number().int().min(0).optional(),
  subscriberDiscountPercent: z.number().int().min(0).max(100).optional(),
});
```

The schema uses `.optional()` which only accepts `undefined`, not `null`.

```typescript
// src/pages/admin/components/SubscriptionSettingsCard.tsx - Lines 82-88
const payload = {
  annualSubscriptionPriceCents: values.annualPriceEgp
    ? Math.round(Number(values.annualPriceEgp) * 100)
    : null,  // <-- sends null when field is empty
  subscriberDiscountPercent: values.subscriberDiscountPercent
    ? Number(values.subscriberDiscountPercent)
    : null,  // <-- sends null when field is empty
};
```

**Impact:** When admin clears a field, Zod validation fails with a 400 error.

**Fix:**
```typescript
const updateSettingsSchema = z.object({
  annualSubscriptionPriceCents: z.number().int().min(0).nullable().optional(),
  subscriberDiscountPercent: z.number().int().min(0).max(100).nullable().optional(),
});
```

---

## 🟡 High Priority: Duplicate ApiError Class

### Issue

`server/src/routes/api/payments.ts` defines its own `ApiError` class (lines 35-44) instead of using the shared one from `server/src/utils/errors.ts`:

```typescript
// payments.ts - DUPLICATE
class ApiError extends Error {
  code: string;
  statusCode: ContentfulStatusCode;  // <-- different property name
  constructor(code: string, message: string, statusCode: ContentfulStatusCode) { ... }
}

// utils/errors.ts - EXISTING SHARED
export class ApiError extends Error {
  code: string;
  status: number;  // <-- different property name
  extra?: Record<string, unknown>;  // <-- missing in duplicate
  constructor(code: string, message: string, status = 400, extra?: Record<string, unknown>) { ... }
}
```

**Impact:**
- Property name inconsistency (`statusCode` vs `status`)
- Cannot use `handleRoute()` wrapper for consistent error handling
- Breaks `instanceof` checks if errors cross boundaries

---

## 🟡 High Priority: Current Subscription API Mismatch

```typescript
// src/app/api/subscriptions.ts - Lines 45-52
export async function fetchCurrentSubscription(): Promise<UserSubscription> {
  const response = await fetchJson<{
    data: { hasSubscription: boolean; subscription: UserSubscription };
  }>(`${API_BASE}/subscriptions/current`, { method: 'GET' });
  return response.data.subscription;  // <-- expects { data: ... } wrapper
}
```

```typescript
// server/src/routes/api/subscriptions.ts - Lines 33-49
return c.json({
  hasSubscription: true,
  subscription: { ... },  // <-- NO data wrapper
});
```

**Impact:** `fetchCurrentSubscription()` will throw trying to access `response.data.subscription`.

---

## Analysis of Tech Lead's Plan vs Implementation

### Phase A: API Contract and Type Alignment

**Plan Said:**
> "Keep { data: ... } responses on the server for consistency with existing routes"

**Reality:** The subscription endpoints do NOT wrap responses in `{ data: ... }`. The plan was **not implemented correctly**.

| Endpoint | Expected Format | Actual Format | Status |
|----------|-----------------|---------------|--------|
| `GET /subscriptions/settings` | `{ data: {...} }` | Raw object | ❌ Mismatch |
| `PUT /subscriptions/settings` | `{ data: {...} }` | Raw object | ❌ Mismatch |
| `GET /subscriptions/current` | `{ data: {...} }` | Raw object | ❌ Mismatch |
| `GET /subscriptions/info` | `{ data: {...} }` | Raw object | ❌ Mismatch |
| `POST /payments/checkout` | `{ data: {...} }` | `{ data: {...} }` | ✅ Correct |
| `POST /payments/verify` | `{ data: {...} }` | `{ data: {...} }` | ✅ Correct |

The payments endpoints are correctly wrapped, but **all subscription endpoints are missing the wrapper**.

### Phase B-G Implementation Quality

| Phase | Status | Notes |
|-------|--------|-------|
| B: Booking Rules in Paid Flows | ✅ Implemented | `calculatePrice()` validates booking windows and constraints |
| C: Track Payment Processing | ✅ Implemented | Atomic CTE for capacity handling |
| D: Fawry/Wallet Pending Flow | ✅ Implemented | Routing to pending page with verify button |
| E: Subscription UX Routing | ✅ Implemented | Auth-based routing in multiple components |
| F: Duplicate Pending Payments | ✅ Implemented | Partial unique index in database |
| G: Testing | ✅ Passed | Lint and build pass |

---

## Required Fixes

### Fix 1: Subscription API Response Wrappers (CRITICAL)

**File:** `server/src/routes/api/subscriptions.ts`

All four endpoints need to wrap responses in `{ data: ... }`:

```typescript
// GET /subscriptions/current - Lines 33-49
// Change from:
return c.json({ hasSubscription: false, subscription: null });
// To:
return c.json({ data: { hasSubscription: false, subscription: null } });

// GET /subscriptions/settings - Lines 61-64
// Change from:
return c.json({ annualSubscriptionPriceCents: ..., subscriberDiscountPercent: ... });
// To:
return c.json({ data: { annualSubscriptionPriceCents: ..., subscriberDiscountPercent: ... } });

// PUT /subscriptions/settings - Lines 103-106
// Same pattern

// GET /subscriptions/info - Lines 113-124
// Same pattern
```

### Fix 2: Subscription Info Field Names (CRITICAL)

**Option A:** Change server to match client expectations:
```typescript
// server/src/routes/api/subscriptions.ts - Lines 113-124
return c.json({
  data: {
    priceCents: settings?.annualSubscriptionPriceCents ?? null,
    priceFormatted: settings?.annualSubscriptionPriceCents
      ? `${(settings.annualSubscriptionPriceCents / 100).toFixed(0)} EGP`
      : null,
    discountPercent: settings?.subscriberDiscountPercent ?? 20,
    benefits: [...],
    durationDays: 365,
  }
});
```

**Option B:** Change client to match server (simpler):
```typescript
// src/app/api/subscriptions.ts - Lines 54-72
export async function fetchSubscriptionInfo(): Promise<SubscriptionInfo> {
  const response = await fetchJson<{
    data: {
      priceEgp: number | null;
      discountPercent: number;
      benefits: string[];
    };
  }>(`${API_BASE}/subscriptions/info`, { method: 'GET' });

  return {
    priceEgp: response.data.priceEgp,
    discountPercent: response.data.discountPercent,
    benefits: response.data.benefits,
  };
}
```

### Fix 3: Zod Schema for Null Values (HIGH)

**File:** `server/src/routes/api/subscriptions.ts`

```typescript
const updateSettingsSchema = z.object({
  annualSubscriptionPriceCents: z.number().int().min(0).nullable().optional(),
  subscriberDiscountPercent: z.number().int().min(0).max(100).nullable().optional(),
});
```

### Fix 4: Remove Duplicate ApiError (HIGH)

**File:** `server/src/routes/api/payments.ts`

Remove lines 35-44 and import from shared:
```typescript
import { ApiError } from '../../utils/errors.js';
```

Update error instantiation to match shared signature.

---

## Architectural Observations

### Well-Implemented Patterns

1. **Atomic Track Booking** - Uses SQL CTE for capacity checking across all track events
2. **Idempotent Payment Processing** - Single atomic UPDATE prevents double-processing
3. **RBAC Enforcement** - Proper use of `requireManager()` and `requireAdmin()` guards
4. **Cache Invalidation** - TanStack Query hooks properly invalidate related queries on success

### Areas for Future Improvement

1. **Large Functions** - `calculatePrice()` (150+ lines) and `processSuccessfulPayment()` (240+ lines) could be broken into smaller functions
2. **Hardcoded Subscription Duration** - 365 days is hardcoded; should be in platform settings
3. **Missing Webhook Endpoint** - `verifyFawaterkWebhook` exists in service but no route uses it

---

## Testing Checklist After Fixes

- [ ] Set subscription price to valid value, save, refresh → value persists
- [ ] Clear subscription price (empty), save, refresh → field is empty (null in DB)
- [ ] Set discount to 0%, save, refresh → shows 0% (not default 20%)
- [ ] View subscribe page as guest → shows correct price
- [ ] View subscribe page as authenticated user → shows correct price with discount
- [ ] Create checkout for subscription → returns redirect URL
- [ ] Verify pending Fawry payment → transitions to paid

---

## Conclusion

The tech lead's plan was comprehensive and addressed the original findings well. However, **the implementation missed a critical detail: the subscription API endpoints do not wrap responses in `{ data: ... }` as the client expects**. This single oversight causes:

1. Settings appearing saved but not persisting
2. Subscribe page showing zero prices
3. Potential runtime errors in subscription status checks

The fixes are straightforward and localized to `server/src/routes/api/subscriptions.ts` and `src/app/api/subscriptions.ts`. Once applied, the payment gateway MVP should function correctly.

**Estimated fix time:** 30-60 minutes for all critical issues.
