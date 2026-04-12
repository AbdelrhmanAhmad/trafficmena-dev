# C4 Code Level: Subscribe components

## Overview

- **Name**: Subscribe components
- **Description**: Subscribe components React component modules.
- **Location**: [src/features/subscribe/components](../../../src/features/subscribe/components)
- **Language**: TypeScript
- **Purpose**: Render subscribe components user interface elements for the TrafficMENA frontend.

## Code Elements

### Functions/Methods

- `ValueCell({ value, isPremium = false }: { value: FeatureValue; isPremium?: boolean }): unknown`
  - Description: Implements value cell behavior for this module.
  - Location: [src/features/subscribe/components/ComparisonTable.tsx](../../../src/features/subscribe/components/ComparisonTable.tsx) (line 7)
  - Dependencies: ../content, @/shared/lib/utils, lucide-react
- `ComparisonTable(): unknown`
  - Description: Implements comparison table behavior for this module.
  - Location: [src/features/subscribe/components/ComparisonTable.tsx](../../../src/features/subscribe/components/ComparisonTable.tsx) (line 25)
  - Dependencies: ../content, @/shared/lib/utils, lucide-react
- `DifferentiationSection(): unknown`
  - Description: Implements differentiation section behavior for this module.
  - Location: [src/features/subscribe/components/DifferentiationSection.tsx](../../../src/features/subscribe/components/DifferentiationSection.tsx) (line 3)
  - Dependencies: ../content
- `FAQSection(): unknown`
  - Description: Implements faqsection behavior for this module.
  - Location: [src/features/subscribe/components/FAQSection.tsx](../../../src/features/subscribe/components/FAQSection.tsx) (line 9)
  - Dependencies: ../content, @/shared/components/ui/accordion
- `FoundingMemberPricing({
  priceEgp,
  onSubscribe,
  isPending = false,
}: FoundingMemberPricingProps): unknown`
  - Description: Implements founding member pricing behavior for this module.
  - Location: [src/features/subscribe/components/FoundingMemberPricing.tsx](../../../src/features/subscribe/components/FoundingMemberPricing.tsx) (line 11)
  - Dependencies: ../content, @/shared/components/ui/button, lucide-react
- `ROISection(): unknown`
  - Description: Implements roisection behavior for this module.
  - Location: [src/features/subscribe/components/ROISection.tsx](../../../src/features/subscribe/components/ROISection.tsx) (line 3)
  - Dependencies: ../content
- `SessionTable({ sessions }: { sessions: Session[] }): unknown`
  - Description: Implements session table behavior for this module.
  - Location: [src/features/subscribe/components/TrackDetailsSection.tsx](../../../src/features/subscribe/components/TrackDetailsSection.tsx) (line 15)
  - Dependencies: ../content, @/shared/lib/utils, lucide-react
- `BonusSection({ items }: { items: string[] }): unknown`
  - Description: Implements bonus section behavior for this module.
  - Location: [src/features/subscribe/components/TrackDetailsSection.tsx](../../../src/features/subscribe/components/TrackDetailsSection.tsx) (line 34)
  - Dependencies: ../content, @/shared/lib/utils, lucide-react
- `TrackCard({
  title,
  description,
  sessions,
  bonus,
  icon: Icon,
  outcome,
}: {
  title: string;
  description: string;
  sessions: Session[];
  bonus: string[];
  icon: typeof BookOpen;
  outcome: string;
}): unknown`
  - Description: Implements track card behavior for this module.
  - Location: [src/features/subscribe/components/TrackDetailsSection.tsx](../../../src/features/subscribe/components/TrackDetailsSection.tsx) (line 53)
  - Dependencies: ../content, @/shared/lib/utils, lucide-react
- `TrackDetailsSection(): unknown`
  - Description: Implements track details section behavior for this module.
  - Location: [src/features/subscribe/components/TrackDetailsSection.tsx](../../../src/features/subscribe/components/TrackDetailsSection.tsx) (line 92)
  - Dependencies: ../content, @/shared/lib/utils, lucide-react
