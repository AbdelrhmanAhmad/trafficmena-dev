# Public store pages — Recordings & Digital Products

## Overview

Guest-facing catalog and preview pages for commerce items (no dashboard required to browse). Purchase still requires sign-in; guests see locked previews and a sign-in modal on buy/cart actions.

## Routes

| Path | Page | API |
|------|------|-----|
| `/recordings` | List sellable series | `GET /api/series/store` (public list uses store endpoint with optional auth) |
| `/recordings/:id` | Series preview + buy/cart | `GET /api/series/store/:id` |
| `/series/:id` | Same detail as `/recordings/:id` (legacy links) | — |
| `/digital-products` | List digital products | `GET /api/digital-products/public` |
| `/digital-products/:id` | Product preview + buy/cart | `GET /api/digital-products/public/:id` |

## Header navigation

`Header.tsx` — `NAVIGATION_ITEMS`:

- **Recordings** → `/recordings` (`FolderOpen` icon)
- **Digital Products** → `/digital-products` (`FileStack` icon)

## Guest detail behaviour

- **Description:** sanitized HTML (DOMPurify) where applicable
- **Videos/files:** titles + thumbnails only; playback/download locked until purchase
- **Purchased / granted access:** link to dashboard detail (`/dashboard/library/series/:id` or `/dashboard/digital-products/:id`)
- **Buy / Add to cart / Open in dashboard (guest):** `SignInRequiredDialog` with return path to the public detail URL

## Key frontend files

| File | Role |
|------|------|
| `src/features/series/pages/PublicRecordings.tsx` | Recordings list |
| `src/features/series/pages/PublicRecordingDetail.tsx` | Recording detail |
| `src/features/series/components/PublicRecordingCard.tsx` | Card on list |
| `src/features/digital-products/pages/PublicDigitalProducts.tsx` | Products list |
| `src/features/digital-products/pages/PublicDigitalProductDetail.tsx` | Product detail |
| `src/features/digital-products/components/PublicDigitalProductCard.tsx` | Card on list |
| `src/shared/components/SignInRequiredDialog.tsx` | Auth gate for guests |
| `src/features/series/components/SeriesBuyActions.tsx` | `onRequireAuth`, `signInReturnPath` |
| `src/features/digital-products/components/DigitalProductBuyActions.tsx` | Same pattern |

## Backend

Existing store APIs in `server/src/routes/api/seriesStore.ts` and `server/src/routes/api/digitalProducts.ts` — public variants strip URLs until purchase; optional session adds `has_purchased` / access flags.
