# C4 Code Level: Shared React Context

## Overview

- **Name**: Shared React Context
- **Description**: Cross-cutting React context providers and hooks used throughout the frontend.
- **Location**: [src/shared/context](../../../src/shared/context)
- **Language**: TypeScript
- **Purpose**: Make session, theme, and app-wide state available to routed screens and shared components.

## Code Elements

### Functions/Methods

- `AuthProvider({ children }: AuthProviderProps): unknown`
  - Description: Implements auth provider behavior for this module.
  - Location: [src/shared/context/AuthContext.tsx](../../../src/shared/context/AuthContext.tsx) (line 27)
  - Dependencies: @/app/auth/AuthContext, react
- `useAuth(): LegacyAuthContextType`
  - Description: React hook that manages auth behavior.
  - Location: [src/shared/context/AuthContext.tsx](../../../src/shared/context/AuthContext.tsx) (line 31)
  - Dependencies: @/app/auth/AuthContext, react
- `ThemeProvider({ children, ...props }: CustomThemeProviderProps): unknown`
  - Description: Implements theme provider behavior for this module.
  - Location: [src/shared/context/ThemeProvider.tsx](../../../src/shared/context/ThemeProvider.tsx) (line 9)
  - Dependencies: next-themes, next-themes/dist/types, react

### Classes/Modules

- `AuthContext.tsx`
  - Description: Module that implements auth context responsibilities for this directory.
  - Location: [src/shared/context/AuthContext.tsx](../../../src/shared/context/AuthContext.tsx)
  - Contains: 2 function(s)
  - Dependencies: @/app/auth/AuthContext, react
- `ThemeProvider.tsx`
  - Description: Module that implements theme provider responsibilities for this directory.
  - Location: [src/shared/context/ThemeProvider.tsx](../../../src/shared/context/ThemeProvider.tsx)
  - Contains: 1 function(s)
  - Dependencies: next-themes, next-themes/dist/types, react

## Dependencies

### Internal Dependencies

- @/app/auth/AuthContext

### External Dependencies

- next-themes
- next-themes/dist/types
- react

