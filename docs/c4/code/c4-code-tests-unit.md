# C4 Code Level: Unit Test Suite

## Overview

- **Name**: Unit Test Suite
- **Description**: Node test runner specifications covering backend behavior, business rules, routing, and regression scenarios.
- **Location**: [tests/unit](../../../tests/unit)
- **Language**: TypeScript
- **Purpose**: Protect critical platform flows with focused automated regression coverage.

## Code Elements

### Functions/Methods

- `createTestApp(): unknown`
  - Description: Creates test app for downstream use.
  - Location: [tests/unit/json-body-parser.test.ts](../../../tests/unit/json-body-parser.test.ts) (line 6)
  - Dependencies: ../../server/src/routes/api/jsonPayload.ts, hono, node:assert/strict, node:test
- `installLocalStorageMock(): unknown`
  - Description: Implements install local storage mock behavior for this module.
  - Location: [tests/unit/post-signup-redirect.test.ts](../../../tests/unit/post-signup-redirect.test.ts) (line 13)
  - Dependencies: ../../src/shared/utils/eventRedirectUtils.ts, ../../src/shared/utils/postSignupRedirect.ts, ../../src/shared/utils/trackRedirectUtils.ts, node:assert/strict, node:test

### Classes/Modules

- `admin-access.test.ts`
  - Description: Module that implements admin access.test responsibilities for this directory.
  - Location: [tests/unit/admin-access.test.ts](../../../tests/unit/admin-access.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../src/shared/utils/adminAccess.ts, node:assert/strict, node:test
- `admin-metrics.test.ts`
  - Description: Module that implements admin metrics.test responsibilities for this directory.
  - Location: [tests/unit/admin-metrics.test.ts](../../../tests/unit/admin-metrics.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../server/src/routes/api/adminMetricsUtils.ts, node:assert/strict, node:test
- `admin-users-api.test.ts`
  - Description: Module that implements admin users api.test responsibilities for this directory.
  - Location: [tests/unit/admin-users-api.test.ts](../../../tests/unit/admin-users-api.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../src/app/api/users.ts, node:assert/strict, node:test
- `bulk-grants-api-response.test.ts`
  - Description: Module that implements bulk grants api response.test responsibilities for this directory.
  - Location: [tests/unit/bulk-grants-api-response.test.ts](../../../tests/unit/bulk-grants-api-response.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../src/app/api/seriesGrants.ts, ../../src/app/api/subscriptions.ts, node:assert/strict, node:test
- `invitations-api.test.ts`
  - Description: Module that implements invitations api.test responsibilities for this directory.
  - Location: [tests/unit/invitations-api.test.ts](../../../tests/unit/invitations-api.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../src/app/api/invitations.ts, node:assert/strict, node:test
- `invitations-list-query.test.ts`
  - Description: Module that implements invitations list query.test responsibilities for this directory.
  - Location: [tests/unit/invitations-list-query.test.ts](../../../tests/unit/invitations-list-query.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../server/src/routes/api/invitations-list.ts, node:assert/strict, node:test
- `invoice-status.test.ts`
  - Description: Module that implements invoice status.test responsibilities for this directory.
  - Location: [tests/unit/invoice-status.test.ts](../../../tests/unit/invoice-status.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../server/src/utils/invoiceStatus.ts, node:assert/strict, node:test
- `json-body-parser.test.ts`
  - Description: Module that implements json body parser.test responsibilities for this directory.
  - Location: [tests/unit/json-body-parser.test.ts](../../../tests/unit/json-body-parser.test.ts)
  - Contains: 1 function(s)
  - Dependencies: ../../server/src/routes/api/jsonPayload.ts, hono, node:assert/strict, node:test
- `phone-number-compat.test.ts`
  - Description: Module that implements phone number compat.test responsibilities for this directory.
  - Location: [tests/unit/phone-number-compat.test.ts](../../../tests/unit/phone-number-compat.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../server/src/routes/api/users-phone.ts, node:assert/strict, node:test
- `post-signup-redirect.test.ts`
  - Description: Module that implements post signup redirect.test responsibilities for this directory.
  - Location: [tests/unit/post-signup-redirect.test.ts](../../../tests/unit/post-signup-redirect.test.ts)
  - Contains: 1 function(s)
  - Dependencies: ../../src/shared/utils/eventRedirectUtils.ts, ../../src/shared/utils/postSignupRedirect.ts, ../../src/shared/utils/trackRedirectUtils.ts, node:assert/strict, node:test
- `rate-limit-keying.test.ts`
  - Description: Module that implements rate limit keying.test responsibilities for this directory.
  - Location: [tests/unit/rate-limit-keying.test.ts](../../../tests/unit/rate-limit-keying.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: hono, node:assert/strict, node:test
- `series-access.test.ts`
  - Description: Module that implements series access.test responsibilities for this directory.
  - Location: [tests/unit/series-access.test.ts](../../../tests/unit/series-access.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../server/src/routes/api/seriesAccess.ts, node:assert/strict, node:test
- `signup-steps.test.ts`
  - Description: Module that implements signup steps.test responsibilities for this directory.
  - Location: [tests/unit/signup-steps.test.ts](../../../tests/unit/signup-steps.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../src/shared/components/layout/signupSteps.ts, node:assert/strict, node:test
- `subscription-grants-concurrency-guard.test.ts`
  - Description: Module that implements subscription grants concurrency guard.test responsibilities for this directory.
  - Location: [tests/unit/subscription-grants-concurrency-guard.test.ts](../../../tests/unit/subscription-grants-concurrency-guard.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: hono, node:assert/strict, node:test
- `subscription-grants-rbac.test.ts`
  - Description: Module that implements subscription grants rbac.test responsibilities for this directory.
  - Location: [tests/unit/subscription-grants-rbac.test.ts](../../../tests/unit/subscription-grants-rbac.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: hono, node:assert/strict, node:test
- `subscription-grants-utils.test.ts`
  - Description: Module that implements subscription grants utils.test responsibilities for this directory.
  - Location: [tests/unit/subscription-grants-utils.test.ts](../../../tests/unit/subscription-grants-utils.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../server/src/routes/api/subscriptionsGrantUtils.ts, node:assert/strict, node:test
- `track-booking-flag.test.ts`
  - Description: Module that implements track booking flag.test responsibilities for this directory.
  - Location: [tests/unit/track-booking-flag.test.ts](../../../tests/unit/track-booking-flag.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../server/src/utils/booking.ts, node:assert/strict, node:test
- `track-booking-state.test.ts`
  - Description: Module that implements track booking state.test responsibilities for this directory.
  - Location: [tests/unit/track-booking-state.test.ts](../../../tests/unit/track-booking-state.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../src/features/tracks/utils/trackBookingState.ts, node:assert/strict, node:test
- `track-paid-status.test.ts`
  - Description: Module that implements track paid status.test responsibilities for this directory.
  - Location: [tests/unit/track-paid-status.test.ts](../../../tests/unit/track-paid-status.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../server/src/routes/api/trackPaidStatus.ts, node:assert/strict, node:test
- `track-series-publish.test.ts`
  - Description: Module that implements track series publish.test responsibilities for this directory.
  - Location: [tests/unit/track-series-publish.test.ts](../../../tests/unit/track-series-publish.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../server/src/routes/api/trackSeriesPublishing.ts, node:assert/strict, node:test
- `users-list-query.test.ts`
  - Description: Module that implements users list query.test responsibilities for this directory.
  - Location: [tests/unit/users-list-query.test.ts](../../../tests/unit/users-list-query.test.ts)
  - Contains: module-level configuration or data
  - Dependencies: ../../server/src/routes/api/users-list.ts, node:assert/strict, node:test

## Dependencies

### Internal Dependencies

- ../../server/src/routes/api/adminMetricsUtils.ts
- ../../server/src/routes/api/invitations-list.ts
- ../../server/src/routes/api/jsonPayload.ts
- ../../server/src/routes/api/seriesAccess.ts
- ../../server/src/routes/api/subscriptionsGrantUtils.ts
- ../../server/src/routes/api/trackPaidStatus.ts
- ../../server/src/routes/api/trackSeriesPublishing.ts
- ../../server/src/routes/api/users-list.ts
- ../../server/src/routes/api/users-phone.ts
- ../../server/src/utils/booking.ts
- ../../server/src/utils/invoiceStatus.ts
- ../../src/app/api/invitations.ts
- ../../src/app/api/seriesGrants.ts
- ../../src/app/api/subscriptions.ts
- ../../src/app/api/users.ts
- ../../src/features/tracks/utils/trackBookingState.ts
- ../../src/shared/components/layout/signupSteps.ts
- ../../src/shared/utils/adminAccess.ts
- ../../src/shared/utils/eventRedirectUtils.ts
- ../../src/shared/utils/postSignupRedirect.ts
- ../../src/shared/utils/trackRedirectUtils.ts

### External Dependencies

- hono
- node:assert/strict
- node:test

