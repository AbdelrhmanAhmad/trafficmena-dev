# C4 Code Level: Pages dashboard

## Overview

- **Name**: Pages dashboard
- **Description**: Pages dashboard route-level page modules.
- **Location**: [src/pages/dashboard](../../../src/pages/dashboard)
- **Language**: TypeScript
- **Purpose**: Compose full-screen pages dashboard experiences that are mounted by the SPA router.

## Code Elements

### Functions/Methods

- `createCheckoutIdempotencyKey(scope: string): string`
  - Description: Creates checkout idempotency key for downstream use.
  - Location: [src/pages/dashboard/Subscribe.tsx](../../../src/pages/dashboard/Subscribe.tsx) (line 33)
  - Dependencies: @/app/api/client, @/app/api/payments, @/app/hooks/usePayments, @/app/hooks/useSubscriptions, @/features/subscribe/components, @/features/subscribe/content, @/shared/components/layout/AppLayout, @/shared/components/payment, @/shared/components/ui/badge, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/hooks/custom/use-toast, @/shared/utils/paymentMethods, date-fns, lucide-react, react, react-router-dom
- `AlreadySubscribedView({ subscription }: { subscription: { endsAt: string } }): unknown`
  - Description: Implements already subscribed view behavior for this module.
  - Location: [src/pages/dashboard/Subscribe.tsx](../../../src/pages/dashboard/Subscribe.tsx) (line 41)
  - Dependencies: @/app/api/client, @/app/api/payments, @/app/hooks/usePayments, @/app/hooks/useSubscriptions, @/features/subscribe/components, @/features/subscribe/content, @/shared/components/layout/AppLayout, @/shared/components/payment, @/shared/components/ui/badge, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/hooks/custom/use-toast, @/shared/utils/paymentMethods, date-fns, lucide-react, react, react-router-dom
- `HeroSection({
  subscriptionInfo,
  pricePreview,
  selectedMethodId,
  setSelectedMethodId,
  onSubscribe,
  isPending,
  isLoaded,
}: {
  subscriptionInfo: { priceEgp?: number | null; discountPercent?: number } | undefined;
  pricePreview: { amountFormatted?: string } | undefined;
  selectedMethodId: number | null;
  setSelectedMethodId: (id: number | null) => void;
  onSubscribe: () => void;
  isPending: boolean;
  isLoaded: boolean;
}): unknown`
  - Description: Implements hero section behavior for this module.
  - Location: [src/pages/dashboard/Subscribe.tsx](../../../src/pages/dashboard/Subscribe.tsx) (line 83)
  - Dependencies: @/app/api/client, @/app/api/payments, @/app/hooks/usePayments, @/app/hooks/useSubscriptions, @/features/subscribe/components, @/features/subscribe/content, @/shared/components/layout/AppLayout, @/shared/components/payment, @/shared/components/ui/badge, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/hooks/custom/use-toast, @/shared/utils/paymentMethods, date-fns, lucide-react, react, react-router-dom
- `FinalCTASection({
  subscriptionInfo,
  selectedMethodId,
  onSubscribe,
  isPending,
}: {
  subscriptionInfo: { priceEgp?: number | null; discountPercent?: number } | undefined;
  selectedMethodId: number | null;
  onSubscribe: () => void;
  isPending: boolean;
}): unknown`
  - Description: Implements final ctasection behavior for this module.
  - Location: [src/pages/dashboard/Subscribe.tsx](../../../src/pages/dashboard/Subscribe.tsx) (line 207)
  - Dependencies: @/app/api/client, @/app/api/payments, @/app/hooks/usePayments, @/app/hooks/useSubscriptions, @/features/subscribe/components, @/features/subscribe/content, @/shared/components/layout/AppLayout, @/shared/components/payment, @/shared/components/ui/badge, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/hooks/custom/use-toast, @/shared/utils/paymentMethods, date-fns, lucide-react, react, react-router-dom
- `SubscribePaymentView(): unknown`
  - Description: Implements subscribe payment view behavior for this module.
  - Location: [src/pages/dashboard/Subscribe.tsx](../../../src/pages/dashboard/Subscribe.tsx) (line 279)
  - Dependencies: @/app/api/client, @/app/api/payments, @/app/hooks/usePayments, @/app/hooks/useSubscriptions, @/features/subscribe/components, @/features/subscribe/content, @/shared/components/layout/AppLayout, @/shared/components/payment, @/shared/components/ui/badge, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/hooks/custom/use-toast, @/shared/utils/paymentMethods, date-fns, lucide-react, react, react-router-dom
- `DashboardSubscribePage(): unknown`
  - Description: Implements dashboard subscribe page behavior for this module.
  - Location: [src/pages/dashboard/Subscribe.tsx](../../../src/pages/dashboard/Subscribe.tsx) (line 476)
  - Dependencies: @/app/api/client, @/app/api/payments, @/app/hooks/usePayments, @/app/hooks/useSubscriptions, @/features/subscribe/components, @/features/subscribe/content, @/shared/components/layout/AppLayout, @/shared/components/payment, @/shared/components/ui/badge, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/hooks/custom/use-toast, @/shared/utils/paymentMethods, date-fns, lucide-react, react, react-router-dom

### Classes/Modules

- `Subscribe.tsx`
  - Description: Module that implements subscribe responsibilities for this directory.
  - Location: [src/pages/dashboard/Subscribe.tsx](../../../src/pages/dashboard/Subscribe.tsx)
  - Contains: 6 function(s)
  - Dependencies: @/app/api/client, @/app/api/payments, @/app/hooks/usePayments, @/app/hooks/useSubscriptions, @/features/subscribe/components, @/features/subscribe/content, @/shared/components/layout/AppLayout, @/shared/components/payment, @/shared/components/ui/badge, @/shared/components/ui/button, @/shared/components/ui/card, @/shared/hooks/custom/use-toast, @/shared/utils/paymentMethods, date-fns, lucide-react, react, react-router-dom

## Dependencies

### Internal Dependencies

- @/app/api/client
- @/app/api/payments
- @/app/hooks/usePayments
- @/app/hooks/useSubscriptions
- @/features/subscribe/components
- @/features/subscribe/content
- @/shared/components/layout/AppLayout
- @/shared/components/payment
- @/shared/components/ui/badge
- @/shared/components/ui/button
- @/shared/components/ui/card
- @/shared/hooks/custom/use-toast
- @/shared/utils/paymentMethods

### External Dependencies

- date-fns
- lucide-react
- react
- react-router-dom

