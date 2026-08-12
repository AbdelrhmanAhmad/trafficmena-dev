# إخفاء التسعير ونشر البيع من مكتبة الأدمن

**التاريخ:** 2026-08-12  
**السبب:** طلب العميل — الاعتماد على **تسعير ونشر التسجيلات من صفحة Track/Event** (بطاقة Publish recordings) وليس من `/admin/library`.

## ما الذي تغيّر؟

| الصفحة | قبل | بعد |
|--------|-----|-----|
| `/admin/library` (تبويب Series) | سعر + سويتش Sales على البطاقة | محتوى Series فقط (عنوان، عدد الأصول، تعديل/حذف) |
| `/admin/library/series/:id` | Price (EGP) + Sales Enabled في النموذج | حقول المحتوى فقط (عنوان، وصف، صورة، Published، Premium) |

## أين يُدار السعر والنشر الآن؟

- **Track edit** `/admin/library/tracks/:id` → بطاقة **Publish recordings for sale**
- **Event edit** (تابع لتراك) → نفس البطاقة على Series التراك

تحديث Series من مكتبة الأدمن **لا يرسل** `priceInCents` ولا `salesEnabled` — فيبقى ما ضبطه الأدمن من Track/Event دون مسح.

## ملفات

- `src/features/series/components/SeriesForm.tsx`
- `src/features/series/components/SeriesCard.tsx` + `SeriesGrid.tsx` (`hideSalesControls`)
- `src/pages/admin/library.tsx`
- `src/pages/admin/library/series/[id].tsx` + `series/new.tsx`
- `src/features/series/utils/seriesPricing.ts` → `mapSeriesFormToContentPayload`

## مرجع

- [publish-recordings-after-end.md](./publish-recordings-after-end.md) — نقطة #2
