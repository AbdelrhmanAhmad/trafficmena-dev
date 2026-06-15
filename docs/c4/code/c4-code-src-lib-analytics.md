# C4 Code Level: src/lib/analytics

## Overview

- **Name**: Frontend Analytics DataLayer Modules
- **Description**: Typed, push-only analytics layer that sends events to `window.dataLayer` for consumption by the Google Tag Manager container loaded from `public/gtm-bootstrap.js`. Covers signup, auth, content discovery, calendar, library content, profile, payment flow, verified purchase, and page view events. Does not call any analytics HTTP endpoints directly.
- **Location**: `src/lib/analytics/`
- **Language**: TypeScript (React 18)
- **Purpose**: Single source of truth for how the SPA emits telemetry. Every tracking call goes through `pushToDataLayer`, which is wrapped in a `try/catch` so analytics instrumentation never breaks the user-facing experience. GTM then fans the events out to downstream destinations (GA4, Ads, Meta, etc.) per its own tag configuration.

## Code Elements

### `gtm.ts`

- `pushToDataLayer(data: Record<string, unknown>): void` — Guarded push to `window.dataLayer`. Initializes the array if missing. Silently swallows errors so instrumentation bugs can never propagate to the UI.

### `helpers.ts`

- `type AnalyticsPaymentItemType = 'event_ticket' | 'track_booking' | 'subscription'`
- `type GlobalVariablesPayload` — Shape of the cross-page `global_variables` context pushed to the dataLayer.
- `getPageType(pathname: string): string` — Derives a page-type label from the current route.
- `getCustomerType(totalPaidPurchases: number): string` — New vs. returning classification for general telemetry.
- `getCustomerTypeForPurchase(priorPurchases: number): string` — Classification scoped to a single purchase context (differentiates first purchase from subsequent purchases).
- `toAnalyticsItemType(itemType)` / `centsToUnits(cents)` / `normalizeAnalyticsPaymentMethod(method)` / `detectMeetingPlatform(url)` / `normalizePhone(phone)` — Normalization helpers applied at the dataLayer boundary to keep event payloads consistent.
- `isGlobalVariablesContextReady(input)` / `buildGlobalVariablesPayload(...)` / `getGlobalVariablesTrackingKey(pathname, locationKey?)` — Gate and build the global-variables snapshot pushed before each tracked page view so downstream tags always see fully hydrated user identity and page type.

### `events.ts`

- Auth events: `trackLoginStart()`, `trackLogin({ status, userId, email })`, `trackSignUpStep(stepNumber, stepName)`, `trackSignUp({ userId, email, phone?, firstName?, lastName? })`.
- Content discovery: `trackViewItemList(listId, listName, items)`, `trackSelectItem(listId, listName, item)`, `trackViewItem(...)`.
- Registration / booking: `trackEventRegistration(params)`, `trackTrackBooking(params)`.
- Checkout funnel: `buildBeginCheckoutEvent(params)`, `trackBeginCheckout(params)`, `buildSelectPaymentMethodEvent(params)`, `trackSelectPaymentMethod(params)`, `trackApplyPromoCode(params)`.
- Purchase: `buildPurchaseEvents(data)` — produces the enriched purchase event(s) pushed after verified payment.
- Each function maps one-to-one with an event in `docs/events-tracking-data-model.md` and pushes a single `dataLayer` entry keyed by `event`.

### `signup.ts`

- `type CompletedSignUpTrackingParams` — Params accepted by the final signup step.
- `buildCompletedSignUpTrackingParams(...)` — Composes the payload pushed when the signup wizard finalizes, ensuring identity is fully hydrated before the `sign_up` event fires.

### `contentDiscovery.ts`

- `EVENTS_LIST_CONTEXT`, `TRACKS_LIST_CONTEXT`, `type AnalyticsListContext` — Constants identifying which catalog a list impression comes from.
- `type AnalyticsDiscoveryItem` — Normalized item shape used for list impressions and selections.
- `buildEventDiscoveryItem(event, index?)` / `buildTrackDiscoveryItem(track, index?)` — Map backend records to `view_item_list` items.
- `isCanonicalDiscoveryListPath(pathname): boolean` — Gate to avoid duplicate impressions from non-canonical routes.
- `useTrackedItemListView(...)` — React hook that fires `view_item_list` exactly once per canonical path + list context combination.

