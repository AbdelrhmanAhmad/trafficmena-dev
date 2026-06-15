# Masterclasses — نظام الكورسات (Tasks 12–18)

## Overview

Masterclasses are a **standalone course product**. In Phase 1 they do **not** enter the commerce cart (Series / Digital Products). The member buys the course as a **single direct checkout**; after payment they receive **permanent enrollment** and access to all modules and lessons.

**Hierarchy:**

```
Masterclass
  └── Modules (ordered)
        └── Lessons (ordered)
              ├── Videos (multiple, Bunny embed via library_assets)
              └── Files (multiple, same upload types as digital products)
```

**Example:**

- Masterclass: *AI Marketing*
  - Module 1: Introduction → Lesson 1, Lesson 2
  - Module 2: Advanced → Lesson 3, Lesson 4

---

## Database — migration `0020_masterclasses.sql`

| Table | Purpose |
|-------|---------|
| `masterclasses` | Title, description, image, `price_in_cents`, `is_published`, `sort_order` |
| `masterclass_modules` | Ordered modules under a masterclass |
| `masterclass_lessons` | Ordered lessons under a module |
| `masterclass_lesson_videos` | Multiple videos per lesson; `video_asset_id` → `library_assets` |
| `masterclass_lesson_files` | Multiple files per lesson; reuses enum `digital_product_file_type` |
| `masterclass_enrollments` | Permanent access; `source`: `paid` \| `manual`; optional `payment_id`, `enrolled_by`, `enrollment_note` |
| `masterclass_lesson_progress` | Per-user lesson completion; `completion_method`: `manual` \| `video` |

Also: `ALTER TYPE payment_item_type ADD VALUE 'masterclass'`.

---

## Backend

### Service

`server/src/services/masterclassSales.ts`

| Function | Role |
|----------|------|
| `getEnrolledMasterclassIds` | Set of enrolled masterclass IDs for a user |
| `isMasterclassSellable` | Published + price > 0 + at least one lesson |
| `assertMasterclassSellable` | Throws if not sellable (checkout) |
| `grantMasterclassEnrollment` | Idempotent insert into `masterclass_enrollments` |
| `countMasterclassLessons` / `countCompletedLessons` | Progress totals |

### Routes

`server/src/routes/api/masterclasses.ts` — registered in `server/src/routes/api/index.ts`

#### Admin (Manager+ — `requireManager` inside handlers)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/masterclasses` | List all (with `lessonCount`) |
| POST | `/masterclasses` | Create |
| GET | `/masterclasses/:id` | Detail → `{ masterclass, lessonCount }` |
| PUT | `/masterclasses/:id` | Update |
| DELETE | `/masterclasses/:id` | Delete |
| GET | `/masterclasses/:id/preview` | Full tree (modules → lessons → videos + files) |
| GET | `/masterclasses/:id/enrollments` | Enrollment list with user email/name |
| POST | `/masterclasses/:id/enrollments/manual` | `{ userId, note? }` — source `manual` |
| POST | `/masterclasses/:id/modules` | Create module |
| PUT | `/masterclasses/:id/modules/:moduleId` | Update module |
| DELETE | `/masterclasses/:id/modules/:moduleId` | Delete module |
| PUT | `/masterclasses/:id/modules/reorder` | `{ orderedIds: string[] }` |
| POST | `.../modules/:moduleId/lessons` | Create lesson |
| PUT | `.../lessons/:lessonId` | Update lesson |
| DELETE | `.../lessons/:lessonId` | Delete lesson |
| PUT | `.../lessons/reorder` | `{ orderedIds: string[] }` |
| POST/PUT/DELETE | `.../lessons/:lessonId/videos/:videoId` | Lesson videos |
| POST/PUT/DELETE | `.../lessons/:lessonId/files/:fileId` | Lesson files |

#### Member (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/masterclasses/store?filter=all\|mine` | Catalog; `mine` = enrolled only |
| GET | `/masterclasses/store/:id` | Detail; curriculum visible only if enrolled |
| GET | `/masterclasses/learn/:id` | Enrolled curriculum + progress counts |
| GET | `/masterclasses/learn/lessons/:lessonId` | Lesson content (videos + files) |
| POST | `/masterclasses/learn/lessons/:lessonId/complete` | Mark lesson complete (manual) |
| DELETE | `/masterclasses/learn/lessons/:lessonId/complete` | Unmark complete |

### Sellability (checkout)

Masterclass is sellable when:

- `is_published = true`
- `price_in_cents > 0`
- At least **one lesson** exists in the tree

---

## Payments (Task 15)

Masterclasses use **direct checkout** — not the unified cart.

| Field | Value |
|-------|--------|
| `payment.itemType` | `'masterclass'` |
| `payment.itemId` | `masterclassId` |

### Flow

1. Member clicks **اشترِ الآن** on `/dashboard/masterclasses/:id`
2. `PaymentCheckoutDialog` → `POST /payments/checkout` with `itemType: 'masterclass'`
3. Fawaterk redirect / reference codes
4. On success → `processSuccessfulPayment` → `grantMasterclassEnrollment` (`source: 'paid'`)
5. Redirect to `/dashboard/masterclasses/:id/learn`

### Fulfillment notes

- Enrollment is granted **without** re-checking sellability at fulfillment time (user already paid).
- On **verify** for an already-`paid` payment, enrollment is granted again if missing (idempotent recovery).

