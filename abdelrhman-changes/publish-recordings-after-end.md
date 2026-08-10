# Checkpoint #2 — نشر التسجيلات بعد انتهاء Track/Event

**Commit tag (عند الرفع):** `checkpoint-recordings-2` (`dd37934`)  
**يعتمد على:** نقطة #1 (`b93ce08`)

## القرار

بعد انتهاء نافذة حجز الـ Track أو انتهاء الـ Event، الأدمن ينشر **حزمة التسجيلات** (Series المرتبطة بالتراك) للبيع من لوحة التعديل. الزائر يرى زر **Available recordings** يفتح صفحة شراء شبيهة بـ dashboard series — **بدون** إعادة `/recordings` للهيدر.

## السلوك

| السطح | ماذا يحدث |
|--------|-----------|
| Admin Track `/admin/library/tracks/:id` | بطاقة Publish: سعر + سياسة وصول + سويتش نشر |
| Admin Event (تابع لتراك له Series) | نفس البطاقة تحدّث **نفس** Series التراك |
| Track عام بعد `Booking period has ended` | إن Series قابلة للبيع → زر → `/tracks/:id/recordings` |
| Event عام (ماضي) | إن Series قابلة للبيع وفيها أصول لهذا الأيفنت → `/meetups/:id/recordings` |
| سياسة الحاجزين | `free_for_prior_buyers` (افتراضي) أو `everyone_pays` |

## Schema

- عمود `series.recordings_access_policy`
- Migration: `server/drizzle/0025_series_recordings_access_policy.sql`

## خارج النطاق (Phase 1)

- أيفنت standalone بدون Track/Series
- إعادة كتالوج `/recordings` للهيدر
- بيع أصل واحد منفصل عن Series
- تمديد نافذة حجز اللايف

## ملفات أساسية

- `server/src/routes/api/seriesAccess.ts`
- `server/src/services/trackRecordingsSeries.ts`
- `src/features/tracks/components/TrackRecordingsPublishCard.tsx`
- `src/features/tracks/pages/TrackRecordingsPage.tsx` (+ wrappers)
- `tests/unit/series-access.test.ts`
