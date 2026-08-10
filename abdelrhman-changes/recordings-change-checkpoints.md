# نقاط التقدم — تغيرات التسجيلات / التصفح العام

ترقيم واضح عشان التراجع بالنقاط لاحقًا.

| النقطة | الوصف | Commit | Baseline قبلها |
|--------|--------|--------|----------------|
| **#1** | فصل `/meetups` (Events فقط) + صفحة `/tracks` + إخفاء/تعطيل مؤقت لـ `/recordings` | `b93ce08` | `277f722` |
| **#2** | نشر التسجيلات بعد انتهاء Track/Event (سياسة وصول + زر Available recordings) | `dd37934` | `b93ce08` |
| **#3** | إخفاء Series التراك من `/dashboard/library` حتى Publish for sale | *(pending)* | `dd37934` |

## كيف تتراجع لنقطة؟

```bash
# مثال: الرجوع لما قبل النقطة #1 (حالة 277f722)
git log --oneline --grep="checkpoint-recordings-1"
# أو revert للـ commit الخاص بالنقطة
```

تفاصيل النقطة #1: [meetups-tracks-split.md](./meetups-tracks-split.md)  
تفاصيل النقطة #2: [publish-recordings-after-end.md](./publish-recordings-after-end.md)  
تفاصيل النقطة #3: [library-hide-unpublished-track-recordings.md](./library-hide-unpublished-track-recordings.md)
