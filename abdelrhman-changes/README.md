# abdelrhman-changes

توثيق التعديلات التي أُجريت على مشروع TrafficMENA Hub.

## الملفات

| الملف | الوصف |
|-------|--------|
| [series-pricing-and-sales.md](./series-pricing-and-sales.md) | سعر Series + تفعيل/إيقاف البيع + عرض السعر في الأدمن والزوار |
| [fawaterk-payment-invoice-id-fix.md](./fawaterk-payment-invoice-id-fix.md) | إصلاح Fawaterk: UUID لـ `invoice_id` + verify الاشتراك |
| [series-sales-commerce.md](./series-sales-commerce.md) | بيع Recording Series: سلة، orders، دفع، badge تم الشراء |
| [digital-products-commerce.md](./digital-products-commerce.md) | Digital Products: ملفات، سلة موحّدة مع Series |
| [video-url-system.md](./video-url-system.md) | **Video URL** لـ Digital Products + فيديوهات دروس Masterclass (migrations 0022–0023) |
| [public-store-pages.md](./public-store-pages.md) | **صفحات الزوار:** Recordings + Digital Products + Sign-in modal |
| [thank-you-order-page.md](./thank-you-order-page.md) | **Thank you for your order** بعد شراء السلة |
| [masterclass-enrollment-display.md](./masterclass-enrollment-display.md) | أدمن Masterclass: هاتف الطالب + بادج سعر الشراء |
| [masterclasses-system.md](./masterclasses-system.md) | Masterclasses: كورسات، enrollment، دفع مباشر، progress |
| [masterclass-certificates.md](./masterclass-certificates.md) | Certificates: PDF، إصدار تلقائي/يدوي، رابط مشاركة |
| [permissions-priority-7.md](./permissions-priority-7.md) | الصلاحيات: User / Manager / Admin |
| [commerce-cart-fixes.md](./commerce-cart-fixes.md) | إصلاح السلة: grant vs purchase، تفريغ بعد الدفع |
| [library-series-access.md](./library-series-access.md) | وصول المكتبة عبر Series المشتراة |
| [orders-pages.md](./orders-pages.md) | Orders (أدمن + عضو) |
| [english-ui-copy.md](./english-ui-copy.md) | واجهة إنجليزية للتجارة والماستركلاس |
| [otp-and-drizzle-studio.md](./otp-and-drizzle-studio.md) | OTP + Drizzle Studio |

## Migrations جديدة (تشغيل مطلوب)

```bash
npm --prefix server run db:migrate
```

- `0022_digital_product_videos.sql`
- `0023_masterclass_lesson_video_urls.sql`

## آخر تحديث

- **2026-06-23** — Public Recordings/Digital Products، Video URL system، Thank you order page، Masterclass enrollment phone + purchase price
- **2026-06-17** — Orders pages + English UI (`f767461`)
- **2026-06-15** — Library access via purchased series (`595cfd0`)
