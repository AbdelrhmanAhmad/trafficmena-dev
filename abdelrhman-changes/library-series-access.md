# Library — وصول عبر Series المشتراة + تنقل الرجوع

> **Author:** Abdelrhman (via Cursor)  
> **Date:** June 15, 2026  
> **Commit:** `595cfd0`  
> **Scope:** فتح محتوى المكتبة من Series بعد الشراء + زر رجوع صحيح للسلسلة

---

## المشكلة

1. عضو اشترى **Recording Series** لكن عند فتح asset من داخل السلسلة كان يظهر **PremiumContentGate** أو يُرفض الوصول رغم الشراء.
2. السبب: التحقق من `series_access_grants` كان محدودًا أو لا يغطي كل assets في الصفحة.
3. زر الرجوع من تفاصيل الـ asset كان يوجّه لمسارات خاطئة (`/dashboard/events` بدل meetups) أو لا يعيد للسلسلة.

---

## الحل (Backend)

**الملف:** `server/src/routes/api/library.ts`

- عند جلب asset واحد (`GET /library/:id`): التحقق من وصول Series عبر:
  - **Track booking** على الحدث المرتبط
  - **Series access grant** (شراء أو منح يدوي)
- لم يعد القيد على premium فقط — أي asset مرتبط بـ Series يُفحص grant/booking
- في قائمة المكتبة: جمع IDs لكل assets في الصفحة والبحث عن grants دفعة واحدة

---

## الحل (Frontend)

**الملف:** `src/pages/LibraryItemDetail.tsx`

- `resolveLibrarySeriesContext(location.state)` — إذا فُتح الـ asset من صفحة Series يُمرَّر `seriesContext` في `navigate` state
- زر الرجوع:
  - مع `seriesContext` → `/dashboard/library/series/:seriesId` (**Back to Series**)
  - بدون → `/dashboard/library` (**Back to Library**)
- روابط الأحداث: `/meetups/:eventId` و `/dashboard/meetups` (وليس `/dashboard/events`)

**الملف:** `src/pages/DashboardSeriesDetail.tsx`

- عند فتح asset من السلسلة يُمرَّر:

```ts
navigate(`/dashboard/library/${asset.id}`, {
  state: {
    seriesContext: { id: series.id, title: series.title },
  },
});
```

---

## اختبار يدوي

1. اشترِ Series فيها تسجيلات في المكتبة
2. افتح السلسلة → اضغط على recording — يفتح بدون gate
3. اضغط **Back to Series** — يعود لصفحة السلسلة وليس المكتبة العامة

---

## ملفات معدّلة

```
server/src/routes/api/library.ts
src/pages/LibraryItemDetail.tsx
src/pages/DashboardSeriesDetail.tsx  (تمرير seriesContext — إن وُجد في نفس الفترة)
```
