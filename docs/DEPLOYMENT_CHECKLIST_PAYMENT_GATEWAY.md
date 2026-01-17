# Payment Gateway Staging Deployment Checklist

**Branch:** `feat/payment-gateway-mvp`
**Target:** staging.trafficmena.com
**Payment Gateway:** Fawaterk Staging

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
git checkout feat/payment-gateway-mvp
git pull origin feat/payment-gateway-mvp

# 2. Install dependencies
npm install
npm --prefix server install

# 3. Run database migrations
npm --prefix server run db:migrate

# 4. Build and restart server
npm --prefix server run build
# Restart your server process (pm2, systemd, etc.)
```

---

## 3. Configure Platform Settings (Admin UI)

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

## 4. Verify Deployment

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

## 5. Test Payment Flow

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
- Check `FAWATERK_ENV` is `staging`
- Check server logs for Fawaterk API errors

### Payment redirect goes to wrong URL
- Verify `APP_BASE_URL` is set to your staging domain
- Must include `https://`

### CORS errors
- Verify `CORS_ORIGIN` includes your staging frontend URL

### Cannot see subscription price
- Configure platform settings (step 3 above)
- Price must be set before users can subscribe
