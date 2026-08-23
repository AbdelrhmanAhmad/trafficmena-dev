# Round-2 Implementation Review — Plan 2026-06-25-002 (Five Admin / Platform Branches, post-fix)

**Date:** 2026-06-25
**Plan:** `docs/plans/2026-06-25-002-feat-admin-enrollment-and-platform-fixes-plan.md`
**Round-1 review (fixed against):** `docs/reviews/2026-06-25-002-admin-enrollment-review.md`
**Base:** `main` @ `078a606` (each branch diffed from its merge-base, which is `078a606`)
**Mode:** report-only (no code changes; you decide merge vs another fix round)

**Branches reviewed (all local, not pushed):**

| Phase | Branch | Tip | Round-1 fix commit |
|---|---|---|---|
| A | `feat/phase-a-series-enrollment` | `07bd5be` | `fix(series): search reference, refresh enrolled list, bound merge fetch` |
| B | `feat/phase-b-timezone` | `55e3267` | `test(timezone): prove cairoLocalToUtcIso TZ-independence; refresh c4 doc` |
| C | `feat/phase-c-email-change` | `de07171` | `fix(email-change): harden enumeration, conflicts, throttling, and logs` |
| D | `feat/phase-d-event-drafts` | `bf77a22` | `fix(events): make draft events unbookable on register and payment paths` |
| E | `feat/phase-e-phone` | `6a89b92` | `fix(phone): backend EG validation, non-EG floor, safe parse, a11y, dedupe` |

**Method:** Full re-review of each branch's **complete** diff vs `main` (original feature + round-1 fix) **plus** an explicit pass/fail on every round-1 finding. 24 reviewer passes via parallel persona sub-agents (correctness, security, adversarial, reliability, data-migration, performance, testing, maintainability), right-sized per branch — heaviest on C/D (auth/payments), lightest on B. Branch content inspected via `git show <branch>:<path>` (working tree stayed on `main`). The two highest-leverage cross-cutting claims (the C event-mode limit divergence, the B "vacuous test") were verified directly against branch source. No separate validator wave was run; in its place are cross-reviewer corroboration + orchestrator direct verification (noted per finding).

---

## 1. Executive Verdict

**All round-1 findings are resolved, and the implementations are correct and secure on close inspection.** Every round-1 P1/P2 — the draft-bookability hole (D-1), the email-change enumeration oracle and 500-vs-409 race (C-1/C-2), the series reference-search/stale-list/unbounded-fetch (A-1/2/3), and the profile-accepts-invalid-EG-number (E-1) — is genuinely closed, independently confirmed by correctness + security + adversarial passes. The high-risk surfaces hold up: the Cairo converter is provably environment-independent, the OTP crypto/takeover defenses are sound, and **drafts are now fully un-bookable** (the guard fires *before* any reservation/payment row is written, and the deliberate choice to not re-gate already-paid webhook fulfillment was independently validated).

**There are no surviving P0 or P1 defects.** What the deeper passes surfaced is a set of **P2/P3 second-round hardening items** — and notably, **three of the most material ones are second-order effects of the round-1 fixes themselves**, which is exactly what this round was meant to catch:

- **C-R2-1 [P2]** — the C-6 fix (peek-then-consume to avoid burning an attempt on a transient error) introduced a **TOCTOU that lets a concurrent verify burst exceed the 5-attempt OTP cap**.
- **D-R2-7 [P2]** — the D-1 guard added `getOptionalUserRole` to `calculatePrice` using the **global `db` instead of the transaction's `tx`**, a cross-connection read inside the checkout transaction.
- **D-R2-8 [P2]** — the D-2 "Publish now" toast **re-submits with a stale closure payload and never syncs the form's `isPublished` state**.

Plus pre-existing-in-branch items the full re-review caught (event-mode rate-limit divergence, missing `fetch` timeouts, rule/role duplication, migration hygiene) and a corroborated cross-cutting **testing gap: the security-critical guard *wiring* is untested** (the verify-429 gate and the draft guard can each be deleted with the suite still green).

**Severity tally (this round):** P0 = 0 · P1 = 0 · P2 = 14 · P3 = 8. None block per-branch correctness; they are quality/robustness improvements to weigh before merge. The cross-branch **INT-1…INT-4** items from round 1 remain **merge-time** and were intentionally out of scope here.

