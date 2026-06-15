# Payment Gateway Critical Fixes Plan

**Date:** 2026-01-15
**Branch:** `feat/payment-gateway-mvp`
**Priority:** CRITICAL - All 6 issues validated

---

## Summary of Validated Issues

| # | Issue | Severity | File(s) |
|---|-------|----------|---------|
| 1 | Client/Server Contract Mismatches | HIGH | `payments.ts` |
| 2 | Paid Flows Bypass Booking Rules | CRITICAL | `events.ts`, `tracks.ts` |
| 3 | Track Purchases Don't Register Users | HIGH | `payments.ts` |
| 4 | Fawry/Wallet Methods Not Handled | MEDIUM | `PaymentCheckoutDialog.tsx`, `Subscribe.tsx` |
| 5 | Subscription UX Routing Inconsistent | LOW | `Header.tsx` |
| 6 | Duplicate Subscription Payments | HIGH | `payments.ts` |

---

## Fix 1: Remove `data` Wrapper from Payment Endpoints

**Problem:** All payment endpoints wrap responses in `{ data: ... }` but frontend `fetchJson()` returns raw JSON, causing undefined values.

**File:** `server/src/routes/api/payments.ts`

**Changes Required:**
- Line ~335: Change `{ data: { free: true, paymentId: ... } }` → `{ free: true, paymentId: ... }`
- Line ~398: Change `{ data: { redirectUrl, paymentId, ... } }` → `{ redirectUrl, paymentId, ... }`
- Line ~449: Change `{ data: { verified, status, ... } }` → `{ verified, status, ... }`
- Line ~475: Change `{ data: payment }` → `payment`
- Line ~538: Change `{ data: { ... } }` → `{ ... }`

**Test:** Frontend should receive values directly without `.data` access.

---

## Fix 2: Enforce Payment for Paid Events/Tracks

**Problem:** Users can register for paid events or book paid tracks without paying.

### Fix 2a: Events Registration

**File:** `server/src/routes/api/events.ts`

**Location:** `/events/:id/register` endpoint (around line 650-700)

**Add before insert:**
```typescript
// Check if event requires payment
if (event.priceInCents && event.priceInCents > 0) {
  return c.json({
    error: {
      code: 'PAYMENT_REQUIRED',
      message: 'This event requires payment. Use the checkout flow.',
    },
  }, 402);
}
```

### Fix 2b: Track Booking

**File:** `server/src/routes/api/tracks.ts`

**Location:** `/tracks/:id/book` endpoint (around line 1200)

**Add before CTE:**
```typescript
// Check if track requires payment
if (track.priceInCents && track.priceInCents > 0) {
  return c.json({
    error: {
      code: 'PAYMENT_REQUIRED',
      message: 'This track requires payment. Use the checkout flow.',
    },
  }, 402);
}
```

---

## Fix 3: Register Users for Track Events After Payment

**Problem:** `processSuccessfulPayment()` for tracks only creates booking, doesn't register user for track events.

**File:** `server/src/routes/api/payments.ts`

**Location:** Lines 187-203 (inside `processSuccessfulPayment`)

**Replace track handling with:**
```typescript
if (updated.itemType === 'track' && updated.itemId) {
  // Create track booking
  await tx.insert(trackBookings).values({
    trackId: updated.itemId,
    userId: updated.userId,
    paidAt: new Date(),
    pricePaidCents: updated.amountCents,
  }).onConflictDoUpdate({
    target: [trackBookings.trackId, trackBookings.userId],
    set: { paidAt: new Date(), pricePaidCents: updated.amountCents },
  });

  // Register user for all events in the track
  const trackEvents = await tx
    .select({ eventId: trackEventsTable.eventId })
    .from(trackEventsTable)
    .where(eq(trackEventsTable.trackId, updated.itemId));

  for (const te of trackEvents) {
    await tx
      .insert(eventAttendees)
      .values({
        eventId: te.eventId,
        userId: updated.userId,
        paidAt: new Date(),
        pricePaidCents: 0, // Part of track bundle
        paymentId: updated.id,
      })
      .onConflictDoNothing();
  }
}
```

---

## Fix 4: Handle Fawry/Wallet Non-Redirect Payments

**Problem:** Frontend only handles `redirectUrl`, ignoring `fawryCode` for reference-based payments.

### Fix 4a: PaymentCheckoutDialog

**File:** `src/shared/components/payment/PaymentCheckoutDialog.tsx`

