---
title: "Fawaterk v3 migration — live-staging findings + code review synthesis"
type: review
status: active
date: 2026-07-03
branch: fix/fawaterk-v3-migration
---

# Fawaterk v3 migration — review findings & fixes (2026-07-03)

Root-cause investigation of "payment methods don't load" + a 14-persona code review of the
migration branch, cross-checked against the **live** Fawaterk staging gateway (OAuth credentials
provisioned mid-session). The live probes are the key differentiator: the static reviewers validated
that the code faithfully implements the plan's contract reference, but the contract reference itself
(extracted from the OpenAPI spec) **diverges from the live API in two places**, which no static
review could catch.

## Root cause of the reported symptom (payment modal shows an error, no methods)

Two stacked causes, both now fixed and verified end-to-end against staging:

1. **Missing OAuth credentials** (config). `server/.env` predated the migration and had no
   `FAWATERK_CLIENT_ID` / `FAWATERK_CLIENT_SECRET`. The v3 client needs an OAuth bearer token before
   any call, so `GET /api/payments/methods` threw `Fawaterk OAuth credentials not configured`.
   Resolved by adding the provisioned staging credentials. **`TOKEN_URL` is NOT needed** — the client
   derives it from `FAWATERK_ENV` (`getV3Host()` → `{host}/oauth/token`).

2. **Methods field-name drift** (code bug). The live `GET /api/v3/getTrPaymentmethods` returns the id
   field as **`paymentId`**, but the code normalized from **`payment_method_id`** (the plan's spec
   claimed a rename that did not happen). Every method failed `z.number()`, so the endpoint 500'd even
   *with* valid credentials. Fixed: `paymentId: method.paymentId ?? method.payment_method_id`.

## Fixes applied in this session (verified)

| # | File | Fix | Verification |
|---|------|-----|--------------|
| 1 | `server/src/services/fawaterk.ts` | Methods id reads live `paymentId` (fallback `payment_method_id`) | Live staging: 3 methods load |
| 2 | `server/src/services/fawaterk.ts` | `createTransaction` accepts BOTH the nested `data.*` envelope AND the FLAT top-level Fawry body | Live staging: card+fawry+wallet all parse |
| 3 | `server/src/services/fawaterk.ts` | Coerce `null` logo → undefined (one null logo no longer fails the whole method array) | Prevents repeat of symptom on live |
| 4 | `server/src/services/fawaterk.ts` | Log primitive `payment_data` shapes (observability for Aman/Masary/Apple Pay drift) | unit-covered path |
| 5 | `tests/unit/fixtures/fawaterk-v3.ts` + `fawaterk-v3-contracts.test.ts` | Fixtures/tests for live `paymentId` shape + flat Fawry body | 420/420 green |
| 6 | `server/drizzle/meta/0021_*.json` | Biome-format the generated 0021 meta files (lint was red) | lint clean |

### Bug #2 detail — Fawry flat envelope (was: Fawry checkout fully broken)

Live `createTransaction` response shapes (probed 2026-07-03):

- **Card** (`redirect:"true"`): `{status, data:{intent_key, payment_data:{redirectTo}}}` — nested ✓
- **Wallet/Meeza** (`redirect:"false"`): `{status, data:{intent_key, payment_data:{meezaReference, meezaQrCode}}}` — nested ✓
- **Fawry** (`redirect:"false"`): `{status:"pending", intent_key, fawryCode, referenceNumber, reference}` — **FLAT, no `data` wrapper**

The code only read `result.data.*`, so for Fawry `result.data` was `undefined` → parse threw →
checkout marked the payment `failed` and 500'd. Fawry is a top-3 method in Egypt. The fix reads a
`container = result.data ?? result` and a `payment_data ?? container` fallback.

## The systemic risk: spec drift also threatens the WEBHOOKS (not yet verifiable)

The plan's contract reference drifted from reality twice (methods field, Fawry envelope). The webhook
HMAC `StringToSign` formats and field names (`transaction_key`, `transactionHashKey`,
`TransactionId=…&TransactionKey=…&PaymentMethod=…`) are ALL spec-derived and **cannot be verified
locally** (they require a real webhook delivery to a public URL after a completed payment). This is
exactly what the plan's U15 staging gate (AE5/AE6) exists for — now proven necessary. **Do not treat
the webhook path as verified until a real staging webhook is captured and its signature verifies with
the vendor key.** Designated fallbacks already in code: `pay_load`→paymentId correlation (U10 T6, not
yet implemented), and the 15-min reconciliation job as the persist-race bridge.

## Code review synthesis (14 personas + live verification)

Security: **zero exploitable findings** (IDOR scoping preserved, HMAC hygiene centralized, secrets
never logged, trigger-not-truth re-verification intact). Data-migration: 0021 additive-only, journal
intact. api-contract: zero contract findings (paymentId normalization keeps SPA↔server stable).

### Recommended follow-ups for Opus (not applied — need judgment or are larger changes)

