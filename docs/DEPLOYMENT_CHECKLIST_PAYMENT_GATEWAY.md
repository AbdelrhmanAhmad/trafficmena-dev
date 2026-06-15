# Payment Gateway Deployment Checklist

**Branch:** `main` (merged from `feat/payment-gateway-mvp`)
**Target:** staging.trafficmena.com / trafficmena.com
**Payment Gateway:** Fawaterk

---

## 1. Environment Variables

Add these to your staging server's `.env` file:

```bash
# Fawaterk Payment Gateway - STAGING
FAWATERK_API_KEY=your_staging_api_key_here   # Get from Fawaterk staging dashboard
FAWATERK_ENV=staging

# Your staging domain (for payment redirects)
APP_BASE_URL=https://staging.trafficmena.com

# API base URL for webhook callbacks (optional, defaults to same as APP_BASE_URL)
# Set this if your API runs on a different domain than your frontend
API_BASE_URL=https://staging.trafficmena.com

# CORS - include your staging frontend
CORS_ORIGIN=https://staging.trafficmena.com
```

### Where to Get Your Fawaterk Staging API Key

1. Go to https://staging.fawaterk.com
2. Login to your merchant account
3. Navigate to **Settings** → **API Keys**
4. Copy your staging API key

---

## 2. Deploy Steps

```bash
# 1. Pull the code
git checkout main
git pull origin main

# 2. Install dependencies
npm install
npm --prefix server install

# 3. Run database migrations (includes payment tables)
npm --prefix server run db:migrate

# 4. Build and restart server
npm --prefix server run build
# Restart your server process (pm2, systemd, etc.)
```

### Database Migrations Applied

The payment gateway includes these migrations:
- `0016_payment_gateway_security_fixes.sql` - Core payment tables
- `0019_payment_reservations.sql` - Capacity reservation system

---

## 3. Configure Fawaterk Webhook (CRITICAL)

The webhook is how Fawaterk notifies your server when a payment is completed. **Without this, payments will stay in "pending" status forever.**

### Webhook Endpoint

Your server exposes two equivalent webhook endpoints (Fawaterk sends to both):

| Endpoint | URL |
|----------|-----|
| Primary | `https://your-domain.com/api/payments/webhook` |
| Alternative | `https://your-domain.com/api/payments/webhook_json` |

### Configure in Fawaterk Dashboard

1. **Staging:** Go to https://staging.fawaterk.com
   **Production:** Go to https://app.fawaterk.com

2. Login to your merchant account

3. Navigate to **Settings** → **Webhooks** (or **API Settings**)

4. Set the webhook URL:
   - **Staging:** `https://staging.trafficmena.com/api/payments/webhook`
   - **Production:** `https://trafficmena.com/api/payments/webhook`

5. Enable webhook notifications for payment events

6. **Save** the settings

### Webhook Security

The webhook is secured by:
- **HMAC-SHA256 signature verification** - Fawaterk signs each webhook using your API key
- **Invoice key double-check** - The invoice key must match what was stored during checkout
- **Rate limiting** - 100 webhooks/minute per IP to prevent DoS
- **Timing-safe comparison** - Prevents timing attacks on signature verification

### Webhook Payload Format

Fawaterk sends this JSON payload:

```json
{
  "invoice_id": 12345,
  "invoice_key": "abc123xyz",
  "payment_method": "Visa-Mastercard",
  "hashKey": "hmac_sha256_signature_here"
}
```

### Test Webhook Manually

```bash
# This will fail signature verification (expected) but confirms endpoint is reachable
curl -X POST "https://staging.trafficmena.com/api/payments/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": 1,
    "invoice_key": "test",
    "payment_method": "test",
    "hashKey": "invalid"
  }'

# Expected response (401 - invalid signature is correct behavior):
# {"error":{"code":"INVALID_SIGNATURE"}}
```

### Verify Webhook is Working

After a test payment:

1. Check server logs for `[payments/webhook]` entries
2. Payment status should change from `pending` to `paid`
3. User should receive their subscription/event access

Note: The subscription record is created during payment fulfillment (when `itemType=subscription`) inside `server/src/routes/api/payments.ts` after webhook/verify succeeds.

---

## 4. Configure Platform Settings (Admin UI)

After deployment, login as admin and configure subscription pricing:

1. Go to **Admin** → **Settings**
2. Set **Annual Subscription Price**: Enter price in EGP (e.g., `999` for 999 EGP)
3. Set **Subscriber Discount**: Enter discount percentage (e.g., `20` for 20% off events)
4. Click **Save**

**OR via API:**

```bash
curl -X PUT "https://staging.trafficmena.com/api/settings" \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_session=<admin_session>" \
  -d '{
    "annualSubscriptionPriceCents": 99900,
    "subscriberDiscountPercent": 20
  }'
```

---

## 5. Verify Deployment

### Check Payment Methods Load

```bash
# Should return Fawaterk payment methods
curl -s "https://staging.trafficmena.com/api/payments/methods" \
  -H "Cookie: auth_session=<your_session>" | jq .
```