- `ValueMathSection({ currentPrice }: ValueMathProps): unknown`
  - Description: Implements value math section behavior for this module.
  - Location: [src/features/subscribe/components/ValueMathSection.tsx](../../../src/features/subscribe/components/ValueMathSection.tsx) (line 8)
  - Dependencies: ../content, lucide-react
- `VideoReviewsSection({ isLoaded = true }: VideoReviewsSectionProps): unknown`
  - Description: Implements video reviews section behavior for this module.
  - Location: [src/features/subscribe/components/VideoReviewsSection.tsx](../../../src/features/subscribe/components/VideoReviewsSection.tsx) (line 10)
  - Dependencies: ../content, @/shared/components/VideoEmbed, @/shared/lib/utils, react

### Classes/Modules

- `ComparisonTable.tsx`
  - Description: Module that implements comparison table responsibilities for this directory.
  - Location: [src/features/subscribe/components/ComparisonTable.tsx](../../../src/features/subscribe/components/ComparisonTable.tsx)
  - Contains: 2 function(s)
  - Dependencies: ../content, @/shared/lib/utils, lucide-react
- `DifferentiationSection.tsx`
  - Description: Module that implements differentiation section responsibilities for this directory.
  - Location: [src/features/subscribe/components/DifferentiationSection.tsx](../../../src/features/subscribe/components/DifferentiationSection.tsx)
  - Contains: 1 function(s)
  - Dependencies: ../content
- `FAQSection.tsx`
  - Description: Module that implements faqsection responsibilities for this directory.
  - Location: [src/features/subscribe/components/FAQSection.tsx](../../../src/features/subscribe/components/FAQSection.tsx)
  - Contains: 1 function(s)
  - Dependencies: ../content, @/shared/components/ui/accordion
- `FoundingMemberPricing.tsx`
  - Description: Module that implements founding member pricing responsibilities for this directory.
  - Location: [src/features/subscribe/components/FoundingMemberPricing.tsx](../../../src/features/subscribe/components/FoundingMemberPricing.tsx)
  - Contains: 1 function(s)
  - Dependencies: ../content, @/shared/components/ui/button, lucide-react
- `index.ts`
  - Description: Entry-point module that re-exports or wires together sibling modules.
  - Location: [src/features/subscribe/components/index.ts](../../../src/features/subscribe/components/index.ts)
  - Contains: module-level configuration or data
  - Dependencies: None
- `ROISection.tsx`
  - Description: Module that implements roisection responsibilities for this directory.
  - Location: [src/features/subscribe/components/ROISection.tsx](../../../src/features/subscribe/components/ROISection.tsx)
  - Contains: 1 function(s)
  - Dependencies: ../content
- `TrackDetailsSection.tsx`
  - Description: Module that implements track details section responsibilities for this directory.
  - Location: [src/features/subscribe/components/TrackDetailsSection.tsx](../../../src/features/subscribe/components/TrackDetailsSection.tsx)
  - Contains: 4 function(s)
  - Dependencies: ../content, @/shared/lib/utils, lucide-react
- `ValueMathSection.tsx`
  - Description: Module that implements value math section responsibilities for this directory.
  - Location: [src/features/subscribe/components/ValueMathSection.tsx](../../../src/features/subscribe/components/ValueMathSection.tsx)
  - Contains: 1 function(s)
  - Dependencies: ../content, lucide-react
- `VideoReviewsSection.tsx`
  - Description: Module that implements video reviews section responsibilities for this directory.
  - Location: [src/features/subscribe/components/VideoReviewsSection.tsx](../../../src/features/subscribe/components/VideoReviewsSection.tsx)
  - Contains: 1 function(s)
  - Dependencies: ../content, @/shared/components/VideoEmbed, @/shared/lib/utils, react

## Dependencies

### Internal Dependencies

- ../content
- @/shared/components/VideoEmbed
- @/shared/components/ui/accordion
- @/shared/components/ui/button
- @/shared/lib/utils

### External Dependencies

- lucide-react
- react

