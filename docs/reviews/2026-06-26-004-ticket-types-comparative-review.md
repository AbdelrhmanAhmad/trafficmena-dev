# Ticket Types Comparative Implementation Review

Date: 2026-06-26
Branch reviewed: `feat/ticket-types`
Implementation plan: `docs/plans/2026-06-26-003-feat-ticket-types-merged-plan.md`
Prior AI report compared: `docs/reviews/2026-06-26-003-ticket-types-review.md`
Diff base used: `origin/main` merge base `3fbb1ac592a4a5053da019270a05fb5286b6b97c`
Head reviewed: `fc2a342f2d658d9ca074ecba9e053fb27730906a`

## Verdict

Not ready to merge or ship.

The prior AI report is materially valid. Its P0 free-booking bypass and P1 location URL leakage are real release blockers. I also found additional blockers that the prior report missed:

1. The pending "Request new code" path for ticketed tracks can expire a valid reservation and then fail because the replacement checkout has no ticket type.
2. Auto-linking recordings to paid ticketed tracks still uses the legacy `priceInCents` paid check, so assets on ticketed paid tracks may remain non-premium and bypass the ticket-aware recording matrix.
3. The full repo lint gate fails on generated Drizzle metadata formatting.

Per the repository tool mapping, reviewer perspectives were run sequentially in the main thread rather than as separate subagent tasks.

## Gates

| Gate | Result | Notes |
|---|---:|---|
| `npm run test:unit` | Pass | 298 tests / 84 suites |
| `npm --prefix server run build` | Pass | Server TypeScript compiles |
| `npm run build` | Pass | Frontend builds; only existing Browserslist/chunk warnings |
| `npm run lint` | Fail | Ultracite formatting errors in `server/drizzle/meta/0018_snapshot.json`, `server/drizzle/meta/0019_snapshot.json`, `server/drizzle/meta/_journal.json` |

## Findings

### P0 - Paid ticketed tracks can be booked for free through the legacy free-book endpoint

Status versus prior report: valid, highest-severity blocker.

The implementation added ticket-variant pricing, but `POST /api/tracks/:id/book` still decides whether a track is paid using only `tracks.priceInCents`. The route selects `priceInCents` but not the three ticket price columns at `server/src/routes/api/tracks.ts:1501-1511`, rejects only `priceInCents > 0` at `server/src/routes/api/tracks.ts:1521-1527`, and then calls `executeTrackBookingWrite` without a `ticketType` at `server/src/routes/api/tracks.ts:1558-1568`.

For a ticketed paid track where legacy `priceInCents` is null or zero, any authenticated user can hit the old free booking path and receive a legacy all-session booking. The frontend still contains an automatic free-book path based on `price_in_cents` at `src/pages/ThankYouTrack.tsx:50-57`, so this is not only theoretical.

Impact: direct revenue bypass, incorrect track bookings, incorrect live attendance entitlements, and capacity consumed by unpaid users.

Required fix: select ticket prices in the free-book route and treat any configured ticket type as paid unless the selected variant is genuinely free and processed through the ticket-aware checkout path. For ticketed tracks, either reject `/book` with `PAYMENT_REQUIRED` or require and validate a `ticketType`.

### P1 - Authenticated track list/detail endpoints leak `locationUrl`

Status versus prior report: valid.

The public track detail route gates the track-level map/location URL with `bookingGrantsLiveAttendance(bookingTicketType, 'offline')` or staff status at `server/src/routes/api/tracks.ts:579-583`. The authenticated manager/user routes do not apply the same rule:

- `GET /api/tracks` selects `tracks.locationUrl` at `server/src/routes/api/tracks.ts:648-651` and returns it directly in the mapped item at `server/src/routes/api/tracks.ts:678-681`.
- `GET /api/tracks/:id` selects `tracks.locationUrl` at `server/src/routes/api/tracks.ts:720-725`, checks only publication visibility at `server/src/routes/api/tracks.ts:735-737`, and returns the whole `track` object at `server/src/routes/api/tracks.ts:812-822`.

Impact: any authenticated user can see offline-day venue/map URLs even when they are online-only, offline-only-not-booked, or completely unbooked. That violates the ticket entitlement matrix and leaks sensitive in-person logistics.

