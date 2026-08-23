# Comprehensive Review — Admin Enrollment / Platform Fix Branches

**Date:** 2026-06-25
**Scope:** Review of the five implementation branches that address `docs/reviews/2026-06-25-002-admin-enrollment-review.md`, then comparison with `docs/reviews/2026-06-25-003-admin-enrollment-round-2-review.md`.

| Phase | Branch | Tip reviewed | Focus |
|---|---|---:|---|
| A | `feat/phase-a-series-enrollment` | `07bd5be` | Series attendees + amount paid fixes |
| B | `feat/phase-b-timezone` | `55e3267` | Cairo timezone save/test fixes |
| C | `feat/phase-c-email-change` | `de07171` | Email-change hardening fixes |
| D | `feat/phase-d-event-drafts` | `bf77a22` | Draft-event booking/payment fixes |
| E | `feat/phase-e-phone` | `6a89b92` | Phone validation/a11y fixes |

## Method

- Read the revised plan and both prior reviews in full.
- Inspected each branch's complete diff against `main` via `git diff` / `git show`; did not switch the working tree because the current checkout contains untracked review artifacts.
- Ran targeted unit tests from clean `git archive` extracts with the existing `node_modules` symlinked in:
  - Phase A: `series-attendees.test.ts`, `attendee-amounts.test.ts` — **15 pass**.
  - Phase B: `timezone-conversion.test.ts` — **10 pass**, including the child-process `TZ` matrix.
  - Phase C: `email-change*.test.ts` — **13 pass**.
  - Phase D: `event-*.test.ts` — **10 pass**.
  - Phase E: `phone-normalize*.test.ts` — **23 pass**.
- This is still primarily a static/deep review, not a full integration-gate run. I did not run full frontend build, server build, or a real cross-branch merge because the branches are intentionally separate and the working tree is dirty.

---

## Executive verdict

The fix round is materially stronger than the first implementation. The original P1/P2 defects from review `002` are mostly fixed in the actual branch code:

- Phase A now searches `reference`, invalidates the enrolled-users query after grants/revokes, and bounds the merge input.
- Phase B now proves timezone independence with child processes under multiple `TZ` values.
- Phase C now bounds the email-existence probe, maps unique conflicts to 409, avoids raw route-level DB-error logging, CAS-marks the OTP request, and returns server cooldown data.
- Phase D now guards draft/unpublished-track events through register and payment price/checkout paths.
- Phase E now makes the backend the final validator for Egyptian mobile numbers and fixes the profile/signup a11y/util gaps.

**I would not call the combined five-branch plan ready to merge without another small fix pass.** There are no broad rewrites needed, but there are three real second-order implementation bugs and one important Phase A correctness tradeoff introduced by the cap fix:

1. **C-P2:** Email-change verify rate limiting is now peek-then-consume, so concurrent wrong-code bursts can exceed the intended 5-attempt cap.
2. **D-P2:** Payment `calculatePrice(..., tx)` still reads the user role through global `db`, adding a second connection inside the checkout transaction.
3. **D-P2:** The "Publish now" toast submits a published payload but leaves the form state as draft, so the next save can silently re-draft the event.
4. **A-P2:** The Phase A cap is applied before search, so searches can return false negatives once a linked track or grant list exceeds 2,000 source rows.

The cross-branch merge hazards from review `002` still apply: C and D both own migration `0016`, B and D conflict in `AdminEventForm.tsx`, and C and E conflict in `Dashboard.tsx`.

---

## What was implemented well

### Phase A — Series enrollment + amount paid

**Good implementation points**

- The track-attendee SQL extraction is clean and additive; `amountPaidCents` is appended without changing the original attendee shape.
- The read-time union keeps the existing access model intact: track bookings are not materialized as grants.
- Dedupe by `userId` with booking rows winning is the right root fix because a manual track booking and a manual series grant are different things.
- `grantId` is the right UI discriminator for revoke; it avoids the original `source === 'manual'` ambiguity.
- The first-review fixes are present: `row.reference` is in the search haystack, grant/revoke/bulk mutations invalidate `['series-attendees', seriesId]`, and the route reports `truncated` when a capped source may be incomplete.

