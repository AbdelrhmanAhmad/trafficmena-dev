import type { PaymentMethod } from '@/app/api/payments';

const OFFLINE_METHOD_KEYWORDS = ['fawry', 'meeza', 'aman', 'masary', 'mobilewallet'];

export const normalizePaymentMethodName = (value: string | undefined | null) =>
  (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const isOfflinePaymentMethod = (method: PaymentMethod | null | undefined) => {
  if (!method) return false;
  const normalized = normalizePaymentMethodName(method.name_en);
  return OFFLINE_METHOD_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

export const shouldRedirectToGateway = (method: PaymentMethod | null | undefined) => {
  if (!method) return false;
  const redirectFlag = String(method.redirect ?? '').toLowerCase() === 'true';
  return redirectFlag || isOfflinePaymentMethod(method);
};
