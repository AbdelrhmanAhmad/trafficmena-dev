# C4 Code Level: Calculators pages

## Overview

- **Name**: Calculators pages
- **Description**: Calculators pages route-level page modules.
- **Location**: [src/features/calculators/pages](../../../src/features/calculators/pages)
- **Language**: TypeScript
- **Purpose**: Compose full-screen calculators pages experiences that are mounted by the SPA router.

## Code Elements

### Functions/Methods

- `CalculatorDetail(): unknown`
  - Description: Implements calculator detail behavior for this module.
  - Location: [src/features/calculators/pages/CalculatorDetail.tsx](../../../src/features/calculators/pages/CalculatorDetail.tsx) (line 40)
  - Dependencies: ../types, @/shared/components/LoadingSpinner, @/shared/components/layout/AppLayout, @/shared/components/ui/button, lucide-react, react, react-router-dom
- `CalculatorsIndex(): unknown`
  - Description: Implements calculators index behavior for this module.
  - Location: [src/features/calculators/pages/CalculatorsIndex.tsx](../../../src/features/calculators/pages/CalculatorsIndex.tsx) (line 30)
  - Dependencies: ../types, @/shared/components/layout/AppLayout, @/shared/components/ui/card, lucide-react, react-router-dom

### Classes/Modules

- `CalculatorDetail.tsx`
  - Description: Module that implements calculator detail responsibilities for this directory.
  - Location: [src/features/calculators/pages/CalculatorDetail.tsx](../../../src/features/calculators/pages/CalculatorDetail.tsx)
  - Contains: 1 function(s)
  - Dependencies: ../types, @/shared/components/LoadingSpinner, @/shared/components/layout/AppLayout, @/shared/components/ui/button, lucide-react, react, react-router-dom
- `CalculatorsIndex.tsx`
  - Description: Module that implements calculators index responsibilities for this directory.
  - Location: [src/features/calculators/pages/CalculatorsIndex.tsx](../../../src/features/calculators/pages/CalculatorsIndex.tsx)
  - Contains: 1 function(s)
  - Dependencies: ../types, @/shared/components/layout/AppLayout, @/shared/components/ui/card, lucide-react, react-router-dom

## Dependencies

### Internal Dependencies

- ../types
- @/shared/components/LoadingSpinner
- @/shared/components/layout/AppLayout
- @/shared/components/ui/button
- @/shared/components/ui/card

### External Dependencies

- lucide-react
- react
- react-router-dom

