# نقطة #5 — بيع تسجيلات الإيفنت المستقل (بدون Track)

**Baseline قبل التعديل:** `be7525e`  
**Commit (يُحدَّث بعد الرفع):** *(محلي — منفَّذ 2026-08-12)*  
**التاريخ:** 2026-08-12

## الهدف

نفس تدفق **إعادة بيع التسجيلات** (نقطة #2) لكن لـ **Meetup/Event standalone** من `/admin/meetups/new` **بدون** ربط بتراك.

| الحالة | السلوك |
|--------|--------|
| إيفنت **غير** مرتبط بتراك | Series خاصة بالإيفنت + بطاقة Publish + By Recordings + `/meetups/:id/recordings` |
| إيفنت **مرتبط** بتراك | **لا تغيير** — يعتمد على Series التراك وإعدادات Track فقط (تسعير الإيفنت المنفصل لا يظهر) |

## تصحيح (2026-08-12)

كان الخطأ: إرجاع `recordings_series` من Series **التراك** على صفحة الإيفنت + بطاقة Publish في admin للإيفنتات المرتبطة بتراك.

**بعد التصحيح:**
- API تفاصيل الإيفنت: `recordings_series = null` إذا كان الإيفنت في تراك.
- Admin edit: بطاقة Publish **فقط** عندما `!trackInfo`.
- EventDetail: سعر/زر By Recordings **فقط** للإيفنت المستقل بعد انتهاء الموعد.


1. عمود `series.event_id` (nullable, unique) — Series واحدة لكل إيفنت مستقل.
2. عند **إنشاء إيفنت** standalone: إنشاء Series + ربط أصل التسجيل الافتراضي (`{title} - Recording`) تلقائياً.
3. عند **إنشاء إيفنت لتراك** (`?trackId=`): **لا** Series للإيفنت — الأصول تُربط بSeries التراك عند الإضافة.
4. عند **إضافة إيفنت لتراك** لاحقاً: حذف Series الإيفنت إن وُجدت (الأصول تبقى وتُربط بSeries التراك).
5. **Prior buyers** للإيفنت المستقل = مسجلون في الإيفент (`event_attendees` active)، وليس حجز تراك.
6. إخفاء Series الإيفنت من `/dashboard/library` حتى **Publish for sale** (مثل التراك).

## خارج النطاق

- بيع أصل library منفصل بدون Series
- تعديل `/recordings` العام في الهيدر
- إيفنتات قديمة بدون أصل تسجيل — يُعالَج بـ backfill في migration

---

## الملفات المتوقَّعة (قائمة التراجع)

### Database
| ملف | التغيير |
|-----|---------|
| `server/drizzle/0026_event_recordings_series.sql` | `series.event_id` + backfill + فهرس unique |
| `server/src/db/schema/index.ts` | `eventId` على `series` |

### Backend
| ملف | التغيير |
|-----|---------|
| `server/src/services/eventRecordingsSeries.ts` | **جديد** — تحميل/enrich Series للإيفنت المستقل |
| `server/src/services/trackRecordingsSeries.ts` | مشترك أو re-export enrich |
| `server/src/routes/api/events.ts` | create + detail + ensure series؛ standalone vs track |
| `server/src/routes/api/tracks.ts` | حذف event series عند add event to track |
| `server/src/routes/api/seriesAccess.ts` | `isSeriesVisibleInMemberLibrary` + prior buyer للإيفنت |
| `server/src/routes/api/series.ts` | فلتر visibility لـ `eventId` |
| `server/src/routes/api/seriesStore.ts` | وصول prior event registration |
| `server/src/routes/api/library.ts` | parent series event context |

### Frontend
| ملف | التغيير |
|-----|---------|
| `src/app/api/events.ts` | `createRecordingsSeries` optional على create |
| `src/features/events/pages/admin/new.tsx` | `createRecordingsSeries: false` عند `trackId` |
| `src/features/events/pages/admin/edit.tsx` | Publish card للإيفنت المستقل |
| `src/features/tracks/components/TrackRecordingsPublishCard.tsx` | نص/invalidation لـ standalone |
| `src/features/events/pages/EventDetail.tsx` | *(إن لزم)* — غالباً يعمل عبر API |

### Tests
| ملف | التغيير |
|-----|---------|
| `tests/unit/series-access.test.ts` | visibility + prior buyer event |

---

## كيف تتراجع عن نقطة #5 فقط؟

```bash
# قبل أي commit: العودة لحالة ما قبل التعديل
git stash
git checkout be7525e -- server/drizzle/0026_event_recordings_series.sql
# أو revert commit نقطة #5 بعد الرفع:
git revert <commit-hash-checkpoint-5>
```

**تحذير DB:** بعد تطبيق migration `0026`، التراجع يتطلب migration عكسية أو `db:reset` في dev.

---

## تسلسل التحقق اليدوي

1. إنشاء meetup من `/admin/meetups/new` **بدون** trackId → Series + أصل في Content tab.
2. Admin edit → بطاقة Publish → سعر + Publish for sale.
3. بعد انتهاء الإيفنت → `/meetups/:id` → سعر Recordings + By Recordings.
4. `/meetups/:id/recordings` → شراء → dashboard series.
5. إيفنت مرتبط بتراك → **لا** بطاقة standalone؛ Publish من Track فقط.
6. `/dashboard/library` — Series مخفية حتى Publish.

## مراجع

- [publish-recordings-after-end.md](./publish-recordings-after-end.md) — نقطة #2
- [recordings-change-checkpoints.md](./recordings-change-checkpoints.md)
