import { ALL_COUNTRIES_BY_DIAL_DESC, MENA_COUNTRIES } from '../data/countries';

export const EGYPT_DIAL = '20';
const EGYPT_MOBILE_PREFIXES = ['10', '11', '12', '15'];
export const EGYPT_PHONE_HELPER = 'Egypt numbers: enter without the leading 0 — e.g. 1012345678.';

const DEFAULT_COUNTRY = MENA_COUNTRIES[0];

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

// Strip a single leading zero from the Egyptian local part (the national trunk prefix); leave
// other countries' local parts untouched. Also strips non-digits (handles pasted spaces/dashes).
export function normalizeLocalPart(rawLocal: string, dial: string): string {
  const digits = digitsOnly(rawLocal);
  return dial === EGYPT_DIAL ? digits.replace(/^0/, '') : digits;
}

export function isValidEgyptMobile(local: string): boolean {
  return local.length === 10 && EGYPT_MOBILE_PREFIXES.some((prefix) => local.startsWith(prefix));
}

// Validation message for an already-normalized local part, or null when acceptable. Empty is
// acceptable (the field may be optional); Egypt requires a valid mobile prefix and 10 digits.
export function validateLocalPart(local: string, dial: string): string | null {
  if (local.length === 0) return null;
  if (dial === EGYPT_DIAL && !isValidEgyptMobile(local)) {
    return 'Enter a valid Egyptian mobile number (10 digits, e.g. 1012345678).';
  }
  return null;
}

export function assembleE164(dial: string, local: string): string {
  return local ? `+${dial}${local}` : '';
}

export function dialForCode(code: string): string {
  return (
    ALL_COUNTRIES_BY_DIAL_DESC.find((country) => country.code === code)?.dial ??
    DEFAULT_COUNTRY.dial
  );
}

// Split a stored E.164 string into a known country code + local part.
export function parseE164(saved: string | null | undefined): { code: string; local: string } {
  if (!saved || !saved.startsWith('+')) return { code: DEFAULT_COUNTRY.code, local: '' };
  const withoutPlus = saved.slice(1);
  for (const country of ALL_COUNTRIES_BY_DIAL_DESC) {
    if (withoutPlus.startsWith(country.dial)) {
      return { code: country.code, local: withoutPlus.slice(country.dial.length) };
    }
  }
  return { code: DEFAULT_COUNTRY.code, local: withoutPlus };
}
