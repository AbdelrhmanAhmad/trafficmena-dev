---
title: "fix: OTP verify rate-limit lockout (too-narrow limits + resend trap)"
type: fix
status: active
date: 2026-06-28
depth: lightweight
execution_posture: test-first
---

# fix: OTP verify rate-limit lockout

## Summary

Legitimate users hit *"Too many verification attempts. Please request a new code."* during sign-in. Root cause is **two stacked, too-narrow verify limits plus a recovery trap**: the custom limiter (`5 / email / 10-min fixed window`) only clears on a *successful* verify, so requesting a new code — exactly what the message instructs — does **not** lift the lock. Better Auth's default `allowedAttempts: 3` per code forces resends that then collide with the custom limit. Event mode is irrelevant (it scales *send* limits only). This plan widens both limits to safe-but-generous values, makes "request a new code" actually reset the budget, and stops non-digit input from wasting attempts.

A 6-digit code (10⁶ space), random per issuance, deleted on success, 10-min TTL, means brute-force risk is per-window ≈ `attempts / 1,000,000`. Even 30 attempts/window is negligible, so we have wide headroom to loosen for UX.

---

## Problem Frame

- **Symptom:** verify lockout reachable with one fumbled code + a couple of typos; the on-screen fix (resend) doesn't work; users retry and stay locked up to 10 minutes.
- **Surfaces:** `server/src/routes/api/auth.ts` (request + verify handlers), `server/src/auth.ts` (Better Auth `emailOTP` config), `server/src/services/rateLimiter.ts` (fixed-window mechanics), `src/pages/SignIn.tsx` + `src/app/auth/signIn.ts` (login entry).
- **Confirmed facts:** custom limit is inline `5 / 10-min` (`auth.ts:351`), reset only on success (`auth.ts:379`); Better Auth default is `allowedAttempts || 3`; the limiter is fixed-window anchored to the first attempt; login uses a plain `<Input>` (only `.trim()` applied, so internal spaces survive) while signup uses the digit-constrained `InputOTP`.

## Recommendations → Units (traceability)

| # | Recommendation | Unit |
|---|----------------|------|
| 1 | Reset verify budget when a new code is sent (fix the trap) | U1 |
| 2 | Set Better Auth `allowedAttempts: 10` (stop forced resends) | U1 |
| 3 | Widen custom verify limit 5 → 10 via named constants | U1 |
| 4 | Digit-sanitize the login code entry | U2 |
| 5 | Tighten the lockout message copy | U1 |

---

## Key Technical Decisions

**KTD-1 — Reset the verify budget on *successful code send*, always (no "is-this-a-resend" branch).**
First principles: the user's mental model is "new code → fresh tries," so the budget should track *code issuance*, not wall-clock. Second order: reset only on the success path (after `sendVerificationOTP` resolves, before returning) so blocked/errored requests grant no free budget; always-reset-on-success avoids extra state. Safety: total attempts are bounded by `send_limit × verify_limit` (≤ 3×10 normal, 15×10 event, per 10 min) — still negligible vs 10⁶, and each reset costs a send-budget token already gated by IP limit + Turnstile. No new brute-force surface.

**KTD-2 — Keep the two verify limits *independent*; do not merge into one shared constant.**
`allowedAttempts` (per-code, Better Auth) and the custom limit (per-email-window) are different mechanisms that merely happen to both be 10. Coupling them would be false DRY — a future tweak to one would silently move the other. Separate, each commented.

**KTD-3 — Use generous static values (10 / 10 / 10-min); do NOT make verify limits event-mode-aware.**
Verify limiting guards online brute-force of a 6-digit code — a security concern, not a load lever. Event mode is a load lever, so wiring it into the verify path adds a DB settings read to the hot path and branching for zero security/UX benefit. Over-engineering — rejected.

**KTD-4 — Centralize the verify key + constants in one small module; share an `otpVerifyKey(email)` helper across consume/reset.**
Mirrors the existing `server/src/routes/api/emailChangeRateLimits.ts` convention. Second order: the reset (request handler) and the consume/reset (verify handler) **must** use a byte-identical key, or the reset silently misses. A shared helper makes key-consistency correct by construction and keeps constants importable by tests without pulling in the DB client.

**KTD-5 — Sanitize OTP to digits at the submission boundary + input hints; defer the `InputOTP` swap.**
First principles: the failure is non-digit characters (pasted spaces) silently mismatching; `.trim()` leaves internal spaces. Strip all non-digits via a single `sanitizeOtp()` helper used by both the `onChange` and the submit boundary (one source of truth, no divergence), plus `inputMode="numeric"` / `autoComplete="one-time-code"`. Swapping the login form to the `InputOTP` primitive is a nicer consistency win but a larger UI change → deferred (the sanitizer fixes the actual bug regardless of widget).

**KTD-6 — Refined copy, made honest by KTD-1.**
Once resend resets the budget, "request a new code" is true. Tighten to make the recovery path unambiguous, e.g. *"Too many incorrect attempts. Request a new code to get a fresh set of tries."* (final wording minor).

---

## Scope Boundaries

**In scope:** the five recommendations above, scoped to the **sign-in OTP** flow, with regression tests.

**Deferred to follow-up:**
- Swap `src/pages/SignIn.tsx` to the shared `InputOTP` primitive for UX parity with signup.
- Apply the same widen/align treatment to the **email-change** verify limiter (`server/src/routes/api/emailChange.ts`, `EMAIL_CHANGE_VERIFY_LIMIT = 5`) — same pattern, different risk/frequency profile, not the reported issue.

**Explicitly rejected (not deferred):**
- Event-mode-aware verify limits (KTD-3).
- Redis / distributed limiter — single-instance infra already documented in `rateLimiter.ts`; unchanged here.

