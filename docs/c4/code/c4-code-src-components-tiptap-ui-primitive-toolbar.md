# C4 Code Level: Tiptap UI Primitive toolbar

## Overview

- **Name**: Tiptap UI Primitive toolbar
- **Description**: Tiptap UI Primitive toolbar React component modules.
- **Location**: [src/components/tiptap-ui-primitive/toolbar](../../../src/components/tiptap-ui-primitive/toolbar)
- **Language**: CSS/SCSS, TypeScript
- **Purpose**: Render tiptap ui primitive toolbar user interface elements for the TrafficMENA frontend.

## Code Elements

### Functions/Methods

- `useToolbarNavigation(toolbarRef: React.RefObject<HTMLDivElement | null>): unknown`
  - Description: React hook that manages toolbar navigation behavior.
  - Location: [src/components/tiptap-ui-primitive/toolbar/toolbar.tsx](../../../src/components/tiptap-ui-primitive/toolbar/toolbar.tsx) (line 14)
  - Dependencies: @/components/tiptap-ui-primitive/separator, @/components/tiptap-ui-primitive/toolbar/toolbar.scss, @/hooks/use-composed-ref, @/hooks/use-menu-navigation, @/lib/tiptap-utils, react
- `ToolbarProvider({ editor, children }): unknown`
  - Description: Implements toolbar provider behavior for this module.
  - Location: [src/components/tiptap-ui-primitive/toolbar/toolbar.tsx](../../../src/components/tiptap-ui-primitive/toolbar/toolbar.tsx) (line 120)
  - Dependencies: @/components/tiptap-ui-primitive/separator, @/components/tiptap-ui-primitive/toolbar/toolbar.scss, @/hooks/use-composed-ref, @/hooks/use-menu-navigation, @/lib/tiptap-utils, react
- `useToolbarContext(): unknown`
  - Description: React hook that manages toolbar context behavior.
  - Location: [src/components/tiptap-ui-primitive/toolbar/toolbar.tsx](../../../src/components/tiptap-ui-primitive/toolbar/toolbar.tsx) (line 127)
  - Dependencies: @/components/tiptap-ui-primitive/separator, @/components/tiptap-ui-primitive/toolbar/toolbar.scss, @/hooks/use-composed-ref, @/hooks/use-menu-navigation, @/lib/tiptap-utils, react

### Classes/Modules

- `index.tsx`
  - Description: Entry-point module that re-exports or wires together sibling modules.
  - Location: [src/components/tiptap-ui-primitive/toolbar/index.tsx](../../../src/components/tiptap-ui-primitive/toolbar/index.tsx)
  - Contains: module-level configuration or data
  - Dependencies: None
- `toolbar.scss`
  - Description: Style module that provides visual rules for sibling components.
  - Location: [src/components/tiptap-ui-primitive/toolbar/toolbar.scss](../../../src/components/tiptap-ui-primitive/toolbar/toolbar.scss)
  - Contains: module-level configuration or data
  - Dependencies: None
- `toolbar.tsx`
  - Description: Module that implements toolbar responsibilities for this directory.
  - Location: [src/components/tiptap-ui-primitive/toolbar/toolbar.tsx](../../../src/components/tiptap-ui-primitive/toolbar/toolbar.tsx)
  - Contains: 3 function(s)
  - Dependencies: @/components/tiptap-ui-primitive/separator, @/components/tiptap-ui-primitive/toolbar/toolbar.scss, @/hooks/use-composed-ref, @/hooks/use-menu-navigation, @/lib/tiptap-utils, react

## Dependencies

### Internal Dependencies

- @/components/tiptap-ui-primitive/separator
- @/components/tiptap-ui-primitive/toolbar/toolbar.scss
- @/hooks/use-composed-ref
- @/hooks/use-menu-navigation
- @/lib/tiptap-utils

### External Dependencies

- react

