---
title: "feat: Implement GTM data layer for analytics event tracking"
type: feat
status: active
date: 2026-04-15
origin: docs/events-tracking-data-model.md
---

# feat: Implement GTM data layer for analytics event tracking

## Overview

Add Google Tag Manager (GTM-5DMGVFZS) and a complete client-side `window.dataLayer` implementation to TrafficMENA. This covers all 23 events defined in the approved data model — from signup funnel tracking through purchase conversions and dashboard engagement. Server-side Measurement Protocol is deferred to a follow-up plan.

## Problem Frame

TrafficMENA has zero analytics tracking. No GTM, no dataLayer, no event instrumentation. This means no visibility into signup funnel drop-off, payment conversion, content engagement, or ad campaign attribution. The data model has been designed and approved (see origin). This plan implements it.

## Requirements Trace

- R1. Inject GTM container (GTM-5DMGVFZS) in `index.html` — header + body snippets
- R2. Fire `global_variables` on every route change with user context, page type, and customer segmentation
- R3. Track the complete signup funnel: `sign_up_step` (steps 1–6) + `sign_up` on completion
- R4. Track authentication: `login_start` + `login` with success/failure status
- R5. Track content discovery: `view_item_list`, `select_item`, `view_item` for events and tracks
- R6. Track free conversions: `event_registration`, `track_booking`
- R7. Track payment funnel: `begin_checkout` → `select_payment_method` → `apply_promo_code`
- R8. Track purchases on actual payment success state: `first_purchase` (additionally), `purchase` (every non-subscription), `subscribe` (subscriptions) — all with `customer_type` attribute
- R9. Track dashboard engagement: `click_meeting_link`, `view_content`, `download_content`, `add_to_calendar`, `calculator_used`
- R10. Track churn: `cancel_registration` with cancellation type
- R11. Track profile: `profile_updated` with completion percentage
- R12. PII parameters (email, phone, first_name, last_name) must be present in dataLayer but documented for GA4 exclusion via GTM tag config
- R13. `customer_type` must never use `"free"` on purchase events — `"new"` (first purchase) or `"returning"` (subsequent)

## Scope Boundaries

- **Client-side only** — no GA4 Measurement Protocol server-side events in this plan
- No GTM tag/trigger/variable configuration — that's done in the GTM web console separately
- No admin dashboard tracking — member/expert dashboard only
- No search event tracking (deferred)
- No invite-only funnel tracking (deferred)

### Deferred to Separate Tasks

- Server-side Measurement Protocol events: separate plan after client-side is tested
- GTM container configuration (tags, triggers, variables): done in GTM console, not code

## Context & Research

### Relevant Code and Patterns

- **HTML entry**: `index.html` — GTM snippets go here, before `<script type="module" src="/src/main.tsx">`
- **Router**: `src/App.tsx` — React Router v6 with `BrowserRouter`, all routes defined here
- **Auth context**: `src/app/auth/AuthContext.tsx` — provides `user` (id, email, name), `verifyOtp()`, `requestOtp()`
- **User profile**: `src/app/hooks/useCurrentUser.ts` — returns profile with role, subscription_status, phone, name
- **Subscription**: `src/app/hooks/useSubscriptions.ts` — `useCurrentSubscription()` returns active/expired/null
- **Payment dialog**: `src/shared/components/payment/PaymentCheckoutDialog.tsx` — `handleCheckout()` at line 105
- **Payment success**: `src/pages/payment/success.tsx` — detects `status: 'paid'` from verification
- **Payment pending**: `src/pages/payment/pending.tsx` — polls for payment completion
- **Event booking**: `src/features/events/hooks/useEventBooking.ts` — `bookEvent()` mutation
- **Track booking**: `src/features/tracks/hooks/useTrackBooking.ts` — `bookTrack()` mutation
- **Signup steps**: `src/pages/signup/Step1.tsx` through `Step5.tsx`, `CheckEmail.tsx` — form data via `useSignUpContext()`
- **Event detail**: `src/features/events/pages/EventDetail.tsx` — meeting link, registration, calendar
- **Library detail**: `src/pages/LibraryItemDetail.tsx` — content viewing, downloads via `<a download>`
- **Calculator detail**: `src/features/calculators/pages/CalculatorDetail.tsx` — lazy-loaded calculator components
- **Profile update**: `src/pages/Dashboard.tsx` — `useUpdateCurrentUser()` mutation
- **Cancel registration**: `src/features/events/hooks/useEventBooking.ts` — `cancelBooking()` mutation
- **Thank-you pages**: `src/pages/ThankYouEvent.tsx`, `src/pages/ThankYouTrack.tsx` — post-registration/payment confirmation
- **TypeScript env**: `src/vite-env.d.ts` — where to add `window.dataLayer` type
- **User API**: `server/src/routes/api/users.ts` line 221 — `GET /users/me` returns profile but NOT purchase stats