**Remaining concern**

- **A-P2 — Search correctness is capped before filtering.** `seriesGrants.ts` fetches only the newest `MAX_MERGE_ROWS` bookings/grants, then `mergeSeriesAttendees()` applies search in memory. If an older attendee exists outside the 2,000-row source window, searching by their name/email/reference returns zero even though they are enrolled. The `truncated` flag honestly warns that older records are not listed, but it does not make a search result correct. Root-cause fix: push search predicates into both source queries before the cap, or move to a SQL `UNION`/CTE that can search and paginate the full active source set.

### Phase B — Cairo timezone

**Good implementation points**

- `cairoLocalToUtcIso()` uses the target IANA zone (`Africa/Cairo`) and a two-pass offset resolution, not the browser/server local timezone.
- Event submit and all four track booking-window fields now submit explicit UTC ISO strings.
- Track edit prefill uses `toCairoDatetimeLocal`, so display/save use one time source.
- The child-process `TZ` matrix is real and would catch a regression to local-time conversion.

**Remaining concern**

- No blocking issue found. The round-2 DST-boundary tests are reasonable P3 coverage, but I found no evidence that the converter is wrong for normal schedulable times.

### Phase C — Email change

**Good implementation points**

- HMAC hashing is bound to `userId:newEmail:otp`, raw OTPs are never stored, and comparison is timing-safe.
- Request flow now consumes per-user budget before probing `users.email`, bounding the enumeration oracle.
- Unique conflicts during verify now map to the same 409 as the explicit in-transaction conflict check.
- `consumedAt` update includes `AND consumed_at IS NULL`, which is the right single-use direction.
- Session invalidation keeps the current session and deletes the user's other sessions.
- Client resend cooldown now reads server `retryAfterSeconds` from the API error payload.

**Remaining concerns**

- **C-P2 — Verify limiter TOCTOU.** The verify route checks `getCount(verifyKey) >= 5`, then awaits the DB request lookup, and only later calls `spendVerifyAttempt()` on wrong/no-request paths. In a concurrent burst, all requests can pass the initial peek before any sibling consumes. The later `consume()` result is ignored, so requests beyond the fifth still get an OTP comparison and a 400 instead of being stopped at 429. Root-cause fix: restore atomic consume-first for attempts that enter the verify path, then either add a refund/decrement for the rare correct-OTP transient-failure path or accept that rare transient DB failures cost one attempt. Do not keep peek-then-consume as the security boundary.
- **C-P3 — Route-level coverage is still thin.** The branch tests prove helper logic and limiter keys, but not the Hono route wiring: request happy path, duplicate email, wrong/expired OTP, verify 429, and session invalidation. This is a high-value test gap because the security-critical behaviors live in route placement, not just helper functions.
- **C-P3 — Per-destination limits are memory-only and fixed at 3/10.** That may be OK for the current single-instance MVP, but it does not fully match the plan's "otpRateLimiter + table count pattern" wording and diverges from sign-in event-mode limits on shared `otp:email:*` keys. Treat this as hardening unless event mode is expected to apply to email-change sends too.

### Phase D — Event drafts

**Good implementation points**

- `is_published` is `NOT NULL DEFAULT true`, so existing events remain visible.
- New event creation defaults to draft, while update omits `isPublished` safely.
- Public list and detail hide drafts and events under unpublished tracks.
- The first-review booking hole is fixed in the main paths: register and payment price/checkout now call `isEventHiddenFromNonStaff()` and return not-found for non-staff drafts.
- `src/app/api/events.ts` now defaults omitted `isPublished` to `false`, which is draft-safe.

**Remaining concerns**

