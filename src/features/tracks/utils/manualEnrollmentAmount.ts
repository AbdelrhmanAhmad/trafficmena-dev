const MAX_MANUAL_ENROLLMENT_AMOUNT_EGP = 100_000;

function trimTrailingZeros(value: string) {
  return value.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function normalizeAmountInput(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '')
    .replace(/\s*egp$/i, '');
}

export function formatManualEnrollmentAmountEgp(
  amountPaidCents: number | null | undefined,
): string {
  if (
    typeof amountPaidCents !== 'number' ||
    !Number.isFinite(amountPaidCents) ||
    amountPaidCents <= 0
  ) {
    return '';
  }

  return trimTrailingZeros((amountPaidCents / 100).toFixed(2));
}

// Display contract for the enrolled-list "Amount Paid" column (U4):
//   null / undefined -> "—" (no captured amount, e.g. a manual series grant)
//   0                -> "Free" (confirmed-free registration)
//   positive         -> formatted EGP (final figure after discounts/promo)
export function formatAmountPaid(amountPaidCents: number | null | undefined): string {
  if (amountPaidCents === null || amountPaidCents === undefined) return '—';
  if (amountPaidCents === 0) return 'Free';
  return `${formatManualEnrollmentAmountEgp(amountPaidCents)} EGP`;
}

export function parseManualEnrollmentAmountEgp(input: string): number | null {
  let normalized = normalizeAmountInput(input);
  if (!normalized) return null;

  if (normalized.includes(',')) {
    const thousandsPattern = /^\d{1,3}(,\d{3})+(\.\d{1,2})?$/;
    if (!thousandsPattern.test(normalized)) {
      return null;
    }
    normalized = normalized.replace(/,/g, '');
  }

  const decimalPattern = /^\d+(\.\d{1,2})?$/;
  if (!decimalPattern.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_MANUAL_ENROLLMENT_AMOUNT_EGP) {
    return null;
  }

  return Math.round(amount * 100);
}
