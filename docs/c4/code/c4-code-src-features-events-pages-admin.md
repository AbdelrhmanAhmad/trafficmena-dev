# C4 Code Level: Pages admin

## Overview

- **Name**: Pages admin
- **Description**: Pages admin route-level page modules.
- **Location**: [src/features/events/pages/admin](../../../src/features/events/pages/admin)
- **Language**: TypeScript
- **Purpose**: Compose full-screen pages admin experiences that are mounted by the SPA router.

## Code Elements

### Functions/Methods

- `AdminMeetupEdit(): unknown`
  - Description: Implements admin meetup edit behavior for this module.
  - Location: [src/features/events/pages/admin/edit.tsx](../../../src/features/events/pages/admin/edit.tsx) (line 12)
  - Dependencies: ../../components/AdminEventForm, ../../hooks/useEvents, @/shared/components/DataLoader, @/shared/components/layout/AdminProtectedRoute, @/shared/components/layout/AppLayout, @/shared/components/ui/card, @/shared/hooks/custom/useRolePermissions, lucide-react, react, react-router-dom
- `AdminMeetupsNew(): unknown`
  - Description: Implements admin meetups new behavior for this module.
  - Location: [src/features/events/pages/admin/new.tsx](../../../src/features/events/pages/admin/new.tsx) (line 11)
  - Dependencies: ../../components/AdminEventForm, ../../hooks/useEvents, @/features/tracks/hooks/useTracks, @/shared/components/layout/AdminProtectedRoute, @/shared/components/layout/AppLayout, @/shared/components/ui/card, @/shared/hooks/custom/use-toast, lucide-react, react-router-dom

### Classes/Modules

- `edit.tsx`
  - Description: Module that implements edit responsibilities for this directory.
  - Location: [src/features/events/pages/admin/edit.tsx](../../../src/features/events/pages/admin/edit.tsx)
  - Contains: 1 function(s)
  - Dependencies: ../../components/AdminEventForm, ../../hooks/useEvents, @/shared/components/DataLoader, @/shared/components/layout/AdminProtectedRoute, @/shared/components/layout/AppLayout, @/shared/components/ui/card, @/shared/hooks/custom/useRolePermissions, lucide-react, react, react-router-dom
- `new.tsx`
  - Description: Module that implements new responsibilities for this directory.
  - Location: [src/features/events/pages/admin/new.tsx](../../../src/features/events/pages/admin/new.tsx)
  - Contains: 1 function(s)
  - Dependencies: ../../components/AdminEventForm, ../../hooks/useEvents, @/features/tracks/hooks/useTracks, @/shared/components/layout/AdminProtectedRoute, @/shared/components/layout/AppLayout, @/shared/components/ui/card, @/shared/hooks/custom/use-toast, lucide-react, react-router-dom

## Dependencies

### Internal Dependencies

- ../../components/AdminEventForm
- ../../hooks/useEvents
- @/features/tracks/hooks/useTracks
- @/shared/components/DataLoader
- @/shared/components/layout/AdminProtectedRoute
- @/shared/components/layout/AppLayout
- @/shared/components/ui/card
- @/shared/hooks/custom/use-toast
- @/shared/hooks/custom/useRolePermissions

### External Dependencies

- lucide-react
- react
- react-router-dom