---

## 2. Round-1 Findings — Verification (all resolved)

Confirmed resolved by the cited round-2 reviewers (✅ = genuinely fixed; the implementation matches intent and no regression was introduced).

| Round-1 | Status | Confirmed by |
|---|---|---|
| **A-1** search omits `reference` | ✅ resolved | correctness, security, testing (haystack now includes `row.reference`; tests cover manual-ref + grant-reason) |
| **A-2** stale list after grant/revoke | ✅ resolved | correctness, security (all 3 mutations invalidate `['series-attendees', seriesId]`) |
| **A-3** unbounded in-memory fetch | ✅ resolved | correctness, performance (cap `MAX_MERGE_ROWS=2000` newest-first + `truncated` flag) — see second-order items A-R2-11/12/13 |
| **B-1** test didn't prove env-independence | ✅ resolved | correctness, testing (child-process TZ matrix genuinely proves it; reviewer reconstructed the old bug and confirmed the matrix would fail) |
| **B-2** stale C4 doc | ✅ resolved | correctness |
| **C-1** enumeration oracle | ✅ resolved | correctness, security, adversarial (per-user limit consumed before the existence probe; bounded + documented tradeoff) |
| **C-2** concurrent claim → 500 | ✅ resolved | correctness, security, adversarial, reliability (23505 mapped to 409 via `isKnownDatabaseConflict`, incl. nested `cause`) |
| **C-3** raw error/PII in logs | ✅ resolved | security (message-only logging; 23505 short-circuits before the generic log) |
| **C-4** consumedAt not CAS | ✅ resolved | correctness, security (`AND consumed_at IS NULL`; idempotent under the same-OTP race) |
| **C-5** route untested | ⚠️ improved, gap remains | testing (limiter/keys/23505 tested; but the verify-429 *gate* wiring is still untested — see C-R2-14) |
| **C-6** transient failure burns attempt | ✅ resolved … but | correctness, reliability — **introduced C-R2-1 (TOCTOU)** |
| **C-7** in-memory limiter | ✅ documented | security, reliability (accurately noted as a single-instance constraint) |
| **C-8** resend cooldown desync | ✅ resolved | (retryAfter surfaced + client aligns) |
| **D-1** drafts registerable/payable | ✅ resolved | correctness, security, adversarial (fully un-bookable; guard precedes reservation/payment writes; multi-track structurally impossible) |
| **D-2** weak no-silent-draft safeguard | ✅ resolved … but | correctness — **introduced D-R2-8 (form-state desync)** |
| **D-3** frontend `?? true` | ✅ resolved | correctness (`?? false`) |
| **E-1** profile persists invalid EG | ✅ resolved | correctness, security (backend guard authoritative; adversarial probe found no bypass) |
| **E-2** non-EG length floor | ✅ resolved | correctness (6–15 digit floor) |
| **E-3** parseE164 corrupts unknown dial | ✅ resolved | correctness, security (empty-local fallback; no wipe-on-save) — test weakness E-R2-23 |
| **E-4…E-7** a11y + dedupe | ✅ resolved | correctness (aria-label, shared parser, inputMode, aria-invalid) |

---

## 3. New Findings — P2 (fix if straightforward, before merge)

Tag: `[2nd-order]` = introduced by a round-1 fix · `[pre-existing]` = in the original branch, surfaced now.

