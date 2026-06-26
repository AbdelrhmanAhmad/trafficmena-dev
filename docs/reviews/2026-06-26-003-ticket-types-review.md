# Code Review — feat: Hybrid ticket types for tracks

- **Branch:** `feat/ticket-types` (base `main`, merge-base `3fbb1ac`, HEAD `fc2a342`)
- **Plan:** `docs/plans/2026-06-26-003-feat-ticket-types-merged-plan.md` (explicit; R1–R10, U1–U9)
- **Scope:** 59 files, +10,549/−221 (≈3.9k of that is auto-gen Drizzle snapshots)
- **Review:** multi-agent (14 reviewers) + orchestrator direct verification of all P0/P1
- **Date:** 2026-06-26
- **Verdict:** **Not ready to merge** — 1 P0 + 2 P1 must be resolved (2 code, 1 release-gate).

## Gates (all green)

| Gate | Result |
|------|--------|
| `npm run test:unit` | 298 pass / 0 fail / 84 suites |
| `npm --prefix server run build` (tsc) | clean |
| `npm run build` (frontend) | clean |

The feature core is solid: the entitlement matrix is genuinely centralized in `ticketAccess.ts`, the money path reads `ticket_type` from the stored `payments` row (no client trust), capacity is filtered to live-included formats at both the 72h hold and fulfillment under `FOR UPDATE` locks, and webhook+verify double-fulfillment is prevented. The problems are specific holes around the edges, not the core.

## P0 — Critical

| # | File | Issue | Reviewer | Confidence |
|---|------|-------|----------|------------|
| 1 | `server/src/routes/api/tracks.ts:1521` | Free-book endpoint bypasses ticket-type enforcement and payment | api-contract + orchestrator-verified | 90 |

- **#1** — `POST /tracks/:id/book` guards only on `track.priceInCents > 0`. `tracks.price_in_cents` has no default (null) and the admin form keeps the legacy price field separate from ticket prices (plan U8: "publish without touching legacy priceInCents"), so a ticketed track normally has `priceInCents = null`. The guard is then false → the handler books the buyer for free via `executeTrackBookingWrite` **with no `ticketType`** → `filterLiveIncludedEvents(rows, undefined)` returns *all* sessions and `track_bookings.ticket_type = null` = legacy full access. Net: any authenticated user gets full all-session access (Zoom + location + recordings) to a paid track for free, and consumes offline seats — bypassing payment, ticket selection (R3), capacity-by-type (R4), and back-compat intent (R10). Directly reachable; the server endpoint doesn't depend on the UI. **Fix:** in the `/book` handler, SELECT the three price columns and `if (hasTicketTypes(track)) throw PAYMENT_REQUIRED` (the free path can't carry a ticketType). Mirror the guard in `ThankYouTrack.tsx` auto-book.

## P1 — High

| # | File | Issue | Reviewer | Confidence |
|---|------|-------|----------|------------|
| 2 | `server/src/routes/api/tracks.ts:812` | Authenticated `GET /tracks/:id` leaks gated track-level `locationUrl` to any logged-in user | security + orchestrator-verified | 100 |
| 3 | `server/drizzle/0018_fast_sleepwalker.sql` | Plan-mandated pre-migration diff-report + sign-off gate is absent; pricing-flipping backfill applies unconditionally; `location` clear is irreversible | data-migration + deployment + adversarial | 100 |

- **#2** — `/tracks/:id/public` correctly gates `locationUrl` to offline-entitled buyers + staff (`tracks.ts:579-583`), but the authenticated sibling `GET /tracks/:id` does `return c.json({ ...track })` at `:812-813`, spreading `track.locationUrl` ungated. The route is not staff-only (`if (!isStaff && !track.isPublished)` at `:736`), so any authenticated user reading a published track gets the offline venue map URL the feature (KTD-6) intends to restrict. Pre-existing on `main`, but in-scope: this feature gated the public path and missed its authenticated twin. **Fix:** resolve the viewer's active-booking `ticketType` in the lookup at `:799-808`, then `locationUrl: (userHasBooked && bookingGrantsLiveAttendance(bookingTicketType,'offline')) || isStaff ? track.locationUrl : null`. Keep the location *text* public. (The `GET /tracks` list at `:651` shares the leak — fix together.)
- **#3** — The plan (lines 81–88) requires a diff report of rows where new `event_format` ≠ the old `meetingLink && !location` inference, plus human sign-off, **before** applying `0018` — because those rows' subscriber pricing changes (online → free). That gate exists only as `legacyOnlineInference` in `eventFormat.ts`, imported solely by a unit test. `db:migrate` is bare `drizzle-kit migrate`; the six pricing call sites are *already* swapped to read `event_format`, so the migration flips pricing the instant it runs. Additionally, `0018` clears `events.location` for literal `'online'/'offline'` text with no snapshot and no down-migration (irreversible). **This is a release-gate blocker, not a code change:** run the diff-report SQL + a `location` snapshot + a backup, get sign-off, then migrate. See the deployment checklist in the run artifacts.

