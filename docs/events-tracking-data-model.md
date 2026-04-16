# TrafficMENA — Events Tracking Data Model

> **Platform:** GTM → GA4 (primary), extensible to other platforms via GTM tags
> **Scope:** Public website + Member/Expert dashboard (no admin tracking)
> **Currency:** Dynamic (currently EGP, multi-currency planned)
> **Version:** 1.0
> **Date:** 2026-04-14

---

## Event Taxonomy Summary

| # | Event Name | Trigger | GA4 Standard | Priority | Tracking |
|---|---|---|---|---|---|
| 1 | `global_variables` | Every page load | Custom | High | Client |
| 2 | `login_start` | User submits email for OTP | Custom | High | Client |
| 3 | `login` | OTP verified successfully | `login` | High | Client |
| 4 | `sign_up_step` | Each signup wizard step completed | Custom | High | Client |
| 5 | `sign_up` | Signup wizard fully completed | `sign_up` | High | Client + Server |
| 6 | `view_item_list` | Events or tracks listing page viewed | `view_item_list` | High | Client |
| 7 | `select_item` | User clicks event/track card from list | `select_item` | Medium | Client |
| 8 | `view_item` | Event or track detail page viewed | `view_item` | High | Client |
| 9 | `event_registration` | User registers for a free event | Custom | High | Client + Server |
| 10 | `track_booking` | User books a free track | Custom | High | Client + Server |
| 11 | `begin_checkout` | Payment dialog opens | `begin_checkout` | High | Client |
| 12 | `select_payment_method` | User clicks "Pay" after selecting payment method | Custom | High | Client |
| 13 | `apply_promo_code` | Promo code submitted | Custom | Medium | Client |
| 14 | `first_purchase` | First-ever non-subscription purchase | Custom | High | Client + Server |
| 15 | `purchase` | Every non-subscription purchase (including first) | `purchase` | High | Client + Server |
| 16 | `subscribe` | Subscription purchase (new or returning) | Custom | High | Client + Server |
| 17 | `click_meeting_link` | User clicks Zoom/meeting link to attend | Custom | High | Client |
| 18 | `view_content` | User opens a lesson or library asset | Custom | High | Client |
| 19 | `download_content` | User downloads a library asset | Custom | Medium | Client |
| 20 | `add_to_calendar` | User adds event to calendar | Custom | Medium | Client |
| 21 | `calculator_used` | User completes a calculator calculation | Custom | Medium | Client |
| 22 | `cancel_registration` | User cancels registration or requests refund | Custom | High | Client + Server |
| 23 | `profile_updated` | User updates profile information | Custom | Low | Client |

---

## PII Handling Rules

The `dataLayer` may contain PII (email, phone, name) for platforms that need it (CRM, email marketing). **GA4 must NOT receive PII.**

In GTM, configure two sets of tags:
- **GA4 tags:** Exclude PII parameters (email, phone, first_name, last_name)
- **CRM/Marketing tags:** Include PII parameters as needed

Parameters marked with 🔒 below are PII — include in dataLayer but block from GA4.

---

## 1. global_variables

**Trigger:** On every page load, before any other event
**Purpose:** Sets persistent user context for all subsequent events on the page

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `user_id` | String | `"a1b2c3d4-e5f6-..."` | UUID from `users.id`. Empty string for guests. | High |
| `login_status` | String | `"logged_in"` | `"logged_in"` or `"guest"` | High |
| `user_role` | String | `"user"` | `"user"` / `"expert"` — member dashboard roles only | Medium |
| `subscription_status` | String | `"none"` | `"active"` / `"expired"` / `"none"` | High |
| `customer_type` | String | `"returning"` | `"free"` (0 purchases) / `"new"` (exactly 1 purchase) / `"returning"` (2+ purchases). Derived from `total_purchases`. | High |
| `event_source` | String | `"Web"` | Platform identifier. Future: `"iOS"`, `"Android"` | High |
| `page_type` | String | `"homepage"` | See page_type values table below | Medium |
| `currency` | String | `"EGP"` | Dynamic from platform settings / payment context | High |
| `total_registrations` | Number | `3` | Total events the user has registered for | Medium |
| `total_purchases` | Number | `2` | Total successful purchases | Medium |
| `total_revenue` | Number | `750.00` | Total amount spent (in currency units, not cents) | Medium |
| `account_creation_date` | String | `"2026-01-15T10:30:00Z"` | ISO-8601 format | Medium |
| 🔒 `email` | String | `"ahmed@example.com"` | PII — block from GA4 | High |
| 🔒 `phone` | String | `"201012345678"` | PII — no `+` prefix, digits only. Block from GA4 | High |
| 🔒 `first_name` | String | `"Ahmed"` | PII — block from GA4 | High |
| 🔒 `last_name` | String | `"Hassan"` | PII — block from GA4 | High |

**page_type values:**

| Value | Route(s) |
|---|---|
| `"homepage"` | `/` |
| `"about"` | `/about` |
| `"event_list"` | `/meetups` |
| `"event_detail"` | `/meetups/:id` |
| `"track_detail"` | `/tracks/:id` |
| `"subscribe_landing"` | `/subscribe`, `/dashboard/subscribe` |
| `"signin"` | `/signin` |
| `"signup"` | `/signup/*` |
| `"dashboard"` | `/dashboard` |
| `"dashboard_events"` | `/dashboard/meetups` |
| `"dashboard_library"` | `/dashboard/library` |
| `"dashboard_library_detail"` | `/dashboard/library/:id` |
| `"dashboard_track_detail"` | `/dashboard/library/tracks/:id` |
| `"dashboard_calculators"` | `/dashboard/calculators` |
| `"calculator_detail"` | `/dashboard/calculators/:slug` |
| `"dashboard_profile"` | `/dashboard/profile` |
| `"payment_success"` | `/payment/success` |
| `"payment_failed"` | `/payment/failed` |
| `"payment_pending"` | `/payment/pending` |
| `"thank_you_event"` | `/thank-you-event/:id` |
| `"thank_you_track"` | `/thank-you-track/:id` |
| `"privacy"` | `/privacy` |
| `"terms"` | `/terms` |

```javascript
// Client-side implementation
window.dataLayer = window.dataLayer || [];

window.dataLayer.push({
  'event': 'global_variables',
  'user_id': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'login_status': 'logged_in',
  'user_role': 'user',
  'subscription_status': 'active',
  'customer_type': 'returning',
  'event_source': 'Web',
  'page_type': 'event_list',
  'currency': 'EGP',
  'total_registrations': 3,
  'total_purchases': 2,
  'total_revenue': 750.00,
  'account_creation_date': '2026-01-15T10:30:00Z',
  'email': 'ahmed@example.com',
  'phone': '201012345678',
  'first_name': 'Ahmed',
  'last_name': 'Hassan'
});
```