- **D-P2 — `calculatePrice(..., tx)` uses global `db` for the role lookup.** In the event-price branch, `Promise.all` uses `dbClient` for event/track/registration reads but calls `getOptionalUserRole(userId)`, which always reads from global `db`. During checkout this function is called inside a transaction, so the role lookup takes a second pool connection while the transaction connection is held. Under checkout concurrency this can create avoidable pool pressure or stalls; it also makes the visibility decision inconsistent with the transaction scope. Root-cause fix: pass a db/tx client into the role lookup or inline the profile-role select using `dbClient`.
- **D-P2 — "Publish now" does not update form state.** The toast action calls `onSubmit({ ...payload, isPublished: true })`, but the React Hook Form value remains `false`. On the edit page the switch can still display Draft after the action, and a later save can send `isPublished:false` again. Root-cause fix: set the form value to true and submit from current form state, or refetch/reset the form after the publish mutation succeeds.
- **D-P3 — Success copy still assumes instant publishing.** `useCreateEvent` still says "Your event is now available to members" even though the new default is draft. That line was pre-existing, but the changed default makes it false for the normal create path. Align the success toast with `payload.isPublished`/returned event state so the no-silent-draft safeguard is not contradicted.

**Clarification needed**

- Do you want unpublishing a previously published event to also cancel/block already-issued pending payment invoices/reservations? The current branch blocks new price calculations and new reservations, but it does not re-gate existing pending invoices or webhook fulfillment. Round 2 treats not re-gating already-paid fulfillment as intentional; the unpaid-pending-code case is adjacent and should be a product decision, not an assumption.

### Phase E — Phone normalization

**Good implementation points**

- Backend validation is now authoritative for Egyptian mobile numbers, so profile saves cannot persist `+2013...` or wrong-length Egyptian numbers.
- Shared frontend helpers handle stripping, validating, assembling, and parsing.
- `parseE164()` now matches longest dial prefixes and avoids corrupting unknown dials into Egypt-prefixed values.
- `PhoneNumberField` lifts validity to `Dashboard`, disables Save when invalid, and adds the missing country-code accessible name and numeric input mode.
- Signup now uses the shared parser and has `aria-invalid` / `aria-describedby` on the phone input.

**Remaining concern**

- No blocking issue found. There is a small consistency nit: profile validation accepts 6-digit non-Egypt local parts via the shared utility, while signup still has a separate `MIN_LOCAL_DIGITS = 7` pre-check. This is not a release blocker, but if the goal is exact signup/profile parity, make the signup floor use the shared utility only.

---

## Cross-branch integration findings

These are still merge-time issues, not per-branch defects.

| ID | Severity | Issue | Required resolution |
|---|---:|---|---|
| INT-1 | P1 | Phase C and D both generated Drizzle migration `0016` and both add `meta/0016_snapshot.json` / `_journal.json` changes. | Merge C and D sequentially; after the first lands, regenerate the second migration as `0017` from the combined schema. Do not hand-merge Drizzle snapshots. |
| INT-2 | P1 trap | B and D both edit `AdminEventForm.tsx`; D branch alone still uses `getCairoOffsetString()` because it was cut independently. | During integration, keep B's `cairoLocalToUtcIso(formValues.date)` and D's `isPublished` toggle/toast behavior. The integrated file must not import `getCairoOffsetString`. |
| INT-3 | P2 | C and E both edit `Dashboard.tsx`. | Keep both `<ChangeEmailFlow>` and `<PhoneNumberField>`, remove both stale `useId`s, and keep E's phone validity gating. |
| INT-4 | P3 | A and D both edit event API/types. | Verify the integrated serializers/types retain both `amountPaidCents` and `isPublished`. |

Recommended merge order remains: **A → B → C/D sequentially with the second migration regenerated → E**, then full gates.

---

## Comparison with review `003`

### Findings I agree with and would keep

| Review 003 item | My status | Notes |
|---|---|---|
| C-R2-1 verify peek→await→consume TOCTOU | **Agree, P2** | This is the most important Phase C fix. The current route ignores the result of late `consume()`, so the cap is not an atomic boundary under concurrency. |
| D-R2-7 global `db` role read inside checkout transaction | **Agree, P2** | This is a real second-order bug from adding draft guards to payment pricing. |
| D-R2-8 stale "Publish now" form state | **Agree, P2** | Real UX/data-state bug; fix at root by updating/resetting form state, not by removing the safeguard. |
| A-R2-12 search over only capped rows | **Agree, P2** | This is the strongest Phase A follow-up. The cap bounds load but changes search semantics. |
| X-R2-14 guard wiring untested | **Agree as P2 test gap** | I would add route-level tests for verify 429 and draft booking/payment guard. |
| B-R2-19 / B-R2-20 | **Agree as P3 coverage** | Useful tests, no evidence of production bug. |
| C-R2-15 second OTP invalidates first | **Agree as P3 UX** | Not a security bug, but can self-lock users. |
| C-R2-16 / D-R2-17 migration/index hygiene | **Agree as P3** | Not blockers; handle when regenerating migrations if easy. |

