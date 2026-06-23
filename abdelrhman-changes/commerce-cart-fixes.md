# Commerce — إصلاحات السلة وشراء Series

> **Author:** Abdelrhman (via Cursor)  
> **Date:** June 2026 (ضمن جلسات ما قبل `595cfd0` / `f767461`)  
> **Scope:** تمييز الشراء عن منح التتبع، إصلاح السلة، تفريغها بعد الدفع

---

## 1. تمييز «مشترى» عن «منح وصول تتبع»

### المشكلة

- `POST /orders` كان يرفض الشراء إذا وُجد أي سجل في `series_access_grants` — بما في ذلك منح وصول عبر **track booking** وليس شراءً فعليًا.
- الواجهة كانت تخفي زر الشراء أو تعرضه بشكل خاطئ لمن لديه grant بدون purchase.

### الحل

**Backend —** `server/src/routes/api/orders.ts`

- `alreadyOwnedSeries` يعتمد على `getPurchasedSeriesIds()` فقط (جدول المشتريات)، وليس كل الـ grants.

**Backend —** `server/src/routes/api/series.ts`, `seriesStore.ts`

- حقل API جديد: `hasSeriesGrant` — منفصل عن `has_purchased`

**Frontend —** `src/features/series/utils/seriesPricing.ts`

```ts
export function canShowSeriesPurchaseActions(series) {
  if (series.has_purchased || series.has_series_grant) return false;
  return isSeriesPurchasable(series);
}
```

يُستخدم في: `SeriesBuyActions`, `SeriesCard`, `DashboardSeriesDetail`

---

## 2. إصلاح `seriesIds: [null]` وعدم إضافة عدة Series

### المشكلة

- `SeriesBuyActions` كان يستخدم `useSeriesCart()` لكن يمرّر `seriesToCartItem()` الذي يكتب `seriesId` غير معرّف في الـ context الموحّد → `seriesIds: [null]` عند الـ checkout.
- إضافة أكثر من Series للسلة كانت تفشل.

### الحل

**الملف:** `src/features/series/components/SeriesBuyActions.tsx`

- التحويل إلى `useCommerceCart()` + `seriesToCartItem()` الصحيح

**الملف:** `src/features/series/context/SeriesCartContext.tsx`

- تنظيف (sanitize) العناصر غير الصالحة من `localStorage` عند التحميل

**الملف:** `src/pages/SeriesCart.tsx`

- فلترة IDs صالحة قبل إنشاء الطلب

---

## 3. تفريغ السلة بعد الدفع

### المشكلة

- `clearCart()` كان يُستدعى فقط عند checkout مجاني في `PaymentCheckoutDialog`.
- بعد دفع Fawaterk ناجح تبقى السلة في `localStorage`.

### الحل

**الملف:** `src/features/series/context/SeriesCartContext.tsx`

```ts
export function clearCommerceCartStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(COMMERCE_CART_CLEARED_EVENT));
}
```

**يُستدعى من:**

- `src/pages/payment/success.tsx` — عند `itemType === 'order'`
- `src/pages/payment/pending.tsx` — عند تأكيد الدفع لطلب commerce

---

## ملفات ذات صلة

```
server/src/routes/api/orders.ts
server/src/routes/api/series.ts
server/src/routes/api/seriesStore.ts
src/app/api/series.ts
src/features/series/utils/seriesPricing.ts
src/features/series/components/SeriesBuyActions.tsx
src/features/series/components/SeriesCard.tsx
src/pages/DashboardSeriesDetail.tsx
src/features/series/context/SeriesCartContext.tsx
src/pages/SeriesCart.tsx
src/pages/payment/success.tsx
src/pages/payment/pending.tsx
```

---

## اختبار يدوي

1. مستخدم لديه track booking لسلسلة **بدون** شراء → يستطيع الشراء من صفحة Series
2. أضف سلسلتين للسلة → checkout → `seriesIds` بدون `null`
3. بعد دفع ناجح → السلة فارغة عند إعادة فتح `/series/cart`