```javascript
// Guest user (not logged in)
window.dataLayer = window.dataLayer || [];

window.dataLayer.push({
  'event': 'global_variables',
  'user_id': '',
  'login_status': 'guest',
  'user_role': '',
  'subscription_status': 'none',
  'customer_type': 'free',
  'event_source': 'Web',
  'page_type': 'homepage',
  'currency': 'EGP',
  'total_registrations': 0,
  'total_purchases': 0,
  'total_revenue': 0,
  'account_creation_date': '',
  'email': '',
  'phone': '',
  'first_name': '',
  'last_name': ''
});
```

---

## 2. login_start

**Trigger:** User submits email on `/signin` page to request OTP
**Purpose:** Top of login funnel — measures login intent vs. completion

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `method` | String | `"email_otp"` | Authentication method used | High |
| `event_source` | String | `"Web"` | Platform | High |

```javascript
window.dataLayer.push({
  'event': 'login_start',
  'method': 'email_otp',
  'event_source': 'Web'
});
```

---

## 3. login

**Trigger:** OTP verified successfully, session established
**Purpose:** Login completion — use with `login_start` to measure OTP verification rate

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `method` | String | `"email_otp"` | Authentication method | High |
| `status` | String | `"success"` | `"success"` or `"failure"` | High |
| `user_id` | String | `"a1b2c3d4-..."` | UUID assigned after verification | High |
| `event_source` | String | `"Web"` | Platform | High |
| 🔒 `email` | String | `"ahmed@example.com"` | PII — block from GA4 | High |

```javascript
// Successful login
window.dataLayer.push({
  'event': 'login',
  'method': 'email_otp',
  'status': 'success',
  'user_id': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'event_source': 'Web',
  'email': 'ahmed@example.com'
});
```

```javascript
// Failed login (wrong OTP)
window.dataLayer.push({
  'event': 'login',
  'method': 'email_otp',
  'status': 'failure',
  'user_id': '',
  'event_source': 'Web',
  'email': 'ahmed@example.com'
});
```

---

## 4. sign_up_step

**Trigger:** Each time a signup wizard step is completed
**Purpose:** Funnel analysis — identify which step has the highest drop-off

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `step_number` | Number | `1` | Sequential step number (1–6) | High |
| `step_name` | String | `"name_info"` | Human-readable step identifier (see table) | High |
| `event_source` | String | `"Web"` | Platform | High |

**Step definitions:**

| step_number | step_name | Data Collected | Component |
|---|---|---|---|
| 1 | `"name_info"` | firstName, lastName | `Step1.tsx` |
| 2 | `"email_entered"` | email address | `Step2.tsx` |
| 3 | `"otp_verified"` | OTP code verified | `CheckEmail.tsx` |
| 4 | `"phone_entered"` | phone number (WhatsApp) | `Step3.tsx` |
| 5 | `"goal_selected"` | primary goal | `Step4.tsx` |
| 6 | `"challenge_selected"` | primary challenge | `Step5.tsx` |

```javascript
// Step 1 completed — user entered name
window.dataLayer.push({
  'event': 'sign_up_step',
  'step_number': 1,
  'step_name': 'name_info',
  'event_source': 'Web'
});
```

```javascript
// Step 3 completed — OTP verified
window.dataLayer.push({
  'event': 'sign_up_step',
  'step_number': 3,
  'step_name': 'otp_verified',
  'event_source': 'Web'
});
```

```javascript
// Step 6 completed — final step before account creation
window.dataLayer.push({
  'event': 'sign_up_step',
  'step_number': 6,
  'step_name': 'challenge_selected',
  'event_source': 'Web'
});
```

---

## 5. sign_up

**Trigger:** Signup wizard fully completed — account created with profile
**Purpose:** Conversion event for acquisition campaigns

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `method` | String | `"email_otp"` | Signup method | High |
| `user_id` | String | `"a1b2c3d4-..."` | Newly created user UUID | High |
| `event_source` | String | `"Web"` | Platform | High |
| `account_creation_date` | String | `"2026-04-14T14:30:00Z"` | ISO-8601 | Medium |
| 🔒 `email` | String | `"ahmed@example.com"` | PII — block from GA4 | High |
| 🔒 `phone` | String | `"201012345678"` | PII — digits only, no `+` | High |
| 🔒 `first_name` | String | `"Ahmed"` | PII — block from GA4 | High |
| 🔒 `last_name` | String | `"Hassan"` | PII — block from GA4 | High |

```javascript
window.dataLayer.push({
  'event': 'sign_up',
  'method': 'email_otp',
  'user_id': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'event_source': 'Web',
  'account_creation_date': '2026-04-14T14:30:00Z',
  'email': 'ahmed@example.com',
  'phone': '201012345678',
  'first_name': 'Ahmed',
  'last_name': 'Hassan'
});
```

### Server-Side: sign_up

Fire from the backend after the profile record is confirmed created. This ensures the signup is counted even if the user closes the browser immediately after the last step.

```javascript
// Server-side — GA4 Measurement Protocol
// POST https://www.google-analytics.com/mp/collect?measurement_id=G-XXXXXXX&api_secret=SECRET
{
  "client_id": "server_generated_client_id",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "events": [{
    "name": "sign_up",
    "params": {
      "method": "email_otp",
      "event_source": "Server",
      "account_creation_date": "2026-04-14T14:30:00Z"
    }
  }]
}
```

---

## 6. view_item_list

**Trigger:** User views the events listing (`/meetups`) or tracks listing page
**Purpose:** Content discovery — which listings get impressions

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `item_list_id` | String | `"events"` | `"events"` or `"tracks"` | High |
| `item_list_name` | String | `"Events"` | `"Events"` or `"Tracks"` | High |
| `items` | Array | See below | Array of visible items on the page | High |

**Item parameters (within `items[]`):**

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `item_id` | String | `"evt-a1b2c3d4-..."` | Event/track UUID | High |
| `item_name` | String | `"Advanced Google Ads Workshop"` | Event/track title | High |
| `item_category` | String | `"Mastermind"` | Event type: `Event` / `Meetup` / `Mastermind` / `Retreat`. For tracks: `"Track"` | High |
| `price` | Number | `250.00` | Price in currency units (cents ÷ 100). `0` for free | High |
| `currency` | String | `"EGP"` | Dynamic currency | High |
| `item_image_link` | String | `"https://trafficmena.b-cdn.net/..."` | CDN image URL | Low |
| `item_link` | String | `"/meetups/evt-a1b2c3d4"` | Relative detail page URL | Medium |
| `index` | Number | `0` | Position in the list (0-based) | Medium |

