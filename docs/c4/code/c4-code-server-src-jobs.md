# C4 Code Level: Background Jobs

## Overview

- **Name**: Background Jobs
- **Description**: Background maintenance jobs that reconcile or expire payment-related records.
- **Location**: [server/src/jobs](../../../server/src/jobs)
- **Language**: TypeScript
- **Purpose**: Keep payment and reservation state aligned outside the request-response cycle.

## Code Elements

### Functions/Methods

- `async expireAllStalePendingPayments(): Promise<number>`
  - Description: Implements expire all stale pending payments behavior for this module.
  - Location: [server/src/jobs/paymentExpiration.ts](../../../server/src/jobs/paymentExpiration.ts) (line 15)
  - Dependencies: ../db/client.js, ../db/schema/index.js, drizzle-orm
- `startPaymentExpirationJob(): void`
  - Description: Implements start payment expiration job behavior for this module.
  - Location: [server/src/jobs/paymentExpiration.ts](../../../server/src/jobs/paymentExpiration.ts) (line 42)
  - Dependencies: ../db/client.js, ../db/schema/index.js, drizzle-orm
- `async fetchReconciliationCandidatesPage(lookbackThreshold: Date, cursor: ReconciliationCursor | null): unknown`
  - Description: Implements fetch reconciliation candidates page behavior for this module.
  - Location: [server/src/jobs/paymentReconciliation.ts](../../../server/src/jobs/paymentReconciliation.ts) (line 31)
  - Dependencies: ../db/client.js, ../db/schema/index.js, ../routes/api/payments.js, ../utils/errors.js, drizzle-orm
- `async reconcileRecentAtRiskPayments(): Promise<ReconciliationSummary>`
  - Description: Implements reconcile recent at risk payments behavior for this module.
  - Location: [server/src/jobs/paymentReconciliation.ts](../../../server/src/jobs/paymentReconciliation.ts) (line 64)
  - Dependencies: ../db/client.js, ../db/schema/index.js, ../routes/api/payments.js, ../utils/errors.js, drizzle-orm
- `startPaymentReconciliationJob(): void`
  - Description: Implements start payment reconciliation job behavior for this module.
  - Location: [server/src/jobs/paymentReconciliation.ts](../../../server/src/jobs/paymentReconciliation.ts) (line 154)
  - Dependencies: ../db/client.js, ../db/schema/index.js, ../routes/api/payments.js, ../utils/errors.js, drizzle-orm

### Classes/Modules

- `paymentExpiration.ts`
  - Description: Module that implements payment expiration responsibilities for this directory.
  - Location: [server/src/jobs/paymentExpiration.ts](../../../server/src/jobs/paymentExpiration.ts)
  - Contains: 2 function(s)
  - Dependencies: ../db/client.js, ../db/schema/index.js, drizzle-orm
- `paymentReconciliation.ts`
  - Description: Module that implements payment reconciliation responsibilities for this directory.
  - Location: [server/src/jobs/paymentReconciliation.ts](../../../server/src/jobs/paymentReconciliation.ts)
  - Contains: 3 function(s)
  - Dependencies: ../db/client.js, ../db/schema/index.js, ../routes/api/payments.js, ../utils/errors.js, drizzle-orm

## Dependencies

### Internal Dependencies

- ../db/client.js
- ../db/schema/index.js
- ../routes/api/payments.js
- ../utils/errors.js

### External Dependencies

- drizzle-orm