### Institutional Learnings

- MVP mindset: keep tracking module simple, no abstractions beyond what's needed
- Use existing hooks and patterns: TanStack Query for data, existing toast patterns for user feedback
- Path alias `@/` maps to `./src/`

## Key Technical Decisions

- **Single analytics module**: All tracking functions in `src/lib/analytics/` — one file for the core push function, one for event-specific functions, one React hook for auto-tracking. No third-party analytics library.
- **`global_variables` via route-change hook**: A `usePageTracking()` hook inside the router that fires on every `useLocation()` change. Placed inside `AuthProvider` so user data is available.
- **Purchase success detection**: Fire purchase events when payment verification returns `status: 'paid'` (on success/pending pages), NOT on thank-you page load. This matches the data model requirement of "actual success state."
- **`customer_type` derivation**: Add `totalPaidPurchases` count to the `GET /users/me` API response (one SQL subquery). Client derives `customer_type` from this: 0 = `"free"` (global_variables only), 1 = `"new"`, 2+ = `"returning"`. On purchase events, use count BEFORE current purchase: 0 prior → `"new"`, 1+ prior → `"returning"`.
- **Calculator `calculator_used` trigger**: Fire on first valid result (when calculation becomes non-null). Use a ref guard to fire only once per calculator page visit — reset on page leave or calculator clear.
- **No analytics wrapper component**: Tracking calls are made directly from existing hooks/components via imported functions. No HOC or provider pattern — keeps it simple.

## Open Questions

### Resolved During Planning

- **Where to put GTM script?**: In `index.html` `<head>` (header snippet) and `<body>` (noscript fallback), before any other scripts. The `window.dataLayer = window.dataLayer || []` init goes above the GTM snippet.
- **How to track page views in an SPA?**: React hook using `useLocation()` that fires `global_variables` on every path change.
- **How to get user stats for global_variables?**: Add `totalPaidPurchases` to `GET /users/me`. This is a single `COUNT` subquery — minimal backend change needed for correct `customer_type`.
- **Where to put the noscript fallback?**: Immediately after `<body>` tag opens, before `<div id="root">`.

### Deferred to Implementation

- Exact debounce timing for calculator tracking (start with ref-guard approach, adjust if needed)
- Whether `page_type` detection needs a lookup table or can be derived from route path pattern matching
- Meeting platform detection regex specifics (zoom.us, meet.google.com, etc.)

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
┌─────────────────────────────────────────────────┐
│  index.html                                     │
│  ┌─── window.dataLayer = [] ───┐                │
│  │    GTM script (head)        │                │
│  │    GTM noscript (body)      │                │
│  └─────────────────────────────┘                │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  src/lib/analytics/                             │
│  ├── gtm.ts        ← pushToDataLayer() core fn │
│  ├── events.ts     ← 23 typed event functions  │
│  └── helpers.ts    ← pageType, customerType     │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  src/lib/analytics/usePageTracking.ts           │
│  └── Hook inside App.tsx router                 │
│      → fires global_variables on route change   │
│      → reads useAuth + useCurrentUser +         │
│        useCurrentSubscription for user context   │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Existing components call event functions:      │
│  ├── SignIn.tsx → trackLoginStart()             │
│  ├── CheckEmail.tsx → trackLogin()              │
│  ├── Step1-5.tsx → trackSignUpStep()            │
│  ├── EventDetail.tsx → trackViewItem()          │
│  ├── PaymentCheckoutDialog → trackBeginCheckout │
│  ├── payment/success.tsx → trackPurchase()      │
│  └── etc.                                       │
└─────────────────────────────────────────────────┘
```

## Implementation Units

- [ ] **Unit 1: Foundation — GTM injection + analytics module**

**Goal:** Install GTM in the HTML, create the core analytics module with type-safe dataLayer push, and add `totalPaidPurchases` to the user API.

**Requirements:** R1, R13

**Dependencies:** None

**Files:**
- Modify: `index.html`
- Create: `src/lib/analytics/gtm.ts`
- Create: `src/lib/analytics/helpers.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `server/src/routes/api/users.ts`
- Modify: `src/app/hooks/useCurrentUser.ts`
- Test: `tests/unit/analytics-helpers.test.ts`

