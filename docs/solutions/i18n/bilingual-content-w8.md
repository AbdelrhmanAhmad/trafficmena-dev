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
- Namespaces: `common`, `nav`, `auth` (expand as needed)
- `document.documentElement.lang` and `dir` updated on switch

## Security

Arabic fields use the same validation, sanitization (DOMPurify), and RBAC as English.
