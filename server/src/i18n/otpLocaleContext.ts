import type { AppLocale } from '../utils/locale.js';
import { DEFAULT_LOCALE } from '../utils/locale.js';

const pendingOtpLocale = new Map<string, AppLocale>();

function normalizeKey(email: string): string {
  return email.trim().toLowerCase();
}

/** Capture request locale before Better Auth dispatches OTP email. */
export function setPendingOtpLocale(email: string, locale: AppLocale): void {
  pendingOtpLocale.set(normalizeKey(email), locale);
}

/** Read and clear locale for the OTP recipient. */
export function consumePendingOtpLocale(email: string): AppLocale {
  const locale = pendingOtpLocale.get(normalizeKey(email));
  pendingOtpLocale.delete(normalizeKey(email));
  return locale ?? DEFAULT_LOCALE;
}