**Approach:**
- Add `window.dataLayer = window.dataLayer || [];` above GTM snippet in `index.html` `<head>`
- Add GTM header snippet (GTM-5DMGVFZS) immediately after
- Add GTM noscript snippet immediately after `<body>` tag
- `gtm.ts`: export a `pushToDataLayer(data)` function that safely pushes to `window.dataLayer`. Include TypeScript type declarations for the dataLayer array.
- `helpers.ts`: export `getPageType(pathname)` (maps route patterns to page_type values), `getCustomerType(totalPaidPurchases)` (0→"free", 1→"new", 2+→"returning"), `getCustomerTypeForPurchase(priorPurchases)` (0→"new", 1+→"returning"), `centsToUnits(cents)` (divides by 100), `detectMeetingPlatform(url)` (returns "zoom"/"google_meet"/"teams"/"other")
- `vite-env.d.ts`: extend Window interface with `dataLayer` property
- `server/src/routes/api/users.ts`: add a `totalPaidPurchases` count subquery to the `GET /users/me` response — `SELECT COUNT(*) FROM payments WHERE user_id = :id AND status = 'paid' AND item_type != 'subscription'`
- Update `useCurrentUser.ts` type to include `totalPaidPurchases`

**Patterns to follow:**
- Existing path alias imports: `import { ... } from '@/lib/analytics/gtm'`
- Existing SQL subquery patterns in `users.ts` (see `getActiveSubscriptionSelectors` at line 30)
- Existing type extensions in `vite-env.d.ts`

**Test scenarios:**
- Happy path: `getPageType('/meetups')` → `"event_list"`, `getPageType('/dashboard/calculators/roas')` → `"calculator_detail"`
- Happy path: `getCustomerType(0)` → `"free"`, `getCustomerType(1)` → `"new"`, `getCustomerType(5)` → `"returning"`
- Happy path: `getCustomerTypeForPurchase(0)` → `"new"`, `getCustomerTypeForPurchase(1)` → `"returning"`
- Edge case: `getPageType('/unknown/path')` → falls back to a generic value
- Edge case: `centsToUnits(null)` → returns `0`
- Happy path: `detectMeetingPlatform('https://zoom.us/j/123')` → `"zoom"`
- Edge case: `detectMeetingPlatform('https://custom-domain.com/meeting')` → `"other"`

**Verification:**
- GTM container loads on page (visible in browser Network tab and GTM debug mode)
- `window.dataLayer` is an array in the browser console
- `GET /users/me` response includes `totalPaidPurchases` field
- Helper function tests pass

---

- [ ] **Unit 2: Global variables — route-change tracking hook**

**Goal:** Fire `global_variables` dataLayer event on every route change with full user context.

**Requirements:** R2

**Dependencies:** Unit 1

**Files:**
- Create: `src/lib/analytics/usePageTracking.ts`
- Modify: `src/App.tsx`

**Approach:**
- `usePageTracking.ts`: React hook that uses `useLocation()` + `useAuth()` + `useCurrentUser()` + `useCurrentSubscription()` to build the `global_variables` payload. Fires `pushToDataLayer()` on every pathname change. Includes all parameters from the data model: user_id, login_status, user_role, subscription_status, customer_type, event_source, page_type, currency, total_registrations (0 for MVP — deferred until backend exposes it), total_purchases (from totalPaidPurchases), total_revenue (0 for MVP), account_creation_date, plus PII fields.
- Place the hook inside a component that is a child of `AuthProvider` and `BrowserRouter` in `App.tsx`. Create a small `<PageTracker />` component that calls the hook and renders nothing.
- Must handle guest state (user is null) — push with empty PII, login_status "guest", customer_type empty string.

