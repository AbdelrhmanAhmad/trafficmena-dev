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

Map the camelCase API response to the snake_case frontend model with an **explicit per-entity mapper** in the API client. This is the deliberate house convention: the API client keeps paired `ApiTrack` (camelCase, wire) / `TrackRecord` (snake_case, model) types with dedicated `mapTrack`/`mapTrackDetail`/`mapTrackEvent` functions. Note `fetchPublicTrackById` returns a `{ track, events }` **wrapper**, not a flat track:

```typescript
// src/app/api/tracks.ts
export async function fetchPublicTrackById(id: string): Promise<{
  track: PublicTrackDetailRecord;
  events: PublicTrackEventRecord[];
}> {
  const data = await fetchJson<{
    track: ApiPublicTrackDetail;
    events: ApiPublicTrackEvent[];
  }>(`${API_BASE}/tracks/${id}/public`);

  return {
    track: {
      id: data.track.id,
      title: data.track.title,
      image_url: data.track.imageUrl,
      track_booking_start: data.track.trackBookingStart
        ? new Date(data.track.trackBookingStart)
        : null,
      max_track_bookings: data.track.maxTrackBookings,
      price_in_cents: data.track.priceInCents,
      // ...map remaining track fields
    },
    events: data.events.map((event) => ({
      id: event.id,
      title: event.title,
      image_url: event.imageUrl,
      // ...map remaining event fields
    })),
  };
}
```

## Alternative Approaches

> This project deliberately standardized on explicit per-entity mappers (the Solution above). The alternatives below are recorded for context — they are **not** the adopted convention here.

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
4. **Test with real API** - Don't mock API responses in a different format
5. **Verify field names against the live response, not a written spec** - The same class bites server-side vendor integrations too: a spec can claim a field name the live endpoint doesn't use (e.g. a payment gateway spec said `payment_method_id` while the live API returned `paymentId`), so parse the actual response before coding to it
