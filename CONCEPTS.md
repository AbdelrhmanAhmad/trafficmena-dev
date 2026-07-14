# Concepts

> Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as js-ce:compound and js-ce:compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Relationships

- A **Track** bundles many **Events**; an Event belongs to at most one Track, or stands alone.
- A **Series** holds many **Library Assets**; each Track has one companion Series that collects its session recordings.
- A **Track Booking** is scoped by exactly one **Ticket Type** and grants access across all of the Track's Events.
- A **Reservation** precedes a **Payment**; confirming the Payment converts the held capacity into a Booking or registration.

## Catalog & Content

### Event
A single scheduled session — online or offline — that users register for and attend; it may stand alone or be bundled into a Track. An Event's format decides which detail it can reveal: an online Event exposes a meeting link, an offline Event exposes a venue location.

### Track
A bookable bundle of Events sold as one package (a cohort or short course), with its own booking window and capacity.
*Avoid:* course, bundle (when the distinction matters)

### Series
A curated collection of Library Assets used to organize content — not bookable and not attended. Every Track has a companion Series that holds its session recordings.

### Library Asset
A content item (video or document) in the knowledge library. An asset may be premium, requiring a Subscription, a qualifying Track Booking, or an explicit grant to open.

## Purchase & Access

### Ticket Type
The variant chosen when booking a Track that scopes which session formats the buyer may attend live and which recordings they may open — distinguishing online-only, offline-only, and both-formats access.

Access is asymmetric: offline-session recordings are available to every Ticket Type, while online-session recordings follow online live entitlement. A Booking with no Ticket Type is a legacy booking that grants access to everything.

### Track Booking
A user's purchase of an entire Track; it stays active until revoked and grants Ticket-Type-scoped access to the Track's Events and recordings.
*Avoid:* enrollment (when the distinction matters)

### Reservation
A temporary capacity hold placed at checkout, before payment settles, that counts against an Event's or Track's capacity and expires after a fixed window — so two buyers cannot both pay for the last seat.
*Avoid:* hold

### Payment
A record of a purchase attempt for an item (Event, Track, or Subscription) that moves through a lifecycle from pending to paid, or to failed/expired. Fulfillment — granting the purchased access — happens atomically only after the payment is confirmed; a Payment is never marked paid before the buyer's access is delivered.

### Late-Added Session
An Event added to a Track after booking opened (a late-confirmed or replacement speaker, or a meetup scheduled once the cohort exists). Active Track Bookings are backfilled per their Ticket Type exactly as if the session had existed at booking time, so purchase timing never changes a buyer's entitlement.

### Subscription
An annual membership that grants premium Library access and a configurable discount on paid Events and Tracks.

### Subscriber Discount
The configurable percentage taken off paid items for an active Subscriber.

### Promo Code
A time-bounded discount code, with usage limits, applied at checkout.

## States

### Registration Status
The state of a user's attendance for an Event: active, cancelled, or awaiting refund approval.

A free registration cancels directly to cancelled. A paid registration cancels into a refund-requested state that an admin then approves (becoming cancelled) or rejects (returning to active).
