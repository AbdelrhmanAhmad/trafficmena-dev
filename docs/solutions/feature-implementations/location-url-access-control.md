---
title: Location URL Access Control for Events and Tracks
category: feature-implementations
tags: [events, tracks, access-control, security, location]
severity: low
components: [events, tracks, api]
symptoms:
  - Need to share physical location/map links only with registered users
  - Meeting links already have access control but location URLs did not
root_cause: New feature requirement for physical event locations
resolution_date: 2026-02-02
---

# Location URL Access Control for Events and Tracks

## Problem

Physical events needed a way to share location links (Google Maps, Apple Maps, Waze) but only with registered attendees—similar to how meeting links are protected.

## Solution

### Database Schema Changes

Added `locationUrl` column to both events and tracks tables:

```sql
-- Migration 0009: Add location_url to events
ALTER TABLE events ADD COLUMN location_url TEXT;

-- Migration 0010: Add location and location_url to tracks
ALTER TABLE tracks ADD COLUMN location TEXT;
ALTER TABLE tracks ADD COLUMN location_url TEXT;
```

### API Validation

Location URLs must be HTTPS:

```typescript
// In event/track creation/update
if (locationUrl && !locationUrl.startsWith('https://')) {
  throw new HTTPException(400, { message: 'Location URL must use HTTPS' });
}
```

### Access Control Logic

Location URL follows the same visibility rules as meeting links:

```typescript
// Determine if user should see location URL
const shouldShowLocationUrl =
  isStaff ||                          // Staff always sees
  isActiveAttendee ||                 // Registered for this event
  hasBookedTrack ||                   // Booked the track containing this event
  (isAuthenticated && event.isPublic); // Authenticated user for public events

// In API response
locationUrl: shouldShowLocationUrl ? event.locationUrl : null
```

### Frontend Hook

Created reusable hook for location visibility:

```typescript
// src/shared/hooks/custom/useLocationVisibility.ts
export function useLocationVisibility({
  isRegistered,
  hasBookedTrack,
  isStaff,
}: LocationVisibilityProps) {
  return isRegistered || hasBookedTrack || isStaff;
}
```

### UI Implementation

Display location link only when visible:

```tsx
{locationUrl && canSeeLocation && (
  <a
    href={locationUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 text-primary hover:underline"
  >
    <MapPin className="h-4 w-4" />
    View on Map
  </a>
)}
```

## Files Changed

**Backend:**
- `server/drizzle/0009_moaning_bug.sql` - Events migration
- `server/drizzle/0010_next_wraith.sql` - Tracks migration
- `server/src/db/schema/index.ts` - Schema definitions
- `server/src/routes/api/events.ts` - Access control logic
- `server/src/routes/api/tracks.ts` - Access control logic

**Frontend:**
- `src/shared/hooks/custom/useLocationVisibility.ts` - Reusable hook
- `src/features/events/pages/EventDetail.tsx` - Event detail display
- `src/features/tracks/pages/TrackDetail.tsx` - Track detail display
- `src/features/events/components/AdminEventForm.tsx` - Admin form

## Key Decisions

1. **HTTPS only** - Security requirement for all URLs
2. **Same rules as meeting links** - Consistency in access control
3. **Separate from location text** - `location` is the address string, `locationUrl` is the map link
4. **Track booking grants access** - If you book a track, you see location URLs for all track events

## Prevention

When adding new sensitive fields that should be conditionally visible:
1. Define who should see the field (registered, booked, staff)
2. Add null redaction in API response
3. Create frontend hook for visibility logic
4. Follow existing patterns (meeting link, location URL)
