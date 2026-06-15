---
title: Track Booking Grants Event and Library Access
category: feature-implementations
tags: [tracks, events, library, access-control, booking]
severity: medium
components: [tracks, events, library, series]
symptoms:
  - Users who booked a track couldn't see meeting links for track events
  - Track-bookers couldn't access premium library content associated with the track
root_cause: Access control only checked individual event registration, not track booking
resolution_date: 2026-02-02
---

# Track Booking Grants Event and Library Access

## Problem

When a user books a learning track, they should automatically get:
1. Access to meeting links and location URLs for all events in that track
2. Access to premium library content (series and assets) associated with the track

The original implementation only checked for individual event registration, not track-level booking.

## Solution

### 1. Check Track Booking for Event Access

In `server/src/routes/api/events.ts`:

```typescript
// Check if user has booked the track containing this event
const hasBookedTrack = event.trackId && userId
  ? await db.query.trackBookings.findFirst({
      where: and(
        eq(trackBookings.trackId, event.trackId),
        eq(trackBookings.userId, userId),
        eq(trackBookings.status, 'active')
      )
    })
  : null;

// Show meeting link if registered for event OR booked the track
const canSeeMeetingLink = isActiveAttendee || !!hasBookedTrack || isStaff;
```

### 2. Check Track Booking for Library Access

In `server/src/routes/api/library.ts`:

```typescript
// For premium assets, check if user has booked a track that includes this content
const hasTrackAccess = await checkTrackBookingForAsset(userId, assetId);

const canAccessPremium = isStaff || hasActiveSubscription || hasTrackAccess;
```

### 3. Series Access Resolution

Created `server/src/routes/api/seriesAccess.ts`:

```typescript
export async function canAccessSeries(
  userId: string | null,
  series: Series,
  userProfile: Profile | null
): Promise<boolean> {
  // Staff always has access
  if (userProfile?.role && roleLevel(userProfile.role) >= roleLevel('manager')) {
    return true;
  }

  // Non-premium series are public
  if (!series.isPremium) {
    return true;
  }

  // Check subscription
  if (userId && await hasActiveSubscription(userId)) {
    return true;
  }

  // Check track booking (series linked to track)
  if (userId && series.trackId) {
    const booking = await db.query.trackBookings.findFirst({
      where: and(
        eq(trackBookings.trackId, series.trackId),
        eq(trackBookings.userId, userId),
        eq(trackBookings.status, 'active')
      )
    });
    if (booking) return true;
  }

  return false;
}
```

### 4. Auto-Link Track to Series

When a track is created, automatically create an associated series:

```typescript
// In track creation
const [newTrack] = await db.insert(tracks).values({ ... }).returning();

// Auto-create companion series for track recordings
await db.insert(series).values({
  title: `${newTrack.title} - Recordings`,
  trackId: newTrack.id,
  isPremium: isPaidTrack(newTrack),
  isPublished: false
});
```

### 5. Auto-Publish Series with Track

When a track publishes, auto-publish its series:

```typescript
// In track update when publishing
if (shouldPublish && !existingTrack.isPublished) {
  // Publish companion series
  await db.update(series)
    .set({ isPublished: true })
    .where(eq(series.trackId, trackId));
}
```

## Access Control Matrix

| User Type | Free Event | Paid Event | Premium Library | Track Series |
|-----------|------------|------------|-----------------|--------------|
| Anonymous | View only | View only | Hidden | Hidden |
| Authenticated | View + Register | View + Pay | Hidden | Hidden |
| Subscriber | Full access | Full access | Full access | Full access |
| Track Booker | Full access* | Full access* | Track assets | Full access |
| Staff | Full access | Full access | Full access | Full access |

*Track booker gets access to all events within that track

## Files Changed

**Backend:**
- `server/src/routes/api/events.ts` - Track booking check for meeting links
- `server/src/routes/api/library.ts` - Track booking check for premium assets
- `server/src/routes/api/series.ts` - Series access with track booking
- `server/src/routes/api/seriesAccess.ts` - New helper module

**Frontend:**
- `src/features/events/pages/EventDetail.tsx` - Display based on track booking
- `src/features/tracks/pages/TrackDetail.tsx` - Show access status

## Key Decisions

1. **Track booking = bundle access** - Booking a track gives access to all contained events
2. **Series auto-creation** - Each track gets a companion series for recordings
3. **Premium cascade** - Paid track → premium series → premium assets
4. **Helper module extraction** - Reusable access logic in dedicated files

## Testing Scenarios

1. Book free track → Can see meeting links for all track events
2. Book paid track → Can access premium series linked to track
3. Cancel track booking → Loses access to premium content
4. Subscribe → Has access regardless of track booking
