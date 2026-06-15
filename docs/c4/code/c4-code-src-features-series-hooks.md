# C4 Code Level: Series hooks

## Overview

- **Name**: Series hooks
- **Description**: Series hooks React hooks and stateful helper logic.
- **Location**: [src/features/series/hooks](../../../src/features/series/hooks)
- **Language**: TypeScript
- **Purpose**: Share reusable series hooks interaction and data-fetching behavior across components.

## Code Elements

### Functions/Methods

- `useSeries(page = 1, pageSize = 12, filters?: { search?: string }): unknown`
  - Description: React hook that manages series behavior.
  - Location: [src/features/series/hooks/useSeries.ts](../../../src/features/series/hooks/useSeries.ts) (line 17)
  - Dependencies: @/app/api/series, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useSeriesDetail(id: string): unknown`
  - Description: React hook that manages series detail behavior.
  - Location: [src/features/series/hooks/useSeries.ts](../../../src/features/series/hooks/useSeries.ts) (line 38)
  - Dependencies: @/app/api/series, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useAllSeries(): unknown`
  - Description: React hook that manages all series behavior.
  - Location: [src/features/series/hooks/useSeries.ts](../../../src/features/series/hooks/useSeries.ts) (line 48)
  - Dependencies: @/app/api/series, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useCreateSeries(): unknown`
  - Description: React hook that manages create series behavior.
  - Location: [src/features/series/hooks/useSeries.ts](../../../src/features/series/hooks/useSeries.ts) (line 60)
  - Dependencies: @/app/api/series, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useUpdateSeries(): unknown`
  - Description: React hook that manages update series behavior.
  - Location: [src/features/series/hooks/useSeries.ts](../../../src/features/series/hooks/useSeries.ts) (line 84)
  - Dependencies: @/app/api/series, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useDeleteSeries(): unknown`
  - Description: React hook that manages delete series behavior.
  - Location: [src/features/series/hooks/useSeries.ts](../../../src/features/series/hooks/useSeries.ts) (line 108)
  - Dependencies: @/app/api/series, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useAddAssetsToSeries(): unknown`
  - Description: React hook that manages add assets to series behavior.
  - Location: [src/features/series/hooks/useSeries.ts](../../../src/features/series/hooks/useSeries.ts) (line 133)
  - Dependencies: @/app/api/series, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useRemoveAssetFromSeries(): unknown`
  - Description: React hook that manages remove asset from series behavior.
  - Location: [src/features/series/hooks/useSeries.ts](../../../src/features/series/hooks/useSeries.ts) (line 161)
  - Dependencies: @/app/api/series, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useReorderSeriesAssets(): unknown`
  - Description: React hook that manages reorder series assets behavior.
  - Location: [src/features/series/hooks/useSeries.ts](../../../src/features/series/hooks/useSeries.ts) (line 187)
  - Dependencies: @/app/api/series, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `grantsQueryKey(seriesId: string, params: FetchSeriesGrantsParams): unknown`
  - Description: Implements grants query key behavior for this module.
  - Location: [src/features/series/hooks/useSeriesGrants.ts](../../../src/features/series/hooks/useSeriesGrants.ts) (line 10)
  - Dependencies: @/app/api/seriesGrants, @tanstack/react-query
- `useSeriesGrants(seriesId: string, params: FetchSeriesGrantsParams = {}): unknown`
  - Description: React hook that manages series grants behavior.
  - Location: [src/features/series/hooks/useSeriesGrants.ts](../../../src/features/series/hooks/useSeriesGrants.ts) (line 13)
  - Dependencies: @/app/api/seriesGrants, @tanstack/react-query
- `useGrantSeriesAccess(seriesId: string): unknown`
  - Description: React hook that manages grant series access behavior.
  - Location: [src/features/series/hooks/useSeriesGrants.ts](../../../src/features/series/hooks/useSeriesGrants.ts) (line 23)
  - Dependencies: @/app/api/seriesGrants, @tanstack/react-query
- `useRevokeSeriesAccess(seriesId: string): unknown`
  - Description: React hook that manages revoke series access behavior.
  - Location: [src/features/series/hooks/useSeriesGrants.ts](../../../src/features/series/hooks/useSeriesGrants.ts) (line 40)
  - Dependencies: @/app/api/seriesGrants, @tanstack/react-query
- `useBulkSeriesGrants(seriesId: string): unknown`
  - Description: React hook that manages bulk series grants behavior.
  - Location: [src/features/series/hooks/useSeriesGrants.ts](../../../src/features/series/hooks/useSeriesGrants.ts) (line 56)
  - Dependencies: @/app/api/seriesGrants, @tanstack/react-query

### Classes/Modules

- `useSeries.ts`
  - Description: Module that implements use series responsibilities for this directory.
  - Location: [src/features/series/hooks/useSeries.ts](../../../src/features/series/hooks/useSeries.ts)
  - Contains: 9 function(s)
  - Dependencies: @/app/api/series, @/shared/hooks/custom/use-toast, @tanstack/react-query
- `useSeriesGrants.ts`
  - Description: Module that implements use series grants responsibilities for this directory.
  - Location: [src/features/series/hooks/useSeriesGrants.ts](../../../src/features/series/hooks/useSeriesGrants.ts)
  - Contains: 5 function(s)
  - Dependencies: @/app/api/seriesGrants, @tanstack/react-query

## Dependencies

### Internal Dependencies

- @/app/api/series
- @/app/api/seriesGrants
- @/shared/hooks/custom/use-toast

### External Dependencies

- @tanstack/react-query