### Payment success page fixes

- `isVerifiedPaymentAnalyticsReady` extended for `masterclass` and `order`
- Redirect to learn page as soon as `status === 'paid'`
- React Query cache invalidation for `['masterclasses']`
- Pending page accepts `item_type=masterclass`

---

## Manual enrollment (Task 16)

Admin/Manager → tab **Enrollments** on `/admin/masterclasses/:id`:

- Search user by email/name
- Optional note
- Creates `masterclass_enrollments` with `source: 'manual'`, `enrolled_by: staff user id`

---

## Lesson progress & completion (Tasks 17–18)

### Phase 1 decision: **Manual (hybrid-ready)**

- Member clicks **Mark as complete** on a lesson page
- Masterclass is complete when **all lessons** are marked complete
- Schema stores `completion_method: 'manual'` (future: auto on video watch via `'video'`)

---

## Uploads (Task 14)

Scope `masterclasses` added to:

- `server/src/routes/api/uploads.ts`
- `src/app/api/uploads.ts` — `UploadScope`

Same allowed file types as digital products: excel, markdown, html, text, powerpoint.

---

## Frontend

### Admin — `/admin/masterclasses`

Sidebar: **Masterclasses** (owner / admin / manager)

| Page | Path |
|------|------|
| List | `/admin/masterclasses` |
| New | `/admin/masterclasses/new` |
| Edit | `/admin/masterclasses/:id` |

Edit page tabs:

1. **Details** — title, description, cover, price, publish, sort order
2. **Curriculum** — modules / lessons / videos / files
3. **Enrollments** — manual enroll + list

Curriculum editor:

- Add / reorder (↑↓) / delete modules and lessons
- Per lesson: add library videos, **multiple file items** via `MasterclassLessonFilesCrud` (Add file → form → list → add another)

### Member — `/dashboard/masterclasses`

Sidebar: **Masterclasses**

| Page | Path |
|------|------|
| Catalog | `/dashboard/masterclasses` — tabs **الكل** / **كورساتي** |
| Detail | `/dashboard/masterclasses/:id` — buy or start learning |
| Learn | `/dashboard/masterclasses/:id/learn` — progress bar + lesson list |
| Lesson | `/dashboard/masterclasses/lessons/:lessonId` — videos, files, mark complete |

Purchase: `MasterclassBuyActions` → `PaymentCheckoutDialog` (`itemType: 'masterclass'`) — **no cart**.

---

## Key files

### Backend

```
server/drizzle/0020_masterclasses.sql
server/src/db/schema/index.ts
server/src/services/masterclassSales.ts
server/src/routes/api/masterclasses.ts
server/src/routes/api/payments.ts          (masterclass checkout + fulfillment)
server/src/routes/api/uploads.ts           (scope: masterclasses)
server/src/routes/api/paymentAnalytics.ts
```

### Frontend

```
src/app/api/masterclasses.ts
src/features/masterclasses/
  components/MasterclassForm.tsx
  components/MasterclassCurriculumEditor.tsx
  components/MasterclassLessonFilesCrud.tsx
  components/MasterclassManualEnrollment.tsx
  components/MasterclassCard.tsx
  components/MasterclassBuyActions.tsx
  hooks/useMasterclasses.ts
src/pages/admin/masterclasses/
src/pages/dashboard/Masterclasses.tsx
src/pages/dashboard/MasterclassDetail.tsx
src/pages/dashboard/MasterclassLearn.tsx
src/pages/dashboard/MasterclassLesson.tsx
src/App.tsx
src/shared/components/layout/AppLayout.tsx
src/pages/payment/success.tsx
src/pages/payment/pending.tsx
src/lib/analytics/paymentFlow.ts
```

---

## Bug fixes during implementation

| Issue | Cause | Fix |
|-------|--------|-----|
| Admin edit form empty | `GET /masterclasses/:id` returns `{ masterclass, lessonCount }` but client read `data` as masterclass | `fetchAdminMasterclass` → `data.data.masterclass` + `form.reset()` on load |
| Payment success — no enrollment / no redirect | Analytics gate excluded `masterclass`; redirect logic skipped when `itemId` present | Extended analytics helper; redirect on `paid`; enrollment recovery on verify |
| Single inline file form | UX did not match digital products multi-item pattern | `MasterclassLessonFilesCrud` — list + **Add file** panel |

---

## Commands

```bash
# Apply migration
npm --prefix server run db:migrate

# Run locally
npm --prefix server run dev   # API :3001
npm run dev                   # Vite :8080
```

---

## Manual test checklist

- [ ] Admin: create masterclass → add module → add lesson → add video (library) → add **multiple** files
- [ ] Publish + set price → appears in member catalog (**الكل**)
- [ ] Member: direct buy (not cart) → Fawaterk → success → redirected to learn page
- [ ] **كورساتي** tab shows enrolled course
- [ ] Lesson page: videos play, files download, mark complete updates progress
- [ ] Admin: manual enrollment → member sees course without payment
- [ ] Re-open `/payment/success?payment_id=...&invoice_id=...` → enrollment still OK (idempotent)

---

## Phase 2 (not implemented)

- Masterclasses in unified cart
- Auto-complete on video watch (`completion_method: 'video'`)
- Certificates on masterclass completion
- Promo / subscriber discounts on masterclass checkout