## P2 — Moderate

| # | File | Issue | Reviewer | Confidence |
|---|------|-------|----------|------------|
| 4 | `server/src/routes/api/tracks.ts:1051` | Ticket/event coverage guard runs only on the publish transition | adversarial + orchestrator-verified | 90 |
| 5 | `server/src/routes/api/events.ts` (update handler) | Admin `event_format` flip silently strips entitlement from existing paid holders | adversarial | 85 |
| 6 | `server/src/routes/api/payments.ts:1267` | Pending ticket-type switch releases reservations + expires old payment outside the new-payment tx (gateway call between) | reliability + adversarial | 75 |
| 7 | `server/src/routes/api/payments.ts:786` | `EVENT_FULL` during expired-recovery after charge → buyer charged, no booking, no refund/alert | reliability + adversarial | 75 |
| 8 | `server/src/routes/api/payments.ts:1593` | Checkout reservation filtering re-implements the live-included predicate inline instead of the tested `filterLiveIncludedEvents` | testing + maintainability | 75 |
| 9 | `server/src/routes/api/trackBookingShared.ts:112` | Core capacity/access SQL paths unverified end-to-end (AE1–3/AE7/AE9 only at pure-helper or source-string level) | testing | 75 |
| 10 | `src/features/tracks/components/TrackTicketSelector.tsx:23` | Hand-rolled ARIA radiogroup (with biome a11y suppression) instead of Shadcn `RadioGroup` | project-standards | 75 |
| 11 | `tests/unit/event-ticket-access.test.ts:35` | ~6 tests assert implementation source strings (`readFile`+`includes`) — false-pass on regressions, false-fail on refactor | testing | 75 |

- **#4** — `if (mergedIsPublished && !currentTrack.isPublished)` gates `ticketEventCoverageError`, so it only fires on first publish. Enabling a ticket type or changing prices via PUT on an already-published track, or flipping an event's `event_format`, skips coverage validation → you can sell e.g. an offline ticket on a track with no offline session (zero entitlement for a paying buyer). **Fix:** run coverage on every published-track update, and re-validate when a track-event's format changes.
- **#5** — Editing an event's `event_format` after bookings exist re-partitions `liveIncludedFormats`; an `online_offline`/`offline_only` holder of a now-flipped session silently loses (or gains) live access with no migration of their attendee rows. **Fix:** block or warn-confirm `event_format` changes on events belonging to a track with active bookings/enabled ticket types (mirror the `TRACK_HAS_BOOKINGS` guard at `tracks.ts:1385`).
- **#6** — Variant switch expires the old pending payment and `DELETE`s its reservations in standalone statements, then makes the gateway call, then opens the new-payment tx. A slow/failed gateway leaves the buyer with neither the held seats nor a replacement invoice. No oversell (constraints hold), but a degraded UX path the feature now triggers automatically on any type change. **Fix:** fold the expire+cleanup into the replacement transaction, or re-create the hold on the catch path.
- **#7** — When a gateway-paid track payment is recovered but fulfillment hits `EVENT_FULL`, the payment stays `expired` with no booking, no refund trigger, only `console.error`. Per-format capacity makes this more reachable (an offline session can fill while an `online_offline` buyer is mid-flight). **Fix:** dead-letter/alert when `fawaterkPaid=true` but `status!=='paid'` so ops can refund or grant a seat.
- **#8** — `payments.ts:1593-1595` & `:1719-1720` use an inline `includedFormats/isLiveIncluded` predicate; fulfillment uses the tested `filterLiveIncludedEvents`. Two implementations of the same KTD-10 invariant — the checkout one is untested and can drift. Plan U3 claims "no matrix duplicated inline." **Fix:** call `filterLiveIncludedEvents` in the hold path too.
- **#9** — The capacity invariant ("online_only never consumes an offline seat") is asserted only against the pure helper; the reservation/attendee SQL and the locked-asset URL nulling run only against a live Postgres the unit harness doesn't start. Consistent with the repo's existing route-test boundary, but AE1–AE3/AE7/AE9 are not proven at the DB level. **Fix:** extract a pure seat-selection/`applyRecordingAccess` mapper and value-test it, or add a tx-stub route test.
- **#10** — `PaymentMethodSelector` already uses Shadcn `RadioGroup`; `TrackTicketSelector` reinvents it with manual `role`/`aria-checked` + a biome-ignore. **Fix:** use `RadioGroup`/`RadioGroupItem`, keeping the brand styling.
- **#11** — Tests like `source.includes('viewerTicketType: bookingTicketType')` prove text exists, not that the gate denies an offline_only viewer. **Fix:** assert behavior on extracted pure resolvers; keep at most one grep guard for the "no duplicate matrix" invariant.

