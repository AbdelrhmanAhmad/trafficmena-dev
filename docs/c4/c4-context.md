# C4 Context Level: System Context

## System Overview

### Short Description

TrafficMENA Hub is a digital marketing education platform for the MENA region that connects practitioners with expert-led events, bundled course tracks, and a premium knowledge library through a single member experience.

### Long Description

TrafficMENA Hub solves the fragmented learning journey for digital marketing professionals in the MENA region. The platform lets practitioners discover and attend expert-led live events, purchase bundled course tracks for structured learning, and access a curated premium library of assets and content series after each live experience ends.

Access is controlled through a five-tier role model (user, expert, manager, admin, owner) so that the same platform serves learners consuming content, subject-matter experts contributing it, and operations staff managing the full catalog lifecycle. Onboarding supports both open OTP-based signup and curated invite-only flows, giving the operations team full control over who enters the platform.

Commerce is built around the Fawaterk payment gateway supporting five payment methods (Fawry, Meeza, Aman, Masary, Mobile Wallet), a 72-hour capacity reservation system, subscriber discounts, and time-bounded promo codes. Annual subscriptions unlock a configurable discount on offline events and track bookings and grant free access to online events, creating an incentive structure that rewards long-term membership.

The admin workspace covers the complete content lifecycle: creating and publishing events, assembling tracks from event groups, curating series and library assets, managing invitations (single and bulk CSV), configuring promo codes, and monitoring platform metrics. Twenty-three standalone marketing and financial calculators round out the learner value proposition without requiring any backend calls.

## Personas

### Learner

- **Type**: Human User
- **Description**: An authenticated digital marketing professional who uses the platform to attend events, book course tracks, and access premium library content.
- **Goals**: Discover and register for live events, purchase track bundles, consume premium library assets, and track learning progress.
- **Key Features Used**: Event browsing and registration, track booking, library access, series browsing, subscription management, marketing calculators, payment checkout.

### Expert

- **Type**: Human User
- **Description**: A subject-matter expert or event host who co-hosts events and authors educational content managed through the platform.
- **Goals**: Deliver knowledge to the audience and have supporting materials published as library or series assets accessible to members.
- **Key Features Used**: Events (as host or co-host), library assets, series, expert-linked content workflows.

### Content Manager

- **Type**: Human User
- **Description**: A staff user with write access to the content catalog and commerce tools who manages day-to-day publishing operations without user-management authority.
- **Goals**: Create and publish events, tracks, series, and library assets; manage promo codes; monitor attendee lists; configure subscription settings.
- **Key Features Used**: Event CRUD, track CRUD, series CRUD, library asset CRUD, promo code management, attendee management, subscription settings.

### Administrator

- **Type**: Human User
- **Description**: A platform operator with full control over content, users, invitations, and settings, excluding removal of owner-level accounts.
- **Goals**: Manage the full user roster and role assignments, run invitation campaigns, oversee platform settings, review dashboard metrics and revenue performance, and approve or reject cancellation requests.
- **Key Features Used**: All Content Manager features plus user management, invitation dispatch (single and bulk CSV), admin dashboard metrics, cancellation request approval, platform settings.

### Platform Owner

- **Type**: Human User
- **Description**: The highest-privilege account holder with unrestricted system control, including owner-level user management and all configuration operations.
- **Goals**: Maintain full platform control including owner-level user operations, all settings changes, and all content and commerce operations.
- **Key Features Used**: All Administrator features plus owner-level user management and system-wide configuration.

### Fawaterk Payment Gateway

- **Type**: Programmatic User
- **Description**: The external payment provider that sends HMAC-verified webhook callbacks to the platform when a hosted invoice changes state.
- **Goals**: Notify the platform that a payment has been confirmed, failed, or expired so that bookings, subscriptions, and reservations can be fulfilled or released.
- **Key Features Used**: Payment webhook endpoints (`POST /api/payments/webhook`, `POST /api/payments/webhook_json`), invoice verification, atomic checkout fulfillment.

### Plunk Email Service

- **Type**: Programmatic User
- **Description**: The transactional email provider that receives API requests from the platform and delivers OTP codes and invitation emails to end users.
- **Goals**: Reliably deliver authentication and onboarding email messages on behalf of the platform.
- **Key Features Used**: OTP email delivery for authentication flows, invitation email dispatch for single and bulk invitation campaigns.

### BunnyCDN

