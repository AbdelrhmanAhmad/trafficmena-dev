---
title: Learning Tracks and Series Feature Implementation
category: feature-implementations
tags:
  - tracks
  - series
  - events
  - booking
  - dashboard
  - api
  - drizzle-orm
  - postgresql
  - react-query
components:
  - server/src/routes/api/tracks.ts
  - server/src/routes/api/series.ts
  - server/src/db/schema/index.ts
  - src/features/tracks/
  - src/features/series/
  - src/app/api/tracks.ts
severity: high
date_documented: 2025-12-29
related_issues:
  - https://github.com/meethosny/trafficmena/pull/1
keywords:
  - multi-session learning programs
  - configurable booking windows
  - track booking atomic operation
  - content series vs event tracks
  - capacity management
  - drizzle inArray fix
---

# Learning Tracks and Series Feature Implementation

## Problem Statement

The TrafficMENA platform needed to support multi-session learning programs where users could book an entire track of events as a package, with configurable booking windows and capacity limits. Additionally, library content needed to be organized into series for better discoverability.

## Solution Overview

Implemented two distinct feature modules:

1. **Learning Tracks**: Event bundles with booking windows, capacity limits, and atomic registration
2. **Content Series**: Library asset collections for content organization (no booking logic)

This separation of concerns was a key architectural decision - tracks are for bookable event sequences, series are for content organization.

## Key Implementation Details

### 1. Database Schema

#### Tracks Table
```sql
CREATE TABLE "tracks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "description" text,
  "image_url" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_published" boolean DEFAULT true NOT NULL,
  "track_booking_start" timestamp with time zone,
  "track_booking_end" timestamp with time zone,
  "single_booking_start" timestamp with time zone,
  "single_booking_end" timestamp with time zone,
  "max_track_bookings" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

#### Track Events Junction (Many-to-Many)
```sql
CREATE TABLE "track_events" (
  "id" uuid PRIMARY KEY,
  "track_id" uuid REFERENCES tracks(id) ON DELETE CASCADE,
  "event_id" uuid REFERENCES events(id) ON DELETE CASCADE,
  "sort_order" integer DEFAULT 0,
  CONSTRAINT "track_events_event_unique" UNIQUE ("event_id")  -- One track per event
);
```

#### Track Bookings
```sql
CREATE TABLE "track_bookings" (
  "id" uuid PRIMARY KEY,
  "track_id" uuid REFERENCES tracks(id) ON DELETE CASCADE,
  "user_id" uuid REFERENCES users(id) ON DELETE CASCADE,
  "booked_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "track_bookings_track_user_unique" UNIQUE ("track_id", "user_id")
);
```

### 2. Booking Window Logic

All 4 booking period fields must be set together (or all left null):

```
trackBookingStart < trackBookingEnd < singleBookingStart < singleBookingEnd
```

- **Track Booking Period**: Users can book entire track as package
- **Single Event Period**: After track booking closes, remaining spots available for individual events

### 3. Critical Bug Fix: Drizzle ORM SQL Array Syntax

**Problem**: Raw SQL template interpolated arrays incorrectly.

```typescript
// BROKEN: Generates tuple ($1, $2) instead of PostgreSQL array
.where(sql`event_id = ANY(${eventIds})`)
// Error: "op ANY/ALL (array) requires array on right side"
```

**Solution**: Use Drizzle's `inArray()` function.

```typescript
import { inArray } from 'drizzle-orm';

// FIXED: Properly handles array parameters
.where(inArray(eventAttendees.eventId, eventIds))
```

### 4. Atomic Track Booking

The track booking endpoint uses a database transaction to atomically:
1. Lock track events with `FOR UPDATE`
2. Check existing registrations
3. Verify capacities
4. Insert event attendees for all track events
5. Create track booking record

```typescript
app.post('/tracks/:id/book', async (c) => {
  return db.transaction(async (tx) => {
    // 1. Get track with lock
    const [track] = await tx.select().from(tracks)
      .where(eq(tracks.id, trackId))
      .for('update');

    // 2. Validate booking window
    const now = new Date();
    if (now < track.trackBookingStart || now > track.trackBookingEnd) {
      throw new ApiError('BOOKING_NOT_OPEN', '...', 400);
    }

    // 3. Check capacity
    const [{ count: currentBookings }] = await tx.select({ count: count() })
      .from(trackBookings)
      .where(eq(trackBookings.trackId, trackId));

    if (track.maxTrackBookings && currentBookings >= track.maxTrackBookings) {
      throw new ApiError('TRACK_FULL', '...', 409);
    }

    // 4. Register for all events atomically
    const trackEventIds = await tx.select({ eventId: trackEvents.eventId })
      .from(trackEvents)
      .where(eq(trackEvents.trackId, trackId));

    // ... insert into eventAttendees for each event

    // 5. Create track booking record
    await tx.insert(trackBookings).values({ trackId, userId });
  });
});
```

### 5. Frontend Architecture

#### Feature Module Structure
```
src/features/tracks/
├── components/
│   ├── PublicTrackCard.tsx    # Purple/indigo themed card
│   ├── TrackCard.tsx          # Admin card
│   ├── TrackBookingButton.tsx # Booking states UI
│   ├── TrackForm.tsx          # Create/edit form
│   └── TrackEventSelector.tsx # Add events dialog
├── hooks/
│   └── useTracks.ts           # 10+ React Query hooks
├── pages/
│   └── TrackDetail.tsx        # Public track page
└── types/
    └── index.ts
