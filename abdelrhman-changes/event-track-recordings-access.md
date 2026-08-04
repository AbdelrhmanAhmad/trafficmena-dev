# Recordings داخل Event / Track

> **Checkpoint + implementation:** 2026-08-04  
> **حالة:** منفّذ ومرّ على GitHub

## الاتفاق مع العميل

1. **صفحة `/recordings` تبقى** — كتالوج Series العام للزوار/البيع.
2. **التسجيلات مرتبطة بالـ Track** (Series تلقائي `series.trackId`) وتظهر أيضًا عبر زرار **Recordings** داخل:
   - صفحة الـ Track (`/tracks/:id`)
   - صفحة الـ Event / Meetup (`/meetups/:id`)
3. **من يشوف التسجيلات:** من حجز الـ Track، أو سجّل/حضر أي Event تابع لنفس الـ Track، أو لديه شراء/منح Series.
4. **التراكات القديمة:** عند إعادة publish + فتح نافذة الحجز، الشراء = كورس مسجّل (وصول للتسجيلات) — عملية أدمن؛ الكود يضمن الوصول بعد الحجز/الحضور.

## نموذج البيانات (بدون schema جديد)

```
Track ──1:1──► Series (auto: "{title} Recordings", series.trackId)
  │
  └─ track_events ──► Event
                         │
                         └─ library_assets.eventId ──► series_assets ──► Series
```

## ما تم تنفيذه

### صلاحية الوصول

[`server/src/routes/api/seriesAccess.ts`](../server/src/routes/api/seriesAccess.ts)

- حقل جديد: `hasTrackEventAttendance`
- `resolveSeriesAccess` / `resolveSeriesAssetAccess` يفتحان الـ Series عند حضور أي event في `track_events` لنفس `series.trackId`
- مربوط في `series.ts` و `seriesStore.ts`

اختبارات: [`tests/unit/series-access.test.ts`](../tests/unit/series-access.test.ts)

### API — `recordingsSeriesId`

| Endpoint | التغيير |
|----------|---------|
| `GET /api/tracks/:id/public` | `track.recordingsSeriesId` |
| `GET /api/events/:id` | `recordingsSeriesId` + داخل `trackInfo` |

فرونت: [`src/app/api/tracks.ts`](../src/app/api/tracks.ts)، [`src/app/api/events.ts`](../src/app/api/events.ts)

### UI — زرار Recordings

| صفحة | متى يظهر | الوجهة |
|------|----------|--------|
| `TrackDetail.tsx` | enrolled + يوجد series | `/dashboard/library/series/:id` |
| `EventDetail.tsx` | attending أو track booked (أو staff) + يوجد series | نفس المسار |

`/recordings` لم تُمس.

## أدمن — تراكات قديمة

1. Publish الـ Track
2. إعادة فتح `track_booking_end` إن كانت نافذة الحجز مغلقة
3. بعد الشراء/الحجز يظهر زرار Recordings ويفتح الـ Series المرتبطة

## خارج النطاق

- إزالة `/recordings`
- ربط Series يدويًا بـ Event منفصل عن Track
- تغيير Module Settings أو بوابة الدفع