**Expected Response:**
```json
{
  "data": [
    { "paymentId": 2, "name_en": "Visa-Mastercard", ... },
    { "paymentId": 3, "name_en": "Fawry", ... },
    { "paymentId": 4, "name_en": "MobileWallets", ... }
  ]
}
```

### Check Subscription Info

```bash
curl -s "https://staging.trafficmena.com/api/subscriptions/info" | jq .
```

**Expected Response:**
```json
{
  "priceEgp": 999,
  "discountPercent": 20,
  "benefits": [...]
}
```

---

## 6. Test Payment Flow

### Test Cards (Fawaterk Staging Only)

| Scenario | Card Number | Holder | Expiry | CVV |
|----------|-------------|--------|--------|-----|
| **Success** | `5123450000000008` | `Fawaterak test` | `12/26` | `100` |
| **Failure** | `5543474002249996` | `Fawaterak test` | `05/21` | `123` |

### Test Subscription Purchase

1. Login as regular user
2. Go to `/subscribe`
3. Select Visa-Mastercard payment
4. Click "Subscribe Now"
5. On Fawaterk page, use **Success test card** above
6. Complete payment
7. Should redirect to `/payment/success`
8. Verify subscription active in profile

### Test Event Payment (if event has price)

1. Admin: Create event with price (e.g., 100 EGP = 10000 cents)
2. User: View event detail
3. Click Register → should show payment flow
4. Complete with test card
5. Verify registration in event attendees

---

## Quick Reference

### Fawaterk Environments

| Environment | API Base URL | Test Cards |
|-------------|--------------|------------|
| **Staging** | `https://staging.fawaterk.com/api/v2` | Work |
| **Live** | `https://app.fawaterk.com/api/v2` | Real cards only |

### Environment Variable Summary

| Variable | Staging Value | Production Value |
|----------|---------------|------------------|
| `FAWATERK_API_KEY` | Staging key from Fawaterk | Live key from Fawaterk |
| `FAWATERK_ENV` | `staging` | `live` |
| `APP_BASE_URL` | `https://staging.trafficmena.com` | `https://trafficmena.com` |
| `API_BASE_URL` | `https://staging.trafficmena.com` | `https://trafficmena.com` |

---

## Troubleshooting

### "Payment service temporarily unavailable"
- Check `FAWATERK_API_KEY` is set correctly
- Check `FAWATERK_ENV` is `staging` or `live`
- Check server logs for Fawaterk API errors
- Circuit breaker may be open after 5 consecutive failures (auto-resets after 30s)

### Payment redirect goes to wrong URL
- Verify `APP_BASE_URL` is set to your staging/production domain
- Must include `https://`

### CORS errors
- Verify `CORS_ORIGIN` includes your frontend URL

### Cannot see subscription price
- Configure platform settings (step 4 above)
- Price must be set before users can subscribe

### Payment stays in "pending" status (WEBHOOK ISSUE)
This is the most common issue. Check:

1. **Webhook URL configured in Fawaterk dashboard?**
   - Go to Fawaterk Settings → Webhooks
   - URL must be: `https://your-domain.com/api/payments/webhook`

2. **Webhook endpoint reachable?**
   ```bash
   curl -X POST "https://your-domain.com/api/payments/webhook" \
     -H "Content-Type: application/json" \
     -d '{"invoice_id":1,"invoice_key":"test","payment_method":"test","hashKey":"test"}'
   ```
   - Should return `{"error":{"code":"INVALID_SIGNATURE"}}` (401)
   - If connection refused/timeout, check firewall/nginx

3. **Check server logs:**
   ```bash
   grep "payments/webhook" /var/log/your-app.log
   ```
   - Look for `Invalid signature` → Webhook is reaching server, signature issue
   - Look for `Payment not found` → Invoice ID doesn't match any pending payment
   - No logs? → Webhook not reaching server

4. **API key mismatch?**
   - The same API key must be used for:
     - Creating the invoice (`invoiceInitPay`)
     - Verifying the webhook signature
   - If you rotated keys, pending payments from old key won't verify

### Webhook returns 401 "INVALID_SIGNATURE"
- Ensure `FAWATERK_API_KEY` in your server matches the key in Fawaterk dashboard
- The API key is used as the HMAC secret for webhook signatures
- Don't confuse staging and production keys

### Non-redirect payment methods (Fawry, Aman, Masary)
These payment methods return a **code** instead of redirecting:

1. User receives a code (e.g., Fawry reference number)
2. User pays at any Fawry outlet using the code
3. Fawaterk sends webhook when payment is confirmed
4. **Webhook is critical** - without it, payment never completes

### Rate limit errors (429)
Rate limits by endpoint:
- `/payments/checkout`: 5/min per user
- `/payments/webhook`: 100/min per IP
- `/payments/verify`: 30/min per user

If hitting limits in production, check for:
- Duplicate webhook sends from Fawaterk
- Bot traffic
- Stuck payment loops in frontend
