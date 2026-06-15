const PHONE_E164_REGEX = /^\+[1-9]\d{7,18}$/;

const isEmptyString = (value: string | null | undefined): value is null | undefined | '' =>
  !value || value.trim().length === 0;

export function normalizePhoneNumber(value: string) {
  return value.replace(/[\s\-()]/g, '');
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

  return { ok: true, isUnchanged: false };
}
