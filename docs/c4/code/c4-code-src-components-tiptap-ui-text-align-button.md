# C4 Code Level: Tiptap Ui text Align Button

## Overview

- **Name**: Tiptap Ui text Align Button
- **Description**: Tiptap Ui text Align Button React component modules.
- **Location**: [src/components/tiptap-ui/text-align-button](../../../src/components/tiptap-ui/text-align-button)
- **Language**: TypeScript
- **Purpose**: Render tiptap ui text align button user interface elements for the TrafficMENA frontend.

## Code Elements

### Functions/Methods

- `TextAlignShortcutBadge({
  align,
  shortcutKeys = TEXT_ALIGN_SHORTCUT_KEYS[align],
}: {
  align: TextAlign;
  shortcutKeys?: string;
}): unknown`
  - Description: Implements text align shortcut badge behavior for this module.
  - Location: [src/components/tiptap-ui/text-align-button/text-align-button.tsx](../../../src/components/tiptap-ui/text-align-button/text-align-button.tsx) (line 35)
  - Dependencies: @/components/tiptap-ui-primitive/badge, @/components/tiptap-ui-primitive/button, @/components/tiptap-ui/text-align-button, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, react
- `canSetTextAlign(editor: Editor | null, align: TextAlign): boolean`
  - Description: Implements can set text align behavior for this module.
  - Location: [src/components/tiptap-ui/text-align-button/use-text-align.ts](../../../src/components/tiptap-ui/text-align-button/use-text-align.ts) (line 64)
  - Dependencies: @/components/tiptap-icons/align-center-icon, @/components/tiptap-icons/align-justify-icon, @/components/tiptap-icons/align-left-icon, @/components/tiptap-icons/align-right-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react, react-hotkeys-hook
- `hasSetTextAlign(commands: ChainedCommands): commands is ChainedCommands & {
  setTextAlign: (align: TextAlign) => ChainedCommands;
}`
  - Description: Checks whether the current context has set text align.
  - Location: [src/components/tiptap-ui/text-align-button/use-text-align.ts](../../../src/components/tiptap-ui/text-align-button/use-text-align.ts) (line 72)
  - Dependencies: @/components/tiptap-icons/align-center-icon, @/components/tiptap-icons/align-justify-icon, @/components/tiptap-icons/align-left-icon, @/components/tiptap-icons/align-right-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react, react-hotkeys-hook
- `isTextAlignActive(editor: Editor | null, align: TextAlign): boolean`
  - Description: Checks whether text align active.
  - Location: [src/components/tiptap-ui/text-align-button/use-text-align.ts](../../../src/components/tiptap-ui/text-align-button/use-text-align.ts) (line 81)
  - Dependencies: @/components/tiptap-icons/align-center-icon, @/components/tiptap-icons/align-justify-icon, @/components/tiptap-icons/align-left-icon, @/components/tiptap-icons/align-right-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react, react-hotkeys-hook
- `setTextAlign(editor: Editor | null, align: TextAlign): boolean`
  - Description: Implements set text align behavior for this module.
  - Location: [src/components/tiptap-ui/text-align-button/use-text-align.ts](../../../src/components/tiptap-ui/text-align-button/use-text-align.ts) (line 89)
  - Dependencies: @/components/tiptap-icons/align-center-icon, @/components/tiptap-icons/align-justify-icon, @/components/tiptap-icons/align-left-icon, @/components/tiptap-icons/align-right-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react, react-hotkeys-hook
- `shouldShowButton(props: {
  editor: Editor | null;
  hideWhenUnavailable: boolean;
  align: TextAlign;
}): boolean`
  - Description: Implements should show button behavior for this module.
  - Location: [src/components/tiptap-ui/text-align-button/use-text-align.ts](../../../src/components/tiptap-ui/text-align-button/use-text-align.ts) (line 104)
  - Dependencies: @/components/tiptap-icons/align-center-icon, @/components/tiptap-icons/align-justify-icon, @/components/tiptap-icons/align-left-icon, @/components/tiptap-icons/align-right-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react, react-hotkeys-hook
- `useTextAlign(config: UseTextAlignConfig): unknown`
  - Description: React hook that manages text align behavior.
  - Location: [src/components/tiptap-ui/text-align-button/use-text-align.ts](../../../src/components/tiptap-ui/text-align-button/use-text-align.ts) (line 158)
  - Dependencies: @/components/tiptap-icons/align-center-icon, @/components/tiptap-icons/align-justify-icon, @/components/tiptap-icons/align-left-icon, @/components/tiptap-icons/align-right-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react, react-hotkeys-hook

### Classes/Modules

- `index.tsx`
  - Description: Entry-point module that re-exports or wires together sibling modules.
  - Location: [src/components/tiptap-ui/text-align-button/index.tsx](../../../src/components/tiptap-ui/text-align-button/index.tsx)
  - Contains: module-level configuration or data
  - Dependencies: None
- `text-align-button.tsx`
  - Description: Module that implements text align button responsibilities for this directory.
  - Location: [src/components/tiptap-ui/text-align-button/text-align-button.tsx](../../../src/components/tiptap-ui/text-align-button/text-align-button.tsx)
  - Contains: 1 function(s)
  - Dependencies: @/components/tiptap-ui-primitive/badge, @/components/tiptap-ui-primitive/button, @/components/tiptap-ui/text-align-button, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, react
- `use-text-align.ts`
  - Description: Module that implements use text align responsibilities for this directory.
  - Location: [src/components/tiptap-ui/text-align-button/use-text-align.ts](../../../src/components/tiptap-ui/text-align-button/use-text-align.ts)
  - Contains: 6 function(s)
  - Dependencies: @/components/tiptap-icons/align-center-icon, @/components/tiptap-icons/align-justify-icon, @/components/tiptap-icons/align-left-icon, @/components/tiptap-icons/align-right-icon, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react, react-hotkeys-hook

## Dependencies

### Internal Dependencies

- @/components/tiptap-icons/align-center-icon
- @/components/tiptap-icons/align-justify-icon
- @/components/tiptap-icons/align-left-icon
- @/components/tiptap-icons/align-right-icon
- @/components/tiptap-ui-primitive/badge
- @/components/tiptap-ui-primitive/button
- @/components/tiptap-ui/text-align-button
- @/hooks/use-mobile
- @/hooks/use-tiptap-editor
- @/lib/tiptap-utils

### External Dependencies

- @tiptap/react
- react
- react-hotkeys-hook

