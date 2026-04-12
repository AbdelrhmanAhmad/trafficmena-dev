# C4 Code Level: Tiptap Ui list Button

## Overview

- **Name**: Tiptap Ui list Button
- **Description**: Tiptap Ui list Button React component modules.
- **Location**: [src/components/tiptap-ui/list-button](../../../src/components/tiptap-ui/list-button)
- **Language**: TypeScript
- **Purpose**: Render tiptap ui list button user interface elements for the TrafficMENA frontend.

## Code Elements

### Functions/Methods

- `ListShortcutBadge({
  type,
  shortcutKeys = LIST_SHORTCUT_KEYS[type],
}: {
  type: ListType;
  shortcutKeys?: string;
}): unknown`
  - Description: Implements list shortcut badge behavior for this module.
  - Location: [src/components/tiptap-ui/list-button/list-button.tsx](../../../src/components/tiptap-ui/list-button/list-button.tsx) (line 26)
  - Dependencies: @/components/tiptap-ui-primitive/badge, @/components/tiptap-ui-primitive/button, @/components/tiptap-ui/list-button, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, react
- `canToggleList(editor: Editor | null, type: ListType, turnInto: boolean = true): boolean`
  - Description: Implements can toggle list behavior for this module.
  - Location: [src/components/tiptap-ui/list-button/use-list.ts](../../../src/components/tiptap-ui/list-button/use-list.ts) (line 69)
  - Dependencies: @/components/tiptap-icons/list-icon, @/components/tiptap-icons/list-ordered-icon, @/components/tiptap-icons/list-todo-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/pm/state, @tiptap/react, react, react-hotkeys-hook
- `isListActive(editor: Editor | null, type: ListType): boolean`
  - Description: Checks whether list active.
  - Location: [src/components/tiptap-ui/list-button/use-list.ts](../../../src/components/tiptap-ui/list-button/use-list.ts) (line 112)
  - Dependencies: @/components/tiptap-icons/list-icon, @/components/tiptap-icons/list-ordered-icon, @/components/tiptap-icons/list-todo-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/pm/state, @tiptap/react, react, react-hotkeys-hook
- `toggleList(editor: Editor | null, type: ListType): boolean`
  - Description: Implements toggle list behavior for this module.
  - Location: [src/components/tiptap-ui/list-button/use-list.ts](../../../src/components/tiptap-ui/list-button/use-list.ts) (line 130)
  - Dependencies: @/components/tiptap-icons/list-icon, @/components/tiptap-icons/list-ordered-icon, @/components/tiptap-icons/list-todo-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/pm/state, @tiptap/react, react, react-hotkeys-hook
- `shouldShowButton(props: {
  editor: Editor | null;
  type: ListType;
  hideWhenUnavailable: boolean;
}): boolean`
  - Description: Implements should show button behavior for this module.
  - Location: [src/components/tiptap-ui/list-button/use-list.ts](../../../src/components/tiptap-ui/list-button/use-list.ts) (line 196)
  - Dependencies: @/components/tiptap-icons/list-icon, @/components/tiptap-icons/list-ordered-icon, @/components/tiptap-icons/list-todo-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/pm/state, @tiptap/react, react, react-hotkeys-hook
- `useList(config: UseListConfig): unknown`
  - Description: React hook that manages list behavior.
  - Location: [src/components/tiptap-ui/list-button/use-list.ts](../../../src/components/tiptap-ui/list-button/use-list.ts) (line 250)
  - Dependencies: @/components/tiptap-icons/list-icon, @/components/tiptap-icons/list-ordered-icon, @/components/tiptap-icons/list-todo-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/pm/state, @tiptap/react, react, react-hotkeys-hook

### Classes/Modules

- `index.tsx`
  - Description: Entry-point module that re-exports or wires together sibling modules.
  - Location: [src/components/tiptap-ui/list-button/index.tsx](../../../src/components/tiptap-ui/list-button/index.tsx)
  - Contains: module-level configuration or data
  - Dependencies: None
- `list-button.tsx`
  - Description: Module that implements list button responsibilities for this directory.
  - Location: [src/components/tiptap-ui/list-button/list-button.tsx](../../../src/components/tiptap-ui/list-button/list-button.tsx)
  - Contains: 1 function(s)
  - Dependencies: @/components/tiptap-ui-primitive/badge, @/components/tiptap-ui-primitive/button, @/components/tiptap-ui/list-button, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, react
- `use-list.ts`
  - Description: Module that implements use list responsibilities for this directory.
  - Location: [src/components/tiptap-ui/list-button/use-list.ts](../../../src/components/tiptap-ui/list-button/use-list.ts)
  - Contains: 5 function(s)
  - Dependencies: @/components/tiptap-icons/list-icon, @/components/tiptap-icons/list-ordered-icon, @/components/tiptap-icons/list-todo-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/pm/state, @tiptap/react, react, react-hotkeys-hook

## Dependencies

### Internal Dependencies

- @/components/tiptap-icons/list-icon
- @/components/tiptap-icons/list-ordered-icon
- @/components/tiptap-icons/list-todo-icon
- @/components/tiptap-ui-primitive/badge
- @/components/tiptap-ui-primitive/button
- @/components/tiptap-ui/list-button
- @/hooks/use-mobile
- @/hooks/use-tiptap-editor
- @/lib/tiptap-utils

### External Dependencies

- @tiptap/pm/state
- @tiptap/react
- react
- react-hotkeys-hook

