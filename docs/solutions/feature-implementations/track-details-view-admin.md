---
title: "Track Details View for Manager+ Dashboard"
category: "feature-implementations"
tags:
  - rbac
  - role-authorization
  - uuid-validation
  - admin-dashboard
  - tracks
  - attendees
severity: medium
components:
  - "frontend: src/features/tracks/pages/AdminTrackDetail.tsx"
  - "frontend: src/features/tracks/components/TrackAttendeesList.tsx"
  - "frontend: src/features/tracks/hooks/useTrackAttendees.ts"
  - "backend: server/src/routes/api/tracks.ts"
  - "routing: src/App.tsx"
created: 2025-01-02
related:
  - docs/rbac-decision.md
  - docs/solutions/feature-implementations/learning-tracks-and-series-separation.md
  - src/features/events/pages/AdminEventDetail.tsx
---

# Track Details View for Manager+ Dashboard

## Problem Statement

Managers needed a way to view track details and enrolled users without modifying the track. Events had this feature (`/admin/events/:id`) but tracks only had an "Edit" button, requiring managers to open the edit form just to see enrollments.

## Solution Summary

Added "View Details" button to track cards in `/admin/meetups` (Tracks tab) that opens `/admin/tracks/:id` showing:
- Track metadata (title, status, booking dates, capacity)
- Paginated list of enrolled users (name, email, enrollment date)

## Implementation

### Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `src/features/tracks/hooks/useTrackAttendees.ts` | TanStack Query hook for paginated attendees | 30 |
| `src/features/tracks/components/TrackAttendeesList.tsx` | Table component with pagination | 114 |
| `src/features/tracks/pages/AdminTrackDetail.tsx` | Admin detail page | 111 |

### Files Modified

| File | Change |
|------|--------|
| `server/src/routes/api/tracks.ts` | Added `GET /tracks/:id/attendees` endpoint |
| `src/app/api/tracks.ts` | Added `fetchTrackAttendees()` function |
| `src/features/events/pages/AdminMeetups.tsx` | Added "View Details" button |
| `src/App.tsx` | Added route with role permissions |

### Backend Endpoint

```typescript
// GET /api/tracks/:id/attendees - Manager+ required
app.get('/tracks/:id/attendees', async (c) => {
  const staff = await requireManager(c);
  if ('response' in staff) return staff.response;

  // Validate trackId is a valid UUID
  const trackIdParam = c.req.param('id');
  const trackIdResult = z.string().uuid('Invalid track ID format').safeParse(trackIdParam);
  if (!trackIdResult.success) {
    return c.json({ error: { code: 'INVALID_ID', message: 'Invalid track ID format.' } }, 400);
  }
  const trackId = trackIdResult.data;

  // Query trackBookings joined with users/profiles
  // Returns paginated list: userId, email, name, firstName, lastName, bookedAt
});
```

### Route Configuration

```tsx
// src/App.tsx - Must specify allowedRoles for manager access
<Route
  path="/admin/tracks/:id"
  element={
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <ErrorBoundary>
        <AdminTrackDetail />
      </ErrorBoundary>
    </AdminProtectedRoute>
  }
/>
```

## Bugs Fixed During Review

### 1. Frontend Route Missing Manager Role (P1)

**Problem:** `AdminProtectedRoute` defaults to `['owner', 'admin']` only. Managers were blocked from the page even though the backend allowed them.

**Fix:** Added explicit `allowedRoles={['owner', 'admin', 'manager']}` to the route.

### 2. Missing UUID Validation (P2)

**Problem:** `trackId` parameter was used directly in database queries without format validation. Invalid UUIDs caused database errors.

**Fix:** Added Zod UUID validation before any database operations:

```typescript
const trackIdResult = z.string().uuid('Invalid track ID format').safeParse(trackIdParam);
if (!trackIdResult.success) {
  return c.json({ error: { code: 'INVALID_ID', message: 'Invalid track ID format.' } }, 400);
}
```

## Patterns Used

### Mirroring Event Details

The implementation follows the exact pattern as `AdminEventDetail` + `EventAttendeesList`:

| Aspect | Events | Tracks |
|--------|--------|--------|
| Detail page | `AdminEventDetail.tsx` | `AdminTrackDetail.tsx` |
| Attendees component | `EventAttendeesList.tsx` | `TrackAttendeesList.tsx` |
| Hook | `useEventAttendees.ts` | `useTrackAttendees.ts` |
| API endpoint | `GET /events/:id/attendees` | `GET /tracks/:id/attendees` |

### Pagination with TanStack Query

```typescript
const query = useQuery({
  queryKey: ['track-attendees', trackId, page, pageSize],
  queryFn: async () => { /* fetch */ },
  enabled: Boolean(trackId),
  placeholderData: keepPreviousData, // Prevents loading flicker
  staleTime: 2 * 60 * 1000,
});
```

### Name Display Fallback

Handles multiple possible name sources:

```typescript
{attendee.name ||
  [attendee.firstName, attendee.lastName].filter(Boolean).join(' ') ||
  'Unknown Member'}
```

## Prevention Strategies

### 1. Always Specify Route Roles

When creating admin routes, always explicitly set `allowedRoles` rather than relying on defaults:

```tsx
// Bad - relies on default ['owner', 'admin']
<AdminProtectedRoute>

// Good - explicit about who can access
<AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
```

### 2. Validate Route Parameters

Always validate UUID parameters before database queries:

```typescript
const idResult = z.string().uuid().safeParse(c.req.param('id'));
if (!idResult.success) {
  return c.json({ error: { code: 'INVALID_ID', message: '...' } }, 400);
}
```

### 3. Mirror Existing Patterns

When adding parallel features (tracks vs events), copy the existing pattern exactly first, then customize. This ensures consistency and reduces bugs.

## Related Documentation

- [RBAC Decision](../../../docs/rbac-decision.md) - Role hierarchy and permissions
- [Learning Tracks & Series](./learning-tracks-and-series-separation.md) - Track schema and booking logic
- [Admin Content Workflow](../../../docs/admin-content-workflow.md) - Admin operations runbook

## Testing Checklist

- [ ] Manager can click "View Details" on track card
- [ ] Opens `/admin/tracks/:id` without permission error
- [ ] Shows track title, status badge, description
- [ ] Shows booking dates and capacity
- [ ] Shows enrolled users list with pagination
- [ ] "Edit track" button navigates to edit form
- [ ] "View public page" opens public track page
- [ ] Invalid UUID returns 400 error (not 500)
