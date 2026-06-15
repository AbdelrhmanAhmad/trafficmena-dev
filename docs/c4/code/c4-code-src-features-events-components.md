# C4 Code Level: Events components

## Overview

- **Name**: Events components
- **Description**: Events components React component modules.
- **Location**: [src/features/events/components](../../../src/features/events/components)
- **Language**: TypeScript
- **Purpose**: Render events components user interface elements for the TrafficMENA frontend.

## Code Elements

### Functions/Methods

- `SanitizedPreviewDescription({ className, html }: SanitizedHtmlProps): unknown`
  - Description: Implements sanitized preview description behavior for this module.
  - Location: [src/features/events/components/AdminEventForm.tsx](../../../src/features/events/components/AdminEventForm.tsx) (line 120)
  - Dependencies: @/app/api/events, @/app/api/uploads, @/shared/components/LazyEditor, @/shared/components/ui/badge, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/components/ui/form, @/shared/components/ui/input, @/shared/components/ui/select, @/shared/components/ui/textarea, @/shared/utils/dateUtils, @hookform/resolvers/zod, dompurify, lucide-react, react, react-hook-form, zod
- `formatPreviewDate(iso: string | undefined): unknown`
  - Description: Formats preview date for presentation or transport.
  - Location: [src/features/events/components/AdminEventForm.tsx](../../../src/features/events/components/AdminEventForm.tsx) (line 128)
  - Dependencies: @/app/api/events, @/app/api/uploads, @/shared/components/LazyEditor, @/shared/components/ui/badge, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/components/ui/form, @/shared/components/ui/input, @/shared/components/ui/select, @/shared/components/ui/textarea, @/shared/utils/dateUtils, @hookform/resolvers/zod, dompurify, lucide-react, react, react-hook-form, zod
- `AdminEventForm({
  event,
  onSubmit,
  submitLabel = 'Save event',
  isSubmitting,
  onDelete,
  isDeleting,
  canDelete = true,
  trackInfo,
}: AdminEventFormProps): unknown`
  - Description: Implements admin event form behavior for this module.
  - Location: [src/features/events/components/AdminEventForm.tsx](../../../src/features/events/components/AdminEventForm.tsx) (line 139)
  - Dependencies: @/app/api/events, @/app/api/uploads, @/shared/components/LazyEditor, @/shared/components/ui/badge, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/components/ui/form, @/shared/components/ui/input, @/shared/components/ui/select, @/shared/components/ui/textarea, @/shared/utils/dateUtils, @hookform/resolvers/zod, dompurify, lucide-react, react, react-hook-form, zod
- `CancellationConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isPaidEvent,
  isLoading = false,
}: CancellationConfirmDialogProps): unknown`
  - Description: Implements cancellation confirm dialog behavior for this module.
  - Location: [src/features/events/components/CancellationConfirmDialog.tsx](../../../src/features/events/components/CancellationConfirmDialog.tsx) (line 20)
  - Dependencies: @/shared/components/ui/button, @/shared/components/ui/dialog, lucide-react
- `CancellationRequestsList({ eventId }: CancellationRequestsListProps): unknown`
  - Description: Implements cancellation requests list behavior for this module.
  - Location: [src/features/events/components/CancellationRequestsList.tsx](../../../src/features/events/components/CancellationRequestsList.tsx) (line 36)
  - Dependencies: @/app/api/events, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/components/ui/dialog, @/shared/components/ui/input, @/shared/components/ui/table, @tanstack/react-query, date-fns, dompurify, lucide-react, react, sonner
- `EventAttendeesList({ eventId }: EventAttendeesListProps): unknown`
  - Description: Implements event attendees list behavior for this module.
  - Location: [src/features/events/components/EventAttendeesList.tsx](../../../src/features/events/components/EventAttendeesList.tsx) (line 21)
  - Dependencies: ../hooks/useEventAttendees, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/components/ui/input, @/shared/components/ui/table, date-fns, lucide-react, react

### Classes/Modules

- `AdminEventForm.tsx`
  - Description: Module that implements admin event form responsibilities for this directory.
  - Location: [src/features/events/components/AdminEventForm.tsx](../../../src/features/events/components/AdminEventForm.tsx)
  - Contains: 3 function(s)
  - Dependencies: @/app/api/events, @/app/api/uploads, @/shared/components/LazyEditor, @/shared/components/ui/badge, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/components/ui/form, @/shared/components/ui/input, @/shared/components/ui/select, @/shared/components/ui/textarea, @/shared/utils/dateUtils, @hookform/resolvers/zod, dompurify, lucide-react, react, react-hook-form, zod
- `CancellationConfirmDialog.tsx`
  - Description: Module that implements cancellation confirm dialog responsibilities for this directory.
  - Location: [src/features/events/components/CancellationConfirmDialog.tsx](../../../src/features/events/components/CancellationConfirmDialog.tsx)
  - Contains: 1 function(s)
  - Dependencies: @/shared/components/ui/button, @/shared/components/ui/dialog, lucide-react
- `CancellationRequestsList.tsx`
  - Description: Module that implements cancellation requests list responsibilities for this directory.
  - Location: [src/features/events/components/CancellationRequestsList.tsx](../../../src/features/events/components/CancellationRequestsList.tsx)
  - Contains: 1 function(s)
  - Dependencies: @/app/api/events, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/components/ui/dialog, @/shared/components/ui/input, @/shared/components/ui/table, @tanstack/react-query, date-fns, dompurify, lucide-react, react, sonner
- `EventAttendeesList.tsx`
  - Description: Module that implements event attendees list responsibilities for this directory.
  - Location: [src/features/events/components/EventAttendeesList.tsx](../../../src/features/events/components/EventAttendeesList.tsx)
  - Contains: 1 function(s)
  - Dependencies: ../hooks/useEventAttendees, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/components/ui/input, @/shared/components/ui/table, date-fns, lucide-react, react
- `EventCard.tsx`
  - Description: Module that implements event card responsibilities for this directory.
  - Location: [src/features/events/components/EventCard.tsx](../../../src/features/events/components/EventCard.tsx)
  - Contains: module-level configuration or data
  - Dependencies: @/features/events/types, @/shared/lib/utils, @/shared/utils/dateUtils, @/shared/utils/inputSanitization, lucide-react, react, react-router-dom

## Dependencies

### Internal Dependencies

- ../hooks/useEventAttendees
- @/app/api/events
- @/app/api/uploads
- @/features/events/types
- @/shared/components/LazyEditor
- @/shared/components/ui/badge
- @/shared/components/ui/button
- @/shared/components/ui/card
- @/shared/components/ui/dialog
- @/shared/components/ui/form
- @/shared/components/ui/input
- @/shared/components/ui/select
- @/shared/components/ui/table
- @/shared/components/ui/textarea
- @/shared/lib/utils
- @/shared/utils/dateUtils
- @/shared/utils/inputSanitization

### External Dependencies

- @hookform/resolvers/zod
- @tanstack/react-query
- date-fns
- dompurify
- lucide-react
- react
- react-hook-form
- react-router-dom
- sonner
- zod

