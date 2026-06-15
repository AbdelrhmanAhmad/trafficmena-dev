export const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export function formatCurrency(value: number | string, currencyCode: CurrencyCode): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(numValue)) {
    return `${CURRENCIES[currencyCode].symbol}${value}`;
  }
  return `${CURRENCIES[currencyCode].symbol}${numValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
