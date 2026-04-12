# C4 Code Level: Tiptap Node image Upload Node

## Overview

- **Name**: Tiptap Node image Upload Node
- **Description**: Tiptap Node image Upload Node React component modules.
- **Location**: [src/components/tiptap-node/image-upload-node](../../../src/components/tiptap-node/image-upload-node)
- **Language**: CSS/SCSS, TypeScript
- **Purpose**: Render tiptap node image upload node user interface elements for the TrafficMENA frontend.

## Code Elements

### Functions/Methods

- `useFileUpload(options: UploadOptions): unknown`
  - Description: React hook that manages file upload behavior.
  - Location: [src/components/tiptap-node/image-upload-node/image-upload-node.tsx](../../../src/components/tiptap-node/image-upload-node/image-upload-node.tsx) (line 85)
  - Dependencies: @/components/tiptap-icons/close-icon, @/components/tiptap-node/image-upload-node/image-upload-node.scss, @/components/tiptap-ui-primitive/button, @/lib/tiptap-utils, @tiptap/react, react
- `CloudUploadIcon(): unknown`
  - Description: Implements cloud upload icon behavior for this module.
  - Location: [src/components/tiptap-node/image-upload-node/image-upload-node.tsx](../../../src/components/tiptap-node/image-upload-node/image-upload-node.tsx) (line 205)
  - Dependencies: @/components/tiptap-icons/close-icon, @/components/tiptap-node/image-upload-node/image-upload-node.scss, @/components/tiptap-ui-primitive/button, @/lib/tiptap-utils, @tiptap/react, react
- `FileIcon(): unknown`
  - Description: Implements file icon behavior for this module.
  - Location: [src/components/tiptap-node/image-upload-node/image-upload-node.tsx](../../../src/components/tiptap-node/image-upload-node/image-upload-node.tsx) (line 227)
  - Dependencies: @/components/tiptap-icons/close-icon, @/components/tiptap-node/image-upload-node/image-upload-node.scss, @/components/tiptap-ui-primitive/button, @/lib/tiptap-utils, @tiptap/react, react
- `FileCornerIcon(): unknown`
  - Description: Implements file corner icon behavior for this module.
  - Location: [src/components/tiptap-node/image-upload-node/image-upload-node.tsx](../../../src/components/tiptap-node/image-upload-node/image-upload-node.tsx) (line 248)
  - Dependencies: @/components/tiptap-icons/close-icon, @/components/tiptap-node/image-upload-node/image-upload-node.scss, @/components/tiptap-ui-primitive/button, @/lib/tiptap-utils, @tiptap/react, react
- `ImageUploadDragArea({ onFile, children }): unknown`
  - Description: Implements image upload drag area behavior for this module.
  - Location: [src/components/tiptap-node/image-upload-node/image-upload-node.tsx](../../../src/components/tiptap-node/image-upload-node/image-upload-node.tsx) (line 283)
  - Dependencies: @/components/tiptap-icons/close-icon, @/components/tiptap-node/image-upload-node/image-upload-node.scss, @/components/tiptap-ui-primitive/button, @/lib/tiptap-utils, @tiptap/react, react
- `ImageUploadPreview({ fileItem, onRemove }): unknown`
  - Description: Implements image upload preview behavior for this module.
  - Location: [src/components/tiptap-node/image-upload-node/image-upload-node.tsx](../../../src/components/tiptap-node/image-upload-node/image-upload-node.tsx) (line 349)
  - Dependencies: @/components/tiptap-icons/close-icon, @/components/tiptap-node/image-upload-node/image-upload-node.scss, @/components/tiptap-ui-primitive/button, @/lib/tiptap-utils, @tiptap/react, react
- `DropZoneContent({ maxSize, limit }): unknown`
  - Description: Implements drop zone content behavior for this module.
  - Location: [src/components/tiptap-node/image-upload-node/image-upload-node.tsx](../../../src/components/tiptap-node/image-upload-node/image-upload-node.tsx) (line 396)
  - Dependencies: @/components/tiptap-icons/close-icon, @/components/tiptap-node/image-upload-node/image-upload-node.scss, @/components/tiptap-ui-primitive/button, @/lib/tiptap-utils, @tiptap/react, react
- `ImageUploadNode(props): unknown`
  - Description: Implements image upload node behavior for this module.
  - Location: [src/components/tiptap-node/image-upload-node/image-upload-node.tsx](../../../src/components/tiptap-node/image-upload-node/image-upload-node.tsx) (line 417)
  - Dependencies: @/components/tiptap-icons/close-icon, @/components/tiptap-node/image-upload-node/image-upload-node.scss, @/components/tiptap-ui-primitive/button, @/lib/tiptap-utils, @tiptap/react, react

### Classes/Modules

- `image-upload-node-extension.ts`
  - Description: Module that implements image upload node extension responsibilities for this directory.
  - Location: [src/components/tiptap-node/image-upload-node/image-upload-node-extension.ts](../../../src/components/tiptap-node/image-upload-node/image-upload-node-extension.ts)
  - Contains: module-level configuration or data
  - Dependencies: @/components/tiptap-node/image-upload-node/image-upload-node, @tiptap/pm/model, @tiptap/react
- `image-upload-node.scss`
  - Description: Style module that provides visual rules for sibling components.
  - Location: [src/components/tiptap-node/image-upload-node/image-upload-node.scss](../../../src/components/tiptap-node/image-upload-node/image-upload-node.scss)
  - Contains: module-level configuration or data
  - Dependencies: None
- `image-upload-node.tsx`
  - Description: Module that implements image upload node responsibilities for this directory.
  - Location: [src/components/tiptap-node/image-upload-node/image-upload-node.tsx](../../../src/components/tiptap-node/image-upload-node/image-upload-node.tsx)
  - Contains: 8 function(s)
  - Dependencies: @/components/tiptap-icons/close-icon, @/components/tiptap-node/image-upload-node/image-upload-node.scss, @/components/tiptap-ui-primitive/button, @/lib/tiptap-utils, @tiptap/react, react
- `index.tsx`
  - Description: Entry-point module that re-exports or wires together sibling modules.
  - Location: [src/components/tiptap-node/image-upload-node/index.tsx](../../../src/components/tiptap-node/image-upload-node/index.tsx)
  - Contains: module-level configuration or data
  - Dependencies: None

## Dependencies

### Internal Dependencies

- @/components/tiptap-icons/close-icon
- @/components/tiptap-node/image-upload-node/image-upload-node
- @/components/tiptap-node/image-upload-node/image-upload-node.scss
- @/components/tiptap-ui-primitive/button
- @/lib/tiptap-utils

### External Dependencies

- @tiptap/pm/model
- @tiptap/react
- react

