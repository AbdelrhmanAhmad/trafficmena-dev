# C4 Code Level: Hooks custom

## Overview

- **Name**: Hooks custom
- **Description**: Hooks custom React hooks and stateful helper logic.
- **Location**: [src/shared/hooks/custom](../../../src/shared/hooks/custom)
- **Language**: TypeScript
- **Purpose**: Share reusable hooks custom interaction and data-fetching behavior across components.

## Code Elements

### Functions/Methods

- `useIsMobile(): unknown`
  - Description: React hook that manages is mobile behavior.
  - Location: [src/shared/hooks/custom/use-mobile.tsx](../../../src/shared/hooks/custom/use-mobile.tsx) (line 5)
  - Dependencies: react
- `genId(): unknown`
  - Description: Implements gen id behavior for this module.
  - Location: [src/shared/hooks/custom/use-toast.ts](../../../src/shared/hooks/custom/use-toast.ts) (line 24)
  - Dependencies: @/shared/components/ui/toast, react
- `addToRemoveQueue(toastId: string): unknown`
  - Description: Implements add to remove queue behavior for this module.
  - Location: [src/shared/hooks/custom/use-toast.ts](../../../src/shared/hooks/custom/use-toast.ts) (line 55)
  - Dependencies: @/shared/components/ui/toast, react
- `reducer(state: State, action: Action): State`
  - Description: Implements reducer behavior for this module.
  - Location: [src/shared/hooks/custom/use-toast.ts](../../../src/shared/hooks/custom/use-toast.ts) (line 71)
  - Dependencies: @/shared/components/ui/toast, react
- `dispatch(action: Action): unknown`
  - Description: Implements dispatch behavior for this module.
  - Location: [src/shared/hooks/custom/use-toast.ts](../../../src/shared/hooks/custom/use-toast.ts) (line 128)
  - Dependencies: @/shared/components/ui/toast, react
- `toast({ ...props }: Toast): unknown`
  - Description: Implements toast behavior for this module.
  - Location: [src/shared/hooks/custom/use-toast.ts](../../../src/shared/hooks/custom/use-toast.ts) (line 137)
  - Dependencies: @/shared/components/ui/toast, react
- `useToast(): unknown`
  - Description: React hook that manages toast behavior.
  - Location: [src/shared/hooks/custom/use-toast.ts](../../../src/shared/hooks/custom/use-toast.ts) (line 166)
  - Dependencies: @/shared/components/ui/toast, react
- `useIsAdmin(): unknown`
  - Description: React hook that manages is admin behavior.
  - Location: [src/shared/hooks/custom/useIsAdmin.ts](../../../src/shared/hooks/custom/useIsAdmin.ts) (line 3)
  - Dependencies: @/shared/hooks/custom/useRolePermissions
- `useIsManager(): unknown`
  - Description: React hook that manages is manager behavior.
  - Location: [src/shared/hooks/custom/useIsManager.ts](../../../src/shared/hooks/custom/useIsManager.ts) (line 3)
  - Dependencies: @/shared/hooks/custom/useRolePermissions
- `useLocationVisibility(locationUrl: string | null | undefined, isRegistered: boolean, isAdmin: boolean, isLoading = false): unknown`
  - Description: React hook that manages location visibility behavior.
  - Location: [src/shared/hooks/custom/useLocationVisibility.ts](../../../src/shared/hooks/custom/useLocationVisibility.ts) (line 7)
  - Dependencies: react
- `isValidLocationUrl(url: string): boolean`
  - Description: Checks whether valid location url.
  - Location: [src/shared/hooks/custom/useLocationVisibility.ts](../../../src/shared/hooks/custom/useLocationVisibility.ts) (line 24)
  - Dependencies: react
- `usePagination({
  itemsPerPage = 10,
  initialPage = 1,
}: UsePaginationProps = {}): UsePaginationReturn`
  - Description: React hook that manages pagination behavior.
  - Location: [src/shared/hooks/custom/usePagination.ts](../../../src/shared/hooks/custom/usePagination.ts) (line 18)
  - Dependencies: @/types, react
