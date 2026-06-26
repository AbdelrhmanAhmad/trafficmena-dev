---
status: completed
priority: p2
issue_id: "053"
tags: [code-review, frontend, payments, ticket-types, ux]
dependencies: ["051"]
---

# Fix Ticketed Track Replacement Code UI Wiring

## Problem Statement

The ticketed-track "Request new code" flow is still not wired end to end. The track detail page knows the pending ticket type but does not send `forceNewCode`; the pending page sends `forceNewCode` but has no ticket type to send.

## Findings

- `src/features/tracks/pages/TrackDetail.tsx:367` only opens the payment dialog for "Request new code".
- `src/shared/components/payment/PaymentCheckoutDialog.tsx:203` sends checkout requests without a `forceNewCode` option or prop.
- `src/pages/payment/pending.tsx:211` sends `forceNewCode: true`, but no `ticketType`.
- `server/src/routes/api/payments.ts:2184` and `src/app/api/payments.ts:66` omit `ticketType` from the payment detail response, so the pending page cannot recover the stored ticket type.
- Result: same-ticket replacement from track detail resumes the old pending payment, while replacement from `/payment/pending` fails with `TICKET_TYPE_REQUIRED` for ticketed tracks.

## Proposed Solutions

### Option 1: Add Replacement Mode To PaymentCheckoutDialog

**Approach:** Add a `forceNewCode` prop to `PaymentCheckoutDialog`; pass it from track detail when the user chooses "Request new code"; keep using the already selected/pending ticket type.

**Pros:**
- Small, direct UI fix.
- Reuses the existing ticket-type preselection on track detail.

**Cons:**
- Does not fix `/payment/pending` by itself.

**Effort:** Small

**Risk:** Low

---

### Option 2: Expose Ticket Type On Payment Detail

**Approach:** Include `ticketType` in `GET /api/payments/:id` and `src/app/api/payments.ts`, then have the pending page send it on `forceNewCode` requests.

**Pros:**
- Fixes the generic pending screen.
- Keeps agents/API clients able to recover full checkout context.

**Cons:**
- Requires a small API response contract update.

**Effort:** Small/Medium

**Risk:** Low

---

### Option 3: Include Ticket Type In Pending URLs

**Approach:** Add `ticket_type` to pending URLs after checkout and use it on replacement.

**Pros:**
- Very quick.

**Cons:**
- URL can drift from server truth; payment detail remains incomplete.

**Effort:** Small

**Risk:** Medium

## Recommended Action

Implemented Options 1 and 2. Track detail now passes replacement mode into checkout, and payment
detail exposes the stored ticket type so the pending page can request a fresh code for ticketed
tracks.

## Technical Details

**Affected files:**
- `src/features/tracks/pages/TrackDetail.tsx`
- `src/shared/components/payment/PaymentCheckoutDialog.tsx`
- `src/pages/payment/pending.tsx`
- `src/app/api/payments.ts`
- `server/src/routes/api/payments.ts`

## Resources

- Source review: `docs/reviews/2026-06-26-004-ticket-types-comparative-review.md`

## Acceptance Criteria

- [x] Track detail "Request new code" sends `forceNewCode: true` and the selected/pending `ticketType`.
- [x] `/payment/pending` can request a fresh code for a ticketed track without `TICKET_TYPE_REQUIRED`.
- [x] Payment detail API exposes the stored ticket type to the owner of the payment.
- [x] Regression coverage proves both track-detail and pending-page replacement requests include ticket type.

## Work Log

### 2026-06-26 - Review Discovery

**By:** Codex

**Actions:**
- Traced replacement-code calls from track detail, payment dialog, pending page, and payment detail API.
- Confirmed the backend now fails safely when ticket type is absent, but the UI flow remains broken.

**Learnings:**
- The fix split the needed state across two screens: one has ticket type, the other has replacement mode.

### 2026-06-26 - Fixed

**By:** Codex

**Actions:**
- Added `forceNewCode` support to `PaymentCheckoutDialog`.
- Wired TrackDetail "Request new code" through `forceNewCode={requestingNewCode}` while keeping
  the selected/pending ticket type.
- Added `ticketType` to payment detail API/client responses.
- Sent the stored `payment.ticketType` from `/payment/pending` replacement checkout requests.

**Verification:**
- `npm run test:unit`
- `npm --prefix server run build`
- `npm run lint`
- `npm run build`
