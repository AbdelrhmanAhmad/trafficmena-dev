# Payment Reliability Operations Runbook

This runbook covers operational response for payment-state drift between Fawaterk and TrafficMENA.

## 1. Stuck Payment Triage

Use this when finance/user support reports "paid in gateway, not reflected in dashboard/access".

1. Collect `invoice_id`, user phone/email, item type, and payment timestamp.
2. Query local payment:
   ```sql
   select id, user_id, item_type, item_id, status, amount_cents, currency, fawaterk_invoice_id, fawaterk_invoice_key, created_at, paid_at
   from payments
   where fawaterk_invoice_id = :invoice_id;
   ```
3. Inspect API logs for the same invoice:
   - `[payments/webhook] Confirmation processed`
   - `[payments/confirm] Recovered expired payment after paid gateway invoice`
   - `[payment-reconciliation] Recovered expired payment`
4. Trigger `POST /api/payments/verify` as the owning user if needed.
5. Confirm outcome:
   - `payments.status = 'paid'`
   - fulfillment rows exist (`event_attendees` / `track_bookings` / `subscriptions`)

## 2. Webhook Outage Playbook

Use this when webhook success count drops or confirmations are delayed.

1. Validate endpoint reachability:
   - `POST /api/payments/webhook_json`
2. Check logs for:
   - `INVALID_SIGNATURE`
   - `INVALID_INVOICE_KEY`
   - elevated 429s on `webhook:*` limiter
3. Verify outbound callback URL in checkout payload:
   - `redirectionUrls.webhookUrl` should resolve to `${API_BASE_URL}/api/payments/webhook_json`
4. If outage confirmed:
   - keep verify endpoint available as fallback
   - ensure reconciliation job is running and healthy
5. After recovery:
   - sample recent invoices and confirm paid convergence to local `paid`

## 3. Reconciliation Playbook

Background safety net runs every 15 minutes and scans recent `pending|expired` rows with invoice IDs.

1. Check startup logs for:
   - `[server] Payment reconciliation job scheduled (every 15 minutes)`
2. Check per-run summary:
   - `[payment-reconciliation] Run complete`
3. Investigate non-zero `errors`:
   - amount/currency mismatch
   - gateway transport failures
4. If needed, run manual SQL validation:
   ```sql
   select status, count(*) from payments
   where fawaterk_invoice_id is not null
     and created_at >= now() - interval '10 days'
   group by status
   order by status;
   ```

## 4. Finance Daily Verification Checklist

1. Export previous-day paid invoices from Fawaterk.
2. Compare with local paid totals:
   ```sql
   select count(*) as paid_count, coalesce(sum(amount_cents), 0) / 100.0 as paid_egp
   from payments
   where status = 'paid'
     and paid_at >= date_trunc('day', now() - interval '1 day')
     and paid_at < date_trunc('day', now());
   ```
3. For any mismatch:
   - isolate invoices missing in local `paid`
   - verify whether reconciliation/webhook/verify logs processed them
4. Escalate if mismatch remains after one reconciliation cycle.
