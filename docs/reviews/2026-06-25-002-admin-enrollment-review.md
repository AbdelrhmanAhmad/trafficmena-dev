# Implementation Review — Plan 2026-06-25-002 (Six Admin / Platform Improvements)

**Date:** 2026-06-25
**Plan:** `docs/plans/2026-06-25-002-feat-admin-enrollment-and-platform-fixes-plan.md`
**Base:** `main` @ `078a606`
**Branches reviewed (all local, not pushed):**

| Phase | Branch | Tip | Units |
|---|---|---|---|
| A | `feat/phase-a-series-enrollment` | `b3d305e` | U1, U2, U3, U4 |
| B | `feat/phase-b-timezone` | `976ee0f` | U5 |
| C | `feat/phase-c-email-change` | `cce4ce0` | U6, U7 |
| D | `feat/phase-d-event-drafts` | `d176a11` | U8, U9 |
| E | `feat/phase-e-phone` | `bf9b4ce` | U10, U11 |

**Method:** Static review of each branch against `main` via `git diff`/`git show` (no branch switching), **plus** every gate actually executed on each branch (checked out, then returned to `main`), **plus** a `git merge-tree` cross-branch conflict analysis, **plus** a five-agent parallel deep-dive (one per branch) as an independent second pass. Findings are root-caused and verified against the real code before inclusion; each fix *strengthens* the implementation rather than weakening it.

> **Note on a second file in this folder.** `docs/reviews/2026-06-25-002-admin-enrollment-platform-fixes-implementation-review.md` already existed when I started writing (created during this session; not by me — it states it did not run the gates). It is accurate and its findings independently corroborate this review. **This document is the consolidated superset** — it absorbs and verifies those findings, adds the empirical gate results, the migration-collision mechanics, and a deeper Phase C security pass. You can safely delete the other file; I left it in place rather than touch an artifact I didn't author.

---

## 1. Executive Verdict

**The implementation quality is high and faithful to the (revised) plan.** Every branch builds, type-checks, lints clean, and its unit tests pass. The hardest, highest-risk pieces — the Cairo save converter, the custom email-change OTP crypto, and the byte-for-byte track-query extraction — are correct on close inspection. The plan's own course-corrections (custom OTP over unavailable Better Auth `changeEmail`; automatic IANA offset over a manual DST toggle) were honored exactly.

**It is not ready to merge as a combined plan** without addressing two classes of issue:

1. **Cross-branch integration** — the five branches were cut in parallel off the same `main`, so they collide on merge. Two phases (**C** and **D**) both generated Drizzle migration **`0016`**, and three files conflict (`AdminEventForm.tsx`, `Dashboard.tsx`, plus the migration metadata). One of those conflicts (B×D) can silently undo the timezone fix if resolved carelessly. None of this is a defect *within* a branch — it's a merge-sequencing problem the plan did not pre-empt.
2. **A small set of real, root-caused defects** — most notably **draft events remain registerable/payable through the action endpoints** (Phase D gates reads but not writes), and three Phase A/E correctness gaps (series search ignores `reference`, the enrolled list goes stale after revoke, and the profile can persist invalid Egyptian numbers).

