# Checkpoint #3 — إخفاء تسجيلات التراك غير المنشورة من مكتبة العضو

**Commit:** *(يُحدَّث بعد الرفع)*  
**يعتمد على:** نقطة #2 (`dd37934`)

## القرار

Series المرتبطة بتراك (تُنشأ تلقائيًا) **لا تظهر** في `/dashboard/library` للأعضاء حتى يفعّل الأدمن **Publish for sale** (`salesEnabled`).

Series المستقلة (`trackId = null`) تظهر عند `isPublished` كالمعتاد.

## السبب

نشر الـ Track كان يضبط `series.isPublished=true` تلقائيًا، فتظهر «… Recordings» في المكتبة قبل أي بيع/نشر تسجيلات.

## التغيير

- `isSeriesVisibleInMemberLibrary` في `seriesAccess.ts`
- فلترة `GET /series` للأعضاء: published AND (`trackId` null OR `salesEnabled`)
- `GET /series/:id` يرد 404 للأعضاء إن لم تكن مرئية بنفس القاعدة

## اختبارات

`tests/unit/series-access.test.ts` — حالات الظهور/الإخفاء لـ track-linked vs standalone.