### `calendar.ts`

- `type TrackCalendarEvent` — Local type describing the subset of event fields used to resolve an add-to-calendar analytics event.
- `resolveTrackCalendarAnalyticsEvent(...)` — Maps a track or event to the add-to-calendar tracking payload, including meeting platform detection.

### `libraryContent.ts`

- `type LibrarySeriesContext` — Context passed when a library asset is being viewed inline as part of a series.
- `shouldTrackInlineLibraryContent(...)` — Guard for whether an inline render should emit a library content event.
- `resolveLibrarySeriesContext(state: unknown)` — Derives the series context (if any) from router state when the asset was opened from a series page.

### `profile.ts`

- `type ProfileAnalyticsSnapshot` — Snapshot of profile fields used to detect changes and compute completion.
- `getProfileCompletion(snapshot): number` — Percentage completion used in the `profile_update` event.
- `getUpdatedProfileFields(before, after)` — Diffs two snapshots to produce the list of changed fields emitted with the event.

### `paymentFlow.ts`

- `SUBSCRIPTION_ANALYTICS_ITEM_NAME = 'TrafficMENA Annual Subscription'` — Canonical subscription item name used everywhere.
- `getBeginCheckoutValue(...)` / `getBeginCheckoutValueFromAvailablePricing(...)` / `getSelectPaymentMethodValue(...)` / `getSelectPaymentMethodValueFromAvailablePricing(...)` — Resolve the monetary value used in checkout funnel events.
- `shouldTrackStandaloneCheckoutEntry(input)` — Guards against double firing when the checkout dialog is opened standalone vs. nested.
- `getNormalizedPaymentType(paymentMethodName?): string` — Normalizes Fawaterk method names for analytics.
- `getAnalyticsItemId(itemType, itemId?)` / `getAnalyticsItemName(itemType, itemName?)` / `getAnalyticsItemCategory(...)` / `getPurchaseItemCategory(...)` — Stable IDs/names/categories for all item types.
- `buildCheckoutAnalyticsItem(params)` — Builds a GA4-compatible item object.
- `getAmountCentsFromUnits(amount?)` — Inverse of `centsToUnits` when dataLayer values are expressed in major units.
- `isVerifiedPaymentAnalyticsReady(response)` — Predicate that gates the `purchase` event on the presence of the enriched fields returned by `GET /api/payments/{id}`.

### `usePageTracking.ts`

- `usePageTracking(): void` — React hook mounted near the router root. Watches `useLocation()` and the current-user hook, and on every navigation pushes a `page_view` event together with the `global_variables` snapshot (once the snapshot is ready). Guards against duplicate pushes for the same path+location key.

## Dependencies

### Internal

- `src/app/api/library.ts` — Types for library assets used in library content events.
- `src/app/api/payments.ts` — `PaymentItemType`, `PricePreview`, `VerifyPaymentResponse` types used by `paymentFlow.ts`.
- `src/app/hooks/useCurrentUser.ts` — Identity for page tracking and global variables.
- Feature modules call into this layer: `src/features/events/**`, `src/features/tracks/**`, `src/features/library/**`, `src/features/series/**`, `src/features/calculators/**`, `src/pages/signup/**`, `src/pages/payment/**`, `src/pages/ThankYou*.tsx`, `src/shared/components/payment/**`.

### External

- Browser `window.dataLayer` as the transport to Google Tag Manager (`GTM-5DMGVFZS`), bootstrapped by `public/gtm-bootstrap.js`.
- No outbound HTTP calls from this layer. All transport is in-page dataLayer messaging.

## Testing

- `tests/unit/analytics-helpers.test.ts` — Coverage for normalization helpers and global-variables gating.
- `tests/unit/analytics-instrumentation.test.ts` — Coverage that key tracking calls push the expected dataLayer payloads.
- `tests/unit/gtm-csp-hardening.test.ts` — Regression guard that the self-hosted `public/gtm-bootstrap.js` approach keeps CSP free of `unsafe-inline`.