**Patterns to follow:**
- Existing `useLocation()` usage pattern in the codebase
- Existing `useAuth()` + `useCurrentUser()` hook composition patterns

**Test scenarios:**
- Test expectation: none — this is a React hook with side effects (dataLayer push). Verification is manual via GTM debug mode.

**Verification:**
- Navigate between pages in the app → `global_variables` event appears in dataLayer for each route change (inspect via `console.log(window.dataLayer)` or GTM Preview mode)
- Logged-in user: user_id, email, role, subscription_status, customer_type are populated
- Guest user: login_status is "guest", PII fields are empty strings

---

- [ ] **Unit 3: Auth events — login + signup funnel**

**Goal:** Track the login flow (`login_start`, `login`) and the complete signup funnel (`sign_up_step` for steps 1-6, `sign_up` on completion).

**Requirements:** R3, R4

**Dependencies:** Unit 1

**Files:**
- Create: `src/lib/analytics/events.ts` (add auth event functions here; subsequent units add to this file)
- Modify: `src/pages/SignIn.tsx`
- Modify: `src/pages/signup/Step1.tsx`
- Modify: `src/pages/signup/Step2.tsx`
- Modify: `src/pages/signup/CheckEmail.tsx`
- Modify: `src/pages/signup/Step3.tsx`
- Modify: `src/pages/signup/Step4.tsx`
- Modify: `src/pages/signup/Step5.tsx`

**Approach:**
- `events.ts`: Create functions — `trackLoginStart()`, `trackLogin(status, userId, email)`, `trackSignUpStep(stepNumber, stepName)`, `trackSignUp(userId, email, phone, firstName, lastName)`
- `SignIn.tsx`: Call `trackLoginStart()` when OTP request is submitted (in the form submit handler)
- `CheckEmail.tsx` (signup context): Call `trackLogin({status: 'success', ...})` after `verifyOtp()` succeeds in the signin flow. Call `trackLogin({status: 'failure'})` on OTP failure.
- `Step1.tsx`: Call `trackSignUpStep(1, 'name_info')` after successful form validation, before navigation to step 2
- `Step2.tsx`: Call `trackSignUpStep(2, 'email_entered')` after email submission
- `CheckEmail.tsx` (signup context): Call `trackSignUpStep(3, 'otp_verified')` after OTP verification succeeds in signup flow
- `Step3.tsx`: Call `trackSignUpStep(4, 'phone_entered')` after phone submission
- `Step4.tsx`: Call `trackSignUpStep(5, 'goal_selected')` after goal selection
- `Step5.tsx`: Call `trackSignUpStep(6, 'challenge_selected')` after challenge selection. Also call `trackSignUp(...)` after the profile is fully saved (in the `persistSignupProfile()` success path)

**Patterns to follow:**
- Existing form submit handlers in Step1-5
- Existing `verifyOtp()` success/error callbacks in CheckEmail.tsx

**Test scenarios:**
- Test expectation: none — event functions are thin wrappers around `pushToDataLayer`. Manual verification via GTM debug mode.

**Verification:**
- Complete signup flow → 6 `sign_up_step` events (one per step) + 1 `sign_up` event in dataLayer
- Sign in flow → 1 `login_start` + 1 `login` event with status "success"
- Failed OTP → `login` event with status "failure"

---

- [ ] **Unit 4: Content discovery — view_item_list, select_item, view_item**

**Goal:** Track when users browse event/track listings, click on items, and view detail pages.

**Requirements:** R5

**Dependencies:** Unit 1

**Files:**
- Modify: `src/lib/analytics/events.ts`
- Modify: `src/features/events/pages/Meetups.tsx`
- Modify: `src/features/events/components/EventCard.tsx`
- Modify: `src/features/events/pages/EventDetail.tsx`
- Modify: `src/features/tracks/pages/TrackDetail.tsx` (public track detail)
- Modify: `src/features/tracks/components/PublicTrackCard.tsx`

