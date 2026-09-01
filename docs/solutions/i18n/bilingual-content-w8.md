# W8 Bilingual Content Architecture

## Locale resolution

- Query: `?lang=en|ar` (also `locale`)
- Cookie: `tm_locale`
- Header: `Accept-Language`
- Default: `en`

Frontend persists choice in `localStorage` key `trafficmena:locale` and mirrors to cookie.

## Database naming

Explicit columns per language: `title_en`, `title_ar`, `description_en`, `description_ar`, etc.

Legacy columns (`title`, `description`, …) are **deprecated** and retained for rollback — not source of truth after cutover.

## Migration backfill (0035)

Every legacy value is copied to **both** EN and AR:

```sql
title_en = title
title_ar = title
```

No language detection. No machine translation.

## API contract

| Audience | Response |
|----------|----------|
| Public/member | Resolved `title`, `description`, `location` for requested locale |
| Admin/staff | Full `titleEn`, `titleAr`, `descriptionEn`, `descriptionAr`, … |

## Admin rules

- Admin UI chrome stays English-only
- Content inputs are bilingual with `dir="ltr"` / `dir="rtl"`
- Both languages required for required content fields on create/update

## Frontend

- i18next + react-i18next
- Namespaces: `common`, `nav`, `auth`, `events`, `tracks`, `library`, `commerce`, `payments`, `dashboard`, `calendar`, `errors`
- `document.documentElement.lang` and `dir` updated on switch
- Translation key parity enforced by `tests/unit/translation-parity.test.ts`

## Emails (round 2)

- Copy modules: `server/src/i18n/emailCopy.ts`, `subscriptionCopy.ts`
- OTP locale via `otpLocaleContext.ts` (request cookie captured before Better Auth send)
- Registration emails receive explicit locale at queue time

## Public API (round 2)

All major content routes use `contentPresentation.ts` + `resolveLocaleFromRequest`.

## Closure pass (round 3)

- Recordings series titles localized in `trackRecordingsSeries` / `eventRecordingsSeries` loaders
- Invitations: `customMessageEn` / `customMessageAr` admin + email locale
- Checkout locale stored on `payments.checkout_locale` (migration 0036)
- Signup, public browse, member dashboard routes wired to i18n
- Payment checkout components use `payments` namespace
- Calendar locale tests in `tests/unit/calendar-locale.test.ts`
- Raw literal audit: `tests/unit/raw-literals-audit.test.ts`

## Live migration verification

Disposable PostgreSQL only — not staging/production:

```bash
MIGRATION_VERIFY_DATABASE_URL=postgresql://user:pass@host:5433/disposable_db \
  node tests/scripts/verify-migration-0035.mjs
```

Note: Drizzle journal may need entries for 0034–0036 before `db:migrate` in CI.

## Security

Arabic fields use the same validation, sanitization (DOMPurify), and RBAC as English.
