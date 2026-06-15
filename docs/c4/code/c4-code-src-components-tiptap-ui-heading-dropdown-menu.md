# C4 Code Level: Tiptap Ui heading Dropdown Menu

## Overview

- **Name**: Tiptap Ui heading Dropdown Menu
- **Description**: Tiptap Ui heading Dropdown Menu React component modules.
- **Location**: [src/components/tiptap-ui/heading-dropdown-menu](../../../src/components/tiptap-ui/heading-dropdown-menu)
- **Language**: TypeScript
- **Purpose**: Render tiptap ui heading dropdown menu user interface elements for the TrafficMENA frontend.

## Code Elements

### Functions/Methods

- `getActiveHeadingLevel(editor: Editor | null, levels: Level[] = [1, 2, 3, 4, 5, 6]): Level | undefined`
  - Description: Returns active heading level derived from current inputs or state.
  - Location: [src/components/tiptap-ui/heading-dropdown-menu/use-heading-dropdown-menu.ts](../../../src/components/tiptap-ui/heading-dropdown-menu/use-heading-dropdown-menu.ts) (line 41)
  - Dependencies: @/components/tiptap-icons/heading-icon, @/components/tiptap-ui/heading-button, @/hooks/use-tiptap-editor, @tiptap/react, react
- `useHeadingDropdownMenu(config?: UseHeadingDropdownMenuConfig): unknown`
  - Description: React hook that manages heading dropdown menu behavior.
  - Location: [src/components/tiptap-ui/heading-dropdown-menu/use-heading-dropdown-menu.ts](../../../src/components/tiptap-ui/heading-dropdown-menu/use-heading-dropdown-menu.ts) (line 88)
  - Dependencies: @/components/tiptap-icons/heading-icon, @/components/tiptap-ui/heading-button, @/hooks/use-tiptap-editor, @tiptap/react, react

### Classes/Modules

- `heading-dropdown-menu.tsx`
  - Description: Module that implements heading dropdown menu responsibilities for this directory.
  - Location: [src/components/tiptap-ui/heading-dropdown-menu/heading-dropdown-menu.tsx](../../../src/components/tiptap-ui/heading-dropdown-menu/heading-dropdown-menu.tsx)
  - Contains: module-level configuration or data
  - Dependencies: @/components/tiptap-icons/chevron-down-icon, @/components/tiptap-ui-primitive/button, @/components/tiptap-ui-primitive/card, @/components/tiptap-ui-primitive/dropdown-menu, @/components/tiptap-ui/heading-button, @/components/tiptap-ui/heading-dropdown-menu, @/hooks/use-tiptap-editor, react
- `index.tsx`
  - Description: Entry-point module that re-exports or wires together sibling modules.
  - Location: [src/components/tiptap-ui/heading-dropdown-menu/index.tsx](../../../src/components/tiptap-ui/heading-dropdown-menu/index.tsx)
  - Contains: module-level configuration or data
  - Dependencies: None
- `use-heading-dropdown-menu.ts`
  - Description: Module that implements use heading dropdown menu responsibilities for this directory.
  - Location: [src/components/tiptap-ui/heading-dropdown-menu/use-heading-dropdown-menu.ts](../../../src/components/tiptap-ui/heading-dropdown-menu/use-heading-dropdown-menu.ts)
  - Contains: 2 function(s)
  - Dependencies: @/components/tiptap-icons/heading-icon, @/components/tiptap-ui/heading-button, @/hooks/use-tiptap-editor, @tiptap/react, react

## Dependencies

### Internal Dependencies

- @/components/tiptap-icons/chevron-down-icon
- @/components/tiptap-icons/heading-icon
- @/components/tiptap-ui-primitive/button
- @/components/tiptap-ui-primitive/card
- @/components/tiptap-ui-primitive/dropdown-menu
- @/components/tiptap-ui/heading-button
- @/components/tiptap-ui/heading-dropdown-menu
- @/hooks/use-tiptap-editor

### External Dependencies

- @tiptap/react
- react

