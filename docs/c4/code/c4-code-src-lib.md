# C4 Code Level: Src lib

## Overview

- **Name**: Src lib
- **Description**: Src lib modules for the TrafficMENA codebase.
- **Location**: [src/lib](../../../src/lib)
- **Language**: TypeScript
- **Purpose**: Organize the src lib responsibilities used by the application.

## Code Elements

### Functions/Methods

- `cn(...classes: (string | boolean | undefined | null)[]): string`
  - Description: Implements cn behavior for this module.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 24)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react
- `isMac(): boolean`
  - Description: Checks whether mac.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 32)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react
- `formatShortcutKey(key: string, isMac: boolean, capitalize: boolean = true): unknown`
  - Description: Formats shortcut key for presentation or transport.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 44)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react
- `parseShortcutKeys(props: {
  shortcutKeys: string | undefined;
  delimiter?: string;
  capitalize?: boolean;
}): unknown`
  - Description: Parses shortcut keys into a normalized form.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 60)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react
- `isMarkInSchema(markName: string, editor: Editor | null): boolean`
  - Description: Checks whether mark in schema.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 81)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react
- `isNodeInSchema(nodeName: string, editor: Editor | null): boolean`
  - Description: Checks whether node in schema.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 92)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react
- `focusNextNode(editor: Editor): unknown`
  - Description: Implements focus next node behavior for this module.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 102)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react
- `isValidPosition(pos: number | null | undefined): pos is number`
  - Description: Checks whether valid position.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 134)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react
- `isExtensionAvailable(editor: Editor | null, extensionNames: string | string[]): boolean`
  - Description: Checks whether extension available.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 144)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react
- `findNodeAtPosition(editor: Editor, position: number): unknown`
  - Description: Implements find node at position behavior for this module.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 171)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react
- `findNodePosition(props: {
  editor: Editor | null;
  node?: TiptapNode | null;
  nodePos?: number | null;
}): { pos: number; node: TiptapNode } | null`
  - Description: Implements find node position behavior for this module.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 193)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react
- `isNodeTypeSelected(editor: Editor | null, types: string[] = []): boolean`
  - Description: Checks whether node type selected.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 248)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react
- `async handleImageUpload(file: File, onProgress?: (event: { progress: number }) => void, abortSignal?: AbortSignal): Promise<string>`
  - Description: Implements handle image upload behavior for this module.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 271)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react
- `isAllowedUri(uri: string | undefined, protocols?: ProtocolConfig): unknown`
  - Description: Checks whether allowed uri.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 345)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react
- `sanitizeUrl(inputUrl: string, baseUrl: string, protocols?: ProtocolConfig): string`
  - Description: Implements sanitize url behavior for this module.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts) (line 381)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react

### Classes/Modules

- `tiptap-utils.ts`
  - Description: Module that implements tiptap utils responsibilities for this directory.
  - Location: [src/lib/tiptap-utils.ts](../../../src/lib/tiptap-utils.ts)
  - Contains: 15 function(s)
  - Dependencies: @/app/api/uploads, @tiptap/pm/model, @tiptap/pm/state, @tiptap/react

## Dependencies

### Internal Dependencies

- @/app/api/uploads

### External Dependencies

- @tiptap/pm/model
- @tiptap/pm/state
- @tiptap/react

