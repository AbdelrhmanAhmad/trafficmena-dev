# Payment Gateway Deployment Checklist — Fawaterk API v3 (hard cutover)

**Migration plan:** `docs/plans/2026-07-03-001-fix-fawaterk-v3-migration-plan.md`
**Payment Gateway:** Fawaterk **API v3** (OAuth client-credentials + transaction-intent model)
**Cutover doctrine:** Hard cutover — zero v2 code ships. No kill switch. In-flight v2 payments are
voided at deploy and their stragglers handled via the support protocol (§8).

> **Rollback boundary.** `git revert` + redeploy is a clean rollback **only before** the void
> script runs (§7 T4) **and before the first organic v3 checkout**. After that point, reverted v2
> code cannot see v3 rows (v2 verify/reconcile/webhook all key off invoice ids), so a post-boundary
> revert additionally requires manual dashboard reconciliation of every row with
> `fawaterk_intent_key` set, and does not restore voided rows. Know this before starting §7.

---

## 1. Environment Variables

v3 authenticates API calls with OAuth client credentials. `FAWATERK_API_KEY` stays permanently — it
is no longer used for API auth but remains the **HMAC secret that signs every webhook**.

```bash
# Fawaterk v3 — per environment
FAWATERK_API_KEY=...            # legacy vendor key; STILL the webhook HMAC secret. Required in prod.
FAWATERK_ENV=staging            # staging -> staging.fawaterk.com ; live -> app.fawaterk.com
FAWATERK_CLIENT_ID=...          # OAuth client_id (UUID). Dashboard -> Integrations -> OAuth.
FAWATERK_CLIENT_SECRET=...      # OAuth client_secret (opaque). Never commit.

# Webhook callback base — PRODUCTION MUST be the www host (see §4).
API_BASE_URL=https://www.trafficmena.com          # staging: https://staging.trafficmena.com
APP_BASE_URL=https://www.trafficmena.com          # staging: https://staging.trafficmena.com
CORS_ORIGIN=https://www.trafficmena.com
```

Production boot **fails closed** without `FAWATERK_API_KEY`, `FAWATERK_CLIENT_ID` (UUID shape), and
`FAWATERK_CLIENT_SECRET` (≥16 chars) — see `server/src/config/env.ts`.

| Variable | Staging | Production |
|---|---|---|
| `FAWATERK_API_KEY` | staging vendor key | live vendor key |
| `FAWATERK_ENV` | `staging` | `live` |
| `FAWATERK_CLIENT_ID` / `_SECRET` | staging OAuth creds | live OAuth creds |
| `APP_BASE_URL` / `API_BASE_URL` | `https://staging.trafficmena.com` | `https://www.trafficmena.com` |

---

## 2. Phase 0 — Preflight (evidence + credentials, no code)

- [ ] Grep production API logs for `[payments/checkout] Error`, `Fawaterk`, `[fawaterk] Invalid`,
      `[payments/webhook]`, `[payment-reconciliation]`; map the first match to H1/H2/H3 (this selects
      the §7 T1 branch: machine sweep vs manual dashboard reconciliation).
- [ ] SQL: `payments` counts by status for the incident window; list `pending` rows > 1h with
      `fawaterk_invoice_id IS NOT NULL`.
- [ ] Caddy access log: status codes on `/api/payments/webhook*` (301/400 = the delivery defect).
- [ ] Create OAuth client credentials on **staging** and **live** (Dashboard → Integrations → OAuth).
      Store staging creds in `server/.env`; store live creds securely for §7 (never in the repo).
- [ ] **HMAC parity:** confirm the dashboard vendor API key equals the deployed `FAWATERK_API_KEY`
      on each environment. A mismatch means every v3 webhook 401s silently.
- [ ] Confirm the dashboard can register the four webhook URL types (paid/failed/cancel/refund).
- [ ] Inventory enabled methods on the **live** account (expect Apple Pay) with each method's
      `redirect` flag; note which are enabled on staging (drives §7 T2 method gating).
