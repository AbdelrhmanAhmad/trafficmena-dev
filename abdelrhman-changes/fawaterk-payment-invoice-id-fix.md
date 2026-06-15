# Fawaterk Payment — إصلاح invoice_id و verify الاشتراك

> **Author:** Abdelrhman (via Cursor)  
> **Date:** June 11, 2026  
> **Scope:** إصلاح فشل checkout/verify مع Fawaterk (UUID + شكل جديد لـ `getInvoiceData`) وتفعيل الاشتراك بعد الدفع

---

## الملخص

بعد ربط بوابة Fawaterk (staging/live) ظهرت أخطاء تمنع إتمام الدفع وتفعيل الاشتراك:

| المشكلة | السبب | الحل |
|---------|--------|------|
| `invoice_id: Expected number, received nan` | Live/staging يرجع `invoice_id` كـ **UUID نصي** وليس رقمًا | قبول `string \| number` وتحويله إلى `text` |
| `POST /api/payments/verify` → 500 | `getInvoiceData` يرجع شكلًا جديدًا: `intent_key` بدل `invoice_id` | تحديث Zod schema في `fawaterk.ts` |
| الاشتراك لا يتغير بعد الدفع | verify يفشل → لا يُحدَّث `payments` ولا `subscriptions` | بعد الإصلاح، صفحة النجاح تستدعي verify بنجاح |
| لا redirect بعد الدفع (أحيانًا) | Fawaterk ترجع المستخدم لـ `APP_BASE_URL/payment/success`؛ قد لا تمرّر `invoice_id` | دعم `intent_key` و `InvoiceId` في صفحة النجاح |

---

## قاعدة البيانات

### تغيير نوع العمود

| العمود | قبل | بعد |
|--------|-----|-----|
| `payments.fawaterk_invoice_id` | `integer` | `text` |

### Migration

- **الملف:** `server/drizzle/0017_fawaterk_invoice_id_text.sql`
- **السجل:** `server/drizzle/meta/_journal.json` (إدخال `0017_fawaterk_invoice_id_text`)

```sql
ALTER TABLE "payments" ALTER COLUMN "fawaterk_invoice_id" TYPE text USING "fawaterk_invoice_id"::text;
```

### Schema (Drizzle)

- **الملف:** `server/src/db/schema/index.ts`
- `fawaterkInvoiceId: text('fawaterk_invoice_id')`

### تطبيق الـ migration

```bash
npm --prefix server run db:migrate
```

---

## Backend

### 1. `server/src/services/fawaterk.ts`

**`invoiceRefSchema`** — يقبل رقمًا أو نصًا (UUID) ويُحوّل إلى `string`:

```ts
const invoiceRefSchema = z
  .union([z.number(), z.string()])
  .transform((value) => String(value).trim())
  .refine((value) => value.length > 0 && value !== 'NaN', 'Invalid invoice id');
```

**`invoiceInitPay`** — نوع الإرجاع: `invoiceId: string`

**`getInvoiceData`** — يدعم الشكل الجديد من Fawaterk:

| حقل قديم (staging) | حقل جديد (API حديث) |
|--------------------|---------------------|
| `invoice_id` | `intent_key` |
| `invoice_key` | `intent_key` |
| `invoice_created_at` | `transaction_created_at` |

- `total` و `paid` عبر `z.coerce.number()`
- تسجيل `dataKeys` عند فشل التحقق لتسهيل التشخيص
- `encodeURIComponent` في URL عند جلب بيانات الفاتورة

**`verifyFawaterkWebhook`** — `invoice_id: string | number`

---

### 2. `server/src/routes/api/payments.ts`

- **`invoiceIdSchema`** — نفس منطق `invoiceRefSchema` لـ verify و webhook
- **`verifySchema`** / **`webhookSchema`** — `invoiceId` و `invoice_id` كنص
- **`confirmGatewayInvoicePayment`** — `invoiceId: string`
- **`CheckoutSuccessPayload`** — `invoiceId?: string`

---

### 3. `server/src/jobs/paymentReconciliation.ts`

- نوع `invoiceId` في المرشحين: `string` بدل `number`

---

### 4. `server/src/routes/api/tracks.ts`

- `pendingInvoiceId: string | null` (كان `number | null`)

---

## Frontend

### أنواع API

| الملف | التغيير |
|-------|---------|
| `src/app/api/payments.ts` | `invoiceId`, `fawaterkInvoiceId`, `VerifyPaymentRequest` → `string` |
| `src/app/api/tracks.ts` | `invoiceId: string \| null` |
| `src/app/api/events.ts` | `invoiceId: string \| null` |

### صفحات ومكوّنات الدفع

| الملف | التغيير |
|-------|---------|
| `src/pages/payment/success.tsx` | إزالة `Number(invoiceId)`؛ قراءة `invoice_id` أو `intent_key` أو `InvoiceId` من query |
| `src/pages/payment/pending.tsx` | `invoiceId` كنص؛ التحقق بـ `trim().length` بدل `Number.isNaN` |
| `src/pages/dashboard/Subscribe.tsx` | أنواع `invoiceId` → `string` |
| `src/shared/components/payment/PaymentCheckoutDialog.tsx` | أنواع `invoiceId` → `string` |

---

## تدفق Redirect URL

```
المستخدم يختار NBE (redirect)
        ↓
POST /api/payments/checkout → redirectUrl من Fawaterk
        ↓
window.location.href = redirectUrl  (بوابة الدفع)
        ↓
بعد الدفع → Fawaterk ترجع إلى:
  APP_BASE_URL/payment/success?...
        ↓
صفحة النجاح → POST /api/payments/verify
        ↓
getInvoiceData → paid === 1 → تفعيل الاشتراك
```