| # | File | Issue | Tag | Reviewers | Conf |
|---|------|-------|-----|-----------|------|
| C-R2-1 | `server/src/routes/api/emailChange.ts` | Verify peek→await→consume lets a concurrent burst exceed the 5-attempt OTP cap | `[2nd-order C-6]` | adversarial, testing, maintainability | 75 |
| C-R2-2 | `server/src/routes/api/emailChangeRateLimits.ts` | Hard-coded dest limits (3/10) diverge from sign-in's event-mode limits (15/50) on the shared `otp:email:*` keys | `[pre-existing]` | maintainability (verified) | 90 |
| C-R2-3 | `server/src/services/email.ts` | `sendOtpEmail` `fetch` has no timeout — hot path hangs if Plunk stalls | `[pre-existing]` | reliability | 90 |
| C-R2-4 | `server/src/routes/api/emailChange.ts` | OTP-send failure after the request INSERT → 500 + orphan row + burned rate slot, no code delivered | `[pre-existing]` | reliability | 90 |
| C-R2-5 | `server/src/routes/api/emailChange.ts` | Verify's pre-transaction `db.select` sits outside try/catch → unhandled error surfaces as a raw 500 | `[pre-existing]` | reliability | 90 |
| C-R2-6 | `server/drizzle/0016_tidy_nova.sql` | No TTL cleanup for `email_change_requests` — only append-only OTP table without pruning | `[pre-existing]` | data-migration | 75 |
| D-R2-7 | `server/src/routes/api/payments.ts` | `getOptionalUserRole` in `calculatePrice` uses global `db`, not `tx` — cross-connection role read inside the checkout transaction | `[2nd-order D-1]` | reliability | 90 |
| D-R2-8 | `src/features/events/components/AdminEventForm.tsx` | "Publish now" re-submits a stale closure payload and never `form.setValue('isPublished', true)` — switch stays "Draft", a later save re-sends `false` | `[2nd-order D-2]` | maintainability | 75 |
| D-R2-9 | `server/src/routes/api/events.ts` | Detail handler re-encodes the visibility rule inline instead of calling `isEventHiddenFromNonStaff` (rule now lives in 3 places) | `[pre-existing]` | maintainability | 90 |
| D-R2-10 | `server/src/routes/api/events.ts` | `['owner','admin','manager'].includes(role)` inlined at 4 sites; no `isStaffRole` helper | `[pre-existing]` | maintainability | 90 |
| A-R2-11 | `server/src/routes/api/seriesGrants.ts` | Up to 2000 rows fetched+sorted on **every** page turn (not just page 1) — bounded, but ~100× a SQL paginate at scale | `[2nd-order A-3]` | performance | 100 |
| A-R2-12 | `server/src/routes/api/seriesGrants.ts` | Search runs only over the cached 2000-row cap window → silent false-negative search once a linked track exceeds the cap | `[2nd-order A-3]` | correctness, performance | 75 |
| A-R2-13 | `server/src/routes/api/seriesGrants.ts` | `ORDER BY bookedAt/grantedAt` not in the filter index → sort of the full per-track/series active set before `LIMIT` | `[pre-existing]` | performance | 75 |
| X-R2-14 | `tests/unit/*` (C + D) | Security-critical guard **wiring** is untested: the verify-429 gate and the draft guard can each be deleted with the suite green. DB-free Hono `app.request()` tests are feasible (`rate-limit-keying.test.ts` does it) | `[test gap]` | testing ×2 | 100 |

**Keyed detail (the ones worth reading before acting):**

