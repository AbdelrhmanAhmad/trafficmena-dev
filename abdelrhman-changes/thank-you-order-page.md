# Thank you for your order — cart checkout

## Overview

After a successful **commerce cart** checkout (Series + Digital Products via `POST /orders`), members land on a dedicated thank-you page listing purchased items with links to dashboard detail pages.

## Route

`/thank-you-order/:orderId?paid=1`

Protected route (member must be signed in).

## Redirect flow

| Source | Destination |
|--------|-------------|
| `payment/success` when `itemType === 'order'` | `/thank-you-order/{orderId}?paid=1` |
| `SeriesCart` — instant/free checkout `onSuccess` | Same URL |
| Cart cleared via `clearCommerceCartStorage()` on paid order in `payment/success` |

## Page content

- Success hero (gradient background, same visual language as `ThankYouEvent` / `ThankYouTrack`)
- **Order summary:** total, item count, paid status
- **Purchased items** (clickable cards):
  - **Recording** (`series`) → `/dashboard/library/series/:seriesId`
  - **Digital product** → `/dashboard/digital-products/:digitalProductId`
- Each card: image, type badge, title, line price, arrow
- CTAs: Library / My digital products / Dashboard (shown based on item types)

## API

`GET /api/orders/:id` — enriched items include `title` and `imageUrl` (from `series` / `digital_products`).

Hook: `useOrder(orderId)` in `src/app/hooks/useOrders.ts`

## Key files

| File | Role |
|------|------|
| `src/pages/ThankYouOrder.tsx` | Thank-you page |
| `src/features/orders/utils/orderItemNavigation.ts` | Dashboard paths + type labels |
| `src/pages/payment/success.tsx` | Redirect for order payments |
| `src/pages/SeriesCart.tsx` | Redirect after inline checkout success |
| `server/src/routes/api/orders.ts` | `enrichOrderItems` adds `imageUrl` |