- **Type**: Programmatic User
- **Description**: The object storage and CDN that receives file uploads from the API server and serves stored media assets directly to browsers.
- **Goals**: Store and serve uploaded documents, images, and content assets with low latency.
- **Key Features Used**: File upload API (20 MB limit), direct browser media delivery for library assets, event images, and track thumbnails.

## System Features

### Email OTP Authentication with CAPTCHA

- **Description**: Passwordless authentication using one-time codes sent to email. Supports open signup, invite-only enforcement, session management, and optional Cloudflare Turnstile bot protection on high-load flows. Rate-limited at 3 OTPs per 10 minutes in normal mode and 15 per 10 minutes in event mode.
- **Users**: Learner, Expert, Content Manager, Administrator, Platform Owner
- **User Journey**: New User Signup Journey

### Event Management and Registration

- **Description**: Full lifecycle for expert-led live events including creation, publishing, attendee registration, capacity tracking, cancellation requests, and refund workflow management.
- **Users**: Learner (registration), Expert (hosting), Content Manager (CRUD), Administrator (CRUD, refund approval)
- **User Journey**: Event Registration Journey

### Track (Course Bundle) Booking

- **Description**: Bundles of events sold as a single purchase with atomic capacity reservation, a 72-hour booking window, and access to all constituent events after booking confirmation.
- **Users**: Learner (booking), Content Manager (CRUD), Administrator (CRUD)
- **User Journey**: Track Booking Journey

### Content Series and Library

- **Description**: Curated series of educational assets and a premium knowledge library with subscription-gated access control, view tracking, and rich media support.
- **Users**: Learner (browsing and access), Expert (content contribution), Content Manager (CRUD), Administrator (CRUD)
- **User Journey**: Library Access Journey

### Payment Processing

- **Description**: End-to-end commerce using the Fawaterk gateway supporting Fawry, Meeza, Aman, Masary, and Mobile Wallet. Includes price previews, promo code application, 72-hour capacity reservations, HMAC-verified webhook fulfillment, and a background job for stale payment expiration.
- **Users**: Learner (checkout), Fawaterk Payment Gateway (webhook callbacks)
- **User Journey**: Payment Flow Journey

### Subscription Management

- **Description**: Annual membership subscriptions with configurable subscriber discounts (default 20% on offline and track events, free access to online events), public benefits presentation, and admin-controlled subscription settings.
- **Users**: Learner (subscription purchase and benefits), Content Manager (settings read), Administrator (settings management)
- **User Journey**: Library Access Journey

### Promo Codes and Discounts

- **Description**: Time-bounded discount codes with configurable percentage reductions, usage tracking, soft-delete lifecycle, and validation at checkout.
- **Users**: Learner (code application at checkout), Content Manager (code management), Administrator (code management)
- **User Journey**: Payment Flow Journey

### Invitation System

- **Description**: Invite-only onboarding support with single email invitations and bulk CSV import, invite acceptance and activation flows, and a toggleable invite-only platform mode.
- **Users**: Administrator (dispatch), Platform Owner (dispatch), Learner (acceptance)
- **User Journey**: New User Signup Journey

### Admin Dashboard and Metrics

- **Description**: Protected staff workspace with overview metrics, revenue visibility, attendee monitoring, and all content and user management operations.
- **Users**: Administrator, Platform Owner
- **User Journey**: Admin Content Management Journey

### Marketing Calculators

- **Description**: Twenty-three standalone interactive marketing and financial calculators (ROI, CPL, ROAS, LTV, and others) that run entirely in the browser with no API dependency.
- **Users**: Learner, Expert, Visitor (public access)
- **User Journey**: N/A (standalone tools)

### Rich Text Content Editor

- **Description**: TipTap-based rich text editor used in content authoring for events, library assets, and series descriptions. Supports headings, code blocks, images, blockquotes, lists, links, and text alignment.
- **Users**: Content Manager, Administrator, Platform Owner
- **User Journey**: Admin Content Management Journey

## User Journeys

### New User Signup Journey

**Persona**: Learner (or any new member)

1. An Administrator dispatches a single or bulk invitation email from the admin console.
2. The invited user receives the email and opens the invitation link (`/invitation/:token`).
3. The platform validates the invitation token and initializes the invite-session context.
4. The user completes the multi-step signup wizard (profile details, preferences).
5. The backend activates the invitation, creates the member record with the `user` role, and establishes a session via Better Auth.
6. The user lands on the dashboard and can browse events, tracks, and library content.

**Alternative path (open OTP signup, when invite-only is disabled):**

