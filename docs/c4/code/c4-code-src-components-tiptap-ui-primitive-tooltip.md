# C4 Code Level: Tiptap UI Primitive tooltip

## Overview

- **Name**: Tiptap UI Primitive tooltip
- **Description**: Tiptap UI Primitive tooltip React component modules.
- **Location**: [src/components/tiptap-ui-primitive/tooltip](../../../src/components/tiptap-ui-primitive/tooltip)
- **Language**: CSS/SCSS, TypeScript
- **Purpose**: Render tiptap ui primitive tooltip user interface elements for the TrafficMENA frontend.

## Code Elements

### Functions/Methods

- `useTooltip({
  initialOpen = false,
  placement = 'top',
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  delay = 600,
  closeDelay = 0,
}: Omit<TooltipProviderProps, 'children'> = {}): unknown`
  - Description: React hook that manages tooltip behavior.
  - Location: [src/components/tiptap-ui-primitive/tooltip/tooltip.tsx](../../../src/components/tiptap-ui-primitive/tooltip/tooltip.tsx) (line 54)
  - Dependencies: @/components/tiptap-ui-primitive/tooltip/tooltip.scss, @floating-ui/react, react
- `useTooltipContext(): unknown`
  - Description: React hook that manages tooltip context behavior.
  - Location: [src/components/tiptap-ui-primitive/tooltip/tooltip.tsx](../../../src/components/tiptap-ui-primitive/tooltip/tooltip.tsx) (line 115)
  - Dependencies: @/components/tiptap-ui-primitive/tooltip/tooltip.scss, @floating-ui/react, react
- `Tooltip({ children, ...props }: TooltipProviderProps): unknown`
  - Description: Implements tooltip behavior for this module.
  - Location: [src/components/tiptap-ui-primitive/tooltip/tooltip.tsx](../../../src/components/tiptap-ui-primitive/tooltip/tooltip.tsx) (line 125)
  - Dependencies: @/components/tiptap-ui-primitive/tooltip/tooltip.scss, @floating-ui/react, react

### Classes/Modules

- `index.tsx`
  - Description: Entry-point module that re-exports or wires together sibling modules.
  - Location: [src/components/tiptap-ui-primitive/tooltip/index.tsx](../../../src/components/tiptap-ui-primitive/tooltip/index.tsx)
  - Contains: module-level configuration or data
  - Dependencies: None
- `tooltip.scss`
  - Description: Style module that provides visual rules for sibling components.
  - Location: [src/components/tiptap-ui-primitive/tooltip/tooltip.scss](../../../src/components/tiptap-ui-primitive/tooltip/tooltip.scss)
  - Contains: module-level configuration or data
  - Dependencies: None
- `tooltip.tsx`
  - Description: Module that implements tooltip responsibilities for this directory.
  - Location: [src/components/tiptap-ui-primitive/tooltip/tooltip.tsx](../../../src/components/tiptap-ui-primitive/tooltip/tooltip.tsx)
  - Contains: 3 function(s)
  - Dependencies: @/components/tiptap-ui-primitive/tooltip/tooltip.scss, @floating-ui/react, react

## Dependencies

### Internal Dependencies

- @/components/tiptap-ui-primitive/tooltip/tooltip.scss

### External Dependencies

- @floating-ui/react
- react

