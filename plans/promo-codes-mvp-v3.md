# Promo Code System - Implementation Plan v3.0

**Date:** 2026-02-03
**Status:** Draft for implementation (updated per latest Q&A)
**Approach:** MVP-first, server-truth, no regression risk

---

## 0) Executive Summary
This v3.0 plan updates v2.2 to explicitly support **pre-checkout promo application** on **Track/Standalone Event detail pages** with a **Stripe-style inline input** (no popup). Promo codes are **applied and locked before redirecting to Fawateerak**. The backend remains the sole source of truth for pricing and discount logic. **Subscribers with existing offline-event discounts are excluded from promo usage** (no stacking).

---

## 1) First‑Principles Invariants (Non‑Negotiable)
1. **Server is source of truth** for price, discounts, and eligibility.
2. **Promo must be applied before checkout** (on detail page); checkout provider (Fawateerak) is not trusted for promo logic.
3. **Amount locks at checkout creation**; fulfillment/webhooks never re‑validate promos.
4. **No discount stacking** — only one discount source applies (subscriber OR promo, never both).
5. **Promo codes never apply to free items** (`basePrice <= 0`).
6. **Subscriber discounts exclude promo usage** for offline events/tracks.

---

## 2) Second‑Order Risks & Mitigations
- **Race conditions / oversell**: Validate promo **inside** payment transaction before reservation creation.
- **Data corruption / partial writes**: Use transactions for multi‑table operations (payments + reservations).
- **Security / enumeration**: Single generic error `PROMO_INVALID` for all promo failures; constant‑time validation.
- **Front‑end mismatch**: Price preview uses server result; never calculate discount on client.
- **Checkout provider mismatch**: Promo applied **before** redirect; store applied promo on payment record.
- **Subscriber stacking**: Hard‑block promo in backend when subscriber discount applies; UI disables promo input.

---

## 3) UX Requirements (Explicit Answers to Questions)
### 3.1 Promo is applied before checkout
- **Yes, the plan explicitly applies promo codes on Track/Standalone Event detail pages** before the user clicks **Book Now**.
- The **checkout provider (Fawateerak)** is not responsible for promo logic. Our backend **creates the checkout session with the already‑discounted amount**.

### 3.2 Stripe‑style inline input (no popup)
- **Promo input is inline** on the detail page, collapsed behind a text link.
- When expanded, it shows a single input and Apply button.
- **No promo input inside any payment dialog**.

### 3.3 Payment dialog
- The existing `PaymentCheckoutDialog` (if still used for payment method selection) only **shows a summary** of the applied promo.
- No promo input is shown inside the dialog.

---

## 4) Admin Management & Sidebar Question
- **Yes, there is a dedicated admin page** for promo codes: `/admin/promo-codes`.
- **No separate sidebar section** is created; we add a **single link under existing Admin navigation**.
- The page allows **create, edit (dates/percent), and delete** promos (manager+ for create/update; admin+ for delete).

---

## 5) MVP Scope & Decisions
**In scope (MVP):**
- One promo applies to **one track OR one standalone event**.
- Percentage discount only (1–99%).
- Case‑sensitive admin‑typed code.
- Inline input on detail pages only.
- Generic error message (`PROMO_INVALID`).
- Usage count via payments (no usage history UI).

**Out of scope (post‑MVP):**
- Orphan cleanup hooks (deferred).
- Usage history UI (count only).
- Server‑side list filtering (client‑side for small dataset).

---

## 6) Data Model (Drizzle)
### 6.1 New table: `promo_codes`
```ts
export const promoCodes = pgTable(
  'promo_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    targetType: text('target_type').notNull(), // 'track' | 'event'
    targetId: uuid('target_id').notNull(),
    discountPercent: integer('discount_percent').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    codeUnique: uniqueIndex('promo_codes_code_unique')
      .on(table.code)
      .where(sql`is_deleted = false`),
    targetIdx: index('promo_codes_target_idx').on(table.targetType, table.targetId),
  })
);
```

