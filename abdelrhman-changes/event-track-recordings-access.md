# Recordings داخل Event / Track (مرجع اتفاق)

> **Checkpoint:** اتفاق المنتج قبل التنفيذ — 2026-08-04  
> **حالة:** مخطط للتنفيذ (انظر قسم التنفيذ أدناه بعد الشحن)

## الاتفاق مع العميل

1. **صفحة `/recordings` تبقى** — كتالوج Series العام للزوار/البيع. جملة «نشيلها» كانت سوء توضيح.
2. **التسجيلات مرتبطة بالـ Track** (Series تلقائي `series.trackId`) وتظهر أيضًا عبر زرار **Recordings** داخل:
   - صفحة الـ Track (`/tracks/:id`)
   - صفحة الـ Event / Meetup (`/meetups/:id`)
3. **من يشوف التسجيلات:** من حجز الـ Track، أو سجّل/حضر أي Event تابع لنفس الـ Track، أو لديه شراء/منح Series.
4. **التراكات القديمة:** عند إعادة publish + فتح نافذة الحجز، الشراء = كورس مسجّل (وصول للتسجيلات) — عملية أدمن + ضمان الوصول بعد الحجز في الكود.

## نموذج البيانات الحالي (بدون schema جديد)

```
Track ──1:1──► Series (auto: "{title} Recordings", series.trackId)
  │
  └─ track_events ──► Event
                         │
                         └─ library_assets.eventId ──► series_assets ──► Series
```

- إنشاء Track ينشئ Series تلقائيًا.
- `resolveSeriesAccess` يفتح الـ Series عند `hasTrackBooking` (وgrant/اشتراك/staff).

## خارج النطاق

- إزالة `/recordings`
- ربط Series يدويًا بـ Event منفصل عن Track
- تغيير Module Settings أو بوابة الدفع

## التنفيذ (يُحدَّث بعد الشحن)

- توسيع `resolveSeriesAccess`: حضور أي event في track الـ Series
- API: `recordingsSeriesId` على track public + event detail
- UI: زرار Recordings في `TrackDetail` و `EventDetail`
