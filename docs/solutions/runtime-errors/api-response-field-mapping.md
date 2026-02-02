---
title: API Response Field Mapping (camelCase to snake_case)
category: runtime-errors
tags: [api, typescript, mapping, frontend]
severity: medium
components: [api-client, tracks]
symptoms:
  - Frontend receiving undefined values for known fields
  - Type mismatches between API response and expected interface
  - Data displayed incorrectly or missing in UI
root_cause: API response uses camelCase but frontend expected snake_case
resolution_date: 2026-02-02
---

# API Response Field Mapping

## Problem

The `fetchPublicTrackById` function was returning data with field names that didn't match what the frontend components expected.

API returned camelCase:
```json
{
  "id": "123",
  "imageUrl": "...",
  "startsAt": "...",
  "endsAt": "...",
  "maxTrackBookings": 50
}
```

Frontend expected snake_case:
```typescript
interface Track {
  id: string;
  image_url: string;
  starts_at: string;
  ends_at: string;
  max_track_bookings: number;
}
```

## Solution

Add explicit field mapping in the API client:

```typescript
// src/app/api/tracks.ts
export async function fetchPublicTrackById(id: string): Promise<Track> {
  const response = await fetchJson<ApiTrackResponse>(`/api/tracks/${id}/public`);

  // Map camelCase API response to snake_case frontend interface
  return {
    id: response.id,
    title: response.title,
    description: response.description,
    image_url: response.imageUrl,
    starts_at: response.startsAt,
    ends_at: response.endsAt,
    location: response.location,
    location_url: response.locationUrl,
    max_track_bookings: response.maxTrackBookings,
    price_in_cents: response.priceInCents,
    track_booking_start: response.trackBookingStart,
    track_booking_end: response.trackBookingEnd,
    is_published: response.isPublished,
    events: response.events?.map(e => ({
      id: e.id,
      title: e.title,
      starts_at: e.startsAt,
      ends_at: e.endsAt,
      // ... map all event fields
    })),
  };
}
```

## Alternative Approaches

### 1. Transform at API Level (Recommended for new projects)
Configure the API to return snake_case:
```typescript
// Using a serialization library
app.get('/tracks/:id', (c) => {
  const track = await getTrack(id);
  return c.json(snakeCaseKeys(track));
});
```

### 2. Transform Globally in fetchJson
```typescript
function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();
  return camelToSnake(data) as T;
}
```

### 3. Use Consistent Casing (Best long-term)
Align frontend interfaces with API casing to avoid mapping entirely.

## Files Changed

- `src/app/api/tracks.ts` - Added field mapping in `fetchPublicTrackById`

## Debugging Tips

When fields appear as `undefined`:
1. Log the raw API response: `console.log('API response:', response)`
2. Compare response keys with interface properties
3. Check for casing differences (camelCase vs snake_case vs PascalCase)
4. Verify nested objects are also mapped

## Prevention

1. **Establish casing convention early** - Decide on camelCase or snake_case for entire stack
2. **Type the API response** - Create separate types for API response vs frontend model
3. **Use mapping layer** - Keep mapping logic in API client, not components
4. **Test with real API** - Don't mock API responses in different format