Required fix: centralize a serializer for track location fields and apply the same staff/offline-entitlement gate to public, authenticated list, and authenticated detail responses. For list responses, either always null `locationUrl` for non-staff or join the current user's booking ticket type before exposing it.

### P1 - Pending "Request new code" can destroy the existing reservation before rejecting the replacement

Status versus prior report: missed by prior report; related to its pending-ticket-switch finding but more directly reproducible.

The public track detail route records that a pending payment exists but returns only the pending payment id and invoice id. It does not return the pending payment's `ticketType` at `server/src/routes/api/tracks.ts:506-521` and `server/src/routes/api/tracks.ts:551-583`.

On the frontend, the ticket selector is rendered only when `usesTicketTypes && bookingState === 'available'` at `src/features/tracks/pages/TrackDetail.tsx:411-419`. When the user is in `pending` state, `handleRequestNewCode` only opens the checkout dialog at `src/features/tracks/pages/TrackDetail.tsx:346-348`, and the dialog receives `ticketType={selectedTicketType ?? undefined}` at `src/features/tracks/pages/TrackDetail.tsx:664-672`.

For a pending ticketed track, `selectedTicketType` can be null because the selector is hidden and the server did not send the pending ticket type back. The checkout request then reaches the payment route without a ticket type. The route expires existing pending payments and deletes reservations at `server/src/routes/api/payments.ts:1267-1280`, then calls `calculatePrice` at `server/src/routes/api/payments.ts:1284-1288`. `calculatePrice` rejects ticketed tracks without a ticket type with `TICKET_TYPE_REQUIRED` at `server/src/routes/api/payments.ts:467-475`.

Impact: a normal user can click "Request new code" and lose the currently held seat/invoice. The replacement request fails, so the user ends up with no reservation and no new code.

Required fix: return the pending payment ticket type from track detail and preselect it in the pending state, or render a selector before allowing a new code. More importantly, validate the replacement request and price before expiring the existing pending payment. Expire old payment plus create new hold in one atomic path, or preserve the old hold on validation/gateway failure.

### P1 - The migration safety gate from the plan was not implemented

Status versus prior report: valid.

The plan explicitly requires a characterization test, snapshot, diff report, human signoff, and only then swapping six call sites to `event_format` (`docs/plans/2026-06-26-003-feat-ticket-types-merged-plan.md:81-86`). Rollout notes repeat the requirement to run the diff report and get signoff before production migration (`docs/plans/2026-06-26-003-feat-ticket-types-merged-plan.md:460-464`).

The migration `server/drizzle/0018_fast_sleepwalker.sql` immediately creates `event_format`, defaults existing rows to offline, promotes selected rows to online, and clears literal `online`/`offline` location text at lines `1-19`. I did not find a migration wrapper, preflight report, stored output artifact, or signoff gate in the repo workflow. The call sites have already moved to `event_format`.

Impact: subscriber pricing, ticket availability, live attendance, recording entitlement, and event visibility can all silently change for any row whose old inference differs from the new backfill.

Required fix: add a staging/prod preflight report script or SQL, capture the row-level delta, and require explicit human approval before running the production migration. Do not treat this as a pure code-only migration.

### P1 - Lint gate fails on new Drizzle metadata

Status versus prior report: missed by prior report.

`npm run lint` fails with 3 Ultracite formatter errors:

- `server/drizzle/meta/0018_snapshot.json`
- `server/drizzle/meta/0019_snapshot.json`
- `server/drizzle/meta/_journal.json`

The failures are formatting-only, mostly single-element array layout and a missing final newline, but they still mean the repository's required quality gate is red.

Impact: branch is not CI-ready and should not be merged until the repo gate is green.

Required fix: format the Drizzle metadata files with the repo formatter or regenerate them in the expected format.

### P2 - Ticket coverage validation only runs on first publish

Status versus prior report: valid.

The track update route validates ticket coverage only inside `if (mergedIsPublished && !currentTrack.isPublished)` at `server/src/routes/api/tracks.ts:1050-1100`. Once a track is already published, a manager can enable or change ticket prices in a way that sells a ticket type whose required event format is absent.

Impact: published tracks can become internally inconsistent after initial publish. Examples: selling `offline_only` on a track with only online sessions, or selling `online_only` after all online sessions have been removed/changed.

Required fix: run `ticketEventCoverageError` whenever the merged track is published and ticket prices or track events/formats have changed, not only during the unpublished-to-published transition.