**Migration CHECK constraints:**
- `discount_percent BETWEEN 1 AND 99`
- `target_type IN ('track', 'event')`
- `starts_at < ends_at`

### 6.2 Payments table additions
```ts
promoCodeId: uuid('promo_code_id').references(() => promoCodes.id, { onDelete: 'set null' }),
discountAppliedCents: integer('discount_applied_cents'),
originalAmountCents: integer('original_amount_cents'),
```

### 6.3 Usage count (no usage table)
```sql
SELECT COUNT(*) FROM payments
WHERE promo_code_id = $1 AND status = 'paid';
```

---

## 7) Core Pricing & Eligibility Rules
1. **Subscriber discount exclusion**: If subscriber discount applies to the item (offline events/tracks), promo codes are ignored and not applied.
2. **Promo applies only for paid items**: `basePrice <= 0` => no promo.
3. **No stacking**: If promo is eligible and subscriber discount is not, promo may apply; otherwise subscriber discount wins.

---

## 8) API Contracts
### 8.1 `calculatePrice()` result
```ts
interface PriceResult {
  amountCents: number;
  originalAmountCents: number;
  discountAppliedCents: number;
  discountSource: 'subscriber' | 'promo' | null;
  promoCodeId: string | null;
}
```

### 8.2 Price preview response
```ts
interface PricePreview {
  amountCents: number;
  amountFormatted: string;
  originalAmountCents: number;
  discountAppliedCents: number;
  discountSource: 'subscriber' | 'promo' | null;
  isSubscriber: boolean;
  isFree: boolean;
  promoError: string | null; // Generic only
}
```

---

## 9) Backend Tasks (B00001+)

### B00001: Schema & Migration
**Files:** `server/src/db/schema/index.ts`, `server/drizzle/*.sql`
- Add `promoCodes` table definition.
- Add payments fields (`promoCodeId`, `discountAppliedCents`, `originalAmountCents`).
- Generate migration: `npm --prefix server run db:gen`.
- Add CHECK constraints in migration SQL.
- Apply migration: `npm --prefix server run db:migrate`.

### B00002: Promo Validation Service
**File:** `server/src/services/promoCodes.ts` (new)
- Implement constant‑time validation:
  - Always query DB.
  - Evaluate all checks and then decide.
- Use single error: `PROMO_INVALID`.
- Accept optional transaction client for atomic checkout.

### B00003: Payment Flow Integration
**File:** `server/src/routes/api/payments.ts`
- Update `calculatePrice()` signature to accept `promoCode?: string` and `tx?`.
- Inside transaction:
  - If `promoCode` provided AND `basePrice > 0` AND `itemType !== 'subscription'`:
    - If subscriber discount applies: **ignore promo**.
    - Else validate promo and apply discount.
- Store `promoCodeId`, `discountAppliedCents`, `originalAmountCents` on payment.
- Ensure promo validation happens **before reservation creation** in the transaction.

### B00004: Price Preview Updates
**File:** `server/src/routes/api/payments.ts`
- Accept `promoCode` query param.
- If subscriber discount applies, ignore promo and return subscriber discount.
- Otherwise, validate promo in try/catch and return `promoError` if invalid (no throw).

### B00005: Admin CRUD Routes
**File:** `server/src/routes/api/promoCodes.ts` (new)
- Endpoints:
  - `GET /promo-codes` (manager+)
  - `GET /promo-codes/:id` (manager+)
  - `POST /promo-codes` (manager+)
  - `PUT /promo-codes/:id` (manager+)
  - `DELETE /promo-codes/:id` (admin+; soft delete)
- List returns usage count via subquery.
- Validate target exists and is standalone for `event`.
- Generic errors for promo validation; normal errors for admin create/update.

### B00006: Payments Index (Performance)
**File:** `server/src/db/schema/index.ts`
- Add index on `payments.promoCodeId` for usage counts.

---

