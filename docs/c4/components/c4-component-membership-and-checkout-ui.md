# C4 Component Level: Membership and Checkout UI

## Overview

- **Name**: Membership and Checkout UI
- **Description**: Subscription marketing, payment dialogs, promo-code entry, and invite/payment completion surfaces in the frontend.
- **Type**: Application
- **Technology**: React 18, TypeScript, Tailwind CSS, TanStack Query

## Purpose

This component explains the membership offer, collects checkout intent, and guides users through payment-related and invitation-related completion states. It packages the user-facing commerce touchpoints that sit between content discovery and backend payment processing.

## Software Features

- Subscription landing page sections such as pricing, ROI, comparison, reviews, and FAQ.
- Shared payment widgets for price display, method selection, promo-code entry, and checkout dialogs.
- Payment result surfaces for success, failure, and pending states.
- Invite acceptance entrypoints that hand the user into the onboarding flow.

## Code Elements

This component contains the following code-level elements:

- [c4-code-src-features-subscribe.md](../code/c4-code-src-features-subscribe.md) - Subscription feature root and exported content.
- [c4-code-src-features-subscribe-components.md](../code/c4-code-src-features-subscribe-components.md) - Membership landing page sections and pricing presentation.
- [c4-code-src-shared-components-payment.md](../code/c4-code-src-shared-components-payment.md) - Shared checkout widgets, price cards, and payment selectors.
- [c4-code-src-pages-payment.md](../code/c4-code-src-pages-payment.md) - Routed payment success, failure, and pending views.
- [c4-code-src-pages-invitation.md](../code/c4-code-src-pages-invitation.md) - Invitation acceptance page entrypoint.

## Interfaces

### Checkout Interaction Surface

- **Protocol**: In-process React component API
- **Description**: Shared UI widgets that collect payment method choice, promo codes, and checkout confirmation.
- **Operations**:
  - `PaymentCheckoutDialog`
  - `PaymentMethodSelector`
  - `PromoCodeInput`
  - `PriceDisplayCard`

### Commerce Navigation Surface

- **Protocol**: Browser navigation
- **Description**: Route segments that close the loop for invites and payments.
- **Operations**:
  - `/subscribe`
  - `/invitation/:token`
  - `/payment/success`, `/payment/failed`, `/payment/pending`

## Dependencies

### Components Used

- [c4-component-web-experience-platform.md](./c4-component-web-experience-platform.md): Provides routing, auth context, and frontend API helpers.
- [c4-component-learning-experiences-ui.md](./c4-component-learning-experiences-ui.md): Invoked from paid event and track journeys.

### External Systems

- TrafficMENA API Service: Creates checkout sessions, verifies invoice status, and resolves invitation state.

## Component Diagram

```mermaid
C4Component
    title Component Diagram for TrafficMENA Web Application

    Container_Boundary(web, "TrafficMENA Web Application") {
        Component(membership, "Membership and Checkout UI", "React commerce UI", "Subscription storytelling and checkout widgets")
        Component(shell, "Web Experience Platform", "React shell", "Routes and shared providers")
        Component(learning, "Learning Experiences UI", "React feature modules", "Paid event and track journeys")
    }
    Container_Ext(api, "TrafficMENA API Service", "Node.js, Hono API")

    Rel(shell, membership, "Routes users into")
    Rel(learning, membership, "Uses checkout widgets from")
    Rel(membership, api, "Creates and verifies payments through", "HTTPS/JSON")
```
