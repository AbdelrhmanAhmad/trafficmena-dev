import type { AppLocale } from '../utils/locale.js';

export function getSubscriptionBenefits(
  locale: AppLocale,
  discountPercent: number,
): string[] {
  if (locale === 'ar') {
    return [
      'وصول مجاني إلى جميع الفعاليات عبر الإنترنت',
      `خصم ${discountPercent}% على الفعاليات الحضورية`,
      `خصم ${discountPercent}% على حزم المسارات`,
      'وصول كامل إلى مكتبة المعرفة',
    ];
  }
  return [
    'Free access to all online events',
    `${discountPercent}% discount on offline events`,
    `${discountPercent}% discount on track bundles`,
    'Full access to the knowledge library',
  ];
}