### P2 - Changing `eventFormat` can mutate sold entitlements

Status versus prior report: valid.

The event update route assigns `updates.eventFormat` directly at `server/src/routes/api/events.ts:606-620`. There is no guard for events that are already part of ticketed tracks with bookings, pending reservations, or sold payments.

Impact: flipping a session from online to offline, or offline to online, changes who gets live access and who gets recordings under the ticket matrix. That can over-grant, revoke purchased access, or expose location/meeting links unexpectedly.

Required fix: block event format changes for events in booked ticketed tracks, or require an explicit admin-only migration workflow that reports affected bookings/payments before applying the change.

### P2 - Auto-linked recordings on paid ticketed tracks can remain non-premium

Status versus prior report: missed by prior report.

When adding events to a track, the route determines whether event assets should be marked premium using only legacy `priceInCents`. It selects `priceInCents` at `server/src/routes/api/tracks.ts:1223-1229`, computes `trackIsPaid = isPaidTrack(track.priceInCents)` at `server/src/routes/api/tracks.ts:1236`, and only marks linked assets premium if that legacy check is true at `server/src/routes/api/tracks.ts:1336-1340`.

Ticketed tracks can be paid entirely through `onlineOnlyPriceCents`, `onlineOfflinePriceCents`, and `offlineOnlyPriceCents`, while `priceInCents` remains null. In that case, auto-linked event recordings stay non-premium.

Impact: the library route only applies ticket-aware `bookedAssetIds` access to premium assets. Non-premium event assets fall back to `item.isPublic || !item.eventId || registeredEventIds.has(item.eventId)` in list access at `server/src/routes/api/library.ts:281-287` and the detail route withholds content for non-registered users at `server/src/routes/api/library.ts:459-466`. This bypasses the planned ticket recording matrix in both directions: public non-premium assets can leak, while private non-premium assets can be denied to legitimate track buyers.

Required fix: use a ticket-aware paid-track helper for auto-premium marking. Any track with at least one enabled paid ticket type should be treated as paid for linked event assets.

### P2 - Paid fulfillment recovery can leave charged users without a booking if capacity is full

Status versus prior report: valid risk.

The prior report's `EVENT_FULL` recovery concern is valid as a system-state risk: payment confirmation and booking fulfillment are not equivalent states. If a gateway-confirmed payment reaches fulfillment after included live capacity is unavailable, the implementation can fail the booking write without an obvious refund/dead-letter/remediation path surfaced to operators.

Impact: user may be charged without a corresponding booking or event attendance rows. This is a high-trust payments failure mode even if it is rare.

Required fix: introduce an explicit reconciliation state for paid-but-unfulfilled payments, operator alerting, and a deterministic refund/remediation runbook. Tests should simulate stale reservations and capacity exhaustion after gateway payment.

### P2 - Checkout capacity logic duplicates the ticket live-inclusion predicate inline

Status versus prior report: valid, lower than the direct blockers.

The payment hold path reconstructs the inclusion predicate with `liveIncludedFormats(ticketType)` and an inline `isLiveIncluded` function at `server/src/routes/api/payments.ts:1591-1595`. Other fulfillment paths use centralized helpers such as `filterLiveIncludedEvents`.

Impact: the current behavior appears aligned today, but it creates two sources of truth for the entitlement matrix. Future changes to ticket rules can drift between reservation capacity, attendance fulfillment, and access checks.

Required fix: reuse the canonical helper in both hold and fulfillment paths and cover it with behavior tests.

### P2 - Tests do not exercise the critical route/database invariants

Status versus prior report: valid.

The test suite includes useful pure helper coverage, but many critical assertions are source-string checks rather than behavioral tests. Examples are `readFile` and `source.includes` assertions in `tests/unit/event-ticket-access.test.ts` and `tests/unit/library-ticket-access.test.ts`.

Impact: tests can pass while the runtime remains vulnerable to the P0 free-book bypass, location URL leaks, pending-code hold deletion, event format mutation, or non-premium ticketed recordings.

Required fix: add route-level or repository-level tests around:

- Ticketed track cannot be booked through `/tracks/:id/book`.
- `locationUrl` is null for non-staff/non-offline-entitled users on every track endpoint.
- Force-new-code validates replacement ticket type before expiring the existing pending payment.
- Paid ticketed tracks mark auto-linked event assets premium.
- Published tracks cannot enable uncovered ticket variants.

