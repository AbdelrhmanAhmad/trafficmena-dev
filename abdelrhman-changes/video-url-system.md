# Video URL system — Digital Products & Masterclass lessons

## Overview

Replaced library video picker (`video_asset_id` → `library_assets`) with direct **Video URL** fields, matching the same admin CRUD pattern for both products and lesson videos.

## Migrations

| Migration | Table | Change |
|-----------|-------|--------|
| `0022_digital_product_videos.sql` | `digital_product_videos` | New child table; migrates from `digital_products.video_asset_id`; drops column |
| `0023_masterclass_lesson_video_urls.sql` | `masterclass_lesson_videos` | Adds `video_url` NOT NULL; migrates from `video_asset_id`; drops column |

Run:

```bash
npm --prefix server run db:migrate
```

## Digital products

### Schema

`digital_product_videos`: `product_id`, `title`, `video_url`, `sort_order`

### API

| Method | Path |
|--------|------|
| POST | `/api/digital-products/:id/videos` |
| PUT | `/api/digital-products/:id/videos/:videoId` |
| DELETE | `/api/digital-products/:id/videos/:videoId` |

Max **20** videos per product.

### Admin UI

- `DigitalProductVideosCrud.tsx` on product edit form (after product exists)
- `LazyEditor` for HTML description
- Preview: `VideoEmbed` + YouTube thumbnail via `getVideoThumbnailUrl`

### Member / public

- Dashboard detail: full `VideoEmbed` after purchase
- Public detail: locked preview (no URLs)
- Cards: `image_url ?? getVideoThumbnailUrl(first_video_url)`

## Masterclass lessons

### Schema

`masterclass_lesson_videos`: `lesson_id`, `title`, `video_url`, `sort_order` (no `video_asset_id`)

### API

Same shape under curriculum paths:

| Method | Path |
|--------|------|
| POST | `/api/masterclasses/:id/modules/:moduleId/lessons/:lessonId/videos` |
| PUT | `.../videos/:videoId` |
| DELETE | `.../videos/:videoId` |

Body: `{ title, videoUrl }` — max **20** videos per lesson.

### Admin UI

**Curriculum → Lesson → Videos:** `MasterclassLessonVideosCrud.tsx` (replaces library dropdown in `MasterclassCurriculumEditor`)

### Member lesson page

`MasterclassLesson.tsx` — `VideoEmbed` with `video.video_url` from API (flat field, no nested `video_asset`).

## Shared utilities

- `src/shared/components/VideoEmbed.tsx`
- `src/shared/utils/videoThumbnail.ts` — YouTube thumbnail helper