```javascript
window.dataLayer.push({
  'event': 'view_item_list',
  'item_list_id': 'events',
  'item_list_name': 'Events',
  'items': [
    {
      'item_id': 'evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'item_name': 'Advanced Google Ads Workshop',
      'item_category': 'Mastermind',
      'price': 250.00,
      'currency': 'EGP',
      'item_image_link': 'https://trafficmena.b-cdn.net/events/workshop.jpg',
      'item_link': '/meetups/evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'index': 0
    },
    {
      'item_id': 'evt-b2c3d4e5-f6a7-8901-bcde-f23456789012',
      'item_name': 'SEO Fundamentals Meetup',
      'item_category': 'Meetup',
      'price': 0,
      'currency': 'EGP',
      'item_image_link': 'https://trafficmena.b-cdn.net/events/seo.jpg',
      'item_link': '/meetups/evt-b2c3d4e5-f6a7-8901-bcde-f23456789012',
      'index': 1
    }
  ]
});
```

---

## 7. select_item

**Trigger:** User clicks on an event or track card from a listing page
**Purpose:** Measures which items attract clicks from the list

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `item_list_id` | String | `"events"` | Which list the item was clicked from | High |
| `item_list_name` | String | `"Events"` | Display name of the list | High |
| `items` | Array | Single item | The clicked item | High |

Item parameters: same as `view_item_list` items.

```javascript
window.dataLayer.push({
  'event': 'select_item',
  'item_list_id': 'events',
  'item_list_name': 'Events',
  'items': [
    {
      'item_id': 'evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'item_name': 'Advanced Google Ads Workshop',
      'item_category': 'Mastermind',
      'price': 250.00,
      'currency': 'EGP',
      'item_image_link': 'https://trafficmena.b-cdn.net/events/workshop.jpg',
      'item_link': '/meetups/evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'index': 0
    }
  ]
});
```

---

## 8. view_item

**Trigger:** Event detail page (`/meetups/:id`) or track detail page (`/tracks/:id`) loads
**Purpose:** Measures content interest depth — who goes beyond listing to details

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `currency` | String | `"EGP"` | Dynamic | High |
| `value` | Number | `250.00` | Item price (cents ÷ 100) | High |
| `items` | Array | Single item | Full item details | High |

**Item parameters:**

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `item_id` | String | `"evt-a1b2c3d4-..."` | UUID | High |
| `item_name` | String | `"Advanced Google Ads Workshop"` | Title | High |
| `item_category` | String | `"Mastermind"` | Event type or `"Track"` | High |
| `price` | Number | `250.00` | Price (cents ÷ 100) | High |
| `currency` | String | `"EGP"` | Dynamic | High |
| `item_image_link` | String | `"https://trafficmena.b-cdn.net/..."` | Image | Medium |
| `item_link` | String | `"/meetups/evt-a1b2c3d4"` | Page URL | Medium |
| `item_location` | String | `"Cairo, Egypt"` | Physical location (null for online) | Medium |
| `item_date` | String | `"2026-05-20T18:00:00Z"` | Event date ISO-8601 | Medium |
| `is_online` | Boolean | `false` | `true` if event has `meetingLink` and no `location` | Medium |
| `spots_remaining` | Number | `12` | Remaining capacity. `null` if unlimited | Low |

```javascript
// Paid offline event
window.dataLayer.push({
  'event': 'view_item',
  'currency': 'EGP',
  'value': 250.00,
  'items': [
    {
      'item_id': 'evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'item_name': 'Advanced Google Ads Workshop',
      'item_category': 'Mastermind',
      'price': 250.00,
      'currency': 'EGP',
      'item_image_link': 'https://trafficmena.b-cdn.net/events/workshop.jpg',
      'item_link': '/meetups/evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'item_location': 'Cairo, Egypt',
      'item_date': '2026-05-20T18:00:00Z',
      'is_online': false,
      'spots_remaining': 12
    }
  ]
});
```

```javascript
// Free online meetup
window.dataLayer.push({
  'event': 'view_item',
  'currency': 'EGP',
  'value': 0,
  'items': [
    {
      'item_id': 'evt-b2c3d4e5-f6a7-8901-bcde-f23456789012',
      'item_name': 'SEO Fundamentals Meetup',
      'item_category': 'Meetup',
      'price': 0,
      'currency': 'EGP',
      'item_image_link': 'https://trafficmena.b-cdn.net/events/seo.jpg',
      'item_link': '/meetups/evt-b2c3d4e5-f6a7-8901-bcde-f23456789012',
      'item_location': '',
      'item_date': '2026-05-15T19:00:00Z',
      'is_online': true,
      'spots_remaining': null
    }
  ]
});
```

```javascript
// Track detail page
window.dataLayer.push({
  'event': 'view_item',
  'currency': 'EGP',
  'value': 1500.00,
  'items': [
    {
      'item_id': 'trk-c3d4e5f6-a7b8-9012-cdef-345678901234',
      'item_name': 'Performance Marketing Bootcamp',
      'item_category': 'Track',
      'price': 1500.00,
      'currency': 'EGP',
      'item_image_link': 'https://trafficmena.b-cdn.net/tracks/bootcamp.jpg',
      'item_link': '/tracks/trk-c3d4e5f6-a7b8-9012-cdef-345678901234',
      'item_location': 'Cairo, Egypt',
      'item_date': '',
      'is_online': false,
      'spots_remaining': 8
    }
  ]
});
```

---

## 9. event_registration

**Trigger:** User successfully registers for a **free** event (POST `/events/:id/register` returns success)
**Purpose:** Free conversion tracking — no payment involved
**Important:** Do NOT fire this for paid events. Paid events go through the checkout funnel → `first_purchase` / `purchase`.

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `item_id` | String | `"evt-b2c3d4e5-..."` | Event UUID | High |
| `item_name` | String | `"SEO Fundamentals Meetup"` | Event title | High |
| `item_category` | String | `"Meetup"` | Event type | High |
| `registration_type` | String | `"free"` | Always `"free"` for this event | High |
| `is_online` | Boolean | `true` | Online vs. offline | Medium |
| `event_source` | String | `"Web"` | Platform | High |

```javascript
window.dataLayer.push({
  'event': 'event_registration',
  'item_id': 'evt-b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'item_name': 'SEO Fundamentals Meetup',
  'item_category': 'Meetup',
  'registration_type': 'free',
  'is_online': true,
  'event_source': 'Web'
});
```

