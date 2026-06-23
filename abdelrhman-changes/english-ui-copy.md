# English UI Copy — Commerce & Masterclasses

> **Author:** Abdelrhman (via Cursor)  
> **Date:** June 2026 (`b33dbcd`, `f767461`)  
> **Scope:** استبدال النصوص العربية في واجهة العضو بإنجليزية متسقة

---

## Digital Products

| الملف | عربي (قديم) | English (جديد) |
|-------|-------------|----------------|
| `DigitalProductCard.tsx` | مشتري | Purchased |
| | منتج رقمي | Digital product |
| | ملف/ملفات | file / files |
| | عرض الملفات | View files |
| `DigitalProductDetail.tsx` | المنتج غير متاح. | Product unavailable. |
| | العودة للمنتجات | Back to products |
| | مشتري — وصول دائم | Purchased — lifetime access |
| | الملفات | Files |
| | فيديو الشرح | Tutorial video |
| `DigitalProductFilesCrud.tsx` | كل عنصر = نوع ملف… | Each item is a file type, title, and one file… |

---

## Series

| الملف | عربي | English |
|-------|------|---------|
| `SeriesPurchasedBadge.tsx` | تم الشراء | Purchased |

---

## Masterclasses

| الملف | عربي | English |
|-------|------|---------|
| `MasterclassDetail.tsx` | الكورس غير متاح. | This course is not available. |
| | مسجّل — وصول دائم | Enrolled — lifetime access |
| | ابدأ التعلّم | Start learning |
| | محتوى الكورس | Course content |
| | back to masterclasses | Back to masterclasses |
| `MasterclassLearn.tsx` | لا يمكن الوصول لهذا الكورس. | You do not have access to this course. |
| `MasterclassLesson.tsx` | الدرس غير متاح. | This lesson is not available. |
| | تحميل | Download |

---

## ملاحظة

- محتوى الأدمن والـ API messages تبقى غالبًا بالإنجليزية كما في بقية المشروع.
- عناوين الكورسات/المنتجات من قاعدة البيانات تبقى كما أدخلها المستخدم.

---

## ملفات معدّلة

```
src/features/digital-products/components/DigitalProductCard.tsx
src/features/digital-products/components/DigitalProductFilesCrud.tsx
src/pages/dashboard/DigitalProductDetail.tsx
src/features/series/components/SeriesPurchasedBadge.tsx
src/pages/dashboard/MasterclassDetail.tsx
src/pages/dashboard/MasterclassLearn.tsx
src/pages/dashboard/MasterclassLesson.tsx
```
