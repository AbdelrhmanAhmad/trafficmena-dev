# C4 Code Level: Tracks pages

## Overview

- **Name**: Tracks pages
- **Description**: Tracks pages route-level page modules.
- **Location**: [src/features/tracks/pages](../../../src/features/tracks/pages)
- **Language**: TypeScript
- **Purpose**: Compose full-screen tracks pages experiences that are mounted by the SPA router.

## Code Elements

### Functions/Methods

- `AdminTrackDetail(): unknown`
  - Description: Implements admin track detail behavior for this module.
  - Location: [src/features/tracks/pages/AdminTrackDetail.tsx](../../../src/features/tracks/pages/AdminTrackDetail.tsx) (line 13)
  - Dependencies: ../components/TrackAttendeesList, ../hooks/useTracks, @/shared/components/DataLoader, @/shared/components/layout/AppLayout, @/shared/components/ui/badge, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/hooks/custom/use-toast, @/shared/utils/dateUtils, lucide-react, react-router-dom
- `SanitizedDescription({ className, html }: SanitizedHtmlProps): unknown`
  - Description: Implements sanitized description behavior for this module.
  - Location: [src/features/tracks/pages/TrackDetail.tsx](../../../src/features/tracks/pages/TrackDetail.tsx) (line 42)
  - Dependencies: ../hooks/useTracks, ../utils/trackBookingState, @/app/api/tracks, @/app/hooks/usePayments, @/shared/components/DataLoader, @/shared/components/layout/Layout, @/shared/components/payment, @/shared/components/ui/button, @/shared/context/AuthContext, @/shared/hooks/custom/useIsManager, @/shared/hooks/custom/useLocationVisibility, @/shared/utils/trackRedirectUtils, @tanstack/react-query, date-fns, dompurify, lucide-react, react, react-router-dom
- `TrackEventCard({ event }: { event: PublicTrackEventRecord }): unknown`
  - Description: Implements track event card behavior for this module.
  - Location: [src/features/tracks/pages/TrackDetail.tsx](../../../src/features/tracks/pages/TrackDetail.tsx) (line 51)
  - Dependencies: ../hooks/useTracks, ../utils/trackBookingState, @/app/api/tracks, @/app/hooks/usePayments, @/shared/components/DataLoader, @/shared/components/layout/Layout, @/shared/components/payment, @/shared/components/ui/button, @/shared/context/AuthContext, @/shared/hooks/custom/useIsManager, @/shared/hooks/custom/useLocationVisibility, @/shared/utils/trackRedirectUtils, @tanstack/react-query, date-fns, dompurify, lucide-react, react, react-router-dom
- `TrackDetail(): unknown`
  - Description: Implements track detail behavior for this module.
  - Location: [src/features/tracks/pages/TrackDetail.tsx](../../../src/features/tracks/pages/TrackDetail.tsx) (line 118)
  - Dependencies: ../hooks/useTracks, ../utils/trackBookingState, @/app/api/tracks, @/app/hooks/usePayments, @/shared/components/DataLoader, @/shared/components/layout/Layout, @/shared/components/payment, @/shared/components/ui/button, @/shared/context/AuthContext, @/shared/hooks/custom/useIsManager, @/shared/hooks/custom/useLocationVisibility, @/shared/utils/trackRedirectUtils, @tanstack/react-query, date-fns, dompurify, lucide-react, react, react-router-dom

### Classes/Modules

- `AdminTrackDetail.tsx`
  - Description: Module that implements admin track detail responsibilities for this directory.
  - Location: [src/features/tracks/pages/AdminTrackDetail.tsx](../../../src/features/tracks/pages/AdminTrackDetail.tsx)
  - Contains: 1 function(s)
  - Dependencies: ../components/TrackAttendeesList, ../hooks/useTracks, @/shared/components/DataLoader, @/shared/components/layout/AppLayout, @/shared/components/ui/badge, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/hooks/custom/use-toast, @/shared/utils/dateUtils, lucide-react, react-router-dom
- `TrackDetail.tsx`
  - Description: Module that implements track detail responsibilities for this directory.
  - Location: [src/features/tracks/pages/TrackDetail.tsx](../../../src/features/tracks/pages/TrackDetail.tsx)
  - Contains: 3 function(s)
  - Dependencies: ../hooks/useTracks, ../utils/trackBookingState, @/app/api/tracks, @/app/hooks/usePayments, @/shared/components/DataLoader, @/shared/components/layout/Layout, @/shared/components/payment, @/shared/components/ui/button, @/shared/context/AuthContext, @/shared/hooks/custom/useIsManager, @/shared/hooks/custom/useLocationVisibility, @/shared/utils/trackRedirectUtils, @tanstack/react-query, date-fns, dompurify, lucide-react, react, react-router-dom

## Dependencies

### Internal Dependencies

- ../components/TrackAttendeesList
- ../hooks/useTracks
- ../utils/trackBookingState
- @/app/api/tracks
- @/app/hooks/usePayments
- @/shared/components/DataLoader
- @/shared/components/layout/AppLayout
- @/shared/components/layout/Layout
- @/shared/components/payment
- @/shared/components/ui/badge
- @/shared/components/ui/button
- @/shared/components/ui/card
- @/shared/context/AuthContext
- @/shared/hooks/custom/use-toast
- @/shared/hooks/custom/useIsManager
- @/shared/hooks/custom/useLocationVisibility
- @/shared/utils/dateUtils
- @/shared/utils/trackRedirectUtils

### External Dependencies

- @tanstack/react-query
- date-fns
- dompurify
- lucide-react
- react
- react-router-dom