### Server-Side: event_registration

Fire after the `eventAttendees` record is confirmed inserted.

```javascript
// Server-side — GA4 Measurement Protocol
{
  "client_id": "server_generated_client_id",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "events": [{
    "name": "event_registration",
    "params": {
      "item_id": "evt-b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "item_name": "SEO Fundamentals Meetup",
      "item_category": "Meetup",
      "registration_type": "free",
      "is_online": true,
      "event_source": "Server"
    }
  }]
}
```

---

## 10. track_booking

**Trigger:** User successfully books a **free** track (POST `/tracks/:id/book` returns success)
**Purpose:** Free conversion tracking for tracks
**Important:** Do NOT fire for paid tracks. Paid tracks go through checkout funnel.

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `item_id` | String | `"trk-c3d4e5f6-..."` | Track UUID | High |
| `item_name` | String | `"Content Marketing Fundamentals"` | Track title | High |
| `item_category` | String | `"Track"` | Always `"Track"` | High |
| `booking_type` | String | `"free"` | Always `"free"` for this event | High |
| `event_count` | Number | `5` | Number of events in the track | Medium |
| `event_source` | String | `"Web"` | Platform | High |

```javascript
window.dataLayer.push({
  'event': 'track_booking',
  'item_id': 'trk-d4e5f6a7-b8c9-0123-defg-456789012345',
  'item_name': 'Content Marketing Fundamentals',
  'item_category': 'Track',
  'booking_type': 'free',
  'event_count': 5,
  'event_source': 'Web'
});
```

### Server-Side: track_booking

Fire after the `trackBookings` record is confirmed inserted.

```javascript
{
  "client_id": "server_generated_client_id",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "events": [{
    "name": "track_booking",
    "params": {
      "item_id": "trk-d4e5f6a7-b8c9-0123-defg-456789012345",
      "item_name": "Content Marketing Fundamentals",
      "item_category": "Track",
      "booking_type": "free",
      "event_count": 5,
      "event_source": "Server"
    }
  }]
}
```

---

## 11. begin_checkout

**Trigger:** Payment dialog opens for a paid event or track, or the user first enters the standalone subscription checkout flow
**Purpose:** Top of payment funnel — measures purchase intent

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `currency` | String | `"EGP"` | Dynamic | High |
| `value` | Number | `250.00` | Total price before discount (cents ÷ 100) | High |
| `item_type` | String | `"event_ticket"` | `"event_ticket"` / `"track_booking"` / `"subscription"` | High |
| `items` | Array | Single item | The item being purchased | High |

```javascript
// Begin checkout for a paid event
window.dataLayer.push({
  'event': 'begin_checkout',
  'currency': 'EGP',
  'value': 250.00,
  'item_type': 'event_ticket',
  'items': [
    {
      'item_id': 'evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'item_name': 'Advanced Google Ads Workshop',
      'item_category': 'Mastermind',
      'price': 250.00,
      'currency': 'EGP'
    }
  ]
});
```

```javascript
// Begin checkout for a subscription
window.dataLayer.push({
  'event': 'begin_checkout',
  'currency': 'EGP',
  'value': 2500.00,
  'item_type': 'subscription',
  'items': [
    {
      'item_id': 'subscription_annual',
      'item_name': 'TrafficMENA Annual Subscription',
      'item_category': 'Subscription',
      'price': 2500.00,
      'currency': 'EGP'
    }
  ]
});
```

---

## 12. select_payment_method

**Trigger:** User clicks the "Pay" button after selecting a payment method in the checkout dialog (fires in `handleCheckout` before the API call to `/payments/checkout`)
**Purpose:** Payment method preference analysis + funnel drop-off between method selection and payment completion. Actual payment info is entered on Fawaterk's external page — this event captures the method choice on our side.

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `currency` | String | `"EGP"` | Dynamic | High |
| `value` | Number | `200.00` | Amount after discount | High |
| `payment_type` | String | `"fawry"` | Selected method name from Fawaterk API (fawry/aman/masary/meeza/mobile_wallet) | High |
| `item_type` | String | `"event_ticket"` | `"event_ticket"` / `"track_booking"` / `"subscription"` | High |
| `coupon` | String | `"SUMMER25"` | Promo code if applied. Empty string if none | Medium |
| `items` | Array | Single item | The item being purchased | High |

```javascript
// Fires when user clicks "Pay" in PaymentCheckoutDialog
// NOT when they select the radio button (that's just browsing)
window.dataLayer.push({
  'event': 'select_payment_method',
  'currency': 'EGP',
  'value': 200.00,
  'payment_type': 'fawry',
  'item_type': 'event_ticket',
  'coupon': 'SUMMER25',
  'items': [
    {
      'item_id': 'evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'item_name': 'Advanced Google Ads Workshop',
      'item_category': 'Mastermind',
      'price': 200.00,
      'currency': 'EGP'
    }
  ]
});
```

---

## 13. apply_promo_code

**Trigger:** User submits a promo code (success or failure)
**Purpose:** Promo code effectiveness and failure rate analysis

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `promo_code` | String | `"SUMMER25"` | The code entered | High |
| `status` | String | `"success"` | `"success"` / `"invalid"` / `"expired"` / `"limit_reached"` | High |
| `discount_percent` | Number | `25` | Discount percentage. `0` if failed | Medium |
| `item_type` | String | `"event_ticket"` | What the code was applied to | Medium |
| `item_id` | String | `"evt-a1b2c3d4-..."` | Target item UUID | Medium |

```javascript
// Successful promo code
window.dataLayer.push({
  'event': 'apply_promo_code',
  'promo_code': 'SUMMER25',
  'status': 'success',
  'discount_percent': 25,
  'item_type': 'event_ticket',
  'item_id': 'evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890'
});
```

```javascript
// Failed promo code
window.dataLayer.push({
  'event': 'apply_promo_code',
  'promo_code': 'OLDCODE',
  'status': 'expired',
  'discount_percent': 0,
  'item_type': 'event_ticket',
  'item_id': 'evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890'
});
```

---

## 14. first_purchase

**Trigger:** Fires **additionally** alongside `purchase` when it is the user's **first-ever** non-subscription purchase (payment status transitions to `paid`)
**Purpose:** New customer acquisition signal — optimizes ad bidding for first-time buyers. This event fires IN ADDITION to `purchase`, not instead of it.
**Important:** Fire on actual payment success state, NOT on thank-you page load. Do NOT fire for subscription purchases (use `subscribe` instead).

