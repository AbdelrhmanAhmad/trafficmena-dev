# C4 Code Level: Backend Utilities

## Overview

- **Name**: Backend Utilities
- **Description**: Shared backend utility modules for security, errors, session handling, booking, and invoice status normalization.
- **Location**: [server/src/utils](../../../server/src/utils)
- **Language**: TypeScript
- **Purpose**: Provide reusable primitives used across route handlers and services.

## Code Elements

### Functions/Methods

- `hasTrackBookingRow(bookingRows: TrackBookingRow[] | null | undefined): boolean`
  - Description: Checks whether the current context has track booking row.
  - Location: [server/src/utils/booking.ts](../../../server/src/utils/booking.ts) (line 5)
  - Dependencies: None
- `isOriginAllowed(origin: string): unknown`
  - Description: Checks whether origin allowed.
  - Location: [server/src/utils/csrf.ts](../../../server/src/utils/csrf.ts) (line 20)
  - Dependencies: ../config/env.js, hono, hono/cookie, node:crypto
- `getOriginFromReferer(referer: string): unknown`
  - Description: Returns origin from referer derived from current inputs or state.
  - Location: [server/src/utils/csrf.ts](../../../server/src/utils/csrf.ts) (line 24)
  - Dependencies: ../config/env.js, hono, hono/cookie, node:crypto
- `issueCsrfToken(c: Context): unknown`
  - Description: Checks whether issue csrf token.
  - Location: [server/src/utils/csrf.ts](../../../server/src/utils/csrf.ts) (line 32)
  - Dependencies: ../config/env.js, hono, hono/cookie, node:crypto
- `async csrfMiddleware(c: Context, next: Next): unknown`
  - Description: Implements csrf middleware behavior for this module.
  - Location: [server/src/utils/csrf.ts](../../../server/src/utils/csrf.ts) (line 44)
  - Dependencies: ../config/env.js, hono, hono/cookie, node:crypto
- `respondError(c: Context, error: ApiError): unknown`
  - Description: Implements respond error behavior for this module.
  - Location: [server/src/utils/errors.ts](../../../server/src/utils/errors.ts) (line 17)
  - Dependencies: hono, hono/utils/http-status
- `handleRoute(handler: (c: Context) => Promise<Response>, fallbackCode: string, fallbackMessage: string, logLabel: string): unknown`
  - Description: Implements handle route behavior for this module.
  - Location: [server/src/utils/errors.ts](../../../server/src/utils/errors.ts) (line 23)
  - Dependencies: hono, hono/utils/http-status
- `isInvoicePaid(invoice: InvoiceStatusInput | null | undefined): boolean`
  - Description: Checks whether invoice paid.
  - Location: [server/src/utils/invoiceStatus.ts](../../../server/src/utils/invoiceStatus.ts) (line 6)
  - Dependencies: None
- `async getSessionFromRequest(c: Context): Promise<AuthSessionResult | null>`
  - Description: Returns session from request derived from current inputs or state.
  - Location: [server/src/utils/session.ts](../../../server/src/utils/session.ts) (line 22)
  - Dependencies: ../auth.js, hono

### Classes/Modules

- `ApiError`
  - Description: Class that encapsulates api error behavior and related methods.
  - Location: [server/src/utils/errors.ts](../../../server/src/utils/errors.ts) (line 4)
  - Methods: No class methods captured.
  - Dependencies: hono, hono/utils/http-status

- `booking.ts`
  - Description: Module that implements booking responsibilities for this directory.
  - Location: [server/src/utils/booking.ts](../../../server/src/utils/booking.ts)
  - Contains: 1 function(s)
  - Dependencies: None
- `csrf.ts`
  - Description: Module that implements csrf responsibilities for this directory.
  - Location: [server/src/utils/csrf.ts](../../../server/src/utils/csrf.ts)
  - Contains: 4 function(s)
  - Dependencies: ../config/env.js, hono, hono/cookie, node:crypto
- `errors.ts`
  - Description: Module that implements errors responsibilities for this directory.
  - Location: [server/src/utils/errors.ts](../../../server/src/utils/errors.ts)
  - Contains: 2 function(s), 1 class(es)
  - Dependencies: hono, hono/utils/http-status
- `invoiceStatus.ts`
  - Description: Module that implements invoice status responsibilities for this directory.
  - Location: [server/src/utils/invoiceStatus.ts](../../../server/src/utils/invoiceStatus.ts)
  - Contains: 1 function(s)
  - Dependencies: None
- `session.ts`
  - Description: Module that implements session responsibilities for this directory.
  - Location: [server/src/utils/session.ts](../../../server/src/utils/session.ts)
  - Contains: 1 function(s)
  - Dependencies: ../auth.js, hono

## Dependencies

### Internal Dependencies

- ../auth.js
- ../config/env.js

### External Dependencies

- hono
- hono/cookie
- hono/utils/http-status
- node:crypto

