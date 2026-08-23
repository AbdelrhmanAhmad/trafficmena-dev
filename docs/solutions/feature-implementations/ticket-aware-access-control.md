---
title: Ticket-Aware Access Control (Events, Tracks, Library)
category: feature-implementations
tags: [access-control, tracks, events, library, ticket-types, security]
components: [events, tracks, library, series]
root_cause: A track booking unlocks only the formats its ticket variant covers; the old "any booking unlocks everything" model leaked online links/recordings to offline-only buyers (and vice versa).
resolution_date: 2026-06-27
---

# Ticket-Aware Access Control

## Problem

A handful of fields are sensitive and must be redacted from people who haven't earned them:

- An **online** event's `meetingLink` (Zoom/live join).
- An **offline** event's `locationUrl` (the map link; the location *text* stays public).
- A **track**'s `locationUrl` (in-person venue for the track's offline sessions).
- **Premium library recordings** (videos/docs attached to a session or to a track's companion series).

The system must decide, per viewer, which of these to reveal. Three things can grant access: being staff, being a direct attendee/registrant of the specific event, or holding an **active track booking** that contains the session.

The older model (see the now-removed `track-booking-grants-event-access.md` and `location-url-access-control.md`) treated a track booking as all-or-nothing: any active booking unlocked every link and every premium asset in the track. That is wrong now that tracks sell **ticket variants**. An `offline_only` buyer must not see Zoom links for online sessions, and an `online_only` buyer must not be handed the physical venue — but should still get the offline session *recordings*. Access is therefore **ticket-type-scoped**, routed through one matrix instead of inline boolean checks.

## Root Cause / Model

### The ticket matrix (`server/src/routes/api/ticketAccess.ts`)

Two axes: the buyer's `ticketType` and the event's `eventFormat`.

```ts
export const TICKET_TYPES = ['online_only', 'online_offline', 'offline_only'] as const;
export type TicketType = (typeof TICKET_TYPES)[number];
export type EventFormat = 'online' | 'offline';
```

The canonical decision is one pure function:

```ts
export function resolveTicketAccess(
  ticketType: TicketType,
  eventFormat: EventFormat,
): TicketAccess {
  if (eventFormat === 'online') {
    const onlineEntitled = ticketType === 'online_only' || ticketType === 'online_offline';
    return { canAttendLive: onlineEntitled, canAccessRecording: onlineEntitled };
  }
  // offline
  const offlineEntitled = ticketType === 'online_offline' || ticketType === 'offline_only';
  return { canAttendLive: offlineEntitled, canAccessRecording: true };
}
```

Truth table (verified from the code above):

| ticketType \ format   | online — live | online — recording | offline — live | offline — recording |
|-----------------------|:-------------:|:------------------:|:--------------:|:-------------------:|
| `online_only`         | ✅            | ✅                 | ❌             | ✅                  |
| `online_offline`      | ✅            | ✅                 | ✅             | ✅                  |
| `offline_only`        | ❌            | ❌                 | ✅             | ✅                  |

The asymmetry is deliberate: **offline recordings are visible to all three variants** (`online_only` buyers get the in-person session recordings without being attendees), while **online recordings follow live entitlement** (offline-only buyers never get them). Live attendance is strictly format-gated.

### Booking-level helpers (handle legacy bookings)

Access routes never call `resolveTicketAccess` directly — they call the two booking-level wrappers, which add the legacy back-compat rule:

```ts
/** Whether an active track booking lets the viewer join an event's live session. */
export function bookingGrantsLiveAttendance(
  ticketType: TicketType | null | undefined,
  eventFormat: EventFormat,
): boolean {
  if (!ticketType) return true;
  return canAttendLive(ticketType, eventFormat);
}

/** Whether an active track booking lets the viewer open a recording (eventFormat null = general). */
export function bookingGrantsRecording(
  ticketType: TicketType | null | undefined,
  eventFormat: EventFormat | null,
): boolean {
  if (!ticketType) return true;
  return canAccessRecording(ticketType, eventFormat);
}
```

Two conventions encoded here:

- **`ticketType` null = grants everything.** `trackBookings.ticketType` is nullable (`server/src/db/schema/index.ts:274`). A NULL ticket is a legacy booking (or a booking on a non-ticket-typed track) that historically unlocked the whole track, so it keeps full access. Existing rows backfilled to `online_offline`; new code must keep tolerating NULL.
- **`eventFormat` null on a recording = general track content** and follows the offline rule (visible to all three ticket types). See `canAccessRecording`: `if (eventFormat === null) return true;`.

### Active bookings = `revoked_at IS NULL` (NOT a `status` column)

There is **no `trackBookings.status` column** anymore. A booking is active when `revoked_at IS NULL` (`server/src/db/schema/index.ts:278`). Every query filters through one helper (`server/src/utils/booking.ts`):

```ts
export function activeTrackBookingWhere(...conditions: MaybeCondition[]) {
  return and(...definedConditions(conditions), isNull(trackBookings.revokedAt));
}
```

Row-level checks use `isTrackBookingActive(booking)` / `hasTrackBookingRow(rows)` from the same file (active = `revokedAt` is `null`/`undefined`). The matching DB indexes are `(track_id, revoked_at)` and `(user_id, revoked_at)`.

## Solution

### Events — meeting link vs location URL (`server/src/routes/api/events.ts:531-573`)

The detail handler resolves access in order **staff → direct attendee → track-booking ticket**, then format-gates the two URLs. A direct attendee is one whose `eventAttendees.sourceTrackBookingId IS NULL` (a standalone registration), which stays additive — a track booking whose ticket doesn't cover the format must never mask a real standalone registration.

```ts
// load the viewer's active booking + its ticket variant
const [booking] = await db
  .select({ id: trackBookings.id, ticketType: trackBookings.ticketType })
  .from(trackBookings)
  .where(activeTrackBookingWhere(
    eq(trackBookings.trackId, trackInfo.id),
    eq(trackBookings.userId, viewerId),
  ))
  .limit(1);
bookingTicketType = booking?.ticketType ?? null;

const directAttendee = attending && (existing?.sourceTrackBookingId ?? null) === null;
let canAttendLiveSession = isStaff || directAttendee;
if (!canAttendLiveSession && trackBooked) {
  canAttendLiveSession = bookingGrantsLiveAttendance(bookingTicketType, event.eventFormat);
}

const canAccessMeetingLink = event.eventFormat === 'online'  && canAttendLiveSession;
const canAccessLocationUrl = event.eventFormat === 'offline' && canAttendLiveSession;
// ... meetingLink: canAccessMeetingLink ? event.meetingLink : null
// ... locationUrl: canAccessLocationUrl ? event.locationUrl : null
```

The list endpoint (`GET /events`) hard-nulls both `meetingLink` and `locationUrl` for everyone — these are only ever revealed through the detail endpoint.

### Tracks — `serializeTrackLocationUrl()` (`server/src/routes/api/tracks.ts:252-265`)

A track's venue URL is offline-by-nature, so it gates on offline live entitlement:

```ts
function serializeTrackLocationUrl(params: {
  locationUrl: string | null;
  isStaff: boolean;
  userHasBooked: boolean;
  bookingTicketType: TicketType | null;
}): string | null {
  if (params.isStaff) return params.locationUrl;
  if (params.userHasBooked && bookingGrantsLiveAttendance(params.bookingTicketType, 'offline')) {
    return params.locationUrl;
  }
  return null;
}
```

So an `online_only` booker does **not** see the track venue URL (correct — they have no in-person entitlement), while `online_offline` and `offline_only` bookers do. The track list endpoint returns `locationUrl: null` and defers the reveal to the detail endpoint, which loads the booking's `ticketType` via `activeTrackBookingWhere(...)`.

### Library / Series — per-asset recording access

Series-level and asset-level decisions live in `server/src/routes/api/seriesAccess.ts`. The functions are `resolveSeriesAccess()` and `resolveSeriesAssetAccess()` — **there is no `canAccessSeries()`** (that name from the old doc never existed in current code).

```ts
export function resolveSeriesAssetAccess(input: SeriesAssetAccessInput): boolean {
  if (input.isStaff || input.isSubscriber || input.hasSeriesGrant) {
    return true;
  }

  // A track booking grants this specific recording only when the ticket matrix allows it. This
  // replaces the old "any booking unlocks every premium asset" short-circuit and is what lets an
  // online_only buyer open offline recordings while an offline_only buyer cannot open online ones.
  if (
    input.hasTrackBooking &&
    bookingGrantsRecording(input.bookingTicketType, input.assetEventFormat)
  ) {
    return true;
  }

  if (input.seriesIsPremium || input.assetIsPremium) {
    return false;
  }
  return input.assetIsPublic || !input.assetEventId || input.userEventIds.has(input.assetEventId);
}
```

`server/src/routes/api/library.ts` implements the same rule directly against the DB. For premium assets it joins `seriesAssets → series → trackBookings` (active via `activeTrackBookingWhere`) and the asset's linked event format, then filters bookings through `bookingGrantsRecording(ticketType, eventFormat)`:

- List endpoint (`library.ts:269-273`): `bookedAssetIds` only includes assets whose booking passes `bookingGrantsRecording(asset.ticketType, asset.eventFormat ?? null)`.
- Detail endpoint (`library.ts:430-432`): `hasTrackBooking = bookingRows.some((b) => bookingGrantsRecording(b.ticketType, asset[0].eventFormat ?? null))`.

Access to a premium asset is granted by **any** of: staff, active subscription, an explicit `seriesAccessGrants` row (`revoked_at IS NULL`), a ticket-permitted track booking, or direct registration for the asset's linked event.

## Prevention

1. **Never gate on `trackBookings.status`.** That column does not exist. Use `activeTrackBookingWhere(...)` in queries and `isTrackBookingActive()` / `hasTrackBookingRow()` for in-memory rows. Active = `revoked_at IS NULL`.
2. **Always resolve through the matrix helpers**, never a blanket "has a booking" boolean. Live attendance → `bookingGrantsLiveAttendance(ticketType, eventFormat)`; recordings → `bookingGrantsRecording(ticketType, eventFormat|null)`; raw decisions → `resolveTicketAccess()`. Don't re-implement the truth table inline.
3. **Format-gate the right field.** Online events expose `meetingLink`; offline events expose `locationUrl`. A track's `locationUrl` is offline-only (`bookingGrantsLiveAttendance(..., 'offline')`).
4. **Honor the recording asymmetry.** Offline recordings are visible to all three ticket types; online recordings follow online live entitlement. A recording with no linked event (`eventFormat === null`) is general track content and is visible to everyone with a booking.
5. **Keep the legacy NULL-ticket path.** A NULL `ticketType` means a legacy/non-ticket booking that grants everything — every helper short-circuits `if (!ticketType) return true`. New content types and access checks must preserve this back-compat behavior.
6. **Direct registrations are additive.** A standalone `eventAttendees` row (`sourceTrackBookingId IS NULL`) must keep its access even when the viewer also holds a track booking whose ticket doesn't cover that event's format.
7. **New sellable/sensitive content types** must route every reveal through these helpers and respect online/offline entitlement — don't add a new "if booked, show it" branch.