**Detection logic:** Check if the user has zero previous `paid` payments in the `payments` table (excluding subscription type). If zero → fire BOTH `first_purchase` AND `purchase`.

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `transaction_id` | String | `"pay-e5f6a7b8-..."` | Payment UUID from `payments.id` | High |
| `currency` | String | `"EGP"` | From `payments.currency` | High |
| `value` | Number | `200.00` | Amount paid (amountCents ÷ 100) | High |
| `item_type` | String | `"event_ticket"` | `"event_ticket"` / `"track_booking"` | High |
| `payment_type` | String | `"fawry"` | Payment method used | High |
| `customer_type` | String | `"new"` | Always `"new"` on first_purchase — this is the moment the member becomes a customer | High |
| `coupon` | String | `"SUMMER25"` | Promo code if used. Empty string if none | Medium |
| `discount` | Number | `50.00` | Discount amount (discountAppliedCents ÷ 100). `0` if none | Medium |
| `original_value` | Number | `250.00` | Pre-discount price (originalAmountCents ÷ 100) | Medium |
| `items` | Array | Single item | The purchased item | High |

**Item parameters:**

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `item_id` | String | `"evt-a1b2c3d4-..."` | Event/track UUID | High |
| `item_name` | String | `"Advanced Google Ads Workshop"` | Title | High |
| `item_category` | String | `"Mastermind"` | Event type or `"Track"` | High |
| `price` | Number | `200.00` | Price paid | High |
| `currency` | String | `"EGP"` | Dynamic | High |
| `quantity` | Number | `1` | Always `1` (single registration) | High |

```javascript
// Client-side — fires ADDITIONALLY alongside purchase
// when user has no prior non-subscription purchases
window.dataLayer.push({
  'event': 'first_purchase',
  'transaction_id': 'pay-e5f6a7b8-c9d0-1234-efgh-567890123456',
  'currency': 'EGP',
  'value': 200.00,
  'item_type': 'event_ticket',
  'payment_type': 'fawry',
  'customer_type': 'new',
  'coupon': 'SUMMER25',
  'discount': 50.00,
  'original_value': 250.00,
  'items': [
    {
      'item_id': 'evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'item_name': 'Advanced Google Ads Workshop',
      'item_category': 'Mastermind',
      'price': 200.00,
      'currency': 'EGP',
      'quantity': 1
    }
  ]
});
```

### Server-Side: first_purchase

Fire from the Fawaterk webhook handler (`POST /payments/webhook`) after payment is confirmed and fulfillment succeeds. Fire **alongside** the `purchase` event, not instead of it.

```javascript
// Server-side — GA4 Measurement Protocol
{
  "client_id": "server_generated_client_id",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "events": [{
    "name": "first_purchase",
    "params": {
      "transaction_id": "pay-e5f6a7b8-c9d0-1234-efgh-567890123456",
      "currency": "EGP",
      "value": 200.00,
      "item_type": "event_ticket",
      "payment_type": "fawry",
      "customer_type": "new",
      "coupon": "SUMMER25",
      "discount": 50.00,
      "original_value": 250.00,
      "items": [{
        "item_id": "evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "item_name": "Advanced Google Ads Workshop",
        "item_category": "Mastermind",
        "price": 200.00,
        "currency": "EGP",
        "quantity": 1
      }],
      "event_source": "Server"
    }
  }]
}
```

---

## 15. purchase

**Trigger:** Fires on **every** non-subscription purchase (payment status → `paid`), including the first
**Purpose:** Single source of truth for all non-subscription revenue. Every transaction flows through this event — use `customer_type` to segment first-time vs. returning in GA4 reports.
**Important:** Fire on actual payment success state. When it's the user's first purchase, fire BOTH `purchase` AND `first_purchase`. Do NOT fire for subscriptions (use `subscribe`).

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `transaction_id` | String | `"pay-f6a7b8c9-..."` | Payment UUID from `payments.id` | High |
| `currency` | String | `"EGP"` | From `payments.currency` | High |
| `value` | Number | `1500.00` | Amount paid (amountCents ÷ 100) | High |
| `item_type` | String | `"track_booking"` | `"event_ticket"` / `"track_booking"` | High |
| `payment_type` | String | `"aman"` | Payment method used | High |
| `customer_type` | String | `"returning"` | `"new"` (first purchase — 0 prior) / `"returning"` (1+ prior purchases) | High |
| `coupon` | String | `""` | Promo code if used. Empty string if none | Medium |
| `discount` | Number | `0` | Discount amount. `0` if none | Medium |
| `original_value` | Number | `1500.00` | Pre-discount price | Medium |
| `items` | Array | Single item | The purchased item (same item params as first_purchase) | High |

```javascript
// First-ever purchase — fires BOTH purchase AND first_purchase
// customer_type is "new" because this is their first purchase
window.dataLayer.push({
  'event': 'purchase',
  'transaction_id': 'pay-e5f6a7b8-c9d0-1234-efgh-567890123456',
  'currency': 'EGP',
  'value': 200.00,
  'item_type': 'event_ticket',
  'payment_type': 'fawry',
  'customer_type': 'new',
  'coupon': 'SUMMER25',
  'discount': 50.00,
  'original_value': 250.00,
  'items': [
    {
      'item_id': 'evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'item_name': 'Advanced Google Ads Workshop',
      'item_category': 'Mastermind',
      'price': 200.00,
      'currency': 'EGP',
      'quantity': 1
    }
  ]
});
```

```javascript
// Returning customer buys a track — fires purchase only (no first_purchase)
window.dataLayer.push({
  'event': 'purchase',
  'transaction_id': 'pay-f6a7b8c9-d0e1-2345-fghi-678901234567',
  'currency': 'EGP',
  'value': 1500.00,
  'item_type': 'track_booking',
  'payment_type': 'aman',
  'customer_type': 'returning',
  'coupon': '',
  'discount': 0,
  'original_value': 1500.00,
  'items': [
    {
      'item_id': 'trk-c3d4e5f6-a7b8-9012-cdef-345678901234',
      'item_name': 'Performance Marketing Bootcamp',
      'item_category': 'Track',
      'price': 1500.00,
      'currency': 'EGP',
      'quantity': 1
    }
  ]
});
```

### Server-Side: purchase

Fire from webhook handler on **every** non-subscription purchase. When `prior_purchases = 0`, fire both `purchase` and `first_purchase`.

```javascript
// Server-side — GA4 Measurement Protocol
{
  "client_id": "server_generated_client_id",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "events": [{
    "name": "purchase",
    "params": {
      "transaction_id": "pay-f6a7b8c9-d0e1-2345-fghi-678901234567",
      "currency": "EGP",
      "value": 1500.00,
      "item_type": "track_booking",
      "payment_type": "aman",
      "customer_type": "returning",
      "coupon": "",
      "discount": 0,
      "original_value": 1500.00,
      "items": [{
        "item_id": "trk-c3d4e5f6-a7b8-9012-cdef-345678901234",
        "item_name": "Performance Marketing Bootcamp",
        "item_category": "Track",
        "price": 1500.00,
        "currency": "EGP",
        "quantity": 1
      }],
      "event_source": "Server"
    }
  }]
}
```