- [ ] Confirm `staging.trafficmena.com` has a **fully separate database** from production
      (hard-blocks the staging deploy in §6).

---

## 3. Deploy Steps (server)

```bash
git checkout <release-branch> && git pull
npm install && npm --prefix server install
npm --prefix server run db:migrate     # additive: adds fawaterk_intent_key + fawaterk_transaction_id
npm --prefix server run build
# restart the API process (pm2 / systemd)
```

Migration `0021_*` is additive-only (two nullable columns + a unique index on intent key + an index
on transaction id). Safe to run under the still-running v2 build.

---

## 4. Phase 1 — Webhook delivery repair (infra, ships first, independent of v3)

The apex `trafficmena.com` 301-redirects `POST /api/payments/webhook_json` to `www`, and webhook
senders do not reliably re-POST across a 301 — dropping delivery. Fix **before** anything else:

- [ ] Dashboard **paid** webhook URL (staging + live):
      `https://www.trafficmena.com/api/payments/webhook_json`
      (staging: `https://staging.trafficmena.com/api/payments/webhook_json`).
      **Do NOT register cancel/failed/refund yet** — those endpoints don't exist until the v3 build
      deploys; registering early makes the gateway POST into 404s for weeks (sender auto-disable
      risk). They land on staging at §6 T0 and on live at §7 T2.
- [ ] Production `API_BASE_URL=https://www.trafficmena.com` on the VPS; fix + restart if wrong.
- [ ] Caddy: exempt `/api/*` on the apex host from the apex→www 301 (proxy identically to www), so
      any URL cached on Fawaterk's side keeps working.
- [ ] Probe (must return 400 = handler reached, **not** 301):
      ```bash
      curl -s -o /dev/null -w "%{http_code}" -X POST \
        https://trafficmena.com/api/payments/webhook_json \
        -H 'Content-Type: application/json' -d '{}'
      ```

### Apex `/api` exemption — the applied Caddy block (durable record)

> **VPS-only artifact.** `/etc/caddy/Caddyfile` is not in the repo, so this block **is** the record.
> Applying it is an owner ops action (SSH); an agent cannot reach the VPS. Update this block verbatim
> whenever the apex vhost changes.

The apex vhost was a blanket `redir …{uri} permanent`, so `POST /api/*` 301'd to `www` and
webhook senders dropped delivery. **Matcher scoping is mandatory:** a bare `redir` + `reverse_proxy`
in one block lets `redir` win by directive order and the failure is silent. Use explicit `handle`
blocks so `/api*` proxies and everything else redirects:

```caddy
trafficmena.com {
	# /api* reaches the API so apex-addressed webhooks are never dropped by the apex→www 301.
	handle /api* {
		reverse_proxy 127.0.0.1:3001   # match the www vhost's upstream exactly
	}
	# Everything else still permanently redirects to www.
	handle {
		redir https://www.trafficmena.com{uri} permanent
	}
}
```

Apply sequence (never `restart` — a graceful `reload` keeps in-flight webhooks alive):

```bash
caddy validate --config /etc/caddy/Caddyfile     # must pass before reload
systemctl reload caddy
# Probe pair — /api reaches the handler (400), everything else still 301s to www:
curl -s -o /dev/null -w "api=%{http_code}\n" -X POST \
  https://trafficmena.com/api/payments/webhook_json \
  -H 'Content-Type: application/json' -d '{}'          # expect 400 (INVALID_PAYLOAD)
curl -s -o /dev/null -w "apex=%{http_code}\n" https://trafficmena.com/    # expect 301 → www
```

- [ ] Applied on live: ____-__-__ by ______ (probe pair captured: `api=400`, `apex=301`).

### v3 webhook endpoints & signatures

| Webhook | Path (registered when) | Signature field | StringToSign |
|---|---|---|---|
| Paid/pending | `/api/payments/webhook_json` (§4) | `transactionHashKey` | `TransactionId=…&TransactionKey=…&PaymentMethod=…` |
| Failed | `/api/payments/webhook_failed_json` (§6 T0 / §7 T2) | `hashKey` | same TR shape |
| Cancel | `/api/payments/webhook_cancel` (§6 T0 / §7 T2) | `hashKey` | `referenceId=…&PaymentMethod=…` |
| Refund | `/api/payments/webhook_refund` (§6 T0 / §7 T2) | `hashKey` | `transactionId=…&amount=…&currency=…` |