**After checkout mutation success (around line 66):**
```tsx
if (result.fawryCode) {
  // Show Fawry reference code to user
  setFawryCode(result.fawryCode);
  setShowFawryInstructions(true);
} else if (result.redirectUrl) {
  window.location.href = result.redirectUrl;
}
```

**Add new state and UI:**
```tsx
const [fawryCode, setFawryCode] = useState<string | null>(null);
const [showFawryInstructions, setShowFawryInstructions] = useState(false);

// In render, add Fawry instructions dialog:
{showFawryInstructions && fawryCode && (
  <div className="p-4 bg-amber-50 rounded-lg">
    <h3 className="font-semibold">Pay with Fawry</h3>
    <p className="text-sm text-neutral-600 mt-2">
      Use this reference code at any Fawry outlet:
    </p>
    <div className="mt-2 p-3 bg-white rounded border text-center font-mono text-xl">
      {fawryCode}
    </div>
    <p className="text-xs text-neutral-500 mt-2">
      Payment will be verified automatically once received.
    </p>
  </div>
)}
```

### Fix 4b: Subscribe.tsx

**File:** `src/pages/dashboard/Subscribe.tsx`

**Same pattern as above.**

---

## Fix 5: Fix Subscription UX Routing

**Problem:** Both guests and authenticated users go to `/subscribe`, but authenticated should go to `/dashboard/subscribe`.

**File:** `src/shared/components/layout/Header.tsx`

**Location:** Lines 109-118 (Desktop Subscribe button)

**Change from:**
```tsx
{!hasActiveSubscription && (
  <Link to="/subscribe">
```

**Change to:**
```tsx
{!hasActiveSubscription && (
  <Link to={user ? '/dashboard/subscribe' : '/subscribe'}>
```

**Also update mobile drawer (around line 203):**
```tsx
<Link to={user ? '/dashboard/subscribe' : '/subscribe'} onClick={closeDrawer}>
```

---

## Fix 6: Prevent Duplicate Subscription Payments

**Problem:** NULL `item_id` bypasses unique index. Users can create multiple pending subscription payments.

**File:** `server/src/routes/api/payments.ts`

**Location:** Before payment insert (around line 344)

**Add explicit check:**
```typescript
// Check for existing pending payment (especially for subscriptions where item_id is NULL)
if (itemType === 'subscription') {
  const [existingPending] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        eq(payments.itemType, 'subscription'),
        eq(payments.status, 'pending'),
      ),
    );

  if (existingPending) {
    // Return existing payment details instead of creating duplicate
    return c.json({
      paymentId: existingPending.id,
      message: 'Existing pending payment found',
      fawaterkInvoiceId: existingPending.fawaterkInvoiceId,
    });
  }
}
```

**Alternative DB-level fix (more robust):**
Create a partial unique index that handles NULL:
```sql
CREATE UNIQUE INDEX "payments_unique_pending_subscription"
ON "payments" ("user_id")
WHERE status = 'pending' AND item_type = 'subscription';
```

---

## Implementation Order

1. **Fix 1** (Contract mismatch) - Unblocks frontend testing
2. **Fix 6** (Duplicate payments) - Prevents data corruption
3. **Fix 2** (Payment enforcement) - Critical security fix
4. **Fix 3** (Track event registration) - Business logic completeness
5. **Fix 4** (Fawry handling) - User experience
6. **Fix 5** (Routing) - Minor UX polish

---

## Testing Checklist

### After Fix 1:
- [ ] Checkout returns `{ redirectUrl, paymentId }` (no `data` wrapper)
- [ ] Frontend handles response correctly

### After Fix 2:
- [ ] POST `/events/:id/register` returns 402 for paid events
- [ ] POST `/tracks/:id/book` returns 402 for paid tracks
- [ ] Free events/tracks still work

### After Fix 3:
- [ ] After track payment, user is registered for all track events
- [ ] Event attendee records have correct `payment_id`

### After Fix 4:
- [ ] Fawry code displays in UI when selected
- [ ] User can copy/use reference code

### After Fix 5:
- [ ] Guest clicking Subscribe → `/subscribe`
- [ ] Authenticated user clicking Subscribe → `/dashboard/subscribe`

### After Fix 6:
- [ ] Multiple subscribe clicks return same pending payment
- [ ] No duplicate payment records created

---

## Notes

- All fixes maintain backward compatibility
- No database migration required (Fix 6 alternative is optional)
- Estimated implementation time: 2-3 hours
- Should run full test suite after each fix
