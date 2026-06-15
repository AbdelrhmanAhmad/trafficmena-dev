# Masterclass Certificates System (Priority 6 — Tasks 19–23)

## Summary

Optional certificates for masterclasses. One **global design template** (background + text positions) applies to all courses. Each masterclass can **enable/disable** certificates independently.

Certificates are **not** issued on purchase. They are issued when:

- The learner completes **all lessons** (automatic), or
- Admin/Owner **manually issues** to an enrolled user (override — completion not required)

Generated PDFs use `pdf-lib` with text overlaid on the uploaded background. English only (Helvetica).

Two URL types per certificate:

| Field | Meaning |
|-------|---------|
| `generated_certificate_url` | System-generated PDF (Bunny storage) |
| `external_certificate_url` | Optional external link (manual issue or admin update) |

---

## Database — migration `0021_certificates.sql`

| Table | Purpose |
|-------|---------|
| `certificate_settings` | Singleton global design: `background_image_url`, `settings` jsonb |
| `masterclass_certificate_settings` | Per-masterclass: `certificate_enabled`, title, description, optional `certificate_template_url` |
| `certificates` | Issued records; unique `(user_id, masterclass_id)`; unique `certificate_code` |

Status enum: `issued` | `revoked` (Phase 1 uses `issued` only).

### Settings JSON shape

```json
{
  "studentName": { "x": 50, "y": 45, "fontSize": 42, "color": "#111827", "align": "center", "fontWeight": "bold" },
  "courseTitle": { "x": 50, "y": 58, "fontSize": 26, "color": "#374151", "align": "center", "fontWeight": "normal" },
  "issueDate": { "x": 35, "y": 72, "fontSize": 16, "color": "#374151", "align": "center", "fontWeight": "normal" },
  "certificateCode": { "x": 70, "y": 72, "fontSize": 16, "color": "#374151", "align": "center", "fontWeight": "normal" }
}
```

Positions are **percentages** (0–100). Frontend preview uses `top/left %`; PDF generation converts Y from top-origin to pdf-lib bottom-origin.

---

## Backend

### Services

| File | Role |
|------|------|
| `server/src/services/certificates.ts` | Issue logic, PDF generation, settings CRUD helpers |
| `server/src/services/certificateStorage.ts` | Upload PDF/bytes to Bunny; fetch remote images |

### Key functions

- `getGlobalCertificateSettings` / `upsertGlobalCertificateSettings`
- `getMasterclassCertificateSettings` / `upsertMasterclassCertificateSettings`
- `shouldIssueCertificate` / `issueCertificateForCompletion` / `issueCertificateManually`
- `tryIssueCertificateOnCompletion` — called after lesson mark-complete (idempotent, errors logged)
- `generateCertificatePdf` — pdf-lib + background embed
- `generateCertificateCode` — `CERT-YYYY-XXXXXX`

### API routes (`server/src/routes/api/certificates.ts`)

| Method | Path | Access |
|--------|------|--------|
| GET/PUT | `/certificate-settings` | Admin/Owner |
| GET/PUT | `/masterclasses/:id/certificate-settings` | Admin/Owner |
| GET | `/masterclasses/:id/certificates` | Admin/Owner — enrollments + cert status |
| POST | `/masterclasses/:id/certificates/manual` | Admin/Owner — `{ userId, externalCertificateUrl? }` |
| GET | `/masterclasses/learn/:id/certificate` | Enrolled learner — status |
| GET | `/certificates/:id` | Owner or Admin/Owner |
| GET | `/certificates/:id/download` | Owner or Admin/Owner — proxied PDF |
| GET | `/certificates/public/:code` | **Public** — verification panel JSON |
| GET | `/certificates/public/:code/view` | **Public** — inline PDF in browser |
| GET | `/certificates/public/:code/download` | **Public** — PDF download by certificate code |
| PUT | `/certificates/:id/external-url` | Admin/Owner |

