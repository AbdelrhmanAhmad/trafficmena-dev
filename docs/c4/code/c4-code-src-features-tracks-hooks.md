# C4 Code Level: Tracks hooks

## Overview

- **Name**: Tracks hooks
- **Description**: Tracks hooks React hooks and stateful helper logic.
- **Location**: [src/features/tracks/hooks](../../../src/features/tracks/hooks)
- **Language**: TypeScript
- **Purpose**: Share reusable tracks hooks interaction and data-fetching behavior across components.

## Code Elements

### Functions/Methods

- `useTrackAttendees(trackId: string | undefined, pageSize = 20, search: string | undefined = undefined): unknown`
  - Description: React hook that manages track attendees behavior.
  - Location: [src/features/tracks/hooks/useTrackAttendees.ts](../../../src/features/tracks/hooks/useTrackAttendees.ts) (line 6)
  - Dependencies: @/app/api/tracks, @tanstack/react-query, react
- `useTrackBooking(trackId: string): unknown`
  - Description: React hook that manages track booking behavior.
  - Location: [src/features/tracks/hooks/useTrackBooking.ts](../../../src/features/tracks/hooks/useTrackBooking.ts) (line 5)
  - Dependencies: @/app/api/tracks, @tanstack/react-query, sonner
- `useTracks(page = 1, pageSize = 12, filters?: { search?: string }): unknown`
  - Description: React hook that manages tracks behavior.
  - Location: [src/features/tracks/hooks/useTracks.ts](../../../src/features/tracks/hooks/useTracks.ts) (line 20)
  - Dependencies: @/app/api/tracks, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useTrack(id: string): unknown`
  - Description: React hook that manages track behavior.
  - Location: [src/features/tracks/hooks/useTracks.ts](../../../src/features/tracks/hooks/useTracks.ts) (line 41)
  - Dependencies: @/app/api/tracks, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useAllTracks(): unknown`
  - Description: React hook that manages all tracks behavior.
  - Location: [src/features/tracks/hooks/useTracks.ts](../../../src/features/tracks/hooks/useTracks.ts) (line 51)
  - Dependencies: @/app/api/tracks, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useCreateTrack(): unknown`
  - Description: React hook that manages create track behavior.
  - Location: [src/features/tracks/hooks/useTracks.ts](../../../src/features/tracks/hooks/useTracks.ts) (line 63)
  - Dependencies: @/app/api/tracks, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useUpdateTrack(): unknown`
  - Description: React hook that manages update track behavior.
  - Location: [src/features/tracks/hooks/useTracks.ts](../../../src/features/tracks/hooks/useTracks.ts) (line 87)
  - Dependencies: @/app/api/tracks, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useDeleteTrack(): unknown`
  - Description: React hook that manages delete track behavior.
  - Location: [src/features/tracks/hooks/useTracks.ts](../../../src/features/tracks/hooks/useTracks.ts) (line 111)
  - Dependencies: @/app/api/tracks, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useAddEventsToTrack(): unknown`
  - Description: React hook that manages add events to track behavior.
  - Location: [src/features/tracks/hooks/useTracks.ts](../../../src/features/tracks/hooks/useTracks.ts) (line 136)
  - Dependencies: @/app/api/tracks, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useRemoveEventFromTrack(): unknown`
  - Description: React hook that manages remove event from track behavior.
  - Location: [src/features/tracks/hooks/useTracks.ts](../../../src/features/tracks/hooks/useTracks.ts) (line 163)
  - Dependencies: @/app/api/tracks, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useReorderTrackEvents(): unknown`
  - Description: React hook that manages reorder track events behavior.
  - Location: [src/features/tracks/hooks/useTracks.ts](../../../src/features/tracks/hooks/useTracks.ts) (line 188)
  - Dependencies: @/app/api/tracks, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `usePublicTracks(page = 1, pageSize = 12): unknown`
  - Description: React hook that manages public tracks behavior.
  - Location: [src/features/tracks/hooks/useTracks.ts](../../../src/features/tracks/hooks/useTracks.ts) (line 201)
  - Dependencies: @/app/api/tracks, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `usePublicTrack(id: string, viewerKey?: string): unknown`
  - Description: React hook that manages public track behavior.
  - Location: [src/features/tracks/hooks/useTracks.ts](../../../src/features/tracks/hooks/useTracks.ts) (line 210)
  - Dependencies: @/app/api/tracks, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useBookTrack(): unknown`
  - Description: React hook that manages book track behavior.
  - Location: [src/features/tracks/hooks/useTracks.ts](../../../src/features/tracks/hooks/useTracks.ts) (line 221)
  - Dependencies: @/app/api/tracks, @/shared/hooks/custom/use-toast, @tanstack/react-query

### Classes/Modules

- `useTrackAttendees.ts`
  - Description: Module that implements use track attendees responsibilities for this directory.
  - Location: [src/features/tracks/hooks/useTrackAttendees.ts](../../../src/features/tracks/hooks/useTrackAttendees.ts)
  - Contains: 1 function(s)
  - Dependencies: @/app/api/tracks, @tanstack/react-query, react
- `useTrackBooking.ts`
  - Description: Module that implements use track booking responsibilities for this directory.
  - Location: [src/features/tracks/hooks/useTrackBooking.ts](../../../src/features/tracks/hooks/useTrackBooking.ts)
  - Contains: 1 function(s)
  - Dependencies: @/app/api/tracks, @tanstack/react-query, sonner
- `useTracks.ts`
  - Description: Module that implements use tracks responsibilities for this directory.
  - Location: [src/features/tracks/hooks/useTracks.ts](../../../src/features/tracks/hooks/useTracks.ts)
  - Contains: 12 function(s)
  - Dependencies: @/app/api/tracks, @/shared/hooks/custom/use-toast, @tanstack/react-query

## Dependencies

### Internal Dependencies

- @/app/api/tracks
- @/shared/hooks/custom/use-toast

### External Dependencies

- @tanstack/react-query
- react
- sonner

## Admin-Only Additions

- `useTrackEnrollmentManagement.ts` — Manager-level mutations for manual enrollment: `POST /api/tracks/:id/manual-enrollments` and `POST /api/tracks/:id/enrollments/:userId/revoke`. Invalidates track and attendee queries on success. Consumed only by `TrackManualEnrollmentManager` on the admin track detail page.
- `useTrackBooking.ts` now feeds `src/features/tracks/trackBookingAnalytics.ts` so every paid and free auto-booking emits a consistent `track_booking` dataLayer event through `src/lib/analytics/events.ts`.

