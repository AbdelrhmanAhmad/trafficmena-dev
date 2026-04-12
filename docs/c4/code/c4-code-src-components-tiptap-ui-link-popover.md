# C4 Code Level: Tiptap Ui link Popover

## Overview

- **Name**: Tiptap Ui link Popover
- **Description**: Tiptap Ui link Popover React component modules.
- **Location**: [src/components/tiptap-ui/link-popover](../../../src/components/tiptap-ui/link-popover)
- **Language**: TypeScript
- **Purpose**: Render tiptap ui link popover user interface elements for the TrafficMENA frontend.

## Code Elements

### Functions/Methods

- `LinkMain({
  url,
  setUrl,
  setLink,
  removeLink,
  openLink,
  isActive,
}): unknown`
  - Description: Implements link main behavior for this module.
  - Location: [src/components/tiptap-ui/link-popover/link-popover.tsx](../../../src/components/tiptap-ui/link-popover/link-popover.tsx) (line 91)
  - Dependencies: @/components/tiptap-icons/corner-down-left-icon, @/components/tiptap-icons/external-link-icon, @/components/tiptap-icons/link-icon, @/components/tiptap-icons/trash-icon, @/components/tiptap-ui-primitive/button, @/components/tiptap-ui-primitive/card, @/components/tiptap-ui-primitive/input, @/components/tiptap-ui-primitive/popover, @/components/tiptap-ui-primitive/separator, @/components/tiptap-ui/link-popover, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @tiptap/react, react
- `LinkContent({ editor }): unknown`
  - Description: Implements link content behavior for this module.
  - Location: [src/components/tiptap-ui/link-popover/link-popover.tsx](../../../src/components/tiptap-ui/link-popover/link-popover.tsx) (line 178)
  - Dependencies: @/components/tiptap-icons/corner-down-left-icon, @/components/tiptap-icons/external-link-icon, @/components/tiptap-icons/link-icon, @/components/tiptap-icons/trash-icon, @/components/tiptap-ui-primitive/button, @/components/tiptap-ui-primitive/card, @/components/tiptap-ui-primitive/input, @/components/tiptap-ui-primitive/popover, @/components/tiptap-ui-primitive/separator, @/components/tiptap-ui/link-popover, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @tiptap/react, react
- `canSetLink(editor: Editor | null): boolean`
  - Description: Implements can set link behavior for this module.
  - Location: [src/components/tiptap-ui/link-popover/use-link-popover.ts](../../../src/components/tiptap-ui/link-popover/use-link-popover.ts) (line 47)
  - Dependencies: @/components/tiptap-icons/link-icon, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react
- `isLinkActive(editor: Editor | null): boolean`
  - Description: Checks whether link active.
  - Location: [src/components/tiptap-ui/link-popover/use-link-popover.ts](../../../src/components/tiptap-ui/link-popover/use-link-popover.ts) (line 55)
  - Dependencies: @/components/tiptap-icons/link-icon, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react
- `shouldShowLinkButton(props: {
  editor: Editor | null;
  hideWhenUnavailable: boolean;
}): boolean`
  - Description: Implements should show link button behavior for this module.
  - Location: [src/components/tiptap-ui/link-popover/use-link-popover.ts](../../../src/components/tiptap-ui/link-popover/use-link-popover.ts) (line 63)
  - Dependencies: @/components/tiptap-icons/link-icon, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react
- `useLinkHandler(props: LinkHandlerProps): unknown`
  - Description: React hook that manages link handler behavior.
  - Location: [src/components/tiptap-ui/link-popover/use-link-popover.ts](../../../src/components/tiptap-ui/link-popover/use-link-popover.ts) (line 85)
  - Dependencies: @/components/tiptap-icons/link-icon, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react
- `useLinkState(props: { editor: Editor | null; hideWhenUnavailable: boolean }): unknown`
  - Description: React hook that manages link state behavior.
  - Location: [src/components/tiptap-ui/link-popover/use-link-popover.ts](../../../src/components/tiptap-ui/link-popover/use-link-popover.ts) (line 171)
  - Dependencies: @/components/tiptap-icons/link-icon, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react
- `useLinkPopover(config?: UseLinkPopoverConfig): unknown`
  - Description: React hook that manages link popover behavior.
  - Location: [src/components/tiptap-ui/link-popover/use-link-popover.ts](../../../src/components/tiptap-ui/link-popover/use-link-popover.ts) (line 244)
  - Dependencies: @/components/tiptap-icons/link-icon, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react

### Classes/Modules

- `index.tsx`
  - Description: Entry-point module that re-exports or wires together sibling modules.
  - Location: [src/components/tiptap-ui/link-popover/index.tsx](../../../src/components/tiptap-ui/link-popover/index.tsx)
  - Contains: module-level configuration or data
  - Dependencies: None
- `link-popover.tsx`
  - Description: Module that implements link popover responsibilities for this directory.
  - Location: [src/components/tiptap-ui/link-popover/link-popover.tsx](../../../src/components/tiptap-ui/link-popover/link-popover.tsx)
  - Contains: 2 function(s)
  - Dependencies: @/components/tiptap-icons/corner-down-left-icon, @/components/tiptap-icons/external-link-icon, @/components/tiptap-icons/link-icon, @/components/tiptap-icons/trash-icon, @/components/tiptap-ui-primitive/button, @/components/tiptap-ui-primitive/card, @/components/tiptap-ui-primitive/input, @/components/tiptap-ui-primitive/popover, @/components/tiptap-ui-primitive/separator, @/components/tiptap-ui/link-popover, @/hooks/use-mobile, @/hooks/use-tiptap-editor, @tiptap/react, react
- `use-link-popover.ts`
  - Description: Module that implements use link popover responsibilities for this directory.
  - Location: [src/components/tiptap-ui/link-popover/use-link-popover.ts](../../../src/components/tiptap-ui/link-popover/use-link-popover.ts)
  - Contains: 6 function(s)
  - Dependencies: @/components/tiptap-icons/link-icon, @/hooks/use-tiptap-editor, @/lib/tiptap-utils, @tiptap/react, react

## Dependencies

### Internal Dependencies

- @/components/tiptap-icons/corner-down-left-icon
- @/components/tiptap-icons/external-link-icon
- @/components/tiptap-icons/link-icon
- @/components/tiptap-icons/trash-icon
- @/components/tiptap-ui-primitive/button
- @/components/tiptap-ui-primitive/card
- @/components/tiptap-ui-primitive/input
- @/components/tiptap-ui-primitive/popover
- @/components/tiptap-ui-primitive/separator
- @/components/tiptap-ui/link-popover
- @/hooks/use-mobile
- @/hooks/use-tiptap-editor
- @/lib/tiptap-utils

### External Dependencies

- @tiptap/react
- react

