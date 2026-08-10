# Meetups / Tracks split — public navigation

> **Checkpoint:** تغيرات التسجيلات **#1**  
> **Date:** 2026-08-10  
> **Baseline before change:** `277f722` (module settings kept; recordings-resale work already reverted)

## Change

| Route | Before | After |
|-------|--------|-------|
| `/meetups` | Events + Tracks section | **Events only** |
| `/tracks` | (detail only via `/tracks/:id`) | **New Tracks catalog** |
| `/recordings` | Series store in nav | **Hidden from nav + temporarily disabled page** |

## API

Reused existing `GET /api/tracks/public` — no backend/schema change.

## Files

- `src/features/events/pages/Meetups.tsx`
- `src/features/tracks/pages/PublicTracks.tsx`
- `src/features/series/pages/PublicRecordingsDisabled.tsx`
- `src/App.tsx`, `src/shared/components/layout/Header.tsx`
- Analytics: `contentDiscovery.ts`, `helpers.ts` (`track_list`)

See also: [recordings-change-checkpoints.md](./recordings-change-checkpoints.md)