**عناوين مُرسَلة لـ Fawaterk** (من `payments.ts`):

| المفتاح | القيمة الافتراضية في `.env` |
|---------|------------------------------|
| `successUrl` | `http://localhost:8080/payment/success?payment_id=<uuid>` |
| `failUrl` | `http://localhost:8080/payment/failed` |
| `pendingUrl` | `http://localhost:8080/payment/pending?...` |
| `webhookUrl` | `http://localhost:3001/api/payments/webhook_json` |

---

## إعدادات `.env` (مهمة)

```env
FAWATERK_API_KEY=<مفتاح من لوحة Fawaterk>
FAWATERK_ENV=staging          # أو live — يجب أن يطابق بيئة المفتاح
APP_BASE_URL=http://localhost:8080
API_BASE_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:8080   # يُفضّل مطابقة منفذ الواجهة (8080 وليس 5173)
```

> **ملاحظة:** مفتاح live يُرفض على `staging.fawaterk.com` والعكس. تأكد من تطابق `FAWATERK_ENV` مع نوع المفتاح.

---

## إعادة التوجيه بعد الدفع (Order / Series)

1. `successUrl` و `failUrl` يتضمنان `payment_id` حتى لو لم يمرّر Fawaterk `invoice_id` في الرابط.
2. قبل فتح بوابة الدفع يُحفظ `{ paymentId, invoiceId }` في `sessionStorage`.
3. صفحة `/payment/success` تجلب الفاتورة من `payment_id` ثم تستدعي `POST /api/payments/verify`.
4. صفحة `/payment/pending` تدعم `item_type=order` وتُفعّل verify تلقائيًا عند العودة.

**إذا لم يحدث redirect من Fawaterk أصلًا:** أضف في لوحة Fawaterk (Integrations) العناوين المسموحة:
- `http://localhost:8080/payment/success`
- `http://localhost:8080/payment/pending`
- `http://localhost:8080/payment/failed`

ثم افتح يدويًا بعد الدفع:
`http://localhost:8080/payment/success?payment_id=<من جدول payments>`

## قيود التطوير المحلي

1. **Webhook** على `localhost:3001` **لا يصل إليه** Fawaterk من الإنترنت — التفعيل يعتمد على:
   - صفحة `/payment/success` + `POST /api/payments/verify`
   - أو job المزامنة `paymentReconciliation` (كل 15 دقيقة)
2. إذا أُغلق تبويب بوابة الدفع قبل إعادة التوجيه، افتح يدويًا:
   ```
   http://localhost:8080/payment/success?invoice_id=<UUID>
   ```
3. تأكد من تفعيل طرق الدفع (NBE، Fawry، …) في لوحة Fawaterk إن كانت `GET /api/payments/methods` فارغة.

---

## أمثلة استجابة Fawaterk (للمرجع)

### `invoiceInitPay` (بعد الإصلاح — UUID)

```json
{
  "status": "success",
  "data": {
    "invoice_id": "9084aed2-4ff0-451f-8ff1-e124fad2ce27",
    "invoice_key": "9084aed2-4ff0-451f-8ff1-e124fad2ce27",
    "payment_data": { "redirectTo": "https://staging.fawaterk.com/ts/..." }
  }
}
```

### `getInvoiceData` (شكل جديد — كان يسبب فشل verify)

```json
{
  "status": "success",
  "data": {
    "intent_key": "2982bfef-2685-4af0-bf1a-3e40354e473d",
    "transaction_id": 330,
    "paid": 1,
    "paid_at": "2026-06-11T11:49:58.000000Z",
    "total": 100,
    "currency": "EGP",
    "payment_method": "Card",
    "transaction_created_at": "2026-06-11T11:49:44.000000Z"
  }
}
```

---

## خطوات التحقق بعد السحب (Pull)

```bash
npm --prefix server run db:migrate
npm --prefix server run dev    # Terminal 1 — المنفذ 3001
npm run dev                    # Terminal 2 — المنفذ 8080
```

1. `GET /api/payments/methods` — يجب أن تظهر طرق الدفع
2. `/dashboard/subscribe` — اختر NBE وأتمم الدفع (بطاقة اختبار Fawaterk)
3. بعد الدفع — يفترض التوجيه لـ `/payment/success` ثم ظهور اشتراك نشط
4. `GET /api/subscriptions/current` — `hasSubscription: true`
5. تحديث الصفحة (F5) إن بقي الكاش قديمًا في React Query

### بطاقة اختبار (staging — من docs)

- الرقم: `5123450000000008`
- الانتهاء: `12/26`
- CVV: `100`

---

## الملفات المعدّلة (قائمة كاملة)

```
server/drizzle/0017_fawaterk_invoice_id_text.sql
server/drizzle/meta/_journal.json
server/src/db/schema/index.ts
server/src/services/fawaterk.ts
server/src/routes/api/payments.ts
server/src/routes/api/tracks.ts
server/src/jobs/paymentReconciliation.ts
src/app/api/payments.ts
src/app/api/tracks.ts
src/app/api/events.ts
src/pages/payment/success.tsx
src/pages/payment/pending.tsx
src/pages/dashboard/Subscribe.tsx
src/shared/components/payment/PaymentCheckoutDialog.tsx
```

---

## أمان

إذا ظهر `FAWATERK_API_KEY` في محادثة أو لقطات شاشة، يُفضّل **تدوير المفتاح** من لوحة Fawaterk.