**Approach:**
- Add functions to `events.ts`: `trackViewItemList(listId, listName, items)`, `trackSelectItem(listId, listName, item, index)`, `trackViewItem(item)`
- `Meetups.tsx`: Fire `trackViewItemList('events', 'Events', visibleItems)` when event data loads. Map event objects to the GA4 items array format using helpers from Unit 1.
- `EventCard.tsx`: Fire `trackSelectItem(...)` in the card's click/navigation handler
- `EventDetail.tsx`: Fire `trackViewItem(...)` when event data loads (in a `useEffect` on event data)
- Same pattern for track listing/detail pages
- Convert `priceInCents` to currency units via `centsToUnits()` helper

**Patterns to follow:**
- Existing `useEffect` patterns for data-loaded side effects
- Existing event/track API response shapes

**Test scenarios:**
- Test expectation: none — thin wrapper functions + useEffect side effects. Manual verification.

**Verification:**
- Visit `/meetups` → `view_item_list` event with items array in dataLayer
- Click an event card → `select_item` event with the clicked item
- Land on `/meetups/:id` → `view_item` event with full item details including price, category, location

---

- [ ] **Unit 5: Free conversions — event_registration, track_booking**

**Goal:** Track successful free event registrations and free track bookings.

**Requirements:** R6

**Dependencies:** Unit 1

**Files:**
- Modify: `src/lib/analytics/events.ts`
- Modify: `src/features/events/hooks/useEventBooking.ts`
- Modify: `src/features/tracks/hooks/useTrackBooking.ts`

**Approach:**
- Add functions: `trackEventRegistration(event)`, `trackTrackBooking(track)`
- `useEventBooking.ts`: In the `bookEvent()` mutation's `onSuccess` callback, call `trackEventRegistration()` with the event data
- `useTrackBooking.ts`: In the `bookTrack()` mutation's `onSuccess` callback, call `trackTrackBooking()` with the track data
- Only fire for free items (non-paid). Paid items go through the purchase funnel.

**Patterns to follow:**
- Existing `onSuccess` callbacks in these mutation hooks

**Test scenarios:**
- Test expectation: none — mutation callback side effects. Manual verification.

**Verification:**
- Register for a free event → `event_registration` event in dataLayer with correct item_id, item_name, item_category, registration_type "free"
- Book a free track → `track_booking` event with booking_type "free"

---

- [ ] **Unit 6: Payment funnel — begin_checkout, select_payment_method, apply_promo_code**

**Goal:** Track the payment funnel from dialog open through method selection and promo code application.

**Requirements:** R7

**Dependencies:** Unit 1

**Files:**
- Modify: `src/lib/analytics/events.ts`
- Modify: `src/shared/components/payment/PaymentCheckoutDialog.tsx`
- Modify: `src/shared/components/payment/PromoCodeInput.tsx`

**Approach:**
- Add functions: `trackBeginCheckout(currency, value, itemType, item)`, `trackSelectPaymentMethod(currency, value, paymentType, itemType, coupon, item)`, `trackApplyPromoCode(code, status, discountPercent, itemType, itemId)`
- `PaymentCheckoutDialog.tsx`: Fire `trackBeginCheckout()` when the dialog opens (in a `useEffect` on `open` prop becoming true). Fire `trackSelectPaymentMethod()` inside `handleCheckout()` at the top, before the API call — this is when user has selected method AND clicked Pay.
- `PromoCodeInput.tsx`: Fire `trackApplyPromoCode()` after promo code validation response — with status "success", "invalid", "expired", or "limit_reached" based on the API response.

**Patterns to follow:**
- Existing `useEffect` on prop changes pattern
- Existing promo code validation response handling

**Test scenarios:**
- Test expectation: none — UI side effects. Manual verification.

**Verification:**
- Open payment dialog → `begin_checkout` event with item details and value
- Select Fawry and click Pay → `select_payment_method` event with payment_type "fawry"
- Apply valid promo code → `apply_promo_code` with status "success"
- Apply expired promo code → `apply_promo_code` with status "expired"

---

- [ ] **Unit 7: Purchase events — first_purchase, purchase, subscribe**

**Goal:** Track successful purchases on actual payment success state, with correct `customer_type` differentiation. `purchase` fires on every non-subscription transaction. `first_purchase` fires additionally when it's the user's first. `subscribe` fires for subscriptions.

