# C4 Code Level: Library series

## Overview

- **Name**: Library series
- **Description**: Library series route-level page modules.
- **Location**: [src/pages/admin/library/series](../../../src/pages/admin/library/series)
- **Language**: TypeScript
- **Purpose**: Compose full-screen library series experiences that are mounted by the SPA router.

## Code Elements

### Functions/Methods

- `getAssetIcon(fileType: string): unknown`
  - Description: Returns asset icon derived from current inputs or state.
  - Location: [src/pages/admin/library/series/[id].tsx](../../../src/pages/admin/library/series/[id].tsx) (line 37)
  - Dependencies: @/features/series, @/features/series/components/SeriesAccessManager, @/features/series/hooks/useSeries, @/shared/components/LoadingSpinner, @/shared/components/layout/AdminProtectedRoute, @/shared/components/layout/AppLayout, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/hooks/custom/use-toast, @/shared/hooks/custom/useRolePermissions, lucide-react, react, react-router-dom
- `SeriesDetailPage(): unknown`
  - Description: Implements series detail page behavior for this module.
  - Location: [src/pages/admin/library/series/[id].tsx](../../../src/pages/admin/library/series/[id].tsx) (line 48)
  - Dependencies: @/features/series, @/features/series/components/SeriesAccessManager, @/features/series/hooks/useSeries, @/shared/components/LoadingSpinner, @/shared/components/layout/AdminProtectedRoute, @/shared/components/layout/AppLayout, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/hooks/custom/use-toast, @/shared/hooks/custom/useRolePermissions, lucide-react, react, react-router-dom
- `NewSeriesPage(): unknown`
  - Description: Implements new series page behavior for this module.
  - Location: [src/pages/admin/library/series/new.tsx](../../../src/pages/admin/library/series/new.tsx) (line 16)
  - Dependencies: @/features/series, @/features/series/hooks/useSeries, @/shared/components/layout/AdminProtectedRoute, @/shared/components/layout/AppLayout, @/shared/components/ui/button, @/shared/components/ui/card, lucide-react, react-router-dom

### Classes/Modules

- `[id].tsx`
  - Description: Module that implements [id] responsibilities for this directory.
  - Location: [src/pages/admin/library/series/[id].tsx](../../../src/pages/admin/library/series/[id].tsx)
  - Contains: 2 function(s)
  - Dependencies: @/features/series, @/features/series/components/SeriesAccessManager, @/features/series/hooks/useSeries, @/shared/components/LoadingSpinner, @/shared/components/layout/AdminProtectedRoute, @/shared/components/layout/AppLayout, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/hooks/custom/use-toast, @/shared/hooks/custom/useRolePermissions, lucide-react, react, react-router-dom
- `new.tsx`
  - Description: Module that implements new responsibilities for this directory.
  - Location: [src/pages/admin/library/series/new.tsx](../../../src/pages/admin/library/series/new.tsx)
  - Contains: 1 function(s)
  - Dependencies: @/features/series, @/features/series/hooks/useSeries, @/shared/components/layout/AdminProtectedRoute, @/shared/components/layout/AppLayout, @/shared/components/ui/button, @/shared/components/ui/card, lucide-react, react-router-dom

## Dependencies

### Internal Dependencies

- @/features/series
- @/features/series/components/SeriesAccessManager
- @/features/series/hooks/useSeries
- @/shared/components/LoadingSpinner
- @/shared/components/layout/AdminProtectedRoute
- @/shared/components/layout/AppLayout
- @/shared/components/ui/button
- @/shared/components/ui/card
- @/shared/hooks/custom/use-toast
- @/shared/hooks/custom/useRolePermissions

### External Dependencies

- lucide-react
- react
- react-router-dom

