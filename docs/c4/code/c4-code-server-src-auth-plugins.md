# C4 Code Level: Plugins

## Overview

- **Name**: Plugins
- **Description**: Plugins authentication modules.
- **Location**: [server/src/auth/plugins](../../../server/src/auth/plugins)
- **Language**: TypeScript
- **Purpose**: Implement plugins authentication setup, helpers, and extensions.

## Code Elements

### Functions/Methods

- `inviteSessionPlugin(): BetterAuthPlugin`
  - Description: Implements invite session plugin behavior for this module.
  - Location: [server/src/auth/plugins/inviteSession.ts](../../../server/src/auth/plugins/inviteSession.ts) (line 7)
  - Dependencies: ../../config/env.js, better-auth, better-auth/api, better-auth/cookies, zod

### Classes/Modules

- `inviteSession.ts`
  - Description: Module that implements invite session responsibilities for this directory.
  - Location: [server/src/auth/plugins/inviteSession.ts](../../../server/src/auth/plugins/inviteSession.ts)
  - Contains: 1 function(s)
  - Dependencies: ../../config/env.js, better-auth, better-auth/api, better-auth/cookies, zod

## Dependencies

### Internal Dependencies

- ../../config/env.js

### External Dependencies

- better-auth
- better-auth/api
- better-auth/cookies
- zod