Certificate routes register **before** masterclass routes in `index.ts` so paths like `/masterclasses/:id/certificate-settings` are not swallowed by generic handlers.

### Lesson completion hook

`POST /masterclasses/learn/lessons/:lessonId/complete` → after progress insert → `tryIssueCertificateOnCompletion`.

### Upload scope

`certificates` — PNG/JPG for background images (`uploads.ts`).

### Duplicate protection

- DB unique index on `(user_id, masterclass_id)`
- Service checks before insert; on unique violation returns existing row
- PDF generation failure **fails the request** (no broken certificate row)

---

## Frontend

### Admin

| Page | Path | Access |
|------|------|--------|
| Global certificate design | `/admin/certificate-settings` | Owner/Admin |
| Per-masterclass certificates tab | `/admin/masterclasses/:id` → **Certificates** | Owner/Admin |

Components:

- `CertificateDesignPreview` — live preview with sample text
- `GlobalCertificateSettingsForm` — background upload + field positions
- `MasterclassCertificatesAdmin` — enable toggle, learner list, manual issue

### Learner

`MasterclassCertificateCard` on `/dashboard/masterclasses/:id/learn`:

- Certificate disabled → hidden
- Enabled + incomplete → locked message
- Issued → code, date, download PDF, external URL, **copy share link**, open public page

### Public verification page

| Page | Path | Access |
|------|------|--------|
| Certificate verification | `/certificates/:code` | **Public** (no login) |

Shows a panel with:

- Student name
- Masterclass / certificate title
- Issue date
- Certificate code + verified/revoked badge
- **Visual certificate preview** (`CertificatePublicPreview`) — responsive HTML overlay on global background
- **View certificate** (inline PDF)
- **Download PDF**
- External certificate URL (if set)

Share URL format: `https://your-domain/certificates/CERT-2026-XXXXXX`

The certificate code acts as the public lookup key (similar to verification portals). Revoked certificates show on the page but block PDF download/view.

Components:

- `CertificateShareButton` — copy public link to clipboard
- `CertificatePublicPreview` — responsive public verification preview (separate from admin `CertificateDesignPreview`)
- `certificatePreviewUtils.ts` — shared field positioning; public preview scales fonts via `ResizeObserver`
- `pages/certificates/[code].tsx` — public verification UI

---

## Certificate code format

`CERT-2026-A8F3K2` (year + 6-char hex)

---

## Manual test checklist

- [ ] Migration `0021_certificates.sql` applied
- [ ] Admin uploads background + saves positions at `/admin/certificate-settings`
- [ ] Preview matches approximate PDF layout
- [ ] Enable certificate on a masterclass (Certificates tab)
- [ ] Enrolled user completes all lessons → certificate auto-issued once
- [ ] Re-complete lesson → no duplicate
- [ ] Learner sees download on learn page
- [ ] Manual issue for enrolled user without completion
- [ ] Manual issue fails if user not enrolled
- [ ] Manual issue when cert exists → returns existing
- [ ] Download endpoint requires auth (owner/admin)
- [ ] Public page `/certificates/CERT-2026-XXXXXX` shows student + course + date
- [ ] Public view/download works without login
- [ ] Copy share link from learner card and admin certificates tab
- [ ] Masterclass with certificate disabled → no learner UI

---

## Commands

```bash
npm --prefix server run db:migrate
npm --prefix server run dev
npm run dev
```

---

## Files changed

**Backend:** `0021_certificates.sql`, schema, `certificates.ts`, `certificateStorage.ts`, `routes/api/certificates.ts`, `masterclasses.ts`, `uploads.ts`, `index.ts`, `package.json` (pdf-lib)

**Frontend:** `src/app/api/certificates.ts`, `src/features/certificates/**`, `pages/admin/certificate-settings.tsx`, `pages/certificates/[code].tsx`, masterclass edit tab, `MasterclassLearn.tsx`, `App.tsx`, `AppLayout.tsx`, `uploads.ts`
