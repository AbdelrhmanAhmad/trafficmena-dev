# Recordings داخل Event / Track + Publish للبيع

> **Implementation:** 2026-08-04

## مطلب العميل (المثبت)

1. **صفحة `/recordings` تبقى.**
2. **مش كل أيفنت/تراك منتهي** يعرض تسجيلاته للبيع — **فقط** بعد زرار **Publish for sale** من الأدمن.
3. **البيع = شراء تسجيلات** عبر `/recordings` (Series commerce) — **بدون** تمديد نافذة حجز التراك اللايف.
4. الحاجزون/الحضور يقدروا يفتحوا تسجيلاتهم من زرار **Recordings** جوه Track/Event.

## زر × زر (للعميل)

| وين | الزر / الأكشن | النتيجة |
|-----|----------------|---------|
| أدمن → Edit Track | **Publish for sale** + سعر EGP | يظهر في `/recordings` للشراء |
| أدمن → Edit Track | **Manage recording assets** | يفتح Series لإدارة الملفات |
| أدمن → Edit Track | إيقاف Publish | يختفي من `/recordings` |
| `/recordings` | شراء | سلة Series → وصول دائم للتسجيلات |
| `/tracks/:id` أو `/meetups/:id` (حاجز/حضور) | **Recordings** | يشوف التسجيلات المرتبطة |

## شروط الظهور في `/recordings` (موجودة مسبقًا)

`isPublished` + `salesEnabled` + سعر > 0 + أصل واحد على الأقل (`isSeriesSellable`).

## ما اتعمل في الكود

### أدمن — Publish على التراك

- API: `GET /api/tracks/:id` يرجّع `recordingsSeries` (id, sales, price, assetCount)
- UI: [`TrackRecordingsPublishCard`](../src/features/tracks/components/TrackRecordingsPublishCard.tsx) في [`admin/library/tracks/[id].tsx`](../src/pages/admin/library/tracks/[id].tsx)
- التفعيل يستدعي `PUT /api/series/:id` بـ `salesEnabled: true`, `isPublished: true`, `priceInCents`
- **لا يمس** `track_booking_start/end`

### زرار Recordings للحاجزين (سابق)

- `TrackDetail` / `EventDetail` → `/dashboard/library/series/:id`
- حضور event في التراك يفتح صلاحية Series (`hasTrackEventAttendance`) للمشاهدة الخاصة — **مش** للظهور في الكتالوج العام

## خارج النطاق

- تمديد نافذة حجز Track
- Publish تلقائي لكل الأيفنتات المنتهية
- إزالة `/recordings`
