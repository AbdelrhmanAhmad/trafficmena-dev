# Fawaterk Payment Gateway Setup Snapshot

**Date:** 2026-01-04
**Environment:** Staging (`staging.fawaterk.com`)
**Status:** ✅ Ready for Implementation

---

## Environment Configuration

### Server Environment Variables (`server/.env`)

```bash
# Fawaterk Payment Gateway (Staging)
FAWATERK_API_KEY=your_api_key_here  # Get from Fawaterk dashboard
FAWATERK_ENV=staging
APP_BASE_URL=http://localhost:8080
API_BASE_URL=http://localhost:3001
```

### Zod Schema (`server/src/config/env.ts`)

```typescript
// Fawaterk Payment Gateway
FAWATERK_API_KEY: z.string().optional(),
FAWATERK_ENV: z.enum(['staging', 'live']).optional().default('staging'),
```

---

## API Test Results

**Endpoint:** `GET https://staging.fawaterk.com/api/v2/getPaymentmethods`

**Response:** ✅ SUCCESS

```json
{
  "status": "success",
  "data": [
    {
      "paymentId": 2,
      "name_en": "Visa-Mastercard",
      "name_ar": "فيزا-ماستركارد",
      "redirect": "true"
    },
    {
      "paymentId": 3,
      "name_en": "Fawry",
      "name_ar": "فوري",
      "redirect": "false"
    },
    {
      "paymentId": 4,
      "name_en": "MobileWallets",
      "name_ar": "المحافظ الالكترونية",
      "redirect": "false"
    }
  ]
}
```

---

## Available Payment Methods

| Payment ID | Method | Redirect Required | Use Case |
|------------|--------|-------------------|----------|
| 2 | Visa-Mastercard | Yes | Card payments |
| 3 | Fawry | No | Cash at retail stores |
| 4 | MobileWallets | No | Vodafone Cash, etc. |

---

## Payment Verification Approach

**Chosen:** Webhooks (with manual verify fallback)

**Flow:**
1. Checkout sends `webhookUrl` to Fawaterk (`{API_BASE_URL}/api/payments/webhook_json`)
2. Fawaterk sends a paid callback when the invoice is settled
3. Backend verifies the HMAC and fulfills the purchase
4. Pending page still offers `POST /api/payments/verify` for manual checks

**Why Webhooks:**
- Prevents payments from being stuck in `pending`
- Works for non-redirect methods (Fawry/Aman/Masary/Meeza/MobileWallets)
- Keeps fulfillment server-to-server without relying on the client

---

## Webhook Dashboard Fields

Set the following in the Fawaterk Integrations screen:

- **Paid transactions webhook:** `{API_BASE_URL}/api/payments/webhook_json`
- **Cancellation webhook (Fawry/Aman/Masary):** leave blank for MVP
- **Failed transactions webhook:** leave blank for MVP

## HMAC Verification Format

Per Fawaterk documentation:

```typescript
const queryParam = `InvoiceId=${invoice_id}&InvoiceKey=${invoice_key}&PaymentMethod=${payment_method}`;
const expectedHash = crypto
  .createHmac('sha256', FAWATERK_API_KEY)  // Uses API Key as secret
  .update(queryParam)
  .digest('hex');
```

---

## Test Cards

**Successful Payment:**
- Card: `5123450000000008`
- Holder: `Fawaterak test`
- Expiry: `12/26`
- CVV: `100`

**Failed Payment:**
- Card: `5543474002249996`
- Holder: `Fawaterak test`
- Expiry: `05/21`
- CVV: `123`

---

## Files Modified

| File | Status |
|------|--------|
| `server/.env` | ✅ Configured |
| `server/src/config/env.ts` | ✅ Configured |
| `plans/payment-gateway-mvp-v2.md` | ✅ Updated with fixes |

---

## Next Steps

1. Create `payments` database table (DB001)
2. Implement `fawaterk.ts` service (BE001)
3. Implement payment routes (BE002-BE007)
4. Build frontend payment flow (FE001-FE003)
