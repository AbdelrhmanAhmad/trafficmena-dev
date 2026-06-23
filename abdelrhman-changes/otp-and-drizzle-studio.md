# OTP & Drizzle Studio — مرجع تشغيل

> **Author:** Abdelrhman (via Cursor)  
> **Date:** June 2026  
> **Scope:** توثيق مرجعي (لا تغييرات كود) — كيف يعمل OTP وكيف تشغّل Drizzle Studio

---

## OTP (تسجيل الدخول / التسجيل)

### التوليد والتحقق

| المكوّن | التقنية |
|---------|---------|
| Auth framework | **Better Auth** (`better-auth`) |
| Plugin | `email-otp` من `better-auth/plugins/email-otp` |
| طول الكود | 6 أرقام |
| مدة الصلاحية | 10 دقائق |
| التخزين | PostgreSQL — جدول `auth_verifications` عبر Drizzle |

**الملف:** `server/src/auth.ts`

```ts
emailOTP({
  expiresIn: OTP_TTL_SECONDS, // 600
  otpLength: 6,
  sendVerificationOTP: async ({ email, otp }) => {
    await sendOtpEmail({ email, otp, ttlMinutes: 10 });
  },
})
```

### إرسال الإيميل

| المكوّن | التقنية |
|---------|---------|
| مزود الإيميل | **Plunk** — `https://next-api.useplunk.com/v1/send` |
| متغير البيئة | `PLUNK_API_KEY` (يبدأ بـ `sk_`) |
| المرسل | `hello@trafficmena.com` / TrafficMENA |

**الملف:** `server/src/services/email.ts` — `sendOtpEmail()`

بدون `PLUNK_API_KEY` صالح: لا يُرسل إيميل فعلي (تحذير في الـ console فقط).

### API Routes

| Method | Path | الوظيفة |
|--------|------|---------|
| POST | `/api/auth/otp/request` | طلب إرسال OTP |
| POST | `/api/auth/otp/verify` | التحقق وإنشاء الجلسة |

**الملف:** `server/src/routes/api/auth.ts`

حماية إضافية: rate limiting (`otpRateLimiter`), Cloudflare Turnstile عند كثرة الطلبات من نفس IP, **Event mode** يرفع الحدود.

### Frontend

- `src/app/auth/AuthContext.tsx` — `requestOtp`, `verifyOtp`
- صفحات: `SignIn.tsx`, `signup/CheckEmail.tsx`
- حقل الإدخال: مكتبة `input-otp` — `src/shared/components/ui/input-otp.tsx`

**لا يوجد SMS** — OTP بالإيميل فقط.

### متغيرات بيئة مطلوبة

```env
BETTER_AUTH_SECRET=...   # 32+ حرف
BETTER_AUTH_ISSUER=https://your-domain.com
PLUNK_API_KEY=sk_...
DATABASE_URL=postgresql://...
```

---

## Drizzle Studio

### المتطلبات

1. PostgreSQL شغّال (`npm run db:start`)
2. `server/.env` فيه `DATABASE_URL` أو `DATABASE_ADMIN_URL`

### التشغيل

من جذر المشروع:

```sh
npm --prefix server run db:studio
```

أو من `server/`:

```sh
cd server
npm run db:studio
```

يفتح المتصفح على واجهة Drizzle Studio (الرابط يظهر في الـ terminal، غالبًا `https://local.drizzle.studio`).

### الإعداد

**الملف:** `server/drizzle.config.ts`

- يحمّل `server/.env` تلقائيًا
- Schema: `./src/db/schema/index.ts`
- Migrations: `server/drizzle/`

### أوامر DB أخرى (مرجع)

| الأمر | الوصف |
|-------|--------|
| `npm --prefix server run db:migrate` | تطبيق migrations |
| `npm --prefix server run db:gen` | توليد SQL من schema |
| `npm run db:start` / `db:stop` | Postgres محلي (port 5433) |

### Windows

إن واجهت مشاكل مع Drizzle Studio على Windows، راجع قسم الإصلاح في [series-pricing-and-sales.md](./series-pricing-and-sales.md#إصلاح-إضافي-جلسة-سابقة-drizzle-studio-على-windows).
