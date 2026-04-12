# C4 Code Level: Admin components

## Overview

- **Name**: Admin components
- **Description**: Admin components React component modules.
- **Location**: [src/pages/admin/components](../../../src/pages/admin/components)
- **Language**: TypeScript
- **Purpose**: Render admin components user interface elements for the TrafficMENA frontend.

## Code Elements

### Functions/Methods

- `InviteOnlySettingsCard({ canEdit }: InviteOnlySettingsCardProps): unknown`
  - Description: Implements invite only settings card behavior for this module.
  - Location: [src/pages/admin/components/InviteOnlySettingsCard.tsx](../../../src/pages/admin/components/InviteOnlySettingsCard.tsx) (line 12)
  - Dependencies: @/app/hooks/useSettings, @/shared/components/ui/card, @/shared/components/ui/switch, @/shared/hooks/custom/use-toast, date-fns, lucide-react
- `SubscriptionSettingsCard({ canEdit }: SubscriptionSettingsCardProps): unknown`
  - Description: Implements subscription settings card behavior for this module.
  - Location: [src/pages/admin/components/SubscriptionSettingsCard.tsx](../../../src/pages/admin/components/SubscriptionSettingsCard.tsx) (line 53)
  - Dependencies: @/app/hooks/useSubscriptions, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/components/ui/form, @/shared/components/ui/input, @/shared/hooks/custom/use-toast, @hookform/resolvers/zod, lucide-react, react, react-hook-form, zod

### Classes/Modules

- `InviteOnlySettingsCard.tsx`
  - Description: Module that implements invite only settings card responsibilities for this directory.
  - Location: [src/pages/admin/components/InviteOnlySettingsCard.tsx](../../../src/pages/admin/components/InviteOnlySettingsCard.tsx)
  - Contains: 1 function(s)
  - Dependencies: @/app/hooks/useSettings, @/shared/components/ui/card, @/shared/components/ui/switch, @/shared/hooks/custom/use-toast, date-fns, lucide-react
- `SubscriptionSettingsCard.tsx`
  - Description: Module that implements subscription settings card responsibilities for this directory.
  - Location: [src/pages/admin/components/SubscriptionSettingsCard.tsx](../../../src/pages/admin/components/SubscriptionSettingsCard.tsx)
  - Contains: 1 function(s)
  - Dependencies: @/app/hooks/useSubscriptions, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/components/ui/form, @/shared/components/ui/input, @/shared/hooks/custom/use-toast, @hookform/resolvers/zod, lucide-react, react, react-hook-form, zod

## Dependencies

### Internal Dependencies

- @/app/hooks/useSettings
- @/app/hooks/useSubscriptions
- @/shared/components/ui/button
- @/shared/components/ui/card
- @/shared/components/ui/form
- @/shared/components/ui/input
- @/shared/components/ui/switch
- @/shared/hooks/custom/use-toast

### External Dependencies

- @hookform/resolvers/zod
- date-fns
- lucide-react
- react
- react-hook-form
- zod

