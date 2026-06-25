const PHONE_E164_REGEX = /^\+[1-9]\d{7,18}$/;

// Canonical Egyptian-mobile rule lives in src/shared/utils/phone.ts (EGYPT_MOBILE_PREFIXES).
// The server is a separate package that can't import the frontend src/, so we inline the tiny
// rule here as the final source of truth. +20 uniquely identifies Egypt (no other dial is 20/20x),
// and normalizePhoneNumber has already collapsed +200 -> +20, so a +20 local part must be exactly
// 10 digits beginning 10/11/12/15.
const EGYPT_E164_PREFIX = '+20';
const EGYPT_MOBILE_PREFIXES = ['10', '11', '12', '15'];

const isValidEgyptE164 = (value: string): boolean => {
  const local = value.slice(EGYPT_E164_PREFIX.length);
  return local.length === 10 && EGYPT_MOBILE_PREFIXES.some((prefix) => local.startsWith(prefix));
};

const isEmptyString = (value: string | null | undefined): value is null | undefined | '' =>
  !value || value.trim().length === 0;

export function normalizePhoneNumber(value: string) {
  const stripped = value.replace(/[\s\-()]/g, '');
  // Egypt guard: collapse a leftover trunk zero after the +20 country code so no path persists the
  // double-zero form (+2001012… -> +201012…). Other country codes are left untouched.
  return stripped.replace(/^\+200/, '+20');
}

export function isE164PhoneNumber(value: string) {
  return PHONE_E164_REGEX.test(value);
}

export function isSamePhoneNumber(incomingNormalized: string, existing: string | null | undefined) {
  if (isEmptyString(existing)) return false;
  return incomingNormalized === normalizePhoneNumber(existing);
}

export function validatePhoneNumberUpdate({
  incomingNormalized,
  existing,
}: {
  incomingNormalized: string;
  existing: string | null | undefined;
}): { ok: true; isUnchanged: boolean } | { ok: false; message: string } {
  if (incomingNormalized.length === 0) {
    return { ok: true, isUnchanged: true };
  }

  if (isSamePhoneNumber(incomingNormalized, existing)) {
    return { ok: true, isUnchanged: true };
  }

  if (!isE164PhoneNumber(incomingNormalized)) {
    return { ok: false, message: 'Invalid phone number format' };
  }

  // Backend is the final validator for the Egypt rule: the E.164 shape check above accepts any
  // +20 length/prefix, so enforce the mobile rule here to stop a persisted save-then-reject.
  if (incomingNormalized.startsWith(EGYPT_E164_PREFIX) && !isValidEgyptE164(incomingNormalized)) {
    return { ok: false, message: 'Enter a valid Egyptian mobile number' };
  }

  return { ok: true, isUnchanged: false };
}
