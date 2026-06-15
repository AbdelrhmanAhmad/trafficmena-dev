# C4 Code Level: Hooks dashboard

## Overview

- **Name**: Hooks dashboard
- **Description**: Hooks dashboard React hooks and stateful helper logic.
- **Location**: [src/shared/hooks/dashboard](../../../src/shared/hooks/dashboard)
- **Language**: TypeScript
- **Purpose**: Share reusable hooks dashboard interaction and data-fetching behavior across components.

## Code Elements

### Functions/Methods

- `useDashboardAnalytics(): unknown`
  - Description: React hook that manages dashboard analytics behavior.
  - Location: [src/shared/hooks/dashboard/useDashboardMetrics.ts](../../../src/shared/hooks/dashboard/useDashboardMetrics.ts) (line 32)
  - Dependencies: @/shared/services/SimpleDashboardService, @tanstack/react-query, react
- `useTotalUsers(): unknown`
  - Description: React hook that manages total users behavior.
  - Location: [src/shared/hooks/dashboard/useDashboardMetrics.ts](../../../src/shared/hooks/dashboard/useDashboardMetrics.ts) (line 70)
  - Dependencies: @/shared/services/SimpleDashboardService, @tanstack/react-query, react
- `useActiveEvents(): unknown`
  - Description: React hook that manages active events behavior.
  - Location: [src/shared/hooks/dashboard/useDashboardMetrics.ts](../../../src/shared/hooks/dashboard/useDashboardMetrics.ts) (line 83)
  - Dependencies: @/shared/services/SimpleDashboardService, @tanstack/react-query, react
- `useTotalAttendees(): unknown`
  - Description: React hook that manages total attendees behavior.
  - Location: [src/shared/hooks/dashboard/useDashboardMetrics.ts](../../../src/shared/hooks/dashboard/useDashboardMetrics.ts) (line 96)
  - Dependencies: @/shared/services/SimpleDashboardService, @tanstack/react-query, react
- `useLibraryAssets(): unknown`
  - Description: React hook that manages library assets behavior.
  - Location: [src/shared/hooks/dashboard/useDashboardMetrics.ts](../../../src/shared/hooks/dashboard/useDashboardMetrics.ts) (line 109)
  - Dependencies: @/shared/services/SimpleDashboardService, @tanstack/react-query, react
- `useMonthlyGrowth(): unknown`
  - Description: React hook that manages monthly growth behavior.
  - Location: [src/shared/hooks/dashboard/useDashboardMetrics.ts](../../../src/shared/hooks/dashboard/useDashboardMetrics.ts) (line 122)
  - Dependencies: @/shared/services/SimpleDashboardService, @tanstack/react-query, react
- `useRecentActivity(): unknown`
  - Description: React hook that manages recent activity behavior.
  - Location: [src/shared/hooks/dashboard/useDashboardMetrics.ts](../../../src/shared/hooks/dashboard/useDashboardMetrics.ts) (line 135)
  - Dependencies: @/shared/services/SimpleDashboardService, @tanstack/react-query, react
- `usePrefetchDashboard(): unknown`
  - Description: React hook that manages prefetch dashboard behavior.
  - Location: [src/shared/hooks/dashboard/useDashboardMetrics.ts](../../../src/shared/hooks/dashboard/useDashboardMetrics.ts) (line 148)
  - Dependencies: @/shared/services/SimpleDashboardService, @tanstack/react-query, react
- `useMetricsInvalidation(): unknown`
  - Description: React hook that manages metrics invalidation behavior.
  - Location: [src/shared/hooks/dashboard/useDashboardMetrics.ts](../../../src/shared/hooks/dashboard/useDashboardMetrics.ts) (line 165)
  - Dependencies: @/shared/services/SimpleDashboardService, @tanstack/react-query, react

### Classes/Modules

- `useDashboardMetrics.ts`
  - Description: Module that implements use dashboard metrics responsibilities for this directory.
  - Location: [src/shared/hooks/dashboard/useDashboardMetrics.ts](../../../src/shared/hooks/dashboard/useDashboardMetrics.ts)
  - Contains: 9 function(s)
  - Dependencies: @/shared/services/SimpleDashboardService, @tanstack/react-query, react

## Dependencies

### Internal Dependencies

- @/shared/services/SimpleDashboardService

### External Dependencies

- @tanstack/react-query
- react

