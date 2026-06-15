# Series Pricing & Sales Toggle

> **Author:** Abdelrhman (via Cursor)  
> **Date:** June 10, 2026  
> **Scope:** إضافة سعر لكل Series + زر تفعيل/إيقاف البيع + عرض السعر في الأدمن ونطاق الزوار

---

## الملخص

تمت إضافة إمكانية تحديد **سعر** لكل Series وتفعيل/إيقاف **البيع** (`sales_enabled`). السعر يظهر في:

- لوحة التحكم (إنشاء، تعديل، قائمة Series)
- صفحة الترحيب للزوار/الأعضاء (`WelcomeDashboard`)
- بطاقات المكتبة وتفاصيل Series

> **خارج النطاق الحالي:** ربط Series ببوابة الدفع (Fawaterk checkout). التعديل الحالي يعرض السعر ويدير حالة البيع فقط.

---

## قاعدة البيانات

### حقول جديدة في جدول `series`

| العمود | النوع | الافتراضي | الوصف |
|--------|------|-----------|--------|
| `price_in_cents` | `integer` | `NULL` | السعر بالقروش (مثل `tracks` و `events`) |
| `sales_enabled` | `boolean` | `false` | هل البيع مفعّل ويُعرض السعر للجمهور |

### Migration

- **الملف:** `server/drizzle/0016_series_sales_pricing.sql`
- **السجل:** `server/drizzle/meta/_journal.json` (إدخال `0016_series_sales_pricing`)

```sql
ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "price_in_cents" integer;
ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "sales_enabled" boolean DEFAULT false NOT NULL;
```

### تطبيق الـ migration

```bash
npm --prefix server run db:migrate
```

### Schema (Drizzle)

- **الملف:** `server/src/db/schema/index.ts`
- إضافة `priceInCents` و `salesEnabled` في تعريف جدول `series`

---

## Backend (API)

### الملف: `server/src/routes/api/series.ts`

**تغييرات:**

1. إضافة `priceInCentsSchema` (0 – 10,000,000 قروش، أو `null`)
2. توسيع `createSeriesSchema` و `updateSeriesSchema`:
   - `priceInCents`
   - `salesEnabled`
3. إرجاع الحقلين في:
   - `GET /api/series` (قائمة)
   - `GET /api/series/:id` (تفاصيل)
4. حفظ الحقلين في `POST /api/series` و `PUT /api/series/:id`

**مثال payload:**

```json
{
  "title": "Performance Marketing Series",
  "priceInCents": 150000,
  "salesEnabled": true,
  "isPublished": true,
  "isPremium": false
}
```

---

## Frontend

### طبقة API

**الملف:** `src/app/api/series.ts`

- إضافة `priceInCents` / `salesEnabled` في `ApiSeries`
- إضافة `price_in_cents` / `sales_enabled` في `SeriesRecord`
- تحديث `mapSeries` و `CreateSeriesPayload` / `UpdateSeriesPayload`

### أدوات مساعدة (جديد)

**الملف:** `src/features/series/utils/seriesPricing.ts`

| الدالة | الغرض |
|--------|--------|
| `formatSeriesPriceLabel()` | تنسيق السعر للعرض (`Free` أو `150 EGP`) |
| `shouldShowSeriesPrice()` | هل يُعرض السعر (زائر vs أدمن) |
| `mapSeriesFormToPayload()` | تحويل `priceEgp` من النموذج إلى `priceInCents` للـ API |

**قواعد العرض:**

- **زائر / عضو:** السعر يظهر فقط إذا `sales_enabled === true`
- **أدمن:** يظهر السعر أو badge `Sales off` حتى لو البيع موقوف

### مكوّنات جديدة

**الملف:** `src/features/series/components/SeriesPriceBadge.tsx`

- Badge لعرض السعر أو `Sales off` (للأدمن)

### نموذج Series (أدمن)

**الملف:** `src/features/series/components/SeriesForm.tsx`

- حقل **Price (EGP)** (`priceEgp`)
- مفتاح **Sales Enabled** (`salesEnabled`)

### بطاقة Series

**الملف:** `src/features/series/components/SeriesCard.tsx`

- عرض `SeriesPriceBadge`
- مفتاح **Sales** سريع على البطاقة (عند `canManage` + `onSalesToggle`)

### شبكة Series

**الملف:** `src/features/series/components/SeriesGrid.tsx`

- تمرير `onSalesToggle` و `isSalesTogglePending` إلى `SeriesCard`

### صفحات الأدمن

| الملف | التعديل |
|-------|---------|
| `src/pages/admin/library/series/new.tsx` | استخدام `mapSeriesFormToPayload` عند الإنشاء |
| `src/pages/admin/library/series/[id].tsx` | استخدام `mapSeriesFormToPayload` عند التحديث |
| `src/pages/admin/library.tsx` | تفعيل/إيقاف البيع السريع عبر `useUpdateSeries` |

### صفحات الزوار / الأعضاء

| الملف | التعديل |
|-------|---------|
| `src/pages/WelcomeDashboard.tsx` | `SeriesPriceBadge` في قسم Series |
| `src/pages/DashboardSeriesDetail.tsx` | `SeriesPriceBadge` في هيدر التفاصيل |

---

## اختبارات

**الملف:** `tests/unit/series-pricing.test.ts`

```bash
npm run test:unit -- tests/unit/series-pricing.test.ts
```

يغطي:

- تنسيق السعر
- منطق `shouldShowSeriesPrice`
- تحويل النموذج إلى payload

---

## قائمة الملفات المتأثرة

### جديد

```
abdelrhman-changes/series-pricing-and-sales.md
server/drizzle/0016_series_sales_pricing.sql
src/features/series/utils/seriesPricing.ts
src/features/series/components/SeriesPriceBadge.tsx
tests/unit/series-pricing.test.ts
```

### معدّل

```
server/src/db/schema/index.ts
server/src/routes/api/series.ts
server/drizzle/meta/_journal.json
src/app/api/series.ts
src/features/series/components/SeriesForm.tsx
src/features/series/components/SeriesCard.tsx
src/features/series/components/SeriesGrid.tsx
src/pages/admin/library.tsx
src/pages/admin/library/series/new.tsx
src/pages/admin/library/series/[id].tsx
src/pages/WelcomeDashboard.tsx
src/pages/DashboardSeriesDetail.tsx
```

---

## إصلاح إضافي (جلسة سابقة): Drizzle Studio على Windows

**المشكلة:** `npm --prefix server run db:studio` كان يفشل بـ `No schema files found` على Windows.

**الحل:** تعديل `server/drizzle.config.ts`:

```ts
// قبل
schema: resolve(currentDir, 'src/db/schema'),

// بعد
schema: './src/db/schema/index.ts',
```

**السبب:** `drizzle-kit studio` لا يتعامل جيداً مع المسار المطلق على Windows.

---

## طريقة الاستخدام (للأدمن)

1. ادخل `/admin/library` → تبويب **Series**
2. أنشئ أو عدّل Series
3. أدخل **Price (EGP)** (مثلاً `150` = 150 جنيه)
4. فعّل **Sales Enabled**
5. احفظ — أو استخدم مفتاح **Sales** على البطاقة للتبديل السريع

---

## خطوات التحقق بعد السحب (Pull)

```bash
npm --prefix server run db:migrate
npm --prefix server run dev    # Terminal 1
npm run dev                    # Terminal 2
```

ثم:

1. `/admin/library?tab=series` — تحقق من السعر ومفتاح Sales
2. `/dashboard` — تحقق من ظهور السعر في قسم Series (للـ Series التي `sales_enabled = true`)