**Requirements:** R8, R13

**Dependencies:** Unit 1, Unit 6

**Files:**
- Modify: `src/lib/analytics/events.ts`
- Modify: `src/pages/payment/success.tsx`
- Modify: `src/pages/payment/pending.tsx`

**Approach:**
- Add functions: `trackFirstPurchase(txData)`, `trackPurchase(txData)`, `trackSubscribe(txData)`. Each accepts transaction_id, currency, value, item_type, payment_type, customer_type, coupon, discount, original_value, items.
- The critical trigger point is when payment verification returns `status: 'paid'`:
  - `success.tsx`: After `verifyPayment.data?.status === 'paid'`, determine item_type from URL params, fetch the item name/category, and fire the appropriate events
  - `pending.tsx`: When polling detects payment completion, same logic
- Customer type detection: Use `totalPaidPurchases` from `useCurrentUser()`. The count at this moment reflects purchases BEFORE the current one (the current payment just transitioned to paid). If count is 0 → `customer_type: "new"`, fire both `trackPurchase()` AND `trackFirstPurchase()`. If count is 1+ → `customer_type: "returning"`, fire only `trackPurchase()`.
- For subscriptions (`itemType === 'subscription'`): fire `trackSubscribe()` instead. Customer type same logic but using total of ALL purchase types.
- Use a ref guard or sessionStorage flag to prevent double-firing on page refresh.

**Patterns to follow:**
- Existing payment verification flow in success.tsx and pending.tsx
- Existing URL search params parsing

**Test scenarios:**
- Test expectation: none — depends on actual payment state and user context. Manual verification with test payments.

**Verification:**
- Complete a first-ever event payment → `purchase` event with customer_type "new" AND `first_purchase` event in dataLayer
- Complete a second event payment → `purchase` event with customer_type "returning", NO first_purchase event
- Complete a subscription payment → `subscribe` event with correct customer_type, NO purchase event
- Refresh the success page → events do NOT double-fire

---

- [ ] **Unit 8: Dashboard engagement — meeting link, content, downloads, calendar, calculators**

**Goal:** Track key engagement actions inside the member dashboard.

**Requirements:** R9

**Dependencies:** Unit 1

**Files:**
- Modify: `src/lib/analytics/events.ts`
- Modify: `src/features/events/pages/EventDetail.tsx` (meeting link click, add to calendar)
- Modify: `src/pages/ThankYouEvent.tsx` (add to calendar)
- Modify: `src/pages/ThankYouTrack.tsx` (add to calendar)
- Modify: `src/pages/LibraryItemDetail.tsx` (view content, download)
- Modify: `src/pages/DashboardSeriesDetail.tsx` (view content from series)
- Modify: `src/features/calculators/pages/CalculatorDetail.tsx` (calculator used)

**Approach:**
- Add functions: `trackClickMeetingLink(event)`, `trackViewContent(asset, seriesContext)`, `trackDownloadContent(asset)`, `trackAddToCalendar(event, calendarType)`, `trackCalculatorUsed(calculatorId, calculatorName, category)`
- **Meeting link**: In EventDetail.tsx, wrap the meeting link `<a>` with an onClick that calls `trackClickMeetingLink()`. Detect platform from URL via `detectMeetingPlatform()`.
- **View content**: In LibraryItemDetail.tsx, fire `trackViewContent()` when asset data loads (useEffect). Include series context if navigated from a series page (pass via route state or URL param).
- **Download**: In LibraryItemDetail.tsx, add onClick handler to the download `<a>` tag that calls `trackDownloadContent()` before the native download proceeds.
- **Add to calendar**: In ThankYouEvent.tsx and ThankYouTrack.tsx, add onClick handlers to Google Calendar link and ICS download button. Fire `trackAddToCalendar(event, 'google_calendar')` or `trackAddToCalendar(event, 'ics_download')`.
- **Calculator**: In CalculatorDetail.tsx, fire `trackCalculatorUsed()` when the rendered calculator produces its first valid result. Use a ref to ensure it fires only once per page visit. Reset on calculator clear or page navigation. Get calculator metadata (name, category) from `getCalculatorBySlug()`.