- **C-R2-1 — the headline.** The verify handler peeks `getCount(verifyKey) >= 5` synchronously at the top, but `spendVerifyAttempt()` only runs *after* `await db.select(request)`. In Node's loop, N concurrent verify requests all execute their sync prefix (each sees count < 5) and yield at the `await` **before any sibling consumes** — so a burst of N wrong-OTP guesses all pass the gate, and the cap only bites on the *next* burst. This erodes the designed 5-guesses/10-min protection on the 10⁶ OTP space to ~burst-size guesses. *Root cause:* my C-6 fix replaced an atomic `consume()`-first (which had **no** TOCTOU — `consume` is synchronous and serializes even concurrent callers) with peek-then-consume. *Recommended fix that keeps both properties:* go back to **consume-first** (restores the atomic cap), and preserve C-6's intent by **refunding** only on the correct-OTP-then-transient-failure path — either add a `decrement`/refund to `InMemoryRateLimiter`, or accept that a rare transient error after a correct OTP costs one attempt (reverting C-6's P3, which is a fair trade for closing a P2). Net: this fix *strengthens* the endpoint vs the round-1 state.
- **C-R2-2 — verified divergence.** `auth.ts:64-65` sets `shortLimit = eventMode ? 15 : 3` and `dailyLimit = eventMode ? 50 : 10` on `otp:email:short/daily:<email>`; email-change consumes the *same keys* with a fixed 3/10. `InMemoryRateLimiter.consume` checks `count >= rule.limit` against the **current caller's** limit, so in event mode a user with 4 sign-in OTPs (allowed at 15) is then blocked from email-change (3). Normal mode is fully consistent (both 3/10) — anti-bombing holds there. *Fix:* read `platformSettings.eventMode` in the email-change request handler and apply the same dynamic limits, or stop sharing the namespace and make the anti-bombing budget explicit.
- **D-R2-7.** `calculatePrice` threads `tx` to `dbClient` for its other reads, but the new `getOptionalUserRole(userId)` uses the hard-coded global `db`. Called with `tx` at checkout, the role read runs on a *separate* connection: (a) it isn't serialized with the event/track `FOR UPDATE` lock (a mid-checkout role change is invisible — minor), and (b) `profiles` becomes a new blocking dependency of checkout (pool exhaustion now fails a checkout that previously succeeded). *Fix:* thread `tx` into the role lookup (or inline the `profiles` select with `dbClient`).
- **D-R2-8.** The `ToastAction` does `void onSubmit({ ...payload, isPublished: true })` but never updates react-hook-form state, so after "Publish now" the switch still reads "Draft" and a subsequent manual save re-sends `isPublished:false`. *Fix:* `form.setValue('isPublished', true, { shouldDirty: true })` then `form.handleSubmit(handleSubmit)()`.
- **X-R2-14 — highest-value test to add.** Both the email-change verify-429 gate and the event draft guard are wired correctly but **only the pure predicates are tested**; deleting the actual guard call leaves every test green. The repo already proves DB-free route tests via `rate-limit-keying.test.ts` (Hono `app.request()`). The verify-429 branch in particular fires before any DB call. Add one route test per guard asserting the 404/429 on the action path.

---

## 4. New Findings — P3 (discretionary)

| # | File | Issue | Tag | Reviewer |
|---|------|-------|-----|----------|
| C-R2-15 | `server/src/routes/api/emailChange.ts` | Issuing a 2nd OTP silently invalidates the 1st (`orderBy createdAt desc limit 1`); typing the still-valid first code burns an attempt → self-lockout with valid codes in hand | `[pre-existing]` | adversarial |
| C-R2-16 | `server/drizzle/0016_tidy_nova.sql` | A partial index `(user_id, new_email) WHERE consumed_at IS NULL` would make the verify hot path index-only (not urgent at scale) | `[pre-existing]` | data-migration |
| D-R2-17 | `server/drizzle/0016_tan_owl.sql` | `events_is_published_idx` (btree on a near-uniform boolean) won't be chosen by the planner; a partial index `WHERE is_published = false` (admin draft lookup) is the useful one | `[pre-existing]` | data-migration |
| D-R2-18 | `server/src/routes/api/events.ts` | Register resolves role pre-transaction → a `profiles` outage now blocks registration one hop earlier (safer for locking; new coupling) | `[2nd-order D-1]` | reliability |
| B-R2-19 | `tests/unit/timezone-conversion.test.ts` | DST-boundary dates absent from the TZ matrix — the spring gap hour (`2026-04-24 00:xx`) silently collides and the fall ambiguous hour (`2026-10-29 23:xx`) is unpinned | `[pre-existing]` | testing |
| B-R2-20 | `src/features/tracks/components/TrackForm.tsx` | The 4 booking-window datetime conversions (incl. the null pass-through) have zero test coverage | `[pre-existing]` | testing |
| B-R2-21 | `tests/unit/timezone-conversion.test.ts:33` | In-process test mislabeled "environment-independent" sits beside the real child-process matrix — rename/remove so it doesn't imply an in-process proof | `[pre-existing]` | testing |
| E-R2-22 | `tests/unit/phone-normalize*.test.ts` | E-3 unknown-dial test uses a vacuously-true inequality (doesn't assert `local === ''`); + 9-digit EG and 5/6-digit non-EG boundaries untested | `[2nd-order E test]` | testing |
| A-R2-23 | `tests/unit/series-attendees.test.ts` | Dedup+search not jointly exercised (a refactor applying search before dedup would pass); A-1 search could pass via `invoiceNumber` not `reference`; null `grantReason` search unasserted | `[2nd-order A test]` | testing |

(`eventPublishSchema.ts` was flagged as a single-consumer file; I'd **leave it** — it exists so `event-publish.test.ts` can unit-test the create-default/no-silent-unpublish schemas without importing the DB-bound route module. That's a legitimate testability seam, not premature abstraction.)

---

## 5. Cross-Cutting Themes

1. **Untested guard wiring (X-R2-14).** The two security-critical guards added in round 1 are correct but their *placement in the action path* is unproven by tests. This is the single highest-leverage gap — and it's cheap to close given the repo's existing DB-free Hono test pattern.
2. **The visibility rule + staff predicate are duplicated (D-R2-9, D-R2-10).** Round-1's `isEventHiddenFromNonStaff` extraction was right, but list (SQL), detail (inline), and register/checkout (helper) now encode the same rule three ways, and `isStaffRole` is inlined at four sites. Consolidating both onto the helper closes a real drift risk before more call sites appear.
3. **Second-order effects of the fixes (C-R2-1, D-R2-7, D-R2-8, A-R2-11/12).** Three fixes traded their target defect for a smaller new one. None is worse than the round-1 issue it fixed, but each deserves a follow-up so the net is strictly positive.
4. **In-memory limiter coupling (C-R2-2, C-7).** Email-change shares sign-in's OTP bucket — correct for anti-bombing in normal mode, but the limit values and the multi-instance assumption both diverge from sign-in. Worth aligning before any horizontal scale.

---

## 6. Coverage & Method Notes

- **24 reviewer passes** across the 5 branches (A: correctness/security/perf/testing; B: correctness/testing; C: + adversarial/reliability/data-migration/maintainability; D: same as C; E: correctness/security/testing) + 1 learnings researcher. One Phase-D reliability pass was interrupted and **re-run** to completion.
- **No separate validator wave.** In report-only mode I substituted (a) cross-reviewer corroboration — C-R2-1 and X-R2-14 were each independently flagged by 2-3 personas — and (b) orchestrator direct verification of the two highest-leverage claims: the C-R2-2 event-mode divergence (confirmed against `auth.ts:12-65`) and the B "vacuous test" (confirmed it's a mislabeled line-33 in-process test, **not** the P2 the reviewer rated — downgraded to P3 B-R2-21). One cited line number (B test) was diff-relative and corrected here.
- **Inspection scope.** Reviewers read branch content via `git show <branch>:<path>` (working tree stayed on `main`), so findings reflect actual branch code, not `main`.
- **Out of scope (by design):** cross-branch integration **INT-1…INT-4** (duplicate `0016` migration, the B×D `AdminEventForm` timezone-merge trap, the C×E `Dashboard` merge, the A×D additive check) remain merge-time items from round 1; agent-native parity (these are internal admin/auth/profile surfaces, not an agent-tool boundary).
- **Confidence gate:** findings reported at ≥75% confidence (P0/P1 would have been kept at ≥50; none arose). A handful of below-threshold observations (e.g., the spring-forward non-existent-midnight hour, the signup-mode invalid-phone no-op) were judged safe by the reviewers and dropped.

---

## 7. Verdict

**Ready with fixes (per-branch).** The five implementations are correct, the round-1 findings are all genuinely resolved, and there are **no P0/P1 defects**. The work is mergeable on a per-branch basis once you've weighed the P2 hardening items — none of which block, but several of which (C-R2-1 OTP-cap TOCTOU, D-R2-7 cross-connection role read, D-R2-8 publish-now desync, X-R2-14 untested wiring) are worth closing because they are direct second-order effects of the fixes and are cheap to address.

**Suggested order if you do another fix round:**
1. **C-R2-1** (restore atomic verify cap; refund on success) — the only finding that weakens a security control.
2. **D-R2-7, D-R2-8** (tx-scoped role read; sync form state on publish-now) — second-order fix bugs.
3. **X-R2-14** (one route test each for the verify-429 gate and the draft guard) — locks the guards in.
4. **C-R2-2..5, D-R2-9/10** (event-mode limits, fetch timeout, orphan-row UX, detail-handler/`isStaffRole` consolidation) as capacity allows.
5. P3s + migration hygiene (TTL cleanup, partial indexes) opportunistically.

**Then** resolve the round-1 **INT-1…INT-4** merge-time items (regenerate the second `0016` → `0017`; keep B's converter through the B×D merge; keep both features in the C×E `Dashboard` merge) in the recommended `A → B → (C or D) → other → E` order, re-running the gates after each.
