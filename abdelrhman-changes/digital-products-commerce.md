# Digital Products — Commerce & Admin

## Overview

Digital products are one-time purchases with downloadable files and an optional tutorial video from the existing library (not uploaded separately).

## Database (`0019_digital_products.sql`)

- `digital_products` — title, description, image, price, sales/publish flags, optional `video_asset_id`
- `digital_product_files` — excel, markdown, html, text, powerpoint
- `digital_product_purchases` — permanent access per user/product
- `order_items` extended with `item_type` (`series` | `digital_product`) and nullable `series_id` + `digital_product_id`

## Admin

- Sidebar: **Digital Products** → `/admin/digital-products`
- CRUD + file upload (scope `digital-products` on Bunny)
- Optional video: pick from library videos (`library_assets` where `file_type = Video`)

## Member store

- Sidebar: **Digital Products** → `/dashboard/digital-products`
- Filters: **الكل** | **مشترياتي**
- Detail page shows files + tutorial video after purchase only
- One purchase per product (409 if already owned)

## Unified cart

- `CommerceCartProvider` (alias `SeriesCartProvider`) stores series + digital products
- `/series/cart` — mixed checkout via `POST /orders` with `seriesIds` + `digitalProductIds`
- Fulfillment: `fulfillOrder` grants series access + digital product purchases

## API

| Method | Path | Role |
|--------|------|------|
| GET/POST | `/api/digital-products` | Manager+ |
| GET/PUT/DELETE | `/api/digital-products/:id` | Manager+ |
| POST/DELETE | `/api/digital-products/:id/files` | Manager+ |
| GET | `/api/digital-products/store?filter=all\|mine` | Auth |
| GET | `/api/digital-products/store/:id` | Auth |
| POST | `/api/orders` | Auth — `{ seriesIds?, digitalProductIds? }` |

## Sellable rules

Product must be: published, sales enabled, price > 0, at least one file.
