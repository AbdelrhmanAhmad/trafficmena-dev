# Public store pages — Tracks, Recordings (disabled), Digital Products

## Current public navigation (2026-08-10)

| Path | Page | Status |
|------|------|--------|
| `/meetups` | Events only | Active |
| `/tracks` | Published tracks catalog | Active (new) |
| `/tracks/:id` | Track detail + booking | Active |
| `/recordings`, `/recordings/:id` | Temporarily disabled unavailable screen | Disabled (hidden from nav) |
| `/digital-products` | Digital products store | Active (Module Settings) |

## Header

`Header.tsx` — `NAVIGATION_ITEMS`:

- **Events** → `/meetups`
- **Tracks** → `/tracks`
- **Digital Products** → `/digital-products` (gated)

Recordings removed from nav.

## Tracks list

- Page: `src/features/tracks/pages/PublicTracks.tsx`
- Card: `PublicTrackCard`
- API: existing `GET /api/tracks/public` (no backend change required)

## Recordings (Series store) — temporary

- Routes still registered but render `PublicRecordingsDisabled`
- Series APIs / dashboard / admin unchanged

## Digital Products

Unchanged — see [digital-products-commerce.md](./digital-products-commerce.md).