### Findings I would downgrade or treat as conditional

| Review 003 item | My adjustment | Why |
|---|---|---|
| C-R2-2 event-mode destination-limit divergence | **Conditional P3/P2** | It is only a product bug if email-change is supposed to inherit event-mode OTP volume. A stricter email-change destination budget may be intentional, but sharing the `otp:email:*` namespace with different limits should be documented or aligned. |
| C-R2-3 `sendOtpEmail` has no timeout | **Platform hardening, not branch-specific** | The no-timeout behavior pre-existed and already affects sign-in OTP. Worth fixing, but not a defect introduced by this branch. |
| C-R2-4 OTP-send failure leaves an orphan request/rate burn | **P3 reliability** | Real but low-frequency; a later successful request supersedes the orphan. Fix after C-P2. |
| C-R2-5 pre-transaction select outside try/catch | **P3 reliability/logging** | It would fall to the app-level Hono error handler, not corrupt data. Still better to catch locally for clean API shape/no raw logs. |
| C-R2-6 no TTL cleanup | **P3 data hygiene** | Good retention issue, not a correctness blocker at expected MVP volume. |
| D-R2-9 / D-R2-10 rule/role duplication | **Maintainability P3** | Consolidation is good, but duplication alone is not a bug while tests/behavior are aligned. |
| A-R2-11 every page fetches 2,000 rows | **P3 performance unless data already large** | The correctness issue is search false negatives; 2,000-row in-memory pages are acceptable short-term for admin-only MVP use. |
| A-R2-13 missing sort index | **P3 performance** | Consider if real production row counts justify it; not a release blocker. |
| E-R2-22 phone tests | **Partly agree** | The unknown-dial assertion is not completely vacuous because it catches the exact old `+20` re-prefix corruption, but it is weaker than asserting `parseE164(...).local === ''`. Boundary tests would still help. |

### Findings I add beyond review `003`

| ID | Severity | Addition |
|---|---:|---|
| D-add-1 | P3 | Create/update success toasts still say drafts are available/live. The changed default makes pre-existing copy wrong for the normal create path. |
| E-add-1 | P3 | Signup and profile now differ on non-Egypt minimum local length (`7` in signup vs `6` in shared/profile). Not a blocker, but it weakens the "shared util means parity" goal. |
| Product clarification | n/a | Decide whether unpublishing should block already-issued pending payment codes, not just new checkout/reservation creation. |

### Which review to go with

Use **review `003` as the baseline**, but apply the prioritization above. It correctly identifies the most important second-order bugs. I would not treat every P2 in `003` as equally urgent: fix **C-R2-1, D-R2-7, D-R2-8, A-R2-12, and guard-wiring tests first**; then take the conditional/hardening items as capacity allows.

---

## Recommended next fix sequence

1. **Phase C:** make verify attempt limiting atomic again; add a route-level test for the 429 boundary.
2. **Phase D:** thread `tx`/`dbClient` into role lookup inside `calculatePrice`; fix the Publish Now toast to update/reset form state.
3. **Phase A:** make search operate before the 2,000-row cap, or replace the in-memory cap with a searchable SQL union/CTE.
4. **Tests:** add route tests for draft register/price-preview/checkout guard and email-change verify throttling.
5. **Integration:** resolve duplicate migration `0016` by regenerating the second migration; carefully merge B+D and C+E UI conflicts.
6. **Copy/hardening:** fix draft success-copy, decide pending-payment behavior, then address C timeout/orphan/cleanup and minor E/B coverage items.

## Bottom line

The implementations are directionally correct and much stronger than the first pass. The remaining work is not simplification or weakening; it is root-cause tightening of second-order effects created by the fixes. After the four primary P2s and the migration conflict are addressed, I would be comfortable moving to full integration gates.
