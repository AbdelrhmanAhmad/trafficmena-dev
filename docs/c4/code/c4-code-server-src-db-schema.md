# C4 Code Level: Database Schema Definitions

## Overview

- **Name**: Database Schema Definitions
- **Description**: Drizzle ORM schema definitions for application tables, enums, indexes, and relational constraints.
- **Location**: [server/src/db/schema](../../../server/src/db/schema)
- **Language**: JavaScript, TypeScript
- **Purpose**: Define the persisted domain model for users, content, invitations, subscriptions, reservations, and payments.

## Code Elements

### Functions/Methods

- No direct top-level functions or methods are defined in files at this directory level.

### Classes/Modules

- `index.js`
  - Description: Entry-point module that re-exports or wires together sibling modules.
  - Location: [server/src/db/schema/index.js](../../../server/src/db/schema/index.js)
  - Contains: module-level configuration or data
  - Dependencies: drizzle-orm/pg-core
- `index.ts`
  - Description: Entry-point module that re-exports or wires together sibling modules.
  - Location: [server/src/db/schema/index.ts](../../../server/src/db/schema/index.ts)
  - Contains: module-level configuration or data
  - Dependencies: drizzle-orm, drizzle-orm/pg-core

## Dependencies

### Internal Dependencies

- None captured from direct file imports in this directory.

### External Dependencies

- drizzle-orm
- drizzle-orm/pg-core

