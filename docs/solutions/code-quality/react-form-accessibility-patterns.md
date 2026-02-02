---
title: React Form Accessibility Patterns
category: code-quality
tags: [react, accessibility, forms, useId, a11y]
severity: medium
components: [calculators, forms]
symptoms:
  - Duplicate IDs in DOM when component renders multiple times
  - Labels not associated with inputs
  - ESLint/Biome warnings about isNaN and parseInt
root_cause: Hardcoded string IDs and unsafe JavaScript methods
resolution_date: 2026-02-02
---

# React Form Accessibility Patterns

## Problem

Calculator components had three code quality issues affecting accessibility and safety:

1. **Hardcoded string IDs** on form inputs/labels caused duplicate IDs when components were reused
2. **Global `isNaN()` usage** instead of the safer `Number.isNaN()`
3. **Missing radix parameter** in `parseInt()` calls

## Symptoms

- Browser console warnings about duplicate IDs
- Screen readers unable to properly associate labels with inputs
- ESLint/Biome/Ultracite warnings:
  - `Use Number.isNaN instead of global isNaN`
  - `Missing radix parameter`

## Solution

### 1. Use React's useId() for Dynamic IDs

```typescript
import { useId, useState } from 'react';

function Calculator() {
  const adSpendId = useId();
  const conversionsId = useId();

  return (
    <>
      <Label htmlFor={adSpendId}>Ad Spend</Label>
      <Input id={adSpendId} ... />

      <Label htmlFor={conversionsId}>Conversions</Label>
      <Input id={conversionsId} ... />
    </>
  );
}
```

**Why:** `useId()` generates stable, unique IDs per component instance, ensuring proper label-input association even when the same component renders multiple times.

### 2. Replace isNaN() with Number.isNaN()

```typescript
// Before - unsafe, performs type coercion
if (isNaN(value)) return null;

// After - strict, only true for actual NaN values
if (Number.isNaN(value)) return null;
```

**Why:** Global `isNaN()` coerces values before checking, leading to unexpected results. `Number.isNaN()` only returns true for actual `NaN` values.

### 3. Always Specify Radix in parseInt()

```typescript
// Before - implicit radix can cause issues
parseInt(value)

// After - explicit base-10 parsing
parseInt(value, 10)
```

**Why:** Without explicit radix, strings starting with "0" may be interpreted as octal in older environments. Always specify `10` for decimal parsing.

## Files Changed

All 23 calculator components in `src/features/calculators/components/`:
- AOVCalculator, CACCalculator, CPCCalculator, CPLCalculator, CPMCalculator
- CTRCalculator, CVRCalculator, BreakevenROASCalculator, GRRCalculator
- LeadToCustomerRateCalculator, LTVCalculator, LTVCACCalculator
- MERCalculator, MoMGrowthCalculator, NCACCalculator, NRRCalculator
- RepeatPurchaseRateCalculator, ROASCalculator, SaaSLTVCalculator
- SEOROICalculator, CheckoutAbandonmentRateCalculator, CartAbandonmentRateCalculator
- CACPaybackCalculator

## Prevention

1. **Ultracite enforcement** - The project's linting rules catch these issues:
   - `Use Number.isFinite instead of global isFinite`
   - `Use Number.isNaN instead of global isNaN`

2. **Code review checklist** - When reviewing form components:
   - [ ] Are IDs using `useId()` hook?
   - [ ] Are labels properly associated with inputs via `htmlFor`?
   - [ ] Is `Number.isNaN()` used instead of `isNaN()`?
   - [ ] Does `parseInt()` include radix parameter?

## Related

- [React useId docs](https://react.dev/reference/react/useId)
- [MDN Number.isNaN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN)