---

## 16. subscribe

**Trigger:** Subscription purchase confirmed (payment status → `paid` where `itemType = 'subscription'`)
**Purpose:** Subscription conversion — separate from item purchases for distinct ad optimization and LTV analysis
**Important:** Fire on actual payment success state.

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `transaction_id` | String | `"pay-a7b8c9d0-..."` | Payment UUID | High |
| `currency` | String | `"EGP"` | Dynamic | High |
| `value` | Number | `2500.00` | Amount paid | High |
| `item_type` | String | `"subscription"` | Always `"subscription"` | High |
| `payment_type` | String | `"meeza"` | Payment method | High |
| `customer_type` | String | `"new"` | `"new"` (1 prior purchase) / `"returning"` (2+ prior purchases). Subscription is always paid — free users who subscribe become "new" after their first purchase. | High |
| `subscription_duration` | String | `"annual"` | Subscription period | High |
| `coupon` | String | `""` | Promo code if used | Medium |
| `discount` | Number | `0` | Discount amount | Medium |
| `original_value` | Number | `2500.00` | Pre-discount price | Medium |
| `items` | Array | Single item | Subscription item | High |

```javascript
// Returning customer subscribes with promo code
window.dataLayer.push({
  'event': 'subscribe',
  'transaction_id': 'pay-b8c9d0e1-f2a3-4567-hijk-890123456789',
  'currency': 'EGP',
  'value': 1875.00,
  'item_type': 'subscription',
  'payment_type': 'fawry',
  'customer_type': 'returning',
  'subscription_duration': 'annual',
  'coupon': 'SUBSCRIBE25',
  'discount': 625.00,
  'original_value': 2500.00,
  'items': [
    {
      'item_id': 'subscription_annual',
      'item_name': 'TrafficMENA Annual Subscription',
      'item_category': 'Subscription',
      'price': 1875.00,
      'currency': 'EGP',
      'quantity': 1
    }
  ]
});
```

### Server-Side: subscribe

Fire from webhook handler after subscription record is created.

```javascript
{
  "client_id": "server_generated_client_id",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "events": [{
    "name": "subscribe",
    "params": {
      "transaction_id": "pay-a7b8c9d0-e1f2-3456-ghij-789012345678",
      "currency": "EGP",
      "value": 2500.00,
      "item_type": "subscription",
      "payment_type": "meeza",
      "customer_type": "new",
      "subscription_duration": "annual",
      "coupon": "",
      "discount": 0,
      "original_value": 2500.00,
      "items": [{
        "item_id": "subscription_annual",
        "item_name": "TrafficMENA Annual Subscription",
        "item_category": "Subscription",
        "price": 2500.00,
        "currency": "EGP",
        "quantity": 1
      }],
      "event_source": "Server"
    }
  }]
}
```

---

## 17. click_meeting_link

**Trigger:** User clicks the Zoom/Google Meet/meeting link to join a live session
**Purpose:** Attendance intent — the strongest signal that a user will actually attend

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `item_id` | String | `"evt-a1b2c3d4-..."` | Event UUID | High |
| `item_name` | String | `"Advanced Google Ads Workshop"` | Event title | High |
| `item_category` | String | `"Mastermind"` | Event type | Medium |
| `meeting_platform` | String | `"zoom"` | Detected from URL: `"zoom"` / `"google_meet"` / `"teams"` / `"other"` | Medium |

```javascript
window.dataLayer.push({
  'event': 'click_meeting_link',
  'item_id': 'evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'item_name': 'Advanced Google Ads Workshop',
  'item_category': 'Mastermind',
  'meeting_platform': 'zoom'
});
```

---

## 18. view_content

**Trigger:** User opens a lesson (library asset) to view it — video starts playing, document opens, presentation loads
**Purpose:** Content consumption tracking — which content delivers value

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `content_id` | String | `"lib-d4e5f6a7-..."` | Library asset UUID | High |
| `content_name` | String | `"Google Ads Bidding Strategies"` | Asset title | High |
| `content_type` | String | `"Video"` | `"Video"` / `"Document"` / `"Presentation"` | High |
| `is_premium` | Boolean | `true` | Whether the asset requires subscription | Medium |
| `series_id` | String | `"ser-e5f6a7b8-..."` | Series UUID if accessed within a series. Empty if standalone | Medium |
| `series_name` | String | `"Google Ads Mastery"` | Series title if applicable | Medium |
| `event_id` | String | `"evt-a1b2c3d4-..."` | Linked event UUID if asset is event-gated. Empty if not | Low |

```javascript
// Viewing a video lesson within a series
window.dataLayer.push({
  'event': 'view_content',
  'content_id': 'lib-d4e5f6a7-b8c9-0123-defg-456789012345',
  'content_name': 'Google Ads Bidding Strategies',
  'content_type': 'Video',
  'is_premium': true,
  'series_id': 'ser-e5f6a7b8-c9d0-1234-efgh-567890123456',
  'series_name': 'Google Ads Mastery',
  'event_id': ''
});
```

```javascript
// Viewing a standalone document from the library
window.dataLayer.push({
  'event': 'view_content',
  'content_id': 'lib-f6a7b8c9-d0e1-2345-fghi-678901234567',
  'content_name': 'MENA Marketing Trends Report 2026',
  'content_type': 'Document',
  'is_premium': false,
  'series_id': '',
  'series_name': '',
  'event_id': ''
});
```

---

## 19. download_content

**Trigger:** User downloads a library asset (document, presentation)
**Purpose:** Content value signal — downloads indicate offline usage intent

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `content_id` | String | `"lib-f6a7b8c9-..."` | Library asset UUID | High |
| `content_name` | String | `"MENA Marketing Trends Report 2026"` | Asset title | High |
| `content_type` | String | `"Document"` | File type | High |
| `is_premium` | Boolean | `false` | Premium status | Medium |

```javascript
window.dataLayer.push({
  'event': 'download_content',
  'content_id': 'lib-f6a7b8c9-d0e1-2345-fghi-678901234567',
  'content_name': 'MENA Marketing Trends Report 2026',
  'content_type': 'Document',
  'is_premium': false
});
```

---

## 20. add_to_calendar