**P1 — Webhook handlers have zero HTTP-level tests (3 reviewers agree).** The plan's own
`tests/unit/fawaterk-webhook-handlers.test.ts` (U10 T5) was never created. The four webhook routes'
verify-then-branch logic (tampered/missing hash→401, unknown key→404, pending→200, legacy→200,
malformed→400) is pinned only by pure-verifier tests + source-text assertions — never by invoking a
handler. These are unauthenticated public payment endpoints. Recipe: `registerPaymentRoutes` is
already exported (payments.ts:1373); mount on a fresh `new Hono()` and drive with `app.request()`
(pattern in `tests/unit/json-body-parser.test.ts`); sign fixtures with the StringToSign helpers in
`tests/unit/fixtures/fawaterk-v3.ts`. The DB-independent branches (verification runs before any DB
touch) need no database.

**P2 — Void script TOCTOU (3 reviewers agree).** `server/scripts/void-v2-pending-payments.ts:108`
updates `status='failed'` keyed only on `payments.id`, with no re-assertion of the selection
predicate. Safe under the planned deploy order, but if an operator runs `--apply` during the same
cutover session as manual reconciliation (U16 T1 H1 branch), a row concurrently marked `paid` gets
clobbered to `failed`. Fix: `.where(and(eq(payments.id, row.id), inArray(payments.status,
['pending','expired'])))` and gate reservation deletion on the update affecting a row.

**P2 — Dialog dismiss + late-mutation navigation race (widened by this diff).**
`PaymentCheckoutDialog.tsx:198` — after the 20s "stuck" escape hatch lets the user dismiss the dialog
mid-checkout, the un-guarded post-`await` continuation now navigates (hard redirect or `goToPending`)
for materially more response shapes than v2. Fix: a dismissal ref checked after
`createCheckout.mutateAsync` resolves.

**P2 — Orphaned dead file (2 reviewers @100).** `src/shared/utils/paymentMethods.ts`
(`shouldRedirectToGateway`/`isOfflinePaymentMethod`/`normalizePaymentMethodName`) has zero importers
after the redirect-vs-code branching collapsed into unconditional `goToPending`. Safe to delete after
a confirming grep.

**P3 cluster (reference-quality / observability):**
- Naming drift: `isInvoicePaid`/`InvoiceStatusInput` (invoiceStatus.ts) and
  `ConfirmGatewayInvoiceResult` (payments.ts:152) still carry v2 "invoice" vocabulary at the v3
  confirm chokepoint. Cosmetic; the plan flagged the conditional rename.
- `GatewayTransaction.expiredOrMissing` is set but never read by confirm/reconcile — wire it in or
  drop it + fix the comment.
- Token manager: `invalidateAccessToken()` on 401 unconditionally clears a token a sibling call may
  have just refreshed — compare-and-clear fix (matters under reconciliation's concurrent fan-out).
- Free-checkout path awaits `getPaymentMethods()` before the `amountCents===0` branch, so a free
  registration depends on OAuth availability. R20's "zero gateway calls" test only checks source
  ordering, not actual calls. Hoist the free branch above the method fetch, or downgrade the claim.
- Free-checkout navigates to `/payment/success` without `payment_id` (pending.tsx:195), landing on
  the R25 uncertainty copy for a completed registration. Pass `payment_id`.

### Deploy-time operational items (config, not code)

- **`FAWATERK_ENV` has no production boot guard** (unlike the 3 new credential guards). Do NOT add a
  "must be live" guard — the staging environment legitimately runs a production build with
  `FAWATERK_ENV=staging`. Keep it a checklist item: `grep FAWATERK_ENV server/.env` must show `live`
  in production.
- **Webhook rate limiter keys on first `X-Forwarded-For` hop** (spoofable if Caddy appends rather
  than replaces XFF). Verify Caddy overwrites XFF at cutover. Bounded impact (verify + reconcile are
  delivery-independent).
- **HMAC-secret parity**: dashboard vendor API key must byte-equal deployed `FAWATERK_API_KEY` per
  environment, or every webhook 401s silently.

### Post-void SQL invariants (from the deployment-verification agent)

```sql
-- MUST return 0 after --apply: no v2 straggler left pending/expired
SELECT count(*) FROM payments
WHERE status IN ('pending','expired') AND fawaterk_invoice_id IS NOT NULL AND fawaterk_intent_key IS NULL;

-- Orphaned reservations after void — MUST be empty
SELECT er.payment_id FROM event_reservations er JOIN payments p ON p.id = er.payment_id WHERE p.status='failed'
UNION ALL
SELECT tr.payment_id FROM track_reservations tr JOIN payments p ON p.id = tr.payment_id WHERE p.status='failed';

-- Post-cutover health: new pending rows should carry an intent key (non-free)
SELECT count(*) FILTER (WHERE fawaterk_intent_key IS NOT NULL) AS with_intent,
       count(*) FILTER (WHERE fawaterk_intent_key IS NULL AND amount_cents > 0) AS without_intent_paid_item
FROM payments WHERE status='pending' AND created_at >= '<CUTOVER_TIMESTAMP>';
```

**Rollback boundary** (confirmed accurate): `git revert` is clean ONLY before the void `--apply` and
before the first organic v3 checkout. After that, reverted v2 code cannot see v3 rows (no invoice
ids), so rollback additionally requires manual dashboard reconciliation. Migration 0021 is additive —
do NOT write a down-migration.