## 10) Frontend Tasks (F00001+)

### F00001: Promo Code API Client
**File:** `src/app/api/promoCodes.ts` (new)
- CRUD helpers for promo codes.
- Types include `usage_count` and computed `is_active`.

### F00002: Update Price Preview Hook
**File:** `src/app/hooks/usePayments.ts`
- Accept `promoCode?: string`.
- Include `promoCode` in query key to avoid stale cache.
- Return `discountSource`, `originalAmountCents`, `promoError`.

### F00003: PromoCodeInput Component
**File:** `src/shared/components/payment/PromoCodeInput.tsx` (new)
- Stripe‑style collapsible input (inline).
- Handles states: collapsed → expanded → loading → applied/error.
- Uses `useId()` for a11y labels.
- Disable if user is subscriber with subscriber discount eligible.

### F00004: PriceDisplayCard Update
**File:** `src/shared/components/payment/PriceDisplayCard.tsx`
- Accept `discountSource`, `originalAmountCents`.
- Display correct badge: `Subscriber discount` vs `Promo applied`.
- Strikethrough original price when discounted.

### F00005: Track Detail Integration
**File:** `src/features/tracks/pages/TrackDetail.tsx`
- Add `appliedPromoCode` state.
- Render `PromoCodeInput` below price display (inline).
- Use `usePricePreview('track', trackId, appliedPromoCode)`.
- If subscriber discount applies, disable promo input with helper text.
- Pass `appliedPromoCode` into checkout request.

### F00006: Event Detail Integration
**File:** `src/features/events/pages/EventDetail.tsx`
- Same as F00005.
- Only show promo input for **standalone events**.

### F00007: Checkout Dialog Summary
**File:** `src/shared/components/payment/PaymentCheckoutDialog.tsx`
- Accept `appliedPromoCode?: string`.
- Display promo summary (no input).
- Pass `promoCode` to checkout mutation.

### F00008: Admin Promo Codes Page
**File:** `src/pages/admin/promo-codes.tsx`
- Single page with modal create/edit.
- Client‑side filtering for search/status.
- Delete button only for admin/owner.

### F00009: Admin Navigation
**Files:** `src/shared/components/layout/AppLayout.tsx`, `src/App.tsx`
- Add route and sidebar link (no new sidebar section).

---

## 11) Verification Steps
### Backend
1. Run migrations.
2. Create a promo code for a track/event.
3. Price preview with valid promo → discounted.
4. Price preview with invalid promo → `promoError` generic.
5. Checkout with promo → payment record stores promo fields.

### Frontend
1. Track detail: expand promo input, apply code, see discounted price.
2. Subscriber on offline event: promo input disabled.
3. Click Book Now → promo summary shown (if dialog exists), checkout amount correct.

### Admin
1. Create promo code.
2. Edit dates/percent.
3. Delete (soft delete).
4. Usage count increments after paid payment.

---

## 12) Deferred (Post‑MVP)
- Orphan cleanup hooks.
- Server‑side filters for large datasets.
- Usage history UI.
- Promo retry flow for pending payments.

---

## 13) Assumptions to Confirm
- Existing subscriber discount applies to **offline events/tracks** via current `calculatePrice()` logic.
- `PaymentCheckoutDialog` still exists for payment method selection; if removed, promo still applies before redirect.
- Standalone events are those without a `trackEvents` relation.

---

## 14) Final Answers to Follow‑up Questions (Explicit)
- **Does this plan apply promo before checkout?** Yes. Promo is applied and locked on the detail page before checkout creation.
- **Is it Stripe‑style inline (no popup)?** Yes. Inline expand/collapse input on detail pages only.
- **Do we rely on Fawateerak for promo?** No. Promo is server‑validated and stored before redirect.
- **Is there an admin sidebar section?** No separate section; one admin link to `/admin/promo-codes`.
- **Can admins manage promo codes?** Yes: create, edit dates/percent, delete (soft), and view usage count.