**Trigger:** User clicks "Add to Google Calendar" or downloads ICS file for an event
**Purpose:** Strong attendance intent signal

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `item_id` | String | `"evt-a1b2c3d4-..."` | Event UUID | High |
| `item_name` | String | `"Advanced Google Ads Workshop"` | Event title | High |
| `calendar_type` | String | `"google_calendar"` | `"google_calendar"` / `"ics_download"` | Medium |

```javascript
window.dataLayer.push({
  'event': 'add_to_calendar',
  'item_id': 'evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'item_name': 'Advanced Google Ads Workshop',
  'calendar_type': 'google_calendar'
});
```

---

## 21. calculator_used

**Trigger:** User completes a calculation in any of the 23 marketing/financial calculators
**Purpose:** Tool engagement — which calculators deliver value

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `calculator_id` | String | `"roas"` | Calculator slug | High |
| `calculator_name` | String | `"Return on Ad Spend"` | Display name | High |
| `calculator_category` | String | `"revenue_value"` | Category grouping (see below) | Medium |

**Calculator categories:**

| Category | Calculators |
|---|---|
| `"traffic_acquisition"` | `cpc`, `cpm`, `cpl`, `ctr`, `cac`, `ncac`, `cac-payback` |
| `"conversion"` | `cvr`, `cart-abandonment`, `checkout-abandonment`, `lead-to-customer`, `repeat-purchase` |
| `"revenue_value"` | `aov`, `ltv`, `saas-ltv`, `ltv-cac`, `roas`, `breakeven-roas` |
| `"retention_growth"` | `grr`, `nrr`, `mom-growth` |
| `"efficiency"` | `mer`, `seo-roi` |

```javascript
window.dataLayer.push({
  'event': 'calculator_used',
  'calculator_id': 'roas',
  'calculator_name': 'Return on Ad Spend',
  'calculator_category': 'revenue_value'
});
```

---

## 22. cancel_registration

**Trigger:** User cancels an event registration or requests a refund
**Purpose:** Churn signal — understand why users disengage

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `item_id` | String | `"evt-a1b2c3d4-..."` | Event UUID | High |
| `item_name` | String | `"Advanced Google Ads Workshop"` | Event title | High |
| `item_category` | String | `"Mastermind"` | Event type | Medium |
| `cancellation_type` | String | `"refund_request"` | `"instant"` (free event) / `"refund_request"` (paid event) | High |
| `was_paid` | Boolean | `true` | Whether the registration involved a payment | High |

```javascript
// Cancel a free event registration
window.dataLayer.push({
  'event': 'cancel_registration',
  'item_id': 'evt-b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'item_name': 'SEO Fundamentals Meetup',
  'item_category': 'Meetup',
  'cancellation_type': 'instant',
  'was_paid': false
});
```

```javascript
// Request refund for a paid event
window.dataLayer.push({
  'event': 'cancel_registration',
  'item_id': 'evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'item_name': 'Advanced Google Ads Workshop',
  'item_category': 'Mastermind',
  'cancellation_type': 'refund_request',
  'was_paid': true
});
```

### Server-Side: cancel_registration

Fire after the `eventAttendees.status` is updated to `cancelled` or `refund_requested`.

```javascript
{
  "client_id": "server_generated_client_id",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "events": [{
    "name": "cancel_registration",
    "params": {
      "item_id": "evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "item_name": "Advanced Google Ads Workshop",
      "item_category": "Mastermind",
      "cancellation_type": "refund_request",
      "was_paid": true,
      "event_source": "Server"
    }
  }]
}
```

---

## 23. profile_updated

**Trigger:** User saves changes to their profile
**Purpose:** Profile completion tracking — engagement depth signal

| Parameter | Type | Sample | Notes | Priority |
|---|---|---|---|---|
| `fields_updated` | String | `"phone,primary_goal"` | Comma-separated list of changed fields | Medium |
| `profile_completion` | Number | `85` | Completion percentage (0–100) | Medium |

**Profile completion calculation:**
Count non-empty fields: firstName, lastName, email, phoneNumber, primaryGoal, primaryChallenge.
Formula: `(filled fields / 6) * 100`, rounded to nearest integer.

```javascript
window.dataLayer.push({
  'event': 'profile_updated',
  'fields_updated': 'phone,primary_goal',
  'profile_completion': 85
});
```

---

## Server-Side Implementation Guide

### Which Events Need Server-Side Tracking

| Event | Why Server-Side | Trigger Point |
|---|---|---|
| `sign_up` | User may close browser after last step | After profile record insert |
| `event_registration` | Ensures registration is recorded | After `eventAttendees` insert |
| `track_booking` | Ensures booking is recorded | After `trackBookings` insert |
| `first_purchase` | Payment confirmation from webhook | Fawaterk webhook handler, after fulfillment |
| `purchase` | Payment confirmation from webhook | Fawaterk webhook handler, after fulfillment |
| `subscribe` | Payment confirmation from webhook | Fawaterk webhook handler, after subscription created |
| `cancel_registration` | Server-initiated cancellations | After status update in `eventAttendees` |

### Deduplication Strategy

Both client-side and server-side events may fire for the same action. Use `transaction_id` (for purchase events) or a generated `event_id` parameter to deduplicate in GA4.

**GA4 deduplication:** GA4 automatically deduplicates events with the same `transaction_id` within a 60-minute window. For non-purchase events, add a custom `dedup_id` parameter:

```javascript
// Client-side
window.dataLayer.push({
  'event': 'event_registration',
  'dedup_id': 'reg-evt-a1b2c3d4-user-x1y2z3',  // deterministic: action + item + user
  // ... other params
});

// Server-side
{
  "events": [{
    "name": "event_registration",
    "params": {
      "dedup_id": "reg-evt-a1b2c3d4-user-x1y2z3",
      // ... other params
    }
  }]
}
```

### New Customer Detection (Server-Side)

For `first_purchase` vs `purchase` determination on the server:

```sql
-- Check if user has any prior paid non-subscription payments
SELECT COUNT(*) as prior_purchases
FROM payments
WHERE user_id = :userId
  AND status = 'paid'
  AND item_type != 'subscription'
  AND id != :currentPaymentId;

-- Always fire purchase (every non-subscription transaction)
-- If prior_purchases = 0 → ALSO fire first_purchase alongside purchase
-- customer_type on purchase events: 0 prior = "new", 1+ prior = "returning"
```

For `subscribe` and `global_variables` — determine `customer_type`:

```sql
-- Count all prior paid payments (any type) to determine customer_type
SELECT COUNT(*) as prior_purchases
FROM payments
WHERE user_id = :userId
  AND status = 'paid'
  AND id != :currentPaymentId;  -- exclude current payment for subscribe event

-- For global_variables:
--   prior_purchases = 0 → customer_type = "free" (member, not a customer)
--   prior_purchases = 1 → customer_type = "new"
--   prior_purchases >= 2 → customer_type = "returning"
-- For purchase/subscribe events (user IS a customer):
--   prior_purchases = 0 → customer_type = "new" (first purchase)
--   prior_purchases >= 1 → customer_type = "returning"
```

### GA4 Measurement Protocol Setup

```
Endpoint: https://www.google-analytics.com/mp/collect
Method: POST
Query params:
  measurement_id: G-XXXXXXXXXX (your GA4 property)
  api_secret: your_api_secret (create in GA4 Admin → Data Streams → Measurement Protocol)

Headers:
  Content-Type: application/json

Body:
{
  "client_id": "<GA client_id from _ga cookie or server-generated>",
  "user_id": "<your user UUID>",
  "events": [{ "name": "...", "params": { ... } }]
}
```

**Important:** The `client_id` links server events to the same user session as client events. Pass the GA `_ga` cookie value from the client to the server (via session or payment record) to maintain session continuity.

---

## Implementation Priority Matrix

### Phase 1 — Core Funnels (ship first)

| Event | Rationale |
|---|---|
| `global_variables` | Foundation for all other events |
| `login_start` + `login` | Auth funnel |
| `sign_up_step` + `sign_up` | Acquisition funnel |
| `view_item` | Content interest |
| `begin_checkout` | Payment funnel top |
| `select_payment_method` | Payment funnel middle |
| `first_purchase` | New customer conversion (ads) |
| `purchase` | Returning customer conversion (ads) |
| `subscribe` | Subscription conversion (ads) |

### Phase 2 — Discovery & Engagement

| Event | Rationale |
|---|---|
| `view_item_list` | Content discovery |
| `select_item` | Click-through analysis |
| `event_registration` | Free conversion tracking |
| `track_booking` | Free conversion tracking |
| `click_meeting_link` | Attendance tracking |
| `view_content` | Content consumption |

### Phase 3 — Optimization & Retention

| Event | Rationale |
|---|---|
| `apply_promo_code` | Promotion effectiveness |
| `cancel_registration` | Churn analysis |
| `download_content` | Content value |
| `add_to_calendar` | Attendance intent |
| `calculator_used` | Tool engagement |
| `profile_updated` | Engagement depth |

---

## GA4 Custom Dimensions & Metrics

Register these as custom dimensions in GA4 Admin → Custom Definitions:

| Parameter | Scope | Type |
|---|---|---|
| `user_role` | User | Text |
| `subscription_status` | User | Text |
| `customer_type` | User | Text |
| `item_type` | Event | Text |
| `payment_type` | Event | Text |
| `item_category` | Event | Text |
| `registration_type` | Event | Text |
| `booking_type` | Event | Text |
| `content_type` | Event | Text |
| `calculator_category` | Event | Text |
| `cancellation_type` | Event | Text |
| `is_online` | Event | Boolean |
| `is_premium` | Event | Boolean |
| `step_name` | Event | Text |

---

## GTM Container Architecture

### Recommended Tag Structure

```
Tags:
├── GA4 Configuration Tag (fires on all pages)
│   └── Sets: measurement_id, user_id (from global_variables)
│
├── GA4 Event Tags (one per event, or use event tag with variable lookup)
│   ├── login_start
│   ├── login
│   ├── sign_up_step
│   ├── sign_up
│   ├── view_item_list
│   ├── select_item
│   ├── view_item
│   ├── event_registration
│   ├── track_booking
│   ├── begin_checkout
│   ├── select_payment_method
│   ├── apply_promo_code
│   ├── first_purchase
│   ├── purchase
│   ├── subscribe
│   ├── click_meeting_link
│   ├── view_content
│   ├── download_content
│   ├── add_to_calendar
│   ├── calculator_used
│   ├── cancel_registration
│   └── profile_updated
│
├── CRM/Marketing Tags (receive PII)
│   └── Forward email, phone, first_name, last_name
│
Triggers:
├── Custom Event triggers (one per dataLayer event name)
│
Variables:
├── Data Layer Variables (one per parameter)
└── Lookup tables (for page_type mapping if needed)
```

### PII Blocking Rule

In each GA4 Event Tag, configure **Parameters to Exclude:**
- `email`
- `phone`
- `first_name`
- `last_name`

Or use a GTM Variable template that strips PII before sending to GA4.

---

## Conversion Actions for Ad Platforms

### Google Ads

| Conversion Action | GA4 Event | Bid Optimization |
|---|---|---|
| New Customer Purchase | `first_purchase` | Maximize conversion value (new customer acquisition) |
| Repeat Purchase | `purchase` | Maximize conversion value (retention) |
| Subscription | `subscribe` | Maximize conversion value (high LTV) |
| Sign Up | `sign_up` | Maximize conversions (top of funnel) |
| Free Registration | `event_registration` | Maximize conversions (engagement) |

### Meta / TikTok / Other Platforms

Map these via GTM tags firing on the same dataLayer events:

| Platform Event | DataLayer Event |
|---|---|
| `CompleteRegistration` | `sign_up` |
| `Purchase` | `first_purchase` / `purchase` |
| `Subscribe` | `subscribe` |
| `ViewContent` | `view_item` |
| `InitiateCheckout` | `begin_checkout` |
| `AddPaymentInfo` | `select_payment_method` |

---

## Key Business Questions This Model Answers

| Question | Events Used |
|---|---|
| What's our signup funnel conversion per step? | `sign_up_step` (compare step 1→2→3→4→5→6) |
| What % of OTP requests convert to logins? | `login_start` → `login` |
| Which event types attract the most registrations? | `event_registration` grouped by `item_category` |
| What's the payment funnel drop-off? | `begin_checkout` → `select_payment_method` → `first_purchase`/`purchase`/`subscribe` |
| Which payment methods are preferred? | `select_payment_method` grouped by `payment_type` |
| What's our new vs. returning customer revenue split? | `purchase` filtered by `customer_type` (`"new"` vs `"returning"`) |
| How effective are promo codes? | `apply_promo_code` by `status` and `promo_code` |
| Which content is most consumed? | `view_content` grouped by `content_type`, `series_name` |
| What % of registrants actually attend? | `event_registration` → `click_meeting_link` (same `item_id`) |
| Which calculators drive the most engagement? | `calculator_used` grouped by `calculator_id` |
| What's the subscription conversion rate? | `begin_checkout` (subscription) → `subscribe` |
| What's our cancellation rate? | `cancel_registration` / `event_registration` |
