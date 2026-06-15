---
title: "fix: Resolve pre-existing payment tech debt from code review"
type: fix
date: 2026-02-07
files:
  - src/app/api/payments.ts
  - src/app/hooks/usePayments.ts
  - src/shared/components/payment/PaymentCheckoutDialog.tsx
---

# fix: Resolve pre-existing payment tech debt from code review

## Overview

Five pre-existing issues surfaced during the payment gateway caching code review. None are regressions — all exist in the current codebase. Each fix is small, targeted, and independent.

**Total estimated changes:** ~15 lines across 3 files.

## Issues & Fixes

### 1. fetchPaymentMethods doesn't forward AbortSignal

**Problem:** TanStack Query provides an `AbortSignal` via `queryFn({ signal })` to cancel in-flight requests when components unmount. Currently, `usePaymentMethods` passes `fetchPaymentMethods` as a bare function reference, dropping the signal. The HTTP request continues even after unmount.

**Files:** `src/app/api/payments.ts`, `src/app/hooks/usePayments.ts`

**Fix:**

```typescript
// src/app/api/payments.ts:82 — add signal parameter
export async function fetchPaymentMethods(signal?: AbortSignal): Promise<PaymentMethod[]> {
  const response = await fetchJson<{ data: PaymentMethod[] }>(`${API_BASE}/payments/methods`, {
    method: 'GET',
    signal,
  });
  return response.data;
}
```

```typescript
// src/app/hooks/usePayments.ts:27 — forward signal from TanStack Query
queryFn: ({ signal }) => fetchPaymentMethods(signal),
```

**Why this is safe:** `fetchJson` already spreads `init` into `fetch()`, so the signal flows through natively. `AbortSignal` only affects the client fetch — no server-side impact.

---

### 2. PaymentMethod.redirect type mismatch (server vs client)

**Problem:** Server type (`server/src/services/fawaterk.ts:121`) defines `redirect: string`. Client type (`src/app/api/payments.ts:10`) defines `redirect?: string | boolean`. The Fawaterk API always returns a string (`"true"` / `"false"`), validated by `z.string()`. The `boolean` in the union is incorrect.

**File:** `src/app/api/payments.ts`

**Fix:**

```typescript
// src/app/api/payments.ts:10 — align with server type
export type PaymentMethod = {
  paymentId: number;
  name_en: string;
  name_ar: string;
  logo?: string;
  redirect?: string;  // was: string | boolean
};
```

**Why this is safe:** `shouldRedirectToGateway()` already uses `String(method.redirect ?? '').toLowerCase() === 'true'` which handles string correctly. No code path relies on `redirect` being a boolean.

---

### 3. selectedMethodId persists across dialog open/close cycles

**Problem:** In `PaymentCheckoutDialog.tsx`, `selectedMethodId` is declared via `useState` at the component level. While Radix `Dialog` does unmount `DialogContent` by default, the `useState` lives on the parent `PaymentCheckoutDialog` component which stays mounted in its parent's render tree regardless of the `open` prop. So when the dialog reopens, the previously selected payment method is still selected, which can confuse users.

**File:** `src/shared/components/payment/PaymentCheckoutDialog.tsx`

**Fix:**

```typescript
// PaymentCheckoutDialog.tsx — add useEffect after useState declaration (line ~43)
import { useEffect, useMemo, useState } from 'react';
// ...
const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);

// Reset selection when dialog closes
useEffect(() => {
  if (!open) setSelectedMethodId(null);
}, [open]);
```

**Why this is safe:** When `open` transitions to `false`, state resets. When dialog reopens, state is already `null`. Combined with Fix 4 (below), the dialog can't close during active checkout, so no race between reset and in-flight mutations.

---

### 4. handleCheckout navigation can fire after dialog close

**Problem:** `handleCheckout` is async. If the user closes the dialog while `createCheckout.mutateAsync()` is in flight, the resolved promise calls `navigate()` or sets `window.location.href`, causing unexpected page changes.

**File:** `src/shared/components/payment/PaymentCheckoutDialog.tsx`

**Fix:** Prevent closing the dialog while checkout is pending.

```typescript
// PaymentCheckoutDialog.tsx:171 — guard onOpenChange
<Dialog
  open={open}
  onOpenChange={(val) => {
    if (!val && createCheckout.isPending) return;
    onOpenChange(val);
  }}
>
```

**Why this is safe:**
- Cancel button is already `disabled={createCheckout.isPending}` — this extends the same guard to overlay click and Escape key.
- If the mutation fails, `isPending` returns to `false` and the user can close normally.
- Standard UX pattern: lock payment dialogs during processing.

---

### 5. Unnecessary useMemo for simple boolean AND

**Problem:** Line 44 of `PaymentCheckoutDialog.tsx`:
```tsx
const shouldFetchPricing = useMemo(() => open && !!user, [open, user]);
```
`useMemo` overhead exceeds the cost of a boolean AND. This is an anti-pattern flagged by multiple reviewers.

**File:** `src/shared/components/payment/PaymentCheckoutDialog.tsx`

**Fix:**

```typescript
// Replace useMemo with direct expression
const shouldFetchPricing = open && !!user;
```

Remove `useMemo` from the import if it's no longer used elsewhere in the file.

**Why this is safe:** Boolean AND is O(1). `useMemo` adds hook tracking overhead that's more expensive than the computation itself.

---

## Acceptance Criteria

- [ ] `fetchPaymentMethods` accepts and forwards `AbortSignal` to `fetchJson`
- [ ] `usePaymentMethods` passes `signal` from TanStack Query's `queryFn`
- [ ] Client `PaymentMethod.redirect` type is `string` (not `string | boolean`)
- [ ] `selectedMethodId` resets to `null` when `PaymentCheckoutDialog` closes
- [ ] Dialog cannot be closed while `createCheckout.isPending` is true
- [ ] `useMemo` removed for simple boolean expression
- [ ] No lint errors (`npm run lint`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] App builds successfully

## Implementation Order

1. **Fix 5** — useMemo removal (trivial, builds confidence)
2. **Fix 2** — type alignment (1 line)
3. **Fix 1** — AbortSignal forwarding (2 files, 3 lines)
4. **Fix 3 + 4** — dialog state reset + close guard (same file, complementary fixes)

Single commit for all fixes since they're all small, scoped, and from the same review.

## References

- Code review report: payment gateway caching review on `project-enhancement-life`
- `src/app/api/payments.ts:82` — fetchPaymentMethods
- `src/app/hooks/usePayments.ts:24-32` — usePaymentMethods hook
- `src/shared/components/payment/PaymentCheckoutDialog.tsx:31-231` — dialog component
- `src/shared/utils/paymentMethods.ts:14-18` — shouldRedirectToGateway (no changes needed)
- `server/src/services/fawaterk.ts:117-123` — server PaymentMethod type (reference only)
