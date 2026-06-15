# C4 Code Level: Tiptap Ui heading Button

## Overview

- **Name**: Tiptap Ui heading Button
- **Description**: Tiptap Ui heading Button React component modules.
- **Location**: [src/components/tiptap-ui/heading-button](../../../src/components/tiptap-ui/heading-button)
- **Language**: TypeScript
- **Purpose**: Render tiptap ui heading button user interface elements for the TrafficMENA frontend.

## Code Elements

### Functions/Methods

- `HeadingShortcutBadge({
  level,
  shortcutKeys = HEADING_SHORTCUT_KEYS[level],
}: {
  level: Level;
  shortcutKeys?: string;
}): unknown`
  - Description: Implements heading shortcut badge behavior for this module.
  - Location: [src/components/tiptap-ui/heading-button/heading-button.tsx](../../../src/components/tiptap-ui/heading-button/heading-button.tsx) (line 26)
  - Dependencies: @/components/tiptap-ui-primitive/badge, @/components/tiptap-ui-primitive/button, @/components/tiptap-ui/heading-button, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, react
- `canToggle(editor: Editor | null, level?: Level, turnInto: boolean = true): boolean`
  - Description: Implements can toggle behavior for this module.
  - Location: [src/components/tiptap-ui/heading-button/use-heading.ts](../../../src/components/tiptap-ui/heading-button/use-heading.ts) (line 71)
  - Dependencies: @/components/tiptap-icons/heading-five-icon, @/components/tiptap-icons/heading-four-icon, @/components/tiptap-icons/heading-one-icon, @/components/tiptap-icons/heading-six-icon, @/components/tiptap-icons/heading-three-icon, @/components/tiptap-icons/heading-two-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/pm/state, @tiptap/react, react, react-hotkeys-hook
- `isHeadingActive(editor: Editor | null, level?: Level | Level[]): boolean`
  - Description: Checks whether heading active.
  - Location: [src/components/tiptap-ui/heading-button/use-heading.ts](../../../src/components/tiptap-ui/heading-button/use-heading.ts) (line 101)
  - Dependencies: @/components/tiptap-icons/heading-five-icon, @/components/tiptap-icons/heading-four-icon, @/components/tiptap-icons/heading-one-icon, @/components/tiptap-icons/heading-six-icon, @/components/tiptap-icons/heading-three-icon, @/components/tiptap-icons/heading-two-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/pm/state, @tiptap/react, react, react-hotkeys-hook
- `toggleHeading(editor: Editor | null, level: Level | Level[]): boolean`
  - Description: Implements toggle heading behavior for this module.
  - Location: [src/components/tiptap-ui/heading-button/use-heading.ts](../../../src/components/tiptap-ui/heading-button/use-heading.ts) (line 114)
  - Dependencies: @/components/tiptap-icons/heading-five-icon, @/components/tiptap-icons/heading-four-icon, @/components/tiptap-icons/heading-one-icon, @/components/tiptap-icons/heading-six-icon, @/components/tiptap-icons/heading-three-icon, @/components/tiptap-icons/heading-two-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/pm/state, @tiptap/react, react, react-hotkeys-hook
- `shouldShowButton(props: {
  editor: Editor | null;
  level?: Level | Level[];
  hideWhenUnavailable: boolean;
}): boolean`
  - Description: Implements should show button behavior for this module.
  - Location: [src/components/tiptap-ui/heading-button/use-heading.ts](../../../src/components/tiptap-ui/heading-button/use-heading.ts) (line 174)
  - Dependencies: @/components/tiptap-icons/heading-five-icon, @/components/tiptap-icons/heading-four-icon, @/components/tiptap-icons/heading-one-icon, @/components/tiptap-icons/heading-six-icon, @/components/tiptap-icons/heading-three-icon, @/components/tiptap-icons/heading-two-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/pm/state, @tiptap/react, react, react-hotkeys-hook
- `useHeading(config: UseHeadingConfig): unknown`
  - Description: React hook that manages heading behavior.
  - Location: [src/components/tiptap-ui/heading-button/use-heading.ts](../../../src/components/tiptap-ui/heading-button/use-heading.ts) (line 240)
  - Dependencies: @/components/tiptap-icons/heading-five-icon, @/components/tiptap-icons/heading-four-icon, @/components/tiptap-icons/heading-one-icon, @/components/tiptap-icons/heading-six-icon, @/components/tiptap-icons/heading-three-icon, @/components/tiptap-icons/heading-two-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/pm/state, @tiptap/react, react, react-hotkeys-hook

### Classes/Modules

- `heading-button.tsx`
  - Description: Module that implements heading button responsibilities for this directory.
  - Location: [src/components/tiptap-ui/heading-button/heading-button.tsx](../../../src/components/tiptap-ui/heading-button/heading-button.tsx)
  - Contains: 1 function(s)
  - Dependencies: @/components/tiptap-ui-primitive/badge, @/components/tiptap-ui-primitive/button, @/components/tiptap-ui/heading-button, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, react
- `index.tsx`
  - Description: Entry-point module that re-exports or wires together sibling modules.
  - Location: [src/components/tiptap-ui/heading-button/index.tsx](../../../src/components/tiptap-ui/heading-button/index.tsx)
  - Contains: module-level configuration or data
  - Dependencies: None
- `use-heading.ts`
  - Description: Module that implements use heading responsibilities for this directory.
  - Location: [src/components/tiptap-ui/heading-button/use-heading.ts](../../../src/components/tiptap-ui/heading-button/use-heading.ts)
  - Contains: 5 function(s)
  - Dependencies: @/components/tiptap-icons/heading-five-icon, @/components/tiptap-icons/heading-four-icon, @/components/tiptap-icons/heading-one-icon, @/components/tiptap-icons/heading-six-icon, @/components/tiptap-icons/heading-three-icon, @/components/tiptap-icons/heading-two-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/pm/state, @tiptap/react, react, react-hotkeys-hook

## Dependencies

### Internal Dependencies

- @/components/tiptap-icons/heading-five-icon
- @/components/tiptap-icons/heading-four-icon
- @/components/tiptap-icons/heading-one-icon
- @/components/tiptap-icons/heading-six-icon
- @/components/tiptap-icons/heading-three-icon
- @/components/tiptap-icons/heading-two-icon
- @/components/tiptap-ui-primitive/badge
- @/components/tiptap-ui-primitive/button
- @/components/tiptap-ui/heading-button
- @/hooks/use-mobile
- @/hooks/use-tiptap-editor
- @/lib/tiptap-utils

### External Dependencies

- @tiptap/pm/state
- @tiptap/react
- react
- react-hotkeys-hook