## P3 — Low (selected)

| # | File | Issue | Reviewer | Confidence |
|---|------|-------|----------|------------|
| 12 | `server/src/utils/eventFormat.ts:56` | Plan prose drift: plan table (L77/L248) says neither-case → `online`; code/SQL/test correctly use the safe `offline`. Fix the **doc**, not the code | correctness + several | 100 |
| 13 | `server/src/routes/api/payments.ts:1297` | Free path has no unique-pending guard → concurrent free-variant checkouts can create duplicate $0 payment rows | adversarial | 80 |
| 14 | `server/src/routes/api/events.ts:396` | `viewerTicketType` returned but no client consumer (dead wire field) | maintainability + api-contract | 75 |
| 15 | `server/src/routes/api/tracks.ts:852` | Ticket-type enum list re-typed inline in 5 backend sites despite exported `TICKET_TYPES` | maintainability | 100 |
| 16 | `server/src/routes/api/payments.ts:1201` | Checkout in-flight idempotency waiter has no timeout | reliability | 75 |

## Requirements completeness (explicit plan)

All units U1–U9 are implemented in code; no unit is missing. Requirements compromised by the findings above:

- **R3** (must select a type, no default) — bypassed by **#1** (free-book path).
- **R4** (ticket controls live attendance + capacity at hold and fulfillment) — solid on the paid checkout path; undermined operationally by **#1** and **#4**.
- **R5** (split Zoom vs location visibility) — leaked by **#2** on `GET /tracks/:id`.
- **R10** (no breakage for legacy/un-configured tracks) — the free-book collision (**#1**) is a legacy-vs-ticketed back-compat defect.

R1, R2, R6, R7, R8, R9 are met.

## Pre-existing (do not count toward verdict, but in-scope)

- **#2** locationUrl leak predates the branch but the feature's stated goal (KTD-6) makes it in-scope.
- **#6, #7, #16** are pre-existing payment patterns the feature now triggers more often (per-format capacity, automatic variant-switch).

## Learnings (institutional knowledge that applies)

- `docs/solutions/payment-gateway/payment-gateway-compound-knowledge.md` & `payment-gateway-lessons-learned.md` — finding #007 ("free track booking bypasses capacity → unify paid+free atomic path") is essentially the same class as **#1** here; the free-book path re-opened a divergent free flow.
- `docs/runbooks/subscriptions-0013-migration-audit.md` & `track-enrollment-0015-migration.md` — both prescribe "preflight SQL in the PR + sign-off" for entitlement/pricing backfills; directly governs **#3**.
- `docs/solutions/feature-implementations/location-url-access-control.md` — documents why `locationUrl` was fused with the meeting gate; relevant to **#2**.
- Auto-memory `project_drizzle_migration_drift.md` — local `db:migrate` re-applying a migration after merge-formatting; heed when this branch's `0018/0019` merge to `main`. Not in `docs/` — worth capturing.

## Coverage

- Reviewers: correctness, security, adversarial, testing, maintainability, project-standards, performance, api-contract, data-migration, reliability, kieran-typescript, agent-native, learnings, deployment-verification (14).
- Performance: no findings (access reads are batched joins, filters pushed to SQL, no N+1). Agent-native: 7/7 capabilities have API parity, no gaps.
- All P0/P1 independently verified by the orchestrator against source.
- Testing gaps (DB-level AE assertions, idempotency/pending-switch/promo-on-variant, free-path persistence) detailed in `testing.json`.
- Artifacts: `/tmp/compound-engineering/js-ce-review/20260626-053010-ticket-types/`

## Suggested fix order

1. **#1** (P0) — add `hasTicketTypes` guard to `/tracks/:id/book` + `ThankYouTrack` (test-first per project rule).
2. **#2** (P1) — gate `locationUrl` on `GET /tracks/:id` (+ list).
3. **#3** (P1) — run diff-report + `location` snapshot + backup + sign-off before the prod migration.
4. **#4, #5** (P2) — continuous coverage validation + guard `event_format` edits on booked tracks.
5. **#8** (P2) — dedupe the live-included predicate (quick, safe).
6. Remaining P2/P3 at discretion.