---

## Implementation Units

### U1. Widen and fix the backend OTP verify limits

**Goal:** Eliminate the lockout trap and widen both verify limits to safe-but-generous values. Covers recommendations 1, 2, 3, 5.

**Requirements:** Users recover by requesting a new code; normal fumbling no longer locks out; brute-force protection preserved.

**Dependencies:** none.

**Files:**
- `server/src/routes/api/otpRateLimits.ts` *(new)* — export `OTP_VERIFY_LIMIT = 10`, `OTP_VERIFY_WINDOW_MS = 10 * 60 * 1000`, `otpVerifyKey(email)`.
- `server/src/routes/api/auth.ts` *(modify)* — verify handler uses the constants + helper for `consume`/`reset`; **request** handler calls `otpVerificationRateLimiter.reset(otpVerifyKey(email))` on the success path (after `sendVerificationOTP`); refine the `OTP_VERIFY_RATE_LIMITED` message.
- `server/src/auth.ts` *(modify)* — add `allowedAttempts: 10` to `emailOTP({...})`.
- `tests/unit/otp-verify-rate-limit.test.ts` *(new)*.

**Approach:** Replace the inline `limit: 5, windowMs: 10*60*1000` (`auth.ts:351`) with the named constants; reuse `otpVerifyKey` everywhere the `otp:verify:${email}` key is built (verify consume + verify success-reset + new request-reset) so keys can't drift (KTD-4). Reset placement: only after a successful send, before returning the response — never on early-return error paths (KTD-1).

**Patterns to follow:** `server/src/routes/api/emailChangeRateLimits.ts` (named constants + key helper) and `tests/unit/email-change-rate-limits.test.ts` (direct-limiter tests + source-order assertions for un-harnessed route logic).

**Execution note:** Test-first — write the "lockout survives a resend" reproduction before changing code (it passes today's buggy behavior into a failing expectation).

**Test scenarios** (mirror `email-change-rate-limits.test.ts`; no HTTP+DB harness exists, so combine a direct `InMemoryRateLimiter` behavioral test with source-text assertions):
- Limiter allows `OTP_VERIFY_LIMIT` consume calls on one key, blocks the next (boundary at 10→11).
- After a block, `reset(key)` restores full budget (models resend recovery — the core mechanic KTD-1 relies on).
- `OTP_VERIFY_LIMIT === 10` and `otpVerifyKey('A@B.com')` equals the verify handler's key form (lowercased/normalized) — locks the value and key shape.
- Source assertion: in `/auth/otp/request`, `otpVerificationRateLimiter.reset(otpVerifyKey(...))` appears **after** `sendVerificationOTP` and within the success path (covers #1).
- Source assertion: `server/src/auth.ts` `emailOTP` config contains `allowedAttempts: 10` (covers #2).
- Source assertion: the `OTP_VERIFY_RATE_LIMITED` branch carries the refined copy (covers #5).

**Verification:** new test file fails before changes (reset-after-block path absent; limit is 5), passes after; `npm run test:unit` green; `npm --prefix server run build` clean.

### U2. Digit-sanitize the login OTP entry

**Goal:** Stop pasted/typed non-digits (e.g. `"4 4 5 4 6 3"`) from silently mismatching and burning attempts. Covers recommendation 4.

**Requirements:** Any code the user can read in their email verifies, regardless of incidental spaces/formatting.

**Dependencies:** none (independent of U1).

**Files:**
- `src/app/auth/signIn.ts` *(modify)* — add `sanitizeOtp(value)` (`String(value).replace(/\D/g, '').slice(0, 6)`); use it in `completeSignInVerification` in place of `.trim()`.
- `src/pages/SignIn.tsx` *(modify)* — `onChange` runs `sanitizeOtp`; add `inputMode="numeric"` and `autoComplete="one-time-code"` to the code `<Input>`.
- `tests/unit/otp-input-sanitize.test.ts` *(new)*.

**Approach:** One shared sanitizer used by both the input and the submit boundary (KTD-5) — no divergence. Pure function keeps it testable without rendering React.

**Patterns to follow:** existing pure-helper unit tests (e.g. `tests/unit/phone-normalize.test.ts`); digit-constrained entry already used in `src/pages/signup/CheckEmail.tsx`.

**Execution note:** Test-first — add the internal-space case first (the current `.trim()` gap).

**Test scenarios:**
- `"4 4 5 4 6 3"` → `"445463"` (internal spaces — the reported case).
- `" 12-34 56 "` → `"123456"` (symbols + edge whitespace).
- `"123456"` → `"123456"` (clean input unchanged).
- `"1234567"` → `"123456"` (caps at 6).
- `completeSignInVerification` passes the sanitized value to a spy `verifyOtp` (integration of helper + boundary).

**Verification:** new tests pass; manual check that the login field shows a numeric keypad on mobile and accepts a code pasted with spaces.

---

## Risks & Second-Order Notes

- **Brute-force:** widened limits remain negligible (≤150 attempts/10-min window worst case vs 10⁶, random code each issuance). Volumetric abuse still gated by send/IP limits + Turnstile.
- **Key drift:** the single risk in KTD-1 is the reset key not matching the consume key — eliminated by the shared `otpVerifyKey` helper (KTD-4) and asserted in tests.
- **Single-instance limiter:** unchanged; `reset()` is in-process, consistent with current infra. Horizontal scaling remains the documented future migration, out of scope here.
- **No conflict with prior art:** no `docs/solutions/` learning or requirements doc governs OTP verify limiting; the send-side limits and `paymentRateLimiter` are untouched.
