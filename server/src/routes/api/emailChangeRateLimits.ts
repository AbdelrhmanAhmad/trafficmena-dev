// Rate-limit windows, limits, and keys for the self-service email-change flow, extracted so the
// route and its tests share one source of truth (C-5). The per-destination keys deliberately reuse
// the sign-in OTP namespace (`otp:email:{short,daily}:`) — that shared budget is what bounds the
// email-bombing vector for the target address regardless of which flow sends to it.
export const SHORT_WINDOW_MS = 10 * 60 * 1000;
export const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

export const EMAIL_CHANGE_USER_REQUEST_LIMIT = 3; // per user / 10 min
export const EMAIL_CHANGE_DEST_SHORT_LIMIT = 3; // per destination email / 10 min (shared w/ sign-in)
export const EMAIL_CHANGE_DEST_DAILY_LIMIT = 10; // per destination email / day (shared w/ sign-in)
export const EMAIL_CHANGE_VERIFY_LIMIT = 5; // verify attempts per user / 10 min

export const emailChangeRateKeys = {
  userRequest: (userId: string) => `emailchange:user:${userId}`,
  destShort: (email: string) => `otp:email:short:${email}`,
  destDaily: (email: string) => `otp:email:daily:${email}`,
  verify: (userId: string) => `emailchange:verify:${userId}`,
};