All four are HMAC-SHA256 keyed with `FAWATERK_API_KEY`, CSRF-exempt, and share the 100/min/IP
throttle. Paid drives fulfillment (re-verified via `getTransactionData`); cancel/failed/refund are
**verify-and-log-only** in v1 (they reject 401 on a missing/invalid signature).

### Dashboard webhook registration status (post-cutover, all four now deployed)

Owner ops (Fawaterk dashboard access is the owner's — an agent cannot register these). All URLs use
the **www** host; register on live and mirror on staging (`https://staging.trafficmena.com/...`).

| Type | Live URL | Registered | Verified (a real/staging delivery logged) |
|---|---|---|---|
| Paid/pending | `https://www.trafficmena.com/api/payments/webhook_json` | ☐ | ☐ |
| Failed | `https://www.trafficmena.com/api/payments/webhook_failed_json` | ☐ | ☐ |
| Cancel | `https://www.trafficmena.com/api/payments/webhook_cancel` | ☐ | ☐ |
| Refund | `https://www.trafficmena.com/api/payments/webhook_refund` | ☐ | ☐ |

Verification = a `[payments/webhook] …` log line for that type (trigger a staging cancel/failed/refund
if none has occurred organically), not merely that the URL is saved in the dashboard.

---

## 5. Reachability smoke (after the v3 build deploys)

```bash
# Reaches the paid handler; unsigned TR/legacy payload → 400 INVALID_PAYLOAD (not 301, not 5xx).
curl -s -X POST "https://www.trafficmena.com/api/payments/webhook_json" \
  -H "Content-Type: application/json" -d '{}'

# Methods (authenticated) return the live v3 list with normalized paymentId + redirect flags.
curl -s "https://www.trafficmena.com/api/payments/methods" -H "Cookie: <admin_session>" | jq .
```

---

## 6. Staging E2E gate (blocks production deploy)

Deploy the branch to `staging.trafficmena.com` (migrate the **separate** staging DB, set staging
OAuth creds), then **register the staging cancel/failed/refund webhook URLs**. Run every gate; any
failure returns to the code. Record evidence in the PR. Gates: methods render; card success (return
URL keeps our `payment_id`, verify confirms, purchase event fires); card failure logged; **webhook
correlation** (`transaction_key === fawaterk_intent_key`, `transactionHashKey` verifies, hash
length/format matches the verifier) + retry-on-404 probe; Fawry code renders on our pending page;
Meeza wallet (local phone format accepted, QR renders); Aman/Masary field shapes captured; `due_date`
now+72h reflected with correct wall-clock; cancel webhook logged; abandoned checkout counts as
`stillPending`; forced reconcile/verify confirm without the webhook; unknown-shape → pending page
action-prompt copy.

---

## 7. Production cutover, void, and canary (strict order)

- [ ] **T1 — Final v2 reconcile (branch by the Phase 0 hypothesis).**
      H2/H3 (v2 API alive): run the sweep on the still-running old build until `errors: 0` — the last
      v2 machine check ever. H1 (v2 dead): export the transaction list from the Fawaterk dashboard,
      manually match pending rows (invoice id / amount / created_at), fulfill confirmed-paid rows via
      the admin enrollment flow, and widen the void watch list to the full incident window.
- [ ] **T2 — Cutover.** Set live `FAWATERK_CLIENT_ID`/`_SECRET` (+ confirm `FAWATERK_API_KEY` /
      `API_BASE_URL`) → run the migration (additive, safe under v2) → deploy/restart onto the v3
      build → register the live cancel/failed/refund webhook URLs → via the dashboard
      Integration-status toggle, disable any direct-dispatch method not verified on staging
      (Aman/Masary if absent); keep card + verified methods on.
- [ ] **T3 — Smoke.** `GET /api/payments/methods` returns the live list; record each `redirect` flag
      (expect Apple Pay present).
- [ ] **T4 — Void (ROLLBACK BOUNDARY).** DB backup confirmed → dry-run → owner sign-off on the
      operator table → apply:
      ```bash
      cd server && tsx -r dotenv/config scripts/void-v2-pending-payments.ts          # dry-run
      cd server && tsx -r dotenv/config scripts/void-v2-pending-payments.ts --apply   # after sign-off
      ```
      Store the table output with the deploy record. Voided rows become `status=failed` (never
      resurrected) and their reservations are released. **From here, rollback needs manual
      reconciliation, not just revert.**
      **Execution record (owner ops — pipe both runs to a file as the audit trail):** the 2026-07-06
      investigation counted **391** stranded rows (`status IN ('pending','expired') AND
      fawaterk_invoice_id IS NOT NULL AND fawaterk_intent_key IS NULL`); expect ≈391 on the dry-run
      and investigate any drift before `--apply`. After apply, record: date ____-__-__, rows voided
      ____, watch-list bucket count ____, stdout captured to ____. Then start the 72h watch window
      (runbook §5).
- [ ] **T5 — Canary.** One card payment end-to-end (webhook + fulfillment + purchase event) and one
      Apple Pay payment from an Apple device; then one canary per re-enabled direct-dispatch method
      staging could not verify (enable → canary → keep on only if it passes). Refund all canaries via
      the dashboard afterward (access revoked manually per §8).
- [ ] **T6 — 48h monitoring.** Checkout error rate; `[payments/webhook]` confirmations vs 4xx;
      reconciliation summaries (`recoveredFromExpired` trending to zero); legacy-tripwire hits (each →
      §8); cancel/failed webhook log volume (feeds the Phase 7 cancel-upgrade decision).

---

## 8. Support protocol (stragglers & tripwire) — R31

Reuses the existing `payment_fulfillment_failures` table and
`docs/runbooks/payment-reliability-operations.md` triage flow — no parallel mechanism.

- A pre-cutover kiosk code paid **after** deploy → Fawaterk charges the customer but the voided row
  won't fulfill. Straggler reports and legacy-tripwire log hits
  (`[payments/webhook] post-cutover legacy webhook, invoice_id=<n> — manual review`) → check the
  Fawaterk dashboard → refund there, or grant access via the admin enrollment flow.
- Voided rows stay visible in admin payments views. The tripwire is removed after 14 consecutive
  silent days (Phase 7).

---

## 9. Troubleshooting (v3)

- **Every payment fails at checkout** → OAuth. Confirm `FAWATERK_CLIENT_ID`/`_SECRET` set and valid;
  logs show `Fawaterk OAuth token request failed: <status>`. Circuit breaker opens after 5 failures
  (auto-resets 30s).
- **Every webhook 401s** → HMAC-secret mismatch. `FAWATERK_API_KEY` must equal the dashboard vendor
  key for the environment (§2 parity check). If the real hash isn't 64-hex, the verifier's length
  check adapts, but confirm the format on staging (§6).
- **Paid but stuck pending** → check webhook delivery (§4 probe returns 400 not 301?), then
  `[payments/webhook] Confirmation processed` in logs. The 15-min reconciliation job is the backstop.
- **Reference code shows but method has no code / no redirect** → undocumented `payment_data` shape;
  the pending page shows the action-prompt state. Capture the shape and extend the lenient parser.
- **Success page can't verify** → Fawaterk stripped our `?payment_id=`; the page shows the
  "confirming your payment" fallback and fulfillment still completes via webhook/reconcile.

### v3 test cards (staging)

| Outcome | Brand | Number | Expiry | CSV |
|---|---|---|---|---|
| Success | Mastercard | 5123450000000008 | 12/26 | 100 |
| Success | Visa | 4005550000000001 | 12/26 | 100 |
| Fail | Visa | 4222000006724235 | 12/26 | 123 |