- `normalizeRole(value: string | null | undefined): UserRole`
  - Description: Implements normalize role behavior for this module.
  - Location: [src/shared/hooks/custom/useRolePermissions.ts](../../../src/shared/hooks/custom/useRolePermissions.ts) (line 15)
  - Dependencies: @/app/hooks/useCurrentUser, @/shared/context/AuthContext, react
- `useRolePermissions(): unknown`
  - Description: React hook that manages role permissions behavior.
  - Location: [src/shared/hooks/custom/useRolePermissions.ts](../../../src/shared/hooks/custom/useRolePermissions.ts) (line 25)
  - Dependencies: @/app/hooks/useCurrentUser, @/shared/context/AuthContext, react
- `getRolePriority(role: UserRole): unknown`
  - Description: Returns role priority derived from current inputs or state.
  - Location: [src/shared/hooks/custom/useRolePermissions.ts](../../../src/shared/hooks/custom/useRolePermissions.ts) (line 61)
  - Dependencies: @/app/hooks/useCurrentUser, @/shared/context/AuthContext, react
- `useSecureQuery(options: UseSecureQueryOptions = {}): unknown`
  - Description: React hook that manages secure query behavior.
  - Location: [src/shared/hooks/custom/useSecureQuery.ts](../../../src/shared/hooks/custom/useSecureQuery.ts) (line 13)
  - Dependencies: @tanstack/react-query, react

### Classes/Modules

- `use-mobile.tsx`
  - Description: Module that implements use mobile responsibilities for this directory.
  - Location: [src/shared/hooks/custom/use-mobile.tsx](../../../src/shared/hooks/custom/use-mobile.tsx)
  - Contains: 1 function(s)
  - Dependencies: react
- `use-toast.ts`
  - Description: Module that implements use toast responsibilities for this directory.
  - Location: [src/shared/hooks/custom/use-toast.ts](../../../src/shared/hooks/custom/use-toast.ts)
  - Contains: 6 function(s)
  - Dependencies: @/shared/components/ui/toast, react
- `useIsAdmin.ts`
  - Description: Module that implements use is admin responsibilities for this directory.
  - Location: [src/shared/hooks/custom/useIsAdmin.ts](../../../src/shared/hooks/custom/useIsAdmin.ts)
  - Contains: 1 function(s)
  - Dependencies: @/shared/hooks/custom/useRolePermissions
- `useIsManager.ts`
  - Description: Module that implements use is manager responsibilities for this directory.
  - Location: [src/shared/hooks/custom/useIsManager.ts](../../../src/shared/hooks/custom/useIsManager.ts)
  - Contains: 1 function(s)
  - Dependencies: @/shared/hooks/custom/useRolePermissions
- `useLocationVisibility.ts`
  - Description: Module that implements use location visibility responsibilities for this directory.
  - Location: [src/shared/hooks/custom/useLocationVisibility.ts](../../../src/shared/hooks/custom/useLocationVisibility.ts)
  - Contains: 2 function(s)
  - Dependencies: react
- `usePagination.ts`
  - Description: Module that implements use pagination responsibilities for this directory.
  - Location: [src/shared/hooks/custom/usePagination.ts](../../../src/shared/hooks/custom/usePagination.ts)
  - Contains: 1 function(s)
  - Dependencies: @/types, react
- `useRolePermissions.ts`
  - Description: Module that implements use role permissions responsibilities for this directory.
  - Location: [src/shared/hooks/custom/useRolePermissions.ts](../../../src/shared/hooks/custom/useRolePermissions.ts)
  - Contains: 3 function(s)
  - Dependencies: @/app/hooks/useCurrentUser, @/shared/context/AuthContext, react
- `useSecureQuery.ts`
  - Description: Module that implements use secure query responsibilities for this directory.
  - Location: [src/shared/hooks/custom/useSecureQuery.ts](../../../src/shared/hooks/custom/useSecureQuery.ts)
  - Contains: 1 function(s)
  - Dependencies: @tanstack/react-query, react

## Dependencies

### Internal Dependencies

- @/app/hooks/useCurrentUser
- @/shared/components/ui/toast
- @/shared/context/AuthContext
- @/shared/hooks/custom/useRolePermissions
- @/types

### External Dependencies

- @tanstack/react-query
- react

