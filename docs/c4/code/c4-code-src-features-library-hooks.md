# C4 Code Level: Library hooks

## Overview

- **Name**: Library hooks
- **Description**: Library hooks React hooks and stateful helper logic.
- **Location**: [src/features/library/hooks](../../../src/features/library/hooks)
- **Language**: TypeScript
- **Purpose**: Share reusable library hooks interaction and data-fetching behavior across components.

## Code Elements

### Functions/Methods

- `useLibraryAssets(page: number, itemsPerPage: number, filters?: LibraryFilters): unknown`
  - Description: React hook that manages library assets behavior.
  - Location: [src/features/library/hooks/useLibrary.ts](../../../src/features/library/hooks/useLibrary.ts) (line 15)
  - Dependencies: ../types, @/app/api/library, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useLibraryAsset(id: string): unknown`
  - Description: React hook that manages library asset behavior.
  - Location: [src/features/library/hooks/useLibrary.ts](../../../src/features/library/hooks/useLibrary.ts) (line 46)
  - Dependencies: ../types, @/app/api/library, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useAssetsByEventId(eventId: string): unknown`
  - Description: React hook that manages assets by event id behavior.
  - Location: [src/features/library/hooks/useLibrary.ts](../../../src/features/library/hooks/useLibrary.ts) (line 60)
  - Dependencies: ../types, @/app/api/library, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useAssetsByEventIds(eventIds: string[]): unknown`
  - Description: React hook that manages assets by event ids behavior.
  - Location: [src/features/library/hooks/useLibrary.ts](../../../src/features/library/hooks/useLibrary.ts) (line 76)
  - Dependencies: ../types, @/app/api/library, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useAllLibraryAssets(): unknown`
  - Description: React hook that manages all library assets behavior.
  - Location: [src/features/library/hooks/useLibrary.ts](../../../src/features/library/hooks/useLibrary.ts) (line 110)
  - Dependencies: ../types, @/app/api/library, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useLibraryStatistics(): unknown`
  - Description: React hook that manages library statistics behavior.
  - Location: [src/features/library/hooks/useLibrary.ts](../../../src/features/library/hooks/useLibrary.ts) (line 122)
  - Dependencies: ../types, @/app/api/library, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useCreateLibraryAsset(): unknown`
  - Description: React hook that manages create library asset behavior.
  - Location: [src/features/library/hooks/useLibrary.ts](../../../src/features/library/hooks/useLibrary.ts) (line 146)
  - Dependencies: ../types, @/app/api/library, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useUpdateLibraryAsset(): unknown`
  - Description: React hook that manages update library asset behavior.
  - Location: [src/features/library/hooks/useLibrary.ts](../../../src/features/library/hooks/useLibrary.ts) (line 172)
  - Dependencies: ../types, @/app/api/library, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useDeleteLibraryAsset(): unknown`
  - Description: React hook that manages delete library asset behavior.
  - Location: [src/features/library/hooks/useLibrary.ts](../../../src/features/library/hooks/useLibrary.ts) (line 200)
  - Dependencies: ../types, @/app/api/library, @/shared/hooks/custom/use-toast, @tanstack/react-query

### Classes/Modules

- `useLibrary.ts`
  - Description: Module that implements use library responsibilities for this directory.
  - Location: [src/features/library/hooks/useLibrary.ts](../../../src/features/library/hooks/useLibrary.ts)
  - Contains: 9 function(s)
  - Dependencies: ../types, @/app/api/library, @/shared/hooks/custom/use-toast, @tanstack/react-query

## Dependencies

### Internal Dependencies

- ../types
- @/app/api/library
- @/shared/hooks/custom/use-toast

### External Dependencies

- @tanstack/react-query

