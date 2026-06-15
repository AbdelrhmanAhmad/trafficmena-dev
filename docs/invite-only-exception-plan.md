# Invite-Only Soft Launch With Exception Track/Event

## Quick Outcome
Enable invite-only platform tomorrow (Feb 3, 2026) while allowing specific tracks/events to bypass invite-only for signup and purchase. Subscriptions are fully blocked during invite-only.

## Scope and MVP Decisions
- Exception scope: Track + event toggles.
- Signup gate: Allow signup before payment for exception items.
- Subscriptions: Block for everyone while invite-only is ON.

## Data Model Changes
- Add boolean flag on both `tracks` and `events`:
  - `allow_invite_bypass` (default `false`).
- Update Drizzle schema and generate migration.

## Backend Changes (Hono)
1. Tracks & Events CRUD
   - Extend create/update Zod schemas to accept `allowInviteBypass`.
   - Persist to DB and return in admin + public responses.
   - Expose in:
     - `/tracks/public`, `/tracks/:id/public` payloads.
     - `/events` list (optional), `/events/:id` detail payload.

2. Invite-only exception enforcement (OTP)
   - Extend OTP request/verify schemas to accept optional bypass context:
     - `bypassType: 'track' | 'event'`
     - `bypassId: uuid`
   - When `inviteOnlySignup = true` and user does not exist:
     - Allow OTP if:
       - Item exists, `allow_invite_bypass = true`.
       - Item is public/available:
         - Track: published + booking window configured.
         - Event: not in unpublished track (existing checks already).
     - Otherwise return `INVITE_ONLY`.
   - Keep invite acceptance logic unchanged.

3. Subscription hard block
   - In `/payments/checkout`:
     - If `itemType === 'subscription'` AND invite-only ON -> return `SUBSCRIPTIONS_PAUSED` (403).
   - In `/payments/price-preview`:
     - If `itemType === 'subscription'` AND invite-only ON -> same error.
   - In `/subscriptions/info`:
     - Return `SUBSCRIPTIONS_PAUSED` when invite-only ON (or an empty response with `enabled: false`).

## Frontend Changes
1. Public Settings Hook
   - Add `usePublicSettings()` in `src/app/hooks/useSettings.ts`.
   - Use this everywhere we need invite-only status.

2. Pending Context Utilities
   - Create `src/shared/utils/trackRedirectUtils.ts` similar to event/subscription.
   - Extend `eventRedirectUtils.ts` to store `allowInviteBypass`.
   - Context shape (track/event):
     - `id`, `title`, `redirectUrl`, `timestamp`, `allowInviteBypass`.

3. Signup Guard
   - Update `SignUpGuard`:
     - When invite-only ON:
       - Allow signup if pending event/track context exists and `allowInviteBypass = true`.
       - Otherwise redirect to `/invite-only`.

4. Signup flow to pass bypass to server
   - Update `requestOtp` and `verifyOtp` calls to include bypass context.
   - Source of bypass data:
     - Read pending event/track context in `Step5` and `CheckEmail`.
   - Update auth client payload types.

5. Event Detail (public)
   - If user is guest:
     - If invite-only ON and event not `allowInviteBypass`: go to `/invite-only`.
     - Else store pending event context + redirect to `/signup?source=event&eventId=...`.

6. Track Detail (public)
   - If user is guest:
     - If invite-only ON and track not `allowInviteBypass`: go to `/invite-only`.
     - Else store pending track context + redirect to `/signup?source=track&trackId=...`.
   - On load for logged-in users:
     - If pending track context exists for this track:
       - If paid: auto-open `PaymentCheckoutDialog`.
       - If free: auto-book.
     - Clear pending context afterward.

7. Post-signup redirect
   - Update `getPostSignupRedirectUrl()` order:
     - Subscription (if we keep it; still blocked)
     - Track (-> `/tracks/:id`)
     - Event (-> `/thank-you-event/:id`)
     - Default `/dashboard`

8. Subscription UI Block
   - `/subscribe` and `/dashboard/subscribe`:
     - If invite-only ON -> show "Subscriptions paused" message and block CTA.
   - Hide subscribe CTA in:
     - `Header`
     - `UserProfileDropdown`
     - `SubscriptionStatusBadge` (if present in public context).

9. Admin UI
   - Add toggle to:
     - `AdminEventForm` and `TrackForm`:
       - "Allow invite-only bypass"
       - Description clarifying this is for soft-launch exceptions.

## Important Interface/Type Additions
- DB:
  - `tracks.allow_invite_bypass: boolean`
  - `events.allow_invite_bypass: boolean`
- API:
  - `EventDetailRecord.allow_invite_bypass`
  - `PublicTrackRecord.allow_invite_bypass`
  - `PublicTrackDetailRecord.allow_invite_bypass`
- OTP:
  - `bypassType?: 'track' | 'event'`
  - `bypassId?: string`

## Tests & Scenarios (manual)
1. Invite-only ON, non-bypass event/track
   - Guest clicking "Register/Book" -> redirected to `/invite-only`.
   - `/signup` manually -> blocked.
2. Invite-only ON, bypass event
   - Guest -> signup allowed -> OTP request succeeds -> account created.
   - Redirect to event thank-you flow (existing).
3. Invite-only ON, bypass track
   - Guest -> signup allowed -> OTP request succeeds.
   - Redirect to `/tracks/:id`:
     - Paid track -> payment dialog auto-opens.
     - Free track -> booking auto-runs.
4. OTP abuse
   - Using bypass params for a non-bypass item -> `INVITE_ONLY`.
5. Subscription blocking
   - `/subscribe` and `/dashboard/subscribe` show paused state.
   - `/payments/checkout` with subscription returns `SUBSCRIPTIONS_PAUSED`.

## Assumptions
- We keep "signup before payment" for exception items.
- No pre-auth payment flow is introduced.
- Invite-only exception only for items explicitly toggled.
- All subscription entry points are blocked while invite-only is ON.
