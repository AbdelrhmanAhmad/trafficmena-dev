// Sign-in OTP verify-attempt limits. Kept in their own module (not inline in auth.ts) so the
// constants and the limiter key are importable by tests without pulling in the DB client —
// mirroring emailChangeRateLimits.ts.
//
// Generous but safe: a 6-digit code (10^6 space) is random per issuance, deleted on success, and
// expires in minutes, so brute-force risk is per-window ~= attempts / 1,000,000. 10 attempts is
// nowhere near a threat while being forgiving for delayed emails and typos.
export const OTP_VERIFY_LIMIT = 10;
export const OTP_VERIFY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// The resend reset (request handler) MUST build the same key as the verify consume, or the budget
// never clears. Single source of truth for that key. Callers pass an already-normalized email.
export const otpVerifyKey = (email: string) => `otp:verify:${email}`;

// Codes are 6-digit numeric. Strip formatting (spaces, dashes) a non-web caller or a stale cached
// bundle might submit, so a correct code isn't rejected and made to burn a verify attempt. The web
// form sanitizes too (src/app/auth/signIn.ts); the server is the real boundary for every client.
export const normalizeOtp = (value: string) => String(value ?? '').replace(/\D/g, '');
