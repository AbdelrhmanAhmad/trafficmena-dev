# C4 Code Level: Calculators utils

## Overview

- **Name**: Calculators utils
- **Description**: Calculators utils utility helpers.
- **Location**: [src/features/calculators/utils](../../../src/features/calculators/utils)
- **Language**: TypeScript
- **Purpose**: Provide shared calculators utils helpers that keep higher-level modules concise.

## Code Elements

### Functions/Methods

- `async shareToClipboard(text: string | null): Promise<void>`
  - Description: Implements share to clipboard behavior for this module.
  - Location: [src/features/calculators/utils/clipboard.ts](../../../src/features/calculators/utils/clipboard.ts) (line 3)
  - Dependencies: @/shared/hooks/custom/use-toast
- `showFeedbackToast(positive: boolean): void`
  - Description: Implements show feedback toast behavior for this module.
  - Location: [src/features/calculators/utils/feedback.ts](../../../src/features/calculators/utils/feedback.ts) (line 3)
  - Dependencies: @/shared/hooks/custom/use-toast

### Classes/Modules

- `clipboard.ts`
  - Description: Module that implements clipboard responsibilities for this directory.
  - Location: [src/features/calculators/utils/clipboard.ts](../../../src/features/calculators/utils/clipboard.ts)
  - Contains: 1 function(s)
  - Dependencies: @/shared/hooks/custom/use-toast
- `feedback.ts`
  - Description: Module that implements feedback responsibilities for this directory.
  - Location: [src/features/calculators/utils/feedback.ts](../../../src/features/calculators/utils/feedback.ts)
  - Contains: 1 function(s)
  - Dependencies: @/shared/hooks/custom/use-toast

## Dependencies

### Internal Dependencies

- @/shared/hooks/custom/use-toast

### External Dependencies

- None captured from direct file imports in this directory.

