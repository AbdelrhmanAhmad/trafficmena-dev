# C4 Code Level: Tiptap Ui undo Redo Button

## Overview

- **Name**: Tiptap Ui undo Redo Button
- **Description**: Tiptap Ui undo Redo Button React component modules.
- **Location**: [src/components/tiptap-ui/undo-redo-button](../../../src/components/tiptap-ui/undo-redo-button)
- **Language**: TypeScript
- **Purpose**: Render tiptap ui undo redo button user interface elements for the TrafficMENA frontend.

## Code Elements

### Functions/Methods

- `HistoryShortcutBadge({
  action,
  shortcutKeys = UNDO_REDO_SHORTCUT_KEYS[action],
}: {
  action: UndoRedoAction;
  shortcutKeys?: string;
}): unknown`
  - Description: Implements history shortcut badge behavior for this module.
  - Location: [src/components/tiptap-ui/undo-redo-button/undo-redo-button.tsx](../../../src/components/tiptap-ui/undo-redo-button/undo-redo-button.tsx) (line 28)
  - Dependencies: @/components/tiptap-ui-primitive/badge, @/components/tiptap-ui-primitive/button, @/components/tiptap-ui/undo-redo-button, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, react
- `canExecuteUndoRedoAction(editor: Editor | null, action: UndoRedoAction): boolean`
  - Description: Implements can execute undo redo action behavior for this module.
  - Location: [src/components/tiptap-ui/undo-redo-button/use-undo-redo.ts](../../../src/components/tiptap-ui/undo-redo-button/use-undo-redo.ts) (line 56)
  - Dependencies: @/components/tiptap-icons/redo2-icon, @/components/tiptap-icons/undo2-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react, react-hotkeys-hook
- `executeUndoRedoAction(editor: Editor | null, action: UndoRedoAction): boolean`
  - Description: Implements execute undo redo action behavior for this module.
  - Location: [src/components/tiptap-ui/undo-redo-button/use-undo-redo.ts](../../../src/components/tiptap-ui/undo-redo-button/use-undo-redo.ts) (line 66)
  - Dependencies: @/components/tiptap-icons/redo2-icon, @/components/tiptap-icons/undo2-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react, react-hotkeys-hook
- `shouldShowButton(props: {
  editor: Editor | null;
  hideWhenUnavailable: boolean;
  action: UndoRedoAction;
}): boolean`
  - Description: Implements should show button behavior for this module.
  - Location: [src/components/tiptap-ui/undo-redo-button/use-undo-redo.ts](../../../src/components/tiptap-ui/undo-redo-button/use-undo-redo.ts) (line 77)
  - Dependencies: @/components/tiptap-icons/redo2-icon, @/components/tiptap-icons/undo2-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react, react-hotkeys-hook
- `useUndoRedo(config: UseUndoRedoConfig): unknown`
  - Description: React hook that manages undo redo behavior.
  - Location: [src/components/tiptap-ui/undo-redo-button/use-undo-redo.ts](../../../src/components/tiptap-ui/undo-redo-button/use-undo-redo.ts) (line 129)
  - Dependencies: @/components/tiptap-icons/redo2-icon, @/components/tiptap-icons/undo2-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react, react-hotkeys-hook

### Classes/Modules

- `index.tsx`
  - Description: Entry-point module that re-exports or wires together sibling modules.
  - Location: [src/components/tiptap-ui/undo-redo-button/index.tsx](../../../src/components/tiptap-ui/undo-redo-button/index.tsx)
  - Contains: module-level configuration or data
  - Dependencies: None
- `undo-redo-button.tsx`
  - Description: Module that implements undo redo button responsibilities for this directory.
  - Location: [src/components/tiptap-ui/undo-redo-button/undo-redo-button.tsx](../../../src/components/tiptap-ui/undo-redo-button/undo-redo-button.tsx)
  - Contains: 1 function(s)
  - Dependencies: @/components/tiptap-ui-primitive/badge, @/components/tiptap-ui-primitive/button, @/components/tiptap-ui/undo-redo-button, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, react
- `use-undo-redo.ts`
  - Description: Module that implements use undo redo responsibilities for this directory.
  - Location: [src/components/tiptap-ui/undo-redo-button/use-undo-redo.ts](../../../src/components/tiptap-ui/undo-redo-button/use-undo-redo.ts)
  - Contains: 4 function(s)
  - Dependencies: @/components/tiptap-icons/redo2-icon, @/components/tiptap-icons/undo2-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react, react-hotkeys-hook

## Dependencies

### Internal Dependencies

- @/components/tiptap-icons/redo2-icon
- @/components/tiptap-icons/undo2-icon
- @/components/tiptap-ui-primitive/badge
- @/components/tiptap-ui-primitive/button
- @/components/tiptap-ui/undo-redo-button
- @/hooks/use-mobile
- @/hooks/use-tiptap-editor
- @/lib/tiptap-utils

### External Dependencies

- @tiptap/react
- react
- react-hotkeys-hook