```

#### React Query Hooks
```typescript
// Public hooks (no auth)
export const usePublicTracks = (page, pageSize) => useQuery({
  queryKey: ['tracks', 'public', page, pageSize],
  queryFn: () => fetchPublicTracks({ page, pageSize }),
});

// Booking mutation
export const useBookTrack = () => useMutation({
  mutationFn: (trackId: string) => bookTrack(trackId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tracks'] });
    queryClient.invalidateQueries({ queryKey: ['events'] });
  },
});
```

### 6. Visual Design

- **Tracks**: Purple/indigo gradient theme to differentiate from events
- **Events**: Green/emerald theme maintained
- **Mobile**: Responsive grid layouts with full-width CTAs on mobile

```tsx
// Track badge styling
<span className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-500
  px-2 py-0.5 text-[10px] font-semibold text-white">
  Track
</span>
```

## API Endpoints

### Public (No Auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/tracks/public` | List published tracks |
| GET | `/tracks/:id/public` | Public track detail |

### Authenticated
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/tracks` | user+ | List tracks (staff see unpublished) |
| GET | `/tracks/:id` | user+ | Track detail with events |
| POST | `/tracks` | manager+ | Create track |
| PUT | `/tracks/:id` | manager+ | Update track |
| DELETE | `/tracks/:id` | admin+ | Delete track |
| POST | `/tracks/:id/events` | manager+ | Add events |
| DELETE | `/tracks/:id/events/:eventId` | manager+ | Remove event |
| PUT | `/tracks/:id/events/reorder` | manager+ | Reorder events |
| POST | `/tracks/:id/book` | user+ | Book track |

## Files Changed

### Backend
- `server/src/routes/api/tracks.ts` (new - 1108 lines)
- `server/src/routes/api/series.ts` (new)
- `server/src/utils/errors.ts` (new - ApiError utility)
- `server/src/db/schema/index.ts` (tracks, trackEvents, trackBookings, series, seriesAssets)
- `server/drizzle/0009-0012` migrations

### Frontend
- `src/features/tracks/` (new module - 11 files)
- `src/features/series/` (new module - 7 files)
- `src/app/api/tracks.ts` (new - 360 lines)
- `src/features/events/pages/DashboardMeetups.tsx` (tracks section)
- `src/features/events/pages/Meetups.tsx` (public tracks section)
- `src/features/events/pages/EventDetail.tsx` (booking logic for track events)
- `src/App.tsx` (new route `/tracks/:id`)

## Prevention & Best Practices

### 1. Drizzle ORM Array Queries
Always use `inArray()` instead of raw SQL with `ANY()`:
```typescript
// Do this
import { inArray } from 'drizzle-orm';
.where(inArray(table.column, arrayValues))

// Not this
.where(sql`column = ANY(${arrayValues})`)
```

### 2. Booking Window Validation
Validate all 4 dates together with proper ordering:
```typescript
function validateBookingWindows(current, payload) {
  // Count non-null values
  const setCount = [trackStart, trackEnd, singleStart, singleEnd]
    .filter(Boolean).length;

  // All or nothing
  if (setCount !== 0 && setCount !== 4) {
    return { valid: false, error: 'All 4 booking dates required together' };
  }

  // Proper ordering
  if (!(trackStart < trackEnd && trackEnd < singleStart && singleStart < singleEnd)) {
    return { valid: false, error: 'Invalid date ordering' };
  }
}
```

### 3. Atomic Multi-Entity Operations
Use database transactions for operations that touch multiple tables:
```typescript
await db.transaction(async (tx) => {
  // All operations in one transaction
  // Automatic rollback on error
});
```

## Related Documentation

- [Admin Content Workflow](../../admin-content-workflow.md)
- [RBAC Decision](../../rbac-decision.md)
- [PR #1: Learning Tracks and Series](https://github.com/meethosny/trafficmena/pull/1)

## Acceptance Criteria

- [x] Users can view published tracks on `/meetups` page
- [x] Users can view track detail at `/tracks/:id`
- [x] Users can book entire track (registers for all events)
- [x] Booking respects capacity limits
- [x] Track booking window enforced
- [x] Individual event booking dates hidden until reached
- [x] Admin can create/edit tracks at `/admin/library/tracks`
- [x] Admin can add/remove/reorder events in tracks
- [x] Mobile-responsive design
- [x] Purple/indigo theme differentiates tracks from events