**Patterns to follow:**
- Existing onClick patterns on links
- Existing `useEffect` on data load patterns
- Existing calculator component structure

**Test scenarios:**
- Test expectation: none — UI interaction side effects. Manual verification.

**Verification:**
- Click a Zoom meeting link → `click_meeting_link` event with meeting_platform "zoom"
- Open a library video → `view_content` event with content_type "Video"
- Download a document → `download_content` event before download starts
- Click "Add to Google Calendar" → `add_to_calendar` with calendar_type "google_calendar"
- Enter valid values in ROAS calculator → `calculator_used` event with calculator_id "roas", fires only once

---

- [ ] **Unit 9: Churn & profile — cancel_registration, profile_updated**

**Goal:** Track registration cancellations/refund requests and profile updates.

**Requirements:** R10, R11

**Dependencies:** Unit 1

**Files:**
- Modify: `src/lib/analytics/events.ts`
- Modify: `src/features/events/hooks/useEventBooking.ts`
- Modify: `src/pages/Dashboard.tsx`

**Approach:**
- Add functions: `trackCancelRegistration(event, cancellationType, wasPaid)`, `trackProfileUpdated(fieldsUpdated, completionPercent)`
- `useEventBooking.ts`: In the `cancelBooking()` mutation's `onSuccess` callback, call `trackCancelRegistration()`. Determine `cancellation_type` from the response status: `'cancelled'` → `"instant"`, `'refund_requested'` → `"refund_request"`. Determine `was_paid` from whether the event had a price.
- `Dashboard.tsx`: In the profile update mutation's `onSuccess` callback, call `trackProfileUpdated()`. Compute `fields_updated` by comparing old and new values. Compute `profile_completion` as percentage of filled fields (firstName, lastName, email, phoneNumber, primaryGoal, primaryChallenge — 6 fields).

**Patterns to follow:**
- Existing `onSuccess` callbacks in mutation hooks
- Existing profile form state handling

**Test scenarios:**
- Test expectation: none — mutation callback side effects. Manual verification.

**Verification:**
- Cancel a free event registration → `cancel_registration` with cancellation_type "instant", was_paid false
- Request refund on a paid event → `cancel_registration` with cancellation_type "refund_request", was_paid true
- Update profile phone number → `profile_updated` with fields_updated containing "phone", profile_completion percentage

## System-Wide Impact

- **Interaction graph:** The analytics module is read-only (pushes to dataLayer, never reads from external services). No existing functionality is affected. All changes are additive onClick/onSuccess/useEffect calls.
- **Error propagation:** Analytics calls should never throw or block UI. The `pushToDataLayer()` function must be wrapped in a try-catch so tracking failures are silent — analytics must never break the user experience.
- **State lifecycle risks:** Double-firing on React strict mode re-renders or payment page refreshes. Mitigated by ref guards and sessionStorage dedup flags for purchase events.
- **API surface parity:** One small backend addition (`totalPaidPurchases` on `/users/me`). No breaking changes — existing consumers get an additional field.
- **Unchanged invariants:** No existing API responses, UI behaviors, or auth flows are modified. All changes are purely additive tracking calls.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Analytics error breaks user flow | `pushToDataLayer()` wraps all pushes in try-catch. Analytics never throws. |
| React strict mode double-fires events | Use ref guards for one-time events (calculator_used, purchase events) |
| Payment page refresh double-fires purchase | Use sessionStorage flag keyed by transaction_id |
| GTM script blocks page load | GTM script is loaded async (`j.async=true` in snippet) — no blocking |
| `totalPaidPurchases` count is stale on purchase page | Count reflects state before current payment, which is correct for customer_type |
| Calculator fires on partial input | Ref guard ensures fire-once-per-visit; valid result check prevents partial input firing |

## Sources & References

- **Origin document:** [docs/events-tracking-data-model.md](docs/events-tracking-data-model.md)
- **Data model Excel:** [docs/TrafficMENA - Events Tracking Data Model.xlsx](docs/TrafficMENA%20-%20Events%20Tracking%20Data%20Model.xlsx)
- **GTM data layer docs:** Google Tag Manager developer documentation (provided in feature request)
- **GTM container ID:** GTM-5DMGVFZS
