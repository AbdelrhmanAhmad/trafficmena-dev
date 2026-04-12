# C4 Code Level: Events hooks

## Overview

- **Name**: Events hooks
- **Description**: Events hooks React hooks and stateful helper logic.
- **Location**: [src/features/events/hooks](../../../src/features/events/hooks)
- **Language**: TypeScript
- **Purpose**: Share reusable events hooks interaction and data-fetching behavior across components.

## Code Elements

### Functions/Methods

- `useEventAttendees(eventId: string | undefined, pageSize = 20, search: string | undefined = undefined): unknown`
  - Description: React hook that manages event attendees behavior.
  - Location: [src/features/events/hooks/useEventAttendees.ts](../../../src/features/events/hooks/useEventAttendees.ts) (line 10)
  - Dependencies: @/app/api/events, @tanstack/react-query, react
- `useEventBooking(): unknown`
  - Description: React hook that manages event booking behavior.
  - Location: [src/features/events/hooks/useEventBooking.ts](../../../src/features/events/hooks/useEventBooking.ts) (line 13)
  - Dependencies: ../types, @/app/api/events, @tanstack/react-query, sonner
- `useUpcomingEventsList(limit: number = 5): unknown`
  - Description: React hook that manages upcoming events list behavior.
  - Location: [src/features/events/hooks/useEventBooking.ts](../../../src/features/events/hooks/useEventBooking.ts) (line 79)
  - Dependencies: ../types, @/app/api/events, @tanstack/react-query, sonner
- `buildEventQueryParams({ page, itemsPerPage, filters }: FetchEventsParams): unknown`
  - Description: Builds event query params from available inputs.
  - Location: [src/features/events/hooks/useEvents.ts](../../../src/features/events/hooks/useEvents.ts) (line 23)
  - Dependencies: ../types, @/app/api/events, @/shared/hooks/custom/use-toast, @/shared/utils/errorHandling, @tanstack/react-query
- `useEvents(page: number, itemsPerPage: number, filters?: EventFilters): unknown`
  - Description: React hook that manages events behavior.
  - Location: [src/features/events/hooks/useEvents.ts](../../../src/features/events/hooks/useEvents.ts) (line 50)
  - Dependencies: ../types, @/app/api/events, @/shared/hooks/custom/use-toast, @/shared/utils/errorHandling, @tanstack/react-query
- `useEvent(id: string | undefined): unknown`
  - Description: React hook that manages event behavior.
  - Location: [src/features/events/hooks/useEvents.ts](../../../src/features/events/hooks/useEvents.ts) (line 68)
  - Dependencies: ../types, @/app/api/events, @/shared/hooks/custom/use-toast, @/shared/utils/errorHandling, @tanstack/react-query
- `useCreateEvent(): unknown`
  - Description: React hook that manages create event behavior.
  - Location: [src/features/events/hooks/useEvents.ts](../../../src/features/events/hooks/useEvents.ts) (line 77)
  - Dependencies: ../types, @/app/api/events, @/shared/hooks/custom/use-toast, @/shared/utils/errorHandling, @tanstack/react-query
- `useUpdateEvent(id: string): unknown`
  - Description: React hook that manages update event behavior.
  - Location: [src/features/events/hooks/useEvents.ts](../../../src/features/events/hooks/useEvents.ts) (line 104)
  - Dependencies: ../types, @/app/api/events, @/shared/hooks/custom/use-toast, @/shared/utils/errorHandling, @tanstack/react-query
- `useDeleteEvent(): unknown`
  - Description: React hook that manages delete event behavior.
  - Location: [src/features/events/hooks/useEvents.ts](../../../src/features/events/hooks/useEvents.ts) (line 132)
  - Dependencies: ../types, @/app/api/events, @/shared/hooks/custom/use-toast, @/shared/utils/errorHandling, @tanstack/react-query
- `useEventsQuery(page: number, itemsPerPage: number): unknown`
  - Description: React hook that manages events query behavior.
  - Location: [src/features/events/hooks/useEventsQuery.ts](../../../src/features/events/hooks/useEventsQuery.ts) (line 9)
  - Dependencies: @/app/api/events, @tanstack/react-query

### Classes/Modules

- `useEventAttendees.ts`
  - Description: Module that implements use event attendees responsibilities for this directory.
  - Location: [src/features/events/hooks/useEventAttendees.ts](../../../src/features/events/hooks/useEventAttendees.ts)
  - Contains: 1 function(s)
  - Dependencies: @/app/api/events, @tanstack/react-query, react
- `useEventBooking.ts`
  - Description: Module that implements use event booking responsibilities for this directory.
  - Location: [src/features/events/hooks/useEventBooking.ts](../../../src/features/events/hooks/useEventBooking.ts)
  - Contains: 2 function(s)
  - Dependencies: ../types, @/app/api/events, @tanstack/react-query, sonner
- `useEvents.ts`
  - Description: Module that implements use events responsibilities for this directory.
  - Location: [src/features/events/hooks/useEvents.ts](../../../src/features/events/hooks/useEvents.ts)
  - Contains: 6 function(s)
  - Dependencies: ../types, @/app/api/events, @/shared/hooks/custom/use-toast, @/shared/utils/errorHandling, @tanstack/react-query
- `useEventsQuery.ts`
  - Description: Module that implements use events query responsibilities for this directory.
  - Location: [src/features/events/hooks/useEventsQuery.ts](../../../src/features/events/hooks/useEventsQuery.ts)
  - Contains: 1 function(s)
  - Dependencies: @/app/api/events, @tanstack/react-query

## Dependencies

### Internal Dependencies

- ../types
- @/app/api/events
- @/shared/hooks/custom/use-toast
- @/shared/utils/errorHandling

### External Dependencies

- @tanstack/react-query
- react
- sonner

