# Payment Reliability Operations Runbook

This runbook covers operational response for payment-state drift between Fawaterk and TrafficMENA.

> **Gateway is Fawaterk API v3** (OAuth + transaction-intent model). The correlation keys are our
> `payments.id` (a UUID; the sole flow key, present in redirect URLs), the gateway
> `fawaterk_intent_key` (= the webhook `transaction_key`), and the gateway `fawaterk_transaction_id`
> (populated on confirmation; searchable in admin attendee views as "Payment Ref"). Legacy v2 rows
> still carry `fawaterk_invoice_id`/`fawaterk_invoice_key` as historical audit data.

## 1. Stuck Payment Triage

Use this when finance/user support reports "paid in gateway, not reflected in dashboard/access".

1. Collect the user's `payment_id` (from their `/payment/*` URL) **or** the gateway
   `transaction_id`/reference (from the Fawaterk dashboard), plus phone/email, item, and timestamp.
2. Query the local payment (by whichever id you have):
   ```sql
   select id, user_id, item_type, item_id, status, amount_cents, currency,
          fawaterk_intent_key, fawaterk_transaction_id,
          fawaterk_invoice_id,  -- legacy rows only; null on v3
          created_at, paid_at
   from payments
   where id = :payment_id
      or fawaterk_intent_key = :intent_key
      or fawaterk_transaction_id = :transaction_id;
   ```
3. Inspect API logs for the same payment (match on `paymentId`, `transactionKey`, or `transaction_id`):
   - `[payments/webhook] Confirmation processed`
   - `[payments/webhook] No payment for transaction_key` (404 — persist race; reconciliation is the backstop)
   - `[payments/confirm] Recovered expired payment after paid gateway transaction`
   - `[payment-reconciliation] Recovered expired payment`
   - `[payments/fulfillment_failed_after_gateway_paid]`
   - `[payments/webhook] post-cutover legacy webhook, invoice_id=<n> — manual review` (a v2 kiosk code paid post-cutover → §5)
4. Check persisted fulfillment failures. **On v3 rows `invoice_id` is null** — correlate via `payment_id`
   and read the gateway ids from the joined `payments` row:
   ```sql
   select f.payment_id, f.user_id, f.item_type, f.item_id, f.ticket_type, f.amount_cents,
          f.confirmation_source, f.error_code, f.error_message, f.failure_count,
          p.fawaterk_intent_key, p.fawaterk_transaction_id,
          f.invoice_id,  -- legacy rows only
          f.created_at, f.updated_at
   from payment_fulfillment_failures f
   join payments p on p.id = f.payment_id
   where f.resolved_at is null
     and f.payment_id = :payment_id
   order by f.updated_at desc;
   ```
5. Trigger `POST /api/payments/verify` with `{ "paymentId": "<uuid>" }` as the owning user if needed
   (session-scoped — it re-verifies via the gateway before fulfilling).
6. Confirm outcome:
   - `payments.status = 'paid'`
   - fulfillment rows exist (`event_attendees` / `track_bookings` / `subscriptions`)
7. After manual booking or refund is complete, mark the failure resolved:
   ```sql
   update payment_fulfillment_failures
   set resolved_at = now(),
       resolved_by = :admin_user_id,
       resolution_note = :note,
       updated_at = now()
   where payment_id = :payment_id
     and resolved_at is null;
   ```

## 2. Webhook Outage Playbook

Use this when webhook success count drops or confirmations are delayed.

1. Validate endpoint reachability (must return 400, **not 301** — the apex 301-redirects `/api/*`;
   the dashboard paid URL must be the **www** host):
   ```bash
   curl -s -o /dev/null -w "%{http_code}" -X POST \
     https://www.trafficmena.com/api/payments/webhook_json \
     -H 'Content-Type: application/json' -d '{}'
   ```
2. Check logs for:
   - `[payments/webhook] Invalid TR signature` / `INVALID_SIGNATURE` — HMAC mismatch (see §2.a)
   - `[payments/webhook] Invalid payload` — shape drift (neither TR nor legacy)
   - elevated 429s on the `webhook:*` limiter (100/min/IP, shared by all four webhook routes)
3. Verify the outbound callback URL in the checkout payload:
   `redirectionUrls.webhookUrl` resolves to `${API_BASE_URL}/api/payments/webhook_json`, and prod
   `API_BASE_URL = https://www.trafficmena.com`.
4. If outage confirmed: the verify endpoint and the 15-min reconciliation job are the fallbacks —
   confirm both are healthy (§3).
5. After recovery: sample recent intents and confirm gateway-paid convergence to local `paid`.

**§2.a — every webhook 401s:** HMAC-secret mismatch. `FAWATERK_API_KEY` must equal the dashboard
vendor API key for the environment. It signs all four webhook types (paid `transactionHashKey`;
cancel/failed/refund `hashKey`).

## 3. Reconciliation Playbook

Background safety net runs every 15 minutes and scans recent `pending|expired` rows **that have a
`fawaterk_intent_key`**.

1. Check startup logs for:
   - `[server] Payment reconciliation job scheduled (every 15 minutes)`
2. Check per-run summary:
   - `[payment-reconciliation] Run complete` (fields: `paid`, `recoveredFromExpired`, `stillPending`,
     `terminalUnchanged`, `errors`)
3. Investigate non-zero `errors`. Note: a routine abandoned checkout returns an
   invalid/expired-intent result (**counts as `stillPending`, not an error**). `errors` means a real
   fault — amount/currency mismatch, a request-shape-drift 422 (object message), or gateway transport
   failure.
4. Manual SQL validation of the candidate set:
   ```sql
   select status, count(*) from payments
   where fawaterk_intent_key is not null
     and created_at >= now() - interval '10 days'
   group by status
   order by status;
   ```

## 4. Finance Daily Verification Checklist

1. Export previous-day paid transactions from the Fawaterk dashboard (match on `transaction_id`).
2. Compare with local paid totals:
   ```sql
   select count(*) as paid_count, coalesce(sum(amount_cents), 0) / 100.0 as paid_egp
   from payments
   where status = 'paid'
     and paid_at >= date_trunc('day', now() - interval '1 day')
     and paid_at < date_trunc('day', now());
   ```
3. For any mismatch: isolate transactions missing in local `paid` (match by `fawaterk_transaction_id`),
   and verify whether reconciliation/webhook/verify logs processed them.
4. Escalate if mismatch remains after one reconciliation cycle.

## 5. Post-cutover v2 stragglers & legacy tripwire

A pre-cutover kiosk code (Fawry/Aman/Masary) paid **after** the v3 deploy hits a voided row the
shipped code can't verify. Signals:
- `[payments/webhook] post-cutover legacy webhook, invoice_id=<n> — manual review` (the log-only
  tripwire; removed after 14 silent days).
- A user reports paying a code but getting no access; their `payments` row is `status='failed'` with
  `fawaterk_invoice_id` set and `fawaterk_intent_key` null (a voided row).

Response: confirm the payment in the Fawaterk dashboard, then either refund there **or** grant access
via the admin enrollment flow. Voided rows remain visible in admin payments views.