**Severity tally (this review):** P0 = 0 · P1 = 2 · P2 = 9 · P3 = 16. (Two findings sit a notch below an agent's rating: the Phase D agent rated **D-1** P0 and the Phase C agent rated **C-2** P1 — I hold them at P1/P2 for the reasons given in each entry. Both are still must-/should-fix before merge.)

### Empirical gate results (run per branch)

| Branch | `test:unit` | server `tsc` build | `lint` (changed files) | frontend `vite build` |
|---|---|---|---|---|
| phase-a | ✅ 143 pass | ✅ | ✅ | ✅ |
| phase-b | ✅ 136 pass | n/a (no server) | ✅ | ✅ |
| phase-c | ✅ 135 pass | ✅ | ✅ | ✅ |
| phase-d | ✅ 134 pass | ✅ | ✅ | ✅ |
| phase-e | ✅ 144 pass | ✅ | ✅ | ✅ |

All green. (Caveat: `npm run build` is `vite build` with **no type-check**; the frontend has no `tsc` gate, so frontend type errors are caught only by review + lint. That is a pre-existing project property, not introduced here.)

---

## 2. Cross-Branch Integration (read this first)

`git merge-tree` (real 3-way merge, no working-tree change) against `main` as the common base:

| Pair | Result | Conflicting paths |
|---|---|---|
| **C × D** | ❌ conflict | `server/drizzle/meta/0016_snapshot.json` (add/add), `server/drizzle/meta/_journal.json` (content) |
| **C × E** | ❌ conflict | `src/pages/Dashboard.tsx` |
| **B × D** | ❌ conflict | `src/features/events/components/AdminEventForm.tsx` |
| A × D, A × B, A × C | ✅ clean | — (different regions of `events.ts` auto-merge) |

### INT-1 — [P1] Duplicate Drizzle migration `0016` (C and D)

`main` tops out at journal **idx 15** (`0015_steady_sabra`). Both branches independently ran `db:gen` off `main`, so **both took idx 16**:

- Phase C → `0016_tidy_nova.sql` (creates `email_change_requests`)
- Phase D → `0016_tan_owl.sql` (adds `events.is_published`)

Each also wrote its own `meta/0016_snapshot.json` (add/add conflict) and appended an `idx:16` entry to `_journal.json` (content conflict).

**Root cause:** parallel branches each generated "the next migration" against the same base. **Resolving the text conflict is not enough** — Drizzle snapshots are *cumulative full-schema states*, and two `idx 16` entries break `drizzle-kit migrate`.

**Fix (does not weaken anything):** pick a merge order; after the first of C/D lands, **regenerate the second's migration** so it becomes `0017` and its snapshot includes *both* schema changes:
```bash
# after C is merged, on the D integration branch:
rm server/drizzle/0016_tan_owl.sql            # discard the colliding 0016
# revert its _journal.json + 0016_snapshot.json edits to C's version
npm --prefix server run db:gen                # regenerate -> 0017_*, snapshot built on C's state
npm --prefix server run db:migrate            # verify it applies cleanly on top of 0016
```
Never hand-merge the snapshot JSON.

### INT-2 — [P1 trap] `AdminEventForm.tsx` merge can silently revert the timezone fix (B × D)

- **B** swaps the import to `cairoLocalToUtcIso` and rewrites the submit line (`AdminEventForm.tsx:226`) to `date: cairoLocalToUtcIso(formValues.date)`.
- **D** (cut from `main`) still imports/uses the old `getCairoOffsetString()` and adds `isPublished` + the `Switch` + the draft toast in overlapping regions.

A careless resolution that keeps D's side of the submit block **reintroduces the exact device-offset corruption Phase B fixed**. Mitigating factor: because B *deletes* `getCairoOffsetString` from `dateUtils.ts`, a wrong resolution fails the build (unresolved import) rather than shipping silently — but the integrator must consciously keep **both** B's converter call **and** D's publish toggle/toast.

### INT-3 — [P2] `Dashboard.tsx` merge must retain both profile features (C × E)

- **C** replaces the email field with `<ChangeEmailFlow>` and removes `emailId`.
- **E** replaces the phone field with `<PhoneNumberField>` and removes `phoneId`.

Distinct UI elements, but adjacent import/`useId`/JSX regions conflict. Correct resolution keeps **both** components and removes **both** stale `useId` declarations. No correctness regression, but easy to drop one feature.

### INT-4 — [P3] Verify additive `events.ts` survive the (clean) A × D merge

`server/src/routes/api/events.ts` and `src/app/api/events.ts` auto-merge, but A adds `amountPaidCents` (attendees route/types) and D adds `isPublished` (list/detail/create/update + `ApiEvent`/`EventRecord`). After merging, sanity-check that both additive fields are present in the merged serializers/types.

### Recommended merge order
`A → B → (C or D) → the other of (C/D, regenerated as 0017) → E`, verifying gates after each. A is independent and clean; B before D so the timezone intent is the baseline when resolving INT-2; C/D ordering is arbitrary but the **second one must regenerate its migration**; E last (only conflicts with C, in `Dashboard.tsx`).

---

## 3. Per-Phase Review

### Phase A — Series enrollment parity + amount paid (R1, R2)

**Conformance**

| Unit / KTD | Status | Evidence |
|---|---|---|
| U1 shared helper + amounts, **track route byte-for-byte** | ✅ MET | `attendeesQuery.ts` holds the `source`/`reference` CASE **verbatim** + identical field order; only `amountPaidCents` appended; `tracks.ts:843+` calls the helper then the same `.orderBy/.limit/.offset`; `count` unchanged |
| U2 `GET /series/:id/attendees` union + `grantId` | ✅ MET | `seriesGrants.ts` route + pure `mergeSeriesAttendees` (`seriesAttendees.ts:81`); dedupe by `userId`, booking wins (`:90-97`); `trackId=null` → grants only |
| U3 frontend parity, revoke only on grants | ✅ MET (see A-2) | `SeriesAttendeesList.tsx`; revoke gated on `grantId`; standalone grants table removed. *Plan text said `DELETE …/grants/:grantId`; the real endpoint is `POST …/grants/:userId/revoke` and the hook calls the correct one — plan-doc error, no code change.* |
| U4 Amount Paid column + contract | ✅ MET | `formatAmountPaid`: `0→"Free"`, `null→"—"`, positive→EGP |
| KTD-1 read-time union (not materialized) | ✅ MET | no grant rows written on purchase |
| KTD-2 amounts staff-only | ✅ MET | `amountPaidCents` appears only in manager-gated attendee routes + the admin manual-enrollment input — **never** on a public payload (grep-verified) |

**Done well:** The byte-for-byte extraction is genuinely byte-for-byte — I diffed the removed block against the helper and only `amountPaidCents` is new. Dependency injection (`database` param + type-only `db` import) keeps the SQL importable in pure tests. `mergeSeriesAttendees` is a clean, testable pure function. The `grantId` discriminator (not `source === 'manual'`, which manual *track* bookings also carry) is the correct revoke gate.

**Findings**

- **A-1 — [P2] Series search silently ignores the `reference` column.** `seriesAttendees.ts:60-74` (`matchesSearch`) builds its haystack from name/firstName/lastName/email/phone/invoiceNumber/invoiceId — but **omits `row.reference`**, even though `SeriesAttendeesList.tsx:141` advertises "…or reference" and renders a Reference column (`:167`), and the track attendees route *does* search references. *Root cause:* missing field in the haystack array. *Fix:* add `row.reference` to the haystack; add regression tests for a manual track reference and a grant-only `grantReason`.
- **A-2 — [P2] Enrolled list goes stale after grant/revoke; revoke can't refresh its own list.** `useSeriesAttendees.ts:28` keys on `['series-attendees', …]`, but every mutation in `useSeriesGrants.ts` (`:31-35`, `:48-51`, `:62-65`) invalidates only `series-grants` / `series-granted-user-ids` / `series-detail` / `series-grant-users-search`. Since revoke now lives **inside** `SeriesAttendeesList` (`:54`, `useRevokeSeriesAccess`), revoking leaves the row visible (with its revoke button) until staleTime/refetch; new grants from `SeriesAccessManager` don't appear either. *Root cause:* new query family not added to the mutations' invalidation set. *Fix:* invalidate `['series-attendees', seriesId]` in the grant/revoke/bulk `onSuccess`.
- **A-3 — [P2] Unbounded in-memory fetch on the series-attendees route.** The route runs `buildTrackAttendeesQuery` **and** the grants query with **no `.limit()` and no search predicate**, then `mergeSeriesAttendees` dedupes/sorts/slices in memory (`seriesAttendees.ts:99-110`). The track route paginates in SQL; the series route structurally can't (it must merge two sources before slicing) — but it added **no upper bound**, and a track's `maxTrackBookings` can be `null` (uncapped, schema `:199`). So a popular track means *every* series-admin page-1 load pulls the full booking history from Postgres (e.g. thousands of rows). *Root cause:* the two source queries are unbounded. *Fix (don't remove pagination):* cap the union input — push a DB-side `.limit(MAX_MERGE_ROWS)` on both source queries with a "truncated" signal, or fetch only the page window via a SQL `UNION`. *(I rated this P3 initially; the Phase A deep-dive agent's null-cap argument upgrades it to P2 — the only finding here worth fixing before scale.)*

**Test quality:** `attendee-amounts`, `series-attendees`, and the manual-amount tests cover the merge/dedupe/`free=0`/`grant=null` shapes well, and a `deepEqual(Object.keys(trackAttendeeSelection), …)` assertion locks the byte-for-byte field set/order so a future reorder breaks CI (a genuine regression guard). Gaps: no test asserts search-by-`reference` (the passing search test actually *masks* A-1's divergence); the plan's U2 **negative assertion** (amount/PII never on a public payload) and the **revoked-grant exclusion** are unproven — both live in the route/DB layer, not the pure merge fn, so they're code-enforced but not tested.

---

### Phase B — Cairo timezone save fix (R3)

**Conformance**

| Unit / KTD | Status | Evidence |
|---|---|---|
| U5 `cairoLocalToUtcIso` from IANA, per-date | ✅ MET | `dateUtils.ts` `cairoOffsetMinutes` uses `Intl.DateTimeFormat(timeZone:'Africa/Cairo', timeZoneName:'longOffset')` |
| Remove broken `getCairoOffsetString` | ✅ MET (see B-2) | removed from source; only stale docs still mention it |
| AdminEventForm submit + IANA prefill | ✅ MET | `:226` uses converter; prefill on `toCairoDatetimeLocal` |
| TrackForm 4 fields + IANA prefill | ✅ MET | submit converts the four datetimes; prefill switched off browser-local |
| KTD-3 single offset source → round-trip identity | ✅ MET | verified below |

**Done well — the converter is correct and genuinely environment-independent.** It reads the **target zone's** offset (`Africa/Cairo`) for the entered instant, never the local zone, then does a **two-pass** resolution so DST-boundary times stay exact:
```
provisional = Date.UTC(Y, M-1, D, h, m)          // wall time as-if-UTC
firstPass   = provisional - offset(provisional)
utc         = provisional - offset(firstPass)     // re-resolve at corrected instant
```
Summer `14:30 → 11:30Z` (+3), winter `14:30 → 12:30Z` (+2), round-trips through `toCairoDatetimeLocal` exactly. `Date.UTC`/`toISOString`/`Intl(timeZone:'Africa/Cairo')` are all TZ-agnostic, so the output is identical under any `process.TZ`. This is the correct root-cause fix.

**Findings**

- **B-1 — [P3] The test doesn't *prove* environment-independence.** `timezone-conversion.test.ts` asserts the right values but only under the **ambient** TZ — no `process.env.TZ` / child-process matrix — whereas the plan's U5 scenarios explicitly call for `{UTC, Africa/Cairo, America/New_York, Asia/Karachi}`. The code is correct today, so the test passes, but a future regression that reintroduced a local-TZ dependency would also pass under CI's TZ. *Fix:* run the suite (or this file) under several `TZ` values — e.g. spawn child processes with `TZ` set, or add a CI matrix — to lock the property in.
- **B-2 — [P3] Stale docs reference the removed function.** `getCairoOffsetString` is gone from all source, but `docs/c4/code/c4-code-src-shared-utils.md:52` still lists it (and an old `2026-02-14` plan references it). *Fix:* regenerate the C4 code doc for `src/shared/utils` so it reflects `cairoLocalToUtcIso`.

**Test quality:** Good coverage of summer/winter/round-trip/empty-input; the only gap is the multi-TZ execution above.

---

### Phase C — Change email via custom OTP (R4) — *highest-risk surface*

**Conformance**

| Unit / KTD | Status | Evidence |
|---|---|---|
| U6 table + `request`/`verify` routes | ✅ MET | `email_change_requests` + `emailChange.ts` mirroring `/auth/otp/*` |
| OTP to **new** email, HMAC-hashed, 10-min TTL | ✅ MET | `emailChangeLogic.ts` HMAC-SHA256 keyed on secret, bound to `userId:newEmail:otp` |
| Per-user **and** per-destination rate limits | ✅ MET (see C-1 ordering) | `emailChange.ts:95-111` |
| Verify: txn uniqueness re-check, set email+`emailVerified`, consume, invalidate other sessions | ✅ MET | `:225-248`; session keep-current via `ne(authSessions.id, currentSessionId)` |
| Old-email out-of-band notice (request + completion) | ✅ MET | `sendEmailChangeNotice` |
| No accounts-email drift | ✅ MET | `auth_accounts` is only the Better Auth adapter table; sign-in resolves by `users.email` via `auth.api.signInEmailOTP` — changing `users.email` is sufficient |
| KTD-4 custom (not native changeEmail) | ✅ MET | — |
| U7 two-step a11y flow, resend cooldown, email out of profile-save | ✅ MET | `ChangeEmailFlow.tsx`; email field replaced, refresh on success |

**Done well — the crypto and the takeover defenses are correct.** Crypto-strong OTP (`randomInt`), HMAC keyed on `BETTER_AUTH_SECRET` and bound to user+email so a stored hash can't be replayed across requests, constant-time `timingSafeEqual` with a length guard, raw OTP never stored. Verify is rate-limited **before** the lookup, enforces TTL (`gt(expiresAt, now)`) and single-use (`isNull(consumedAt)`) server-side, re-checks uniqueness inside the transaction, and invalidates *other* sessions while keeping the current one. `users.email` has a `UNIQUE` constraint (schema `:41`) backstopping the race. Emails are normalized so rate-limit keys can't be case-bypassed. This is a careful implementation. *(The independent Phase C deep-dive agent corroborated all of this and verified **live that the `auth_accounts` table is empty** — confirming, rather than assuming, that no email is stranded elsewhere — and confirmed both rate dimensions are consumed before any send, with the per-destination keys byte-identical to the sign-in budget.)*

**Findings**

- **C-1 — [P2] Email-existence enumeration is unbounded (existence check runs before rate-limiting).** In `request`, the "already in use?" `users.email` probe (`emailChange.ts:76-91`) executes **before** the per-user rate limit (`:95`). An authenticated user can therefore probe unlimited addresses (409 vs. proceed) without consuming any budget — an account-enumeration oracle. *Root cause:* ordering — the early-return existence check precedes the limiter, **and** the 409-vs-200 response itself is an oracle regardless of throttling. *Fix:* (a) consume the per-user limit **first** to *bound* the probe rate, and (b) to actually *close* the oracle, return a uniform `{success:true}` and suppress the send when the address is taken — relying on the new-address OTP (unreadable to the attacker) as the real gate — **or** consciously document the tradeoff (signup already discloses the same). This conforms to the plan as written ("reject if already in `users`"), so it's a hardening, not a deviation. *(The Phase C agent independently flagged this same oracle, P2.)*
- **C-2 — [P2] Concurrent claim of the same new email returns 500, not 409.** The in-transaction uniqueness re-check (`:227`) is read-then-write under READ COMMITTED with no row lock; two concurrent verifies for the same target can both pass the `SELECT`, then the loser hits a `users_email_unique` violation (PG `23505`) that **isn't** the thrown `EmailTakenError`, so it falls through to the generic `EMAIL_CHANGE_FAILED` **500**. Data stays safe (the `UNIQUE` constraint is the real backstop — no double-assignment, no takeover), but the plan's own "rejected inside the transaction" scenario degrades to an opaque 500 on the riskiest endpoint, and the repo **already has `isKnownDatabaseConflict()` (`utils.ts:333`) for exactly this, unused here**. *Fix:* in the catch, map `isKnownDatabaseConflict(error) === 'unique'` to the same 409 `EMAIL_EXISTS` before the generic 500; ship it with a unit assertion. *(I rated this P3; the Phase C agent rated it **P1** as the single most important pre-merge fix — I keep P2 because the data is safe, but it's the cleanest robustness win and trivially fixed via the existing helper.)*
- **C-3 — [P3] Raw `error` logged in the request path.** `:137` logs the full error object, which on a DB failure can contain the new email (PII-in-logs, against the project's no-PII-in-logs rule). *Fix:* log a code/message, not the raw error (the verify path's notice logs are already clean).
- **C-4 — [P3] OTP consume isn't a compare-and-swap.** The `consumedAt` UPDATE (`:240-243`) doesn't include `AND consumed_at IS NULL`, so two correct-OTP verifies racing both proceed. The effect is idempotent (same target email, same session purge), so it's not exploitable — note for single-use rigor only.
- **C-5 — [P2] Route behavior is untested.** `email-change.test.ts` imports **only** `emailChangeLogic` and tests the pure crypto/mask helpers. The security-critical *route* flows — request/verify happy path, duplicate email, expired/wrong OTP, the per-destination limit, and session invalidation — have **no test**, on the single riskiest endpoint in the plan. *Fix:* add route-level tests (the plan's U6 scenarios — replay of a consumed request, expired TTL, the 429 on the 3/user and 3/dest limits *before* send, the 5-attempt verify throttle, and "other sessions deleted + current survives" — enumerate exactly these).
- **C-6 — [P3] A transient transaction failure burns a verify attempt with no reset.** The verify limiter is consumed before the lookup and only `reset` on success (`:273`); if the transaction throws (the C-2 race, or any transient DB error) on an otherwise-correct OTP, the attempt is spent and not refunded, so a user can be pushed toward the 5/10-min lockout by infra hiccups. *Fix:* consume the verify budget only on a *wrong-OTP* compare (keep the wrong-OTP throttle intact), so correct-OTP-but-transient-failure doesn't cost an attempt.
- **C-7 — [P3] The rate limiter is in-memory / per-instance.** `rateLimiter.ts` holds counts in process memory, so the per-user, per-destination (email-bombing), and verify-brute-force limits are enforced **per server instance**. Fine on the current single-VPS deploy, but if the API is ever horizontally scaled, every limit weakens by the instance count. *Fix:* note this as a scaling constraint; move to a shared store (e.g. the DB, like sign-in's `authVerifications` count) before scaling out. (Also: email-change consumes only the in-memory buckets, not the DB `authVerifications` count that sign-in additionally uses — the shared short bucket is still the binding constraint, so bombing defense holds today.)
- **C-8 — [P3] Resend cooldown can desync from the server limit.** The client's 60s resend cooldown allows 3 sends in ~2 min, which trips the server's 3/10-min per-user limit; the 4th shows "Resend" available but is 429'd. It degrades gracefully (the inline 429 message shows), so this is minor UX. *Fix:* align the client cooldown with the server window, or surface the server's retry-after.

---

### Phase D — Event draft / published (R5)

**Conformance**

| Unit / KTD | Status | Evidence |
|---|---|---|
| U8 `is_published notNull default true` + index | ✅ MET | schema + `0016_tan_owl.sql`; existing events stay visible |
| List hides drafts from non-staff (AND with track filter) | ✅ MET | `events.ts:188` adds `eq(events.isPublished,true)` alongside the unpublished-track `NOT EXISTS` |
| Detail returns same 404 for non-staff drafts | ✅ MET | `:327` `!event.isPublished && !isStaff → 404 EVENT_NOT_FOUND` |
| Create defaults to draft; update never silently unpublishes | ✅ MET | create schema defaults `false`; update sets `isPublished` only `if (updates.isPublished !== undefined)` (`:591`) |
| **Drafts not registerable/payable** | ❌ **NOT addressed** | see D-1 |
| U9 switch + badge + draft confirmation | ⚠️ PARTIAL | switch/badge present; confirmation is a passive toast (see D-2) |
| KTD-6 default-true + no-silent-draft | ⚠️ PARTIAL | default-true ✅; safeguard weaker than planned |

**Done well:** The read-path access control is exactly right — list filter correctly AND-composed with the existing track filter, detail returns the *same* 404 as a missing event (no existence leak), create defaults to draft, and update is a true partial that never resets `is_published` when the field is omitted. The `NOT NULL DEFAULT true` migration is a safe constant default on PG17 (no rewrite) and keeps every existing event live.

**Findings**

- **D-1 — [P1] Draft events are still registerable and payable via the action endpoints.** The guard was applied to `GET /events` and `GET /events/:id` only. `POST /events/:id/register` (~`:706-722`) selects the event (`:708`) with **no `isPublished` check**, and `payments.ts` checks `track.isPublished` (`:414`, `:658`, `:1481`) but has **no equivalent `event.isPublished` check** — `calculatePrice` (~`:260`) and the checkout transaction (~`:1340`) both re-fetch the event without it, so `GET /payments/price-preview` also **leaks a draft's existence** (it returns the title/price). So a member who has a draft event's id — most realistically an event that was **published then unpublished** (staff unpublish to *stop* sign-ups, but its URL/id is already known) — can still register for a free draft or create a paid checkout/reservation for a paid one. *Root cause:* the plan (U8) scoped visibility to list+detail and never extended it to the mutation paths; the existing **track** flow already gates checkout on publish state, so events are inconsistent with that precedent. *Fix (strengthens, mirrors the track pattern):* extract the non-staff visibility rule (`isPublished = true` AND any linked track published) and reuse it in detail, register, price-preview, checkout/reservation creation, and any payment-fulfillment path that writes `eventAttendees` — returning the same 404 so drafts stay non-discoverable. *(Resolved with the product owner, 2026-06-25: drafts must be **fully un-bookable** — so this is a confirmed required fix, not a scope choice; see §6.)* **The Phase D deep-dive agent independently confirmed both the register and payment paths and rated them P0 — three reviews now converge. Treat as must-fix before merge.**
- **D-2 — [P3] The no-silent-draft safeguard is weaker than planned.** KTD-6/U9 specify a save-time confirmation — *"Saved as draft — not visible publicly. **Publish now?**"* — to protect a registration window. The implementation shows a **passive toast** (`AdminEventForm.tsx`) telling staff to toggle Published, and on create the parent navigates away to the detail page, so there's no in-context "publish now" recovery action. *Root cause:* toast chosen over an actionable confirmation. *Fix:* surface an actionable toast/dialog after create with a "Publish now" button that calls update with `isPublished:true` (or keep the user on the form and focus the publish switch). Keeps the draft default without weakening the guard. *Separately:* the toast fires on **every** save of a draft (`if (!formValues.isPublished)`), so staff iterating on an existing draft see it each time — gate it on create / transition-to-draft (e.g. `event?.is_published !== false && !formValues.isPublished`).
- **D-3 — [P3] Frontend mapping defaults to published.** `src/app/api/events.ts:84` maps `is_published: event.isPublished ?? true`, so if any list/detail response ever omits the field a draft renders as **published** in the UI. Benign today (the backend always returns it), but the safe default is `false`. *Fix:* default the fallback to `false` (draft-safe).

**Test quality:** `event-publish.test.ts` (26 tests) covers the schema/create-default/no-silent-unpublish/filter shapes. Gap: no test for the **action-path** access (D-1) — `register`, price-preview, checkout against an unpublished event.

---

### Phase E — Egypt phone normalization (R6)

**Conformance**

| Unit / KTD | Status | Evidence |
|---|---|---|
| U10 shared `phone.ts`, strip-on-blur EG, prefix {10,11,12,15}+10 digits | ✅ MET | `phone.ts:282` `normalizeLocalPart`, `:287` `isValidEgyptMobile` |
| Persistent EG helper text | ✅ MET | `EGYPT_PHONE_HELPER` shown when EG selected (Step3 + field) |
| Profile field parses stored E.164 into selector+local | ✅ MET | `PhoneNumberField` + `parseE164` (dial-desc longest-prefix) |
| U11 backend `+200 → +20` guard | ✅ MET | `users-phone.ts:26-29` `replace(/^\+200/, '+20')` |
| KTD-7 forgiving + validating, frontend-first, backend guard | ⚠️ PARTIAL | see E-1 |

**Done well:** Genuine defense-in-depth — `buildFullPhone` (signup) and `assembleE164` always normalize, strip-on-blur is UX-only, and the backend `+200→+20` collapse catches any un-blurred path (an unguessable Egyptian national number never legitimately starts with `0` after `+20`, so the collapse is safe). `parseE164` matches by descending dial so `+212…` isn't mis-split as Egypt `20`. Pure-logic tests are thorough (strip, prefix accept/reject, wrong length, non-EG untouched, pasted separators, parse, backend guard, empty).

**Findings**

- **E-1 — [P2] Profile can persist an invalid Egyptian number despite showing an error.** `PhoneNumberField` keeps validation in *local* state; `Dashboard.tsx` submits `formData.phone` on Save with no validity gate, and the backend `validatePhoneNumberUpdate`/`isE164PhoneNumber` only checks E.164 *shape* (and collapses `+200`), not the EG prefix/length. So a user can blur, see "Enter a valid Egyptian mobile number," then Save and persist `+2013…` or a wrong-length number. *Root cause:* the backend isn't the final validator for the EG rule, and field validity isn't surfaced to the save. *Fix:* extend the backend guard to reject `+20` local parts that fail `{10,11,12,15}`/10-digit (final source of truth); optionally lift validity to `Dashboard` to disable Save / show a top-level error.
- **E-2 — [P3] Non-Egypt numbers get no length/digit floor in the profile field.** `validateLocalPart` returns `null` for every non-EG dial, and `PhoneNumberField` relies solely on it, so a 1-digit `+971…` passes. The plan mentioned "generic behavior for other countries"; Step3 has its own generic checks but the profile field doesn't. Not a regression (the old flat input had none). *Fix:* add a minimal generic length/digit check in `validateLocalPart` for non-EG.
- **E-3 — [P3] `parseE164` unknown-dial fallback can corrupt a stored number.** For a stored value whose dial isn't in the country list, `parseE164` (`:313-322`) returns the **default country (Egypt)** with the whole number as the local part — a later edit/blur then re-prefixes `+20`. Unlikely with selector-produced data, but worth a guard (preserve original or flag unknown).
- **E-4 — [P3] Country `<Select>` has no accessible name.** In `PhoneNumberField`, the dial selector trigger has no `aria-label`; a screen reader announces a bare combobox. *Fix:* add `aria-label="Country code"`.

- **E-5 — [P3] Signup duplicates the shared parser.** `Step3.tsx:34` defines a private `parseSavedPhone` identical to the new shared `parseE164`, instead of importing it (and inlines the E.164 template rather than `assembleE164`). Plan U10 called for a *shared* util so signup + profile match; this re-introduces the divergence risk it was meant to remove. *Fix:* import `parseE164`/`assembleE164` from `@/shared/utils/phone` and delete `parseSavedPhone`.
- **E-6 — [P3] `inputMode="numeric"` missing.** Both phone inputs use `type="tel"` (telephony keyboard with `+ * #`) without `inputMode="numeric"`, which plan U10 explicitly required for the digits-only local part. *Fix:* add `inputMode="numeric"` to both inputs (keep `type="tel"` for semantics).
- **E-7 — [P3] Step3 error not wired for screen readers.** `PhoneNumberField` sets `aria-invalid`/`aria-describedby` (`:115-116`), but Step3's input (`:151`) does neither, so its inline EG error isn't announced. *Fix:* add `aria-invalid` + `aria-describedby` (with an `id` on the error `<p>`) to the Step3 input, matching `PhoneNumberField`.

**Test quality:** Strong on the pure helpers. Gaps: no test for `parseE164` of a **non-EG** stored value (proving no digit loss), and none through `validatePhoneNumberUpdate` for an invalid EG prefix/length (the E-1 path).

---

## 4. Requirements Traceability

| R | Requirement | Status | Blocking gaps |
|---|---|---|---|
| R1 | Series enrolled list = track buyers ∪ grants | Mostly met | A-1 (reference search), A-2 (stale list) |
| R2 | Show exact amount paid (staff-only) | **Met** | — (no leak; stored values only) |
| R3 | Cairo timezone correct, automatic, DST-aware | **Met** | keep B's converter through the INT-2 merge |
| R4 | Change email from profile via OTP | Mostly met | C-1 (enumeration), C-5 (route tests) before release |
| R5 | Events draft/published; new default draft | **Partially met** | **D-1** (drafts still bookable) |
| R6 | Egypt phone strips leading 0 + validates | **Partially met** | E-1 (profile/backend accept invalid EG) |

---

## 5. Consolidated Findings

| # | Sev | Area | File(s) | Issue |
|---|---|---|---|---|
| INT-1 | P1 | Integration | `drizzle/meta/_journal.json`, `0016_snapshot.json` | Duplicate migration idx 16 (C & D) — renumber 2nd to 0017 + regenerate |
| D-1 | P1 (P0 per agent) | Phase D | `events.ts` register, `payments.ts` calc/checkout | Draft events registerable/payable; price-preview leaks existence |
| INT-2 | P2 | Integration | `AdminEventForm.tsx` | B×D merge can revert timezone fix; keep converter + toggle |
| INT-3 | P2 | Integration | `Dashboard.tsx` | C×E merge must keep both ChangeEmailFlow + PhoneNumberField |
| A-1 | P2 | Phase A | `seriesAttendees.ts:60` | Search omits `reference` though UI/columns include it |
| A-2 | P2 | Phase A | `useSeriesGrants.ts` | Mutations don't invalidate `series-attendees` → stale list/revoke |
| A-3 | P2 | Phase A | `seriesAttendees.ts` route | Unbounded in-memory fetch (uncapped track → full history per page) |
| C-1 | P2 | Phase C | `emailChange.ts:76-95` | Existence check before rate-limit + 409-vs-200 enumeration oracle |
| C-2 | P2 | Phase C | `emailChange.ts:227` | Concurrent claim → 500 not 409 (use existing `isKnownDatabaseConflict`) |
| C-5 | P2 | Phase C | `email-change.test.ts` | No route-level tests on the riskiest endpoint |
| E-1 | P2 | Phase E | `PhoneNumberField`/`Dashboard`/`users-phone.ts` | Profile saves invalid EG number despite error |
| INT-4 | P3 | Integration | `events.ts`, `app/api/events.ts` | Verify both amount + isPublished survive A×D merge |
| B-1 | P3 | Phase B | `timezone-conversion.test.ts` | Test runs ambient TZ only (doesn't prove env-independence) |
| B-2 | P3 | Phase B | `docs/c4/code/...` | Stale doc references removed `getCairoOffsetString` |
| C-3 | P3 | Phase C | `emailChange.ts:137` | Raw error log may leak new email (PII) |
| C-4 | P3 | Phase C | `emailChange.ts:240` | `consumedAt` update isn't compare-and-swap (idempotent; rigor only) |
| C-6 | P3 | Phase C | `emailChange.ts:248` | Transient txn failure burns a verify attempt (no reset) |
| C-7 | P3 | Phase C | `rateLimiter.ts` | In-memory limiter is per-instance (weakens if scaled out) |
| C-8 | P3 | Phase C | `ChangeEmailFlow.tsx` | 60s resend cooldown can desync from server 3/10-min limit |
| D-2 | P3 | Phase D | `AdminEventForm.tsx` | Passive toast (+ fires on every draft save) vs. planned "Publish now?" |
| D-3 | P3 | Phase D | `app/api/events.ts:84` | Frontend maps `is_published ?? true` (draft-unsafe fallback) |
| E-2 | P3 | Phase E | `phone.ts` | Non-EG numbers get no length/digit floor in profile |
| E-3 | P3 | Phase E | `phone.ts:313` | `parseE164` unknown-dial fallback can re-prefix `+20` |
| E-4 | P3 | Phase E | `PhoneNumberField` | Country `<Select>` lacks an accessible name |
| E-5 | P3 | Phase E | `Step3.tsx:34` | Duplicates shared `parseE164` as `parseSavedPhone` |
| E-6 | P3 | Phase E | `PhoneNumberField`, `Step3.tsx:151` | `inputMode="numeric"` missing (plan U10) |
| E-7 | P3 | Phase E | `Step3.tsx:151` | Input lacks `aria-invalid`/`aria-describedby` |

No anonymously-exploitable P0. No false positives — every finding was verified against the branch code, and the five-agent deep-dive corroborated them independently (D-1 and C-2 were each rated one notch higher — P0 and P1 respectively — by their branch agents; see those entries for why I hold them at P1/P2).

---

## 6. Decisions & Deployment Notes (resolved with the product owner, 2026-06-25)

1. **Draft scope — RESOLVED: drafts must be fully un-bookable.** So **D-1 is a confirmed required fix**, not a scope choice. The non-staff visibility rule (`isPublished = true` AND any linked track published) must gate `GET /events/:id`, `POST /events/:id/register`, `GET /payments/price-preview`, and the checkout/reservation + payment-fulfillment paths that can write `eventAttendees` — returning the same 404 used by detail. *(To be implemented in a later session — not done here.)*

2. **Migration collision vs. the deploy pipeline (INT-1) — analyzed against `deploy-prod.sh`.** The production deploy (run after a push to `main`) does: `git merge --ff-only origin/main` → `npm ci` → build server → **full DB backup** → `npm --prefix server run db:migrate` (= `drizzle-kit migrate`) → build frontend → restart. Implications for the duplicate `0016`:
   - The deploy script **does not renumber or resolve migrations** — it faithfully runs `drizzle-kit migrate` against whatever reaches `main`, and `--ff-only` means the VPS never auto-resolves anything. So the collision **must be resolved in the PR, before it lands on `main`**: the *second* of C/D to merge will hit a GitHub conflict on `_journal.json` + `0016_snapshot.json` and cannot merge until resolved.
   - **Correct resolution (either order):** merge C and D **sequentially**; for the second, after rebasing on the merged `main`, run `npm --prefix server run db:gen` to regenerate it as `0017_*` with a cumulative snapshot, verify `db:migrate` applies cleanly against a fresh DB locally, then push. The order of C vs D doesn't matter — only that the second regenerates rather than force-keeping its `0016`.
   - **The deploy's safety net is strong, which de-risks INT-1:** it takes a **full DB backup immediately before migrating** and **aborts on migration failure with services left running** + restore instructions, and `drizzle-kit migrate` is idempotent (applied migrations are tracked in `__drizzle_migrations`, so `0001–0015` never re-run). Worst realistic outcome of a botched migration merge is therefore a **failed/red deploy you fix forward — not production data loss or corruption.**

3. **Superseded review file — DONE.** `…-implementation-review.md` was deleted (moved to trash) at your request; `docs/reviews/` now holds only this consolidated review.

> **⚠️ Out-of-scope security note (found while reading `deploy-prod.sh` for item 2 — unrelated to the six-change plan):** the **production database password is hardcoded in the tracked file** (`deploy-prod.sh:23`), so it lives in git history. That's a real credential exposure worth **rotating the password and moving it to an env var / secret**, independent of this review. Flagged here so it isn't lost; I did not change it.

---

## 7. Suggested Sequence Before Merge

1. Fix **D-1** (central event-visibility rule on register + checkout + price-preview) + add its tests — highest user-facing risk.
2. Fix **A-1**, **A-2**, **E-1**, and **C-2** (map the unique-violation to a 409 via the existing `isKnownDatabaseConflict`) — small, well-scoped correctness/robustness fixes.
3. Harden **C-1** (bound *and* close the enumeration oracle) and add **C-5** route tests before R4 ships; cap **A-3**'s unbounded fetch if any linked track may grow large.
4. Resolve integration in the recommended order; **regenerate the second 0016 → 0017** (never hand-merge the snapshot); confirm INT-2 keeps `cairoLocalToUtcIso`.
5. Re-run the full gate set after integration: `npm run test:unit`, `npm run lint`, `npm --prefix server run build`, `npm run build` — and run the timezone test under a TZ matrix (B-1).
6. Mop up the remaining P3s (C-3/4/6/7/8, D-2/3, E-2/3/4/5/6/7, B-2 doc) as capacity allows.