1. A visitor navigates to `/signin` and enters their email address.
2. The frontend submits an OTP request to `POST /api/auth/otp/request`, optionally with a Turnstile token.
3. The backend rate-limits the request and dispatches a one-time code via Plunk.
4. The visitor enters the OTP code on the verification screen.
5. The backend verifies the code, creates or resumes the session, and returns the authenticated session state.
6. The user proceeds to the dashboard.

### Event Registration Journey

**Persona**: Learner

1. The learner browses the events catalog from the dashboard or a public listing page.
2. The frontend loads event details and current attendance state from `GET /api/events/:id`.
3. For a free event, the learner clicks Register; the backend records attendance immediately.
4. For a paid event, the learner proceeds to checkout: the frontend requests a price preview from `GET /api/payments/price-preview`, optionally applying a promo code.
5. The learner selects a payment method from `GET /api/payments/methods` and submits checkout via `POST /api/payments/checkout`.
6. The backend creates a 72-hour capacity reservation and a hosted Fawaterk invoice, returning invoice metadata.
7. The learner completes payment through the Fawaterk-hosted flow.
8. Fawaterk sends an HMAC-verified callback to `POST /api/payments/webhook`; the backend fulfills the booking atomically.
9. The learner returns to a payment success screen and sees confirmed registration status in the dashboard.

### Track Booking Journey

**Persona**: Learner

1. The learner opens a track page from the dashboard or public track listing.
2. The frontend loads track details, the event lineup, and current booking state from `GET /api/tracks/:id`.
3. The learner initiates booking via `POST /api/tracks/:id/book`.
4. The backend reserves capacity across all track events atomically and creates a Fawaterk invoice.
5. The learner completes payment; Fawaterk sends a webhook callback.
6. The backend fulfills the track booking via a CTE-based atomic transaction, granting access to all constituent events.
7. The learner sees the track confirmed in the dashboard and can access all linked events and associated library assets.

### Library Access Journey

**Persona**: Learner

1. The learner navigates to the library section of the dashboard.
2. The frontend requests the asset catalog from `GET /api/library`, which applies subscription-based access control.
3. Premium assets are visible in the listing but gated behind a subscription or event-access grant.
4. If the learner holds an active subscription, premium assets are accessible directly.
5. If not subscribed, the learner is directed to the subscription landing page (`/subscribe`), where benefits and pricing are presented via `GET /api/subscriptions/info`.
6. The learner purchases a subscription through the payment flow; the backend grants subscription-level library access.
7. The learner returns to the library and opens any gated asset; view tracking is recorded by the backend.

### Admin Content Management Journey

**Persona**: Administrator or Content Manager

1. The staff user signs in and navigates to the protected admin console (`/admin/*`).
2. To create an event, the admin fills in the event form (title, description via TipTap editor, date, capacity, pricing) and submits to `POST /api/events`.
3. The backend validates the payload with Zod, enforces the manager-level RBAC check, and persists the event.
4. To build a track, the admin creates a track record via `POST /api/tracks`, then assembles events into it via `POST /api/tracks/:id/events`.
5. Content assets (images, documents) are uploaded via `POST /api/uploads`; the backend stores them in BunnyCDN and returns CDN URLs for embedding.
6. The admin publishes the track; it becomes visible to learners in the catalog.
7. An Administrator monitors the admin dashboard for overview metrics, revenue figures, and attendee lists, iterating as needed.

### Payment Flow Journey

**Persona**: Learner (initiating), Fawaterk Payment Gateway (fulfilling)

1. The learner selects a paid item (event, track, or subscription) and starts checkout.
2. The frontend requests a price preview with any applicable subscriber discount and promo code.
3. The learner confirms the order; the frontend submits `POST /api/payments/checkout` with the selected payment method.
4. The backend creates a capacity reservation (72-hour TTL), generates a Fawaterk hosted invoice, and returns the invoice URL.
5. The learner is redirected to the Fawaterk-hosted payment page and completes the transaction.
6. Fawaterk delivers an HMAC-verified webhook callback to `POST /api/payments/webhook`.
7. The backend verifies the webhook signature, resolves invoice state, and atomically fulfills the purchase (event booking, track booking, or subscription grant).
8. The learner is redirected to the payment success screen; access is immediately active.
9. A background job periodically expires stale pending payments and releases associated capacity reservations.

## External Systems and Dependencies

### PostgreSQL

