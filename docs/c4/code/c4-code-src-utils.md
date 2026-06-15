# C4 Code Level: Src utils

## Overview

- **Name**: Src utils
- **Description**: Src utils utility helpers.
- **Location**: [src/utils](../../../src/utils)
- **Language**: TypeScript
- **Purpose**: Provide shared src utils helpers that keep higher-level modules concise.

## Code Elements

### Functions/Methods

- `isArray(value: unknown): value is unknown[]`
  - Description: Checks whether array.
  - Location: [src/utils/typeValidation.ts](../../../src/utils/typeValidation.ts) (line 9)
  - Dependencies: None
- `isSafeArray(value: unknown): value is unknown[]`
  - Description: Checks whether safe array.
  - Location: [src/utils/typeValidation.ts](../../../src/utils/typeValidation.ts) (line 16)
  - Dependencies: None
- `isObject(value: unknown): value is Record<string, unknown>`
  - Description: Checks whether object.
  - Location: [src/utils/typeValidation.ts](../../../src/utils/typeValidation.ts) (line 23)
  - Dependencies: None
- `isString(value: unknown): value is string`
  - Description: Checks whether string.
  - Location: [src/utils/typeValidation.ts](../../../src/utils/typeValidation.ts) (line 30)
  - Dependencies: None
- `isNumber(value: unknown): value is number`
  - Description: Checks whether number.
  - Location: [src/utils/typeValidation.ts](../../../src/utils/typeValidation.ts) (line 37)
  - Dependencies: None
- `isBoolean(value: unknown): value is boolean`
  - Description: Checks whether boolean.
  - Location: [src/utils/typeValidation.ts](../../../src/utils/typeValidation.ts) (line 44)
  - Dependencies: None
- `safeGet(obj: unknown, path: string, fallback?: T): T | undefined`
  - Description: Implements safe get behavior for this module.
  - Location: [src/utils/typeValidation.ts](../../../src/utils/typeValidation.ts) (line 226)
  - Dependencies: None

### Classes/Modules

- `typeValidation.ts`
  - Description: Module that implements type validation responsibilities for this directory.
  - Location: [src/utils/typeValidation.ts](../../../src/utils/typeValidation.ts)
  - Contains: 7 function(s)
  - Dependencies: None

## Dependencies

### Internal Dependencies

- None captured from direct file imports in this directory.

### External Dependencies

- None captured from direct file imports in this directory.