### P3 - Track ticket selector bypasses the local component primitive expectation

Status versus prior report: valid but lower severity than payment/access defects.

`TrackTicketSelector` implements a manual ARIA radiogroup with button radios and a Biome ignore at `src/features/tracks/components/TrackTicketSelector.tsx:22-39`. The project standard prefers Shadcn/Radix primitives when available.

Impact: not a release blocker by itself, but it adds accessibility and maintenance risk in a purchase-critical selector.

Required fix: use the existing Shadcn/Radix radio group primitive and keep the card styling as presentation.

### P3 - Plan/code drift remains around the "neither link nor location" default

Status versus prior report: valid, but code may be safer than the plan text.

The plan table says rows with neither meeting link nor location should default to online at `docs/plans/2026-06-26-003-feat-ticket-types-merged-plan.md:71-77`. The migration defaults rows to offline at `server/drizzle/0018_fast_sleepwalker.sql:1-5`.

Impact: implementation and plan disagree. The code's conservative offline default may be safer operationally, but the drift needs an explicit product/data decision because it affects subscriber pricing and ticket eligibility.

Required fix: update the plan/decision record or adjust the migration, after inspecting real production rows through the required diff report.

### P3 - Low-priority cleanup findings from prior report are mostly valid

Status versus prior report: valid but not release-defining compared with the P0/P1/P2 issues.

The prior report's low-priority notes are credible:

- Free checkout can create duplicate zero-value paid rows under retry/concurrency.
- `viewerTicketType` is returned but appears unused by clients.
- Ticket type literals are repeated in a few places instead of fully centralized.
- Idempotency waiter behavior lacks an obvious timeout.

These should be tracked after the release blockers are fixed, or pulled forward if a touched area is already being changed.

## Comparison With The Prior AI Report

| Prior finding | My assessment | Notes |
|---|---|---|
| P0 free `/tracks/:id/book` bypass | Valid | Confirmed as the top blocker. |
| P1 authenticated `locationUrl` leak | Valid | Confirmed on both list and detail endpoints. |
| P1 migration diff/signoff missing | Valid | Confirmed against plan lines and migration implementation. |
| P2 coverage guard only first publish | Valid | Confirmed in update route. |
| P2 `event_format` flip mutates sold access | Valid | Confirmed in event update route. |
| P2 pending type switch expires reservation before replacement | Valid, but incomplete | Prior framing was right; the stronger user-visible path is pending "Request new code" with missing ticket type. |
| P2 paid recovery `EVENT_FULL` no remediation | Valid risk | Needs a reconciliation/remediation state. |
| P2 duplicated live-included predicate | Valid | Lower direct severity than blockers, but should be centralized. |
| P2 DB-level test gap | Valid | Route/database tests are missing for the riskiest paths. |
| P2 manual ARIA selector | Valid, likely P3 | Standards/accessibility issue, not equal to payment/access defects. |
| P2 source-string tests | Valid, likely P2/P3 | Important because the runtime bugs escaped tests. |
| P3 plan prose drift | Valid | Code chose offline, plan says online. Needs decision. |
| P3 duplicate zero-dollar payments | Valid | Low operational severity unless analytics/accounting depends on uniqueness. |
| P3 dead `viewerTicketType` | Valid | Cleanup. |
| P3 repeated ticket enum | Valid | Cleanup. |
| P3 idempotency waiter no timeout | Valid | Reliability hardening. |

## What The Prior Report Missed

1. Pending ticketed-track retries can destroy a valid reservation and then fail with `TICKET_TYPE_REQUIRED`.
2. Auto-linked event recordings for paid ticketed tracks still use legacy `priceInCents`, so paid ticketed assets can remain non-premium and bypass the ticket-aware recording access model.
3. `npm run lint` fails on Drizzle metadata formatting.

## What I Would Prioritize

1. Close the P0 free-book route bypass and add a regression test.
2. Apply one canonical track serializer for `locationUrl` across public/authenticated endpoints and add regression tests.
3. Fix pending replacement checkout ordering so old holds are not expired before the new request is valid and durable.
4. Implement the migration diff/signoff gate before any production migration.
5. Fix lint formatting.
6. Add behavioral tests for published ticket coverage, event format mutations, and auto-premium recording linking.