- **Type**: Database
- **Description**: The durable transactional data store holding all platform state including users, profiles, events, tracks, series, library assets, payments, reservations, subscriptions, promo codes, invitations, and platform settings.
- **Integration Type**: SQL via Drizzle ORM
- **Purpose**: Single source of truth for all platform business state; backs authentication, content discovery, access control, commerce, and metrics.

### Fawaterk

- **Type**: Payment Gateway
- **Description**: Provides payment-method discovery, hosted invoice creation for Fawry, Meeza, Aman, Masary, and Mobile Wallet, and HMAC-verified webhook callbacks when invoice state changes.
- **Integration Type**: HTTPS API (outbound invoice creation) and HTTPS webhooks (inbound payment confirmations)
- **Purpose**: Enables paid registration for events, track bookings, and annual subscriptions.

### Plunk

- **Type**: Transactional Email Service
- **Description**: Receives API requests from the backend and delivers OTP authentication codes and invitation emails to end users.
- **Integration Type**: HTTPS API
- **Purpose**: Supports passwordless authentication and curated invite-only onboarding communications.

### BunnyCDN

- **Type**: Object Storage and Content Delivery Network
- **Description**: Stores uploaded files sent by the backend API and serves stored media assets directly to browsers using CDN URLs.
- **Integration Type**: HTTPS API (upload) and direct browser HTTPS delivery (media serving)
- **Purpose**: Hosts uploaded documents, images, event thumbnails, and library content assets with low-latency global delivery.

### Cloudflare Turnstile

- **Type**: Bot-Protection Service
- **Description**: Issues challenge tokens in the browser that are submitted alongside OTP requests and validated server-side by the backend.
- **Integration Type**: HTTPS API (server-side token validation)
- **Purpose**: Protects OTP request endpoints from automated abuse during high-traffic periods such as event launches.

## System Context Diagram

```mermaid
C4Context
    title TrafficMENA Hub - System Context

    Person(learner, "Learner", "Attends events, books tracks, and accesses premium library content")
    Person(expert, "Expert", "Hosts events and contributes educational content")
    Person(manager, "Content Manager", "Creates and publishes events, tracks, series, and library assets")
    Person(admin, "Administrator", "Manages users, invitations, metrics, settings, and all content")
    Person(owner, "Platform Owner", "Holds full system control including owner-level operations")

    System(system, "TrafficMENA Hub", "Digital marketing education platform with events, course tracks, subscriptions, invite-only onboarding, and a premium knowledge library")

    System_Ext(postgres, "PostgreSQL", "Transactional data store for all platform state")
    System_Ext(fawaterk, "Fawaterk", "Payment gateway - invoice creation and webhook callbacks")
    System_Ext(plunk, "Plunk", "Transactional email - OTP codes and invitation delivery")
    System_Ext(bunny, "BunnyCDN", "Object storage and CDN for media assets")
    System_Ext(turnstile, "Cloudflare Turnstile", "Bot-protection CAPTCHA for auth flows")

    Rel(learner, system, "Browses catalog, registers for events, books tracks, accesses library")
    Rel(expert, system, "Hosts events and contributes content")
    Rel(manager, system, "Creates and manages content catalog and promo codes")
    Rel(admin, system, "Operates users, invitations, metrics, and platform settings")
    Rel(owner, system, "Controls all platform operations and owner-level accounts")
    Rel(system, postgres, "Reads and writes all platform data")
    Rel(system, fawaterk, "Creates payment invoices and receives webhook callbacks")
    Rel(system, plunk, "Sends OTP and invitation emails")
    Rel(system, bunny, "Uploads files and serves media assets")
    Rel(system, turnstile, "Validates bot-protection challenge tokens")
```

## Related Documentation

- [Container Documentation](./c4-container.md)
- [Component Documentation](./c4-component.md)
- [Web Experience Platform](./components/c4-component-web-experience-platform.md)
- [API Runtime and Platform Security](./components/c4-component-api-runtime-and-platform-security.md)
- [Identity, Invitations, and Member Operations API](./components/c4-component-identity-invitations-and-member-operations-api.md)
- [Learning Experiences UI](./components/c4-component-learning-experiences-ui.md)
- [Payments, Pricing, and Revenue Operations API](./components/c4-component-payments-pricing-and-revenue-operations-api.md)
- [Learning Content and Delivery API](./components/c4-component-learning-content-and-delivery-api.md)
- [Persistence and Background Operations](./components/c4-component-persistence-and-background-operations.md)
